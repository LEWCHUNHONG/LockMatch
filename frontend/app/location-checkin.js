import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../utils/api';

export default function LocationCheckin() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const mapRef = useRef(null);

  // 獲取當前位置及附近用戶
  const getCurrentLocationAndNearby = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要位置權限', '請允許存取位置');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const newLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      setLocation(newLocation);

      if (mapRef.current) {
        mapRef.current.animateToRegion(newLocation, 1000);
      }

      // 儲存位置到後端（打卡 + 積分）
      const saveRes = await api.post('/api/user/location', {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      });

      if (saveRes.data.success) {
        const earned = saveRes.data.pointsEarned || 50;
        Alert.alert('打卡成功', `獲得 ${earned} 積分！`);
      }

      // 獲取附近用戶
      const nearbyRes = await api.get('/api/nearby-users', {
        params: {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          radius: 1000, // 可先改大一點測試，例如 5000
        },
      });

      if (nearbyRes.data.success) {
        const users = nearbyRes.data.users || [];

        console.log('API 原始附近用戶數量:', users.length);
        if (users.length > 0) {
          console.log('第一筆用戶資料範例:', users[0]);
        }

        // 更寬鬆的過濾：接受 string 或 number，只要能轉成有效數字即可
        const validUsers = users
          .filter(user => {
            const lat = Number(user.latitude);
            const lng = Number(user.longitude);
            return (
              !isNaN(lat) &&
              !isNaN(lng) &&
              lat >= -90 &&
              lat <= 90 &&
              lng >= -180 &&
              lng <= 180
            );
          })
          .map(user => ({
            ...user,
            latitude: Number(user.latitude),   // 統一轉成 number
            longitude: Number(user.longitude),
          }));

        console.log('過濾後有效用戶數量:', validUsers.length);

        if (validUsers.length === 0 && users.length > 0) {
          console.warn('所有用戶被濾掉，可能 latitude/longitude 格式異常');
        }

        setNearbyUsers(validUsers);
      } else {
        console.warn('附近用戶 API 回傳不成功:', nearbyRes.data);
      }
    } catch (error) {
      console.error('獲取位置/附近用戶失敗:', error);
      Alert.alert('錯誤', error.message || '無法獲取位置或附近用戶');
    } finally {
      if (showLoading) setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocationAndNearby(true);
  }, []);

  // 渲染 Marker（已簡化，因為資料已預先轉型）
  const renderAvatarMarker = (user) => {
    return (
      <Marker
        key={user.id}
        coordinate={{
          latitude: user.latitude,
          longitude: user.longitude,
        }}
        onPress={() => sendTempChatInvite(user.id, user.username)}
      >
        <View style={styles.markerContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.markerAvatar} />
          ) : (
            <View style={styles.markerDefault}>
              <Text style={styles.markerText}>{user.username?.charAt(0) || '?'}</Text>
            </View>
          )}
        </View>
      </Marker>
    );
  };

  // 開始臨時聊天邀請
  const sendTempChatInvite = async (targetUserId, targetUsername) => {
    try {
      console.log('🔘 點擊邀請按鈕，目標用戶 ID:', targetUserId);
      Alert.alert(
        '發送邀請',
        `確定要向 ${targetUsername || '該用戶'} 發送臨時聊天邀請嗎？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '發送',
            onPress: async () => {
              try {
                const response = await api.post('/api/temp-chat/invite', { targetUserId });
                console.log('📥 邀請回應:', response.data);
                if (response.data.success) {
                  Alert.alert('✅ 邀請已發送', '等待對方接受');
                } else {
                  Alert.alert('❌ 錯誤', response.data.error || '發送失敗');
                }
              } catch (err) {
                console.error('❌ 發送邀請錯誤:', err);
                if (err.response) {
                  Alert.alert('錯誤', err.response.data.error || `伺服器錯誤 (${err.response.status})`);
                } else if (err.request) {
                  Alert.alert('網絡錯誤', '無法連接到伺服器，請檢查網絡');
                } else {
                  Alert.alert('錯誤', err.message);
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ 意外錯誤:', error);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>即時位置打卡</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4c7ab" />
          <Text style={styles.loadingText}>獲取位置及附近用戶中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>即時位置打卡</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.mapContainer}>
        {location ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={location}
            showsUserLocation={true}
            showsMyLocationButton={false}
            provider={PROVIDER_GOOGLE}
          >
            {nearbyUsers.map(user => renderAvatarMarker(user))}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text>無法載入地圖位置</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.updateButton, loading && styles.disabled]}
          onPress={() => getCurrentLocationAndNearby(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialCommunityIcons name="map-marker-check" size={24} color="#fff" />
              <Text style={styles.updateButtonText}>更新位置</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          附近有 {nearbyUsers.length} 位用戶，點擊大頭針可聊天
        </Text>
      </View>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fffaf5' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244,199,171,0.3)',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(244,199,171,0.25)',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#5c4033',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#8b5e3c',
    },
    mapContainer: {
        flex: 1,
        margin: 16,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#f4c7ab',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    buttonContainer: {
        padding: 20,
        alignItems: 'center',
    },
    updateButton: {
        flexDirection: 'row',
        backgroundColor: '#f4c7ab',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#c47c5e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    updateButtonText: {
        color: '#5c4033',
        fontSize: 18,
        fontWeight: '700',
    },
    note: {
        marginTop: 16,
        fontSize: 14,
        color: '#8b5e3c',
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.6,
    },
    // Marker 樣式
    markerContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#f4c7ab',
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    markerAvatar: {
        width: '100%',
        height: '100%',
    },
    markerDefault: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f4c7ab',
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#5c4033',
    },
    // Callout 樣式
    calloutContainer: {
        backgroundColor: '#fffaf5',
        borderRadius: 16,
        padding: 12,
        minWidth: 160,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f4c7ab',
    },
    calloutName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#5c4033',
    },
    calloutMbti: {
        fontSize: 14,
        color: '#8b5e3c',
        marginTop: 2,
    },
    calloutDistance: {
        fontSize: 12,
        color: '#a0785e',
        marginTop: 4,
    },
    calloutButton: {
        backgroundColor: '#f4c7ab',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginTop: 8,
    },
    calloutButtonText: {
        color: '#5c4033',
        fontSize: 14,
        fontWeight: '600',
    },
});