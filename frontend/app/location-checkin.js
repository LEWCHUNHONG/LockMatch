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
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
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

const AUTO_UPDATE_INTERVAL_MS = 15000;       // 普通檢查間隔：15 秒
const FORCE_UPLOAD_INTERVAL_MS = 300000;     // 強制上傳間隔：5 分鐘 
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

const getCurrentLocationAndNearby = async (showLoading = true, isForceUpload = false) => {
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

    let shouldUpload = isForceUpload; // 如果是強制上傳，就一定上傳

    if (!isForceUpload && lastUploadedLocationRef.current) {
      const distance = calculateDistanceMeters(
        lastUploadedLocationRef.current.latitude,
        lastUploadedLocationRef.current.longitude,
        currentLat,
        currentLng
      );

      console.log(`距離上次上傳：${distance.toFixed(2)} 公尺`);

      if (distance >= MIN_DISTANCE_THRESHOLD) {
        console.log(`距離 ≥ ${MIN_DISTANCE_THRESHOLD}m → 上傳`);
        shouldUpload = true;
      } else {
        console.log(`距離 < ${MIN_DISTANCE_THRESHOLD}m → 跳過`);
      }
    } else if (!lastUploadedLocationRef.current) {
      console.log('首次上傳');
      shouldUpload = true;
    }

    if (shouldUpload) {
      try {
        console.log('[位置上傳]', isForceUpload ? '(強制)' : '(移動觸發)', new Date().toLocaleTimeString());
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
      } catch (uploadError) {
        console.error('[上傳失敗]', uploadError);
      }
    }

    // 獲取附近用戶（無論是否上傳都重新抓一次）
    const nearbyRes = await api.get('/api/nearby-users', {
      params: {
        lat: currentLat,
        lng: currentLng,
        radius: 1000,
      },
    });

    console.log('附近用戶 API 完整回應：', nearbyRes.data);

    if (nearbyRes.data.success) {
      const users = nearbyRes.data.users || [];
      console.log('收到附近用戶數量：', users.length);       // ← 新增
      console.log('附近用戶資料（前2筆）：', users.slice(0, 2)); // ← 新增，可看到是否有資料
      const validUsers = users
        .filter(user => {
          const lat = Number(user.latitude);
          const lng = Number(user.longitude);
          return (
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180
          );
        })
        .map(user => ({
          ...user,
          latitude: Number(user.latitude),
          longitude: Number(user.longitude),
        }));

      setNearbyUsers(validUsers);
    }
  } catch (error) {
    console.error('位置/附近用戶錯誤:', error);
    if (showLoading) {
      Alert.alert('錯誤', '無法獲取位置或附近用戶');
    }
  } finally {
    if (showLoading) setLoading(false);
    setInitialLoading(false);
  }
};

// useFocusEffect 只保留這一個版本
useFocusEffect(
  useCallback(() => {
    // 進入頁面立即更新一次（帶 loading）
    getCurrentLocationAndNearby(true, false);  // 初次不算強制，但會因為首次而上传

    // 普通檢查：每 15 秒看是否移動夠遠 → 決定是否上傳
    const normalInterval = setInterval(() => {
      getCurrentLocationAndNearby(false, false);
      console.log(`普通檢查 @ ${new Date().toLocaleTimeString()}`);
    }, AUTO_UPDATE_INTERVAL_MS);

    // 強制上傳：每 5 分鐘強制上傳一次，保證靜止也維持可見
    const forceInterval = setInterval(() => {
      getCurrentLocationAndNearby(false, true);
      console.log(`強制上傳 @ ${new Date().toLocaleTimeString()}`);
    }, FORCE_UPLOAD_INTERVAL_MS);

    return () => {
      clearInterval(normalInterval);
      clearInterval(forceInterval);
      console.log('離開頁面 → 停止所有自動更新');
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
            {/* 畫出 600m 範圍的紅色圓 */}
    <Circle
      center={{
        latitude: location.latitude,
        longitude: location.longitude,
      }}
      radius={1000}
      strokeColor="#ff0000"          // 純紅 #ff0000 或 "#e63946"
      strokeOpacity={0.9}
      strokeWidth={2.5}
      fillColor="rgba(255, 100, 100, 0.1)"  // 淡紅填充
    />
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