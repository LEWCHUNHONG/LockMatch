import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import api from '../utils/api';

export default function LocationCheckin() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const mapRef = useRef(null);

  const lastUploadedLocationRef = useRef(null);

  const AUTO_UPDATE_INTERVAL_MS = 10000;
  const MIN_DISTANCE_THRESHOLD = 80;

  const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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

      const currentLat = loc.coords.latitude;
      const currentLng = loc.coords.longitude;

      const newLocation = {
        latitude: currentLat,
        longitude: currentLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setLocation(newLocation);

      if (mapRef.current) {
        mapRef.current.animateToRegion(newLocation, 1000);
      }

      let shouldUpload = true;

      if (lastUploadedLocationRef.current) {
        const distance = calculateDistanceMeters(
          lastUploadedLocationRef.current.latitude,
          lastUploadedLocationRef.current.longitude,
          currentLat,
          currentLng
        );

        console.log(`距離上次上傳位置：${distance.toFixed(2)} 公尺`);

        if (distance < MIN_DISTANCE_THRESHOLD) {
          console.log(`距離小於 ${MIN_DISTANCE_THRESHOLD}m → 跳過上傳`);
          shouldUpload = false;
        } else {
          console.log(`距離 ≥ ${MIN_DISTANCE_THRESHOLD}m → 將上傳`);
        }
      } else {
        console.log('首次上傳，無上次記錄');
      }

      if (shouldUpload) {
        try {
          console.log('[上傳開始]', new Date().toLocaleTimeString());
          const saveRes = await api.post('/api/user/location', {
            latitude: currentLat,
            longitude: currentLng,
            accuracy: loc.coords.accuracy,
          });
          console.log('[上傳成功]', saveRes.data);

          lastUploadedLocationRef.current = {
            latitude: currentLat,
            longitude: currentLng,
          };
          console.log('已更新上次上傳記錄 →', lastUploadedLocationRef.current);
        } catch (uploadError) {
          console.error('[上傳失敗]', uploadError);
        }
      }

      const nearbyRes = await api.get('/api/nearby-users', {
        params: {
          lat: currentLat,
          lng: currentLng,
          radius: 1000,
        },
      });

      if (nearbyRes.data.success) {
        const users = nearbyRes.data.users || [];

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
            latitude: Number(user.latitude),
            longitude: Number(user.longitude),
          }));

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

  useFocusEffect(
    useCallback(() => {
      // 頁面 focus 時立刻做一次完整更新（帶 loading）
      getCurrentLocationAndNearby(true);

      const intervalId = setInterval(() => {
        getCurrentLocationAndNearby(false);
        console.log(`自動更新循環觸發 @ ${new Date().toLocaleTimeString()}`);
      }, AUTO_UPDATE_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
        console.log('離開地圖頁 → 停止自動更新');
      };
    }, [])
  );

const renderAvatarMarker = (user) => {
  const avatarUri = user.avatar
    ? user.avatar.startsWith('http')
      ? user.avatar
      : `${api.defaults.baseURL}${user.avatar}`
    : null;   // 或放預設圖

  return (
    <Marker
      key={user.id}
      coordinate={{
        latitude: user.latitude,
        longitude: user.longitude,
      }}
      onPress={() => sendTempChatInvite(user.id, user.username)}
      tracksViewChanges={true}
      anchor={{ x: 0.5, y: 0.6 }}
    >
      <View style={styles.markerContainer}>
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.markerAvatar}
            // 建議加上這兩行，幫助 debug
            onError={(e) => console.log('頭像載入失敗:', user.id, e.nativeEvent.error)}
          />
        ) : (
          <View style={styles.markerDefault}>
            <Text style={styles.markerText}>{user.username?.charAt(0) || '?'}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
};

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
                Alert.alert('錯誤', '發送失敗，請稍後再試');
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
          <Text style={styles.headerTitle}>附近的人</Text>
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
        <Text style={styles.headerTitle}>附近的人</Text>
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
markerContainer: {
  width: 38,               // 縮小到 48（或 44–50 之間測試）
  height: 38,
  borderRadius: 24,
  borderWidth: 2,          // 邊框也薄一點
  borderColor: '#f4c7ab',
  backgroundColor: '#fff',
  overflow: 'visible',
  justifyContent: 'center',
  alignItems: 'center',
},

markerAvatar: {
  width: 28,               // 圖片再小 8px，避免頂到 bitmap 邊界
  height: 28,
  borderRadius: 20,
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
});