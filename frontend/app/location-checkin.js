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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import api from '../utils/api';

export default function LocationCheckin() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const mapRef = useRef(null);

  const lastUploadedLocationRef = useRef(null);

  const AUTO_UPDATE_INTERVAL_MS = 15000;       // 15秒檢查一次
  const FORCE_UPLOAD_INTERVAL_MS = 300000;     // 5分鐘強制上傳
  const MIN_DISTANCE_THRESHOLD = 80;

  // 預覽 Modal 相關狀態
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewUser, setPreviewUser] = useState(null);

  const getMbtiColor = (mbti) => {
  if (!mbti) return '#f4c7ab';
  
  const mbtiColors = {
    ISTJ: '#3498db', ISFJ: '#2ecc71', INFJ: '#9b59b6', INTJ: '#1abc9c',
    ISTP: '#e74c3c', ISFP: '#f39c12', INFP: '#d35400', INTP: '#34495e',
    ESTP: '#e67e22', ESFP: '#f1c40f', ENFP: '#2ecc71', ENTP: '#9b59b6',
    ESTJ: '#3498db', ESFJ: '#1abc9c', ENFJ: '#e74c3c', ENTJ: '#f39c12',
  };
  
  return mbtiColors[mbti.toUpperCase()] || '#f4c7ab';
};

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

      let shouldUpload = isForceUpload;

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

  useFocusEffect(
    useCallback(() => {
      getCurrentLocationAndNearby(true, false);

      const normalInterval = setInterval(() => {
        getCurrentLocationAndNearby(false, false);
      }, AUTO_UPDATE_INTERVAL_MS);

      const forceInterval = setInterval(() => {
        getCurrentLocationAndNearby(false, true);
      }, FORCE_UPLOAD_INTERVAL_MS);

      return () => {
        clearInterval(normalInterval);
        clearInterval(forceInterval);
      };
    }, [])
  );

  const renderAvatarMarker = (user) => {
    const avatarUri = user.avatar
      ? user.avatar.startsWith('http')
        ? user.avatar
        : `${api.defaults.baseURL}${user.avatar}`
      : null;

    return (
      <Marker
        key={user.id}
        coordinate={{
          latitude: user.latitude,
          longitude: user.longitude,
        }}
        onPress={() => {
          console.log('點擊用戶:', user.id, user.username); // debug 用
          setPreviewUser(user);
          setPreviewModalVisible(true);
        }}
        tracksViewChanges={true}
        anchor={{ x: 0.5, y: 0.6 }}
      >
        <View style={styles.markerContainer}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.markerAvatar}
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

      {/* 所有 Modal 統一放在這裡，同級 */}
      
      {/* 預覽用戶 Modal */}
<Modal
  animationType="fade"
  transparent={true}
  visible={previewModalVisible}
  onRequestClose={() => setPreviewModalVisible(false)}
>
  <TouchableOpacity
    style={modalStyles.modalOverlay}
    activeOpacity={1}
    onPress={() => setPreviewModalVisible(false)}
  >
    <TouchableOpacity
      activeOpacity={1}
      style={[modalStyles.modalContainer, { paddingVertical: 40, paddingHorizontal: 28 }]}
      onPress={() => {}}
    >
      {/* 頭像 */}
      <View style={{ marginBottom: 16 }}>
        {previewUser?.avatar ? (
          <Image
            source={{
              uri: previewUser.avatar.startsWith('http')
                ? previewUser.avatar
                : `${api.defaults.baseURL}${previewUser.avatar}`,
            }}
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              borderWidth: 4,
              borderColor: '#f4c7ab',
            }}
          />
        ) : (
          <View
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: '#f4c7ab',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 4,
              borderColor: '#f4c7ab',
            }}
          >
            <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#5c4033' }}>
              {previewUser?.username?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>

      {/* 用戶名 */}
      <Text style={[modalStyles.modalTitle, { marginBottom: 12 }]}>
        {previewUser?.username || '用戶'}
      </Text>

{previewUser?.mbti ? (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: getMbtiColor(previewUser.mbti),
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 30,
      gap: 8,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)', // 輕微白色邊框增加質感
    }}
  >
    <MaterialCommunityIcons name="account-check" size={18} color="#fff" />
    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
      {previewUser.mbti} 型
    </Text>
  </View>
) : (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 30,
      backgroundColor: 'rgba(244, 199, 171, 0.15)', // 跟公開頁面一致的極淡暖灰
      borderWidth: 1,
      borderColor: 'rgba(244, 199, 171, 0.3)',
      gap: 8,
      marginBottom: 24,
    }}
  >
    <MaterialCommunityIcons name="account-question-outline" size={18} color="#a68a7c" />
    <Text
      style={{
        color: '#a68a7c',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.3,
      }}
    >
      尚未設置 MBTI
    </Text>
  </View>
)}
      {/* 查看個人卡片按鈕 */}
      <TouchableOpacity
        style={{
          backgroundColor: '#f4c7ab',
          paddingVertical: 16,
          paddingHorizontal: 40,
          borderRadius: 30,
          width: '80%',
          alignItems: 'center',
          marginBottom: 16,
        }}
        onPress={() => {
          setPreviewModalVisible(false);
          if (previewUser?.id) {
            router.push(`/profile/public/${previewUser.id}`);
          } else {
            Alert.alert('提示', '無法獲取用戶 ID');
          }
        }}
      >
        <Text style={{ color: '#5c4033', fontSize: 17, fontWeight: '700' }}>
          查看個人卡片
        </Text>
      </TouchableOpacity>

      {/* 關閉按鈕 */}
      <TouchableOpacity onPress={() => setPreviewModalVisible(false)}>
        <Text style={{ color: '#8b5e3c', fontSize: 15, fontWeight: '500' }}>
          關閉
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  </TouchableOpacity>
</Modal>

      {/* 使用說明 Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInfoModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[modalStyles.modalContainer, { maxHeight: '70%' }]}
            onPress={() => {}}
          >
            <Text style={modalStyles.modalTitle}>使用說明</Text>

            <Text style={[modalStyles.modalMessage, { textAlign: 'left', lineHeight: 24 }]}>
              • 每 15 秒自動檢查位置，移動 80m 時上傳{'\n\n'}
              • 每 5 分鐘強制更新一次{'\n\n'}
              • 顯示 1 公里內的用戶（紅色圓圈）{'\n\n'}
              • 點大頭針可查看用戶資訊{'\n\n'}
            </Text>

            <TouchableOpacity
              onPress={() => setInfoModalVisible(false)}
              style={{
                backgroundColor: '#f4c7ab',
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 12,
                marginTop: 24,
              }}
            >
              <Text style={{
                color: '#3d2a1f',
                fontSize: 17,
                fontWeight: '700',
              }}>
                知道了
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 頁面主要內容 */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { zIndex: 10 }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
        </TouchableOpacity>

        <Text 
          style={[
            styles.headerTitle, 
            { 
              position: 'absolute', 
              left: 0, 
              right: 0, 
              textAlign: 'center',
              pointerEvents: 'none'
            }
          ]}
        >
          附近的人
        </Text>

        <TouchableOpacity 
          onPress={() => setInfoModalVisible(true)}
          style={[styles.infoButton, { zIndex: 10 }]}
        >
          <MaterialCommunityIcons name="information" size={28} color="#5c4033" />
        </TouchableOpacity>
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
            <Circle
              center={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              radius={1000}
              strokeColor="#ff0000"
              strokeOpacity={0.9}
              strokeWidth={2.5}
              fillColor="rgba(255, 100, 100, 0.1)"
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
          附近有 {nearbyUsers.length} 位用戶，點擊大頭針查看資訊
        </Text>
      </View>

    </SafeAreaView>
  );
}

// styles 與 modalStyles 保持不變（你原本的就很好）
const { width } = Dimensions.get('window');

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
    width: 38,
    height: 38,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#f4c7ab',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerAvatar: {
    width: 28,
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

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(92, 64, 51, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '82%',
    maxWidth: 360,
    backgroundColor: '#fffaf5',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 14,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#5c4033',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244,199,171,0.25)',
  },
});