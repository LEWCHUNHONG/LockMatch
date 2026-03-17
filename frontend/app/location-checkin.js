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

  // Modal 狀態
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // { id, username }

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

      console.log('附近用戶 API 完整回應：', nearbyRes.data);

      if (nearbyRes.data.success) {
        const users = nearbyRes.data.users || [];
        console.log('收到附近用戶數量：', users.length);
        console.log('附近用戶資料（前2筆）：', users.slice(0, 2));

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
        console.log(`普通檢查 @ ${new Date().toLocaleTimeString()}`);
      }, AUTO_UPDATE_INTERVAL_MS);

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
      : null;

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

  const sendTempChatInvite = (targetUserId, targetUsername) => {
    setSelectedUser({ id: targetUserId, username: targetUsername || '該用戶' });
    setInviteModalVisible(true);
  };

  const confirmAndSendInvite = async () => {
    if (!selectedUser) return;

    setInviteModalVisible(false);

    try {
      console.log('🔘 發送邀請給用戶 ID:', selectedUser.id);
      const response = await api.post('/api/temp-chat/invite', {
        targetUserId: selectedUser.id,
      });

      console.log('📥 邀請回應:', response.data);

      if (response.data.success) {
        setSuccessModalVisible(true);
      } else {
        Alert.alert('❌ 錯誤', response.data.error || '發送失敗');
      }
    } catch (err) {
      console.error('❌ 發送邀請錯誤:', err);
      Alert.alert('錯誤', '發送失敗，請稍後再試');
    } finally {
      setSelectedUser(null);
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

            {/* 邀請確認 Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={inviteModalVisible}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInviteModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={modalStyles.modalContainer}
            onPress={() => {}}
          >
            <Text style={modalStyles.modalTitle}>發送聊天邀請</Text>

            <Text style={modalStyles.modalMessage}>
              確定要向{' '}
              <Text style={{ fontWeight: 'bold', color: '#5c4033' }}>
                {selectedUser?.username}
              </Text>{' '}
              發送臨時聊天邀請嗎？
            </Text>

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={[modalStyles.button, modalStyles.cancelButton]}
                onPress={() => {
                  setInviteModalVisible(false);
                  setSelectedUser(null);
                }}
              >
                <Text style={modalStyles.cancelText}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.button, modalStyles.confirmButton]}
                onPress={confirmAndSendInvite}
              >
                <Text style={modalStyles.confirmText}>發送</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 邀請成功 Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <TouchableOpacity
          style={modalStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSuccessModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={modalStyles.modalContainer}
            onPress={() => {}}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={64}
              color="#4CAF50"
              style={{ marginBottom: 16 }}
            />

            <Text style={[modalStyles.modalTitle, { marginBottom: 12 }]}>
              邀請已發送
            </Text>

            <Text style={[modalStyles.modalMessage, { marginBottom: 32 }]}>
              等待對方接受囉～
            </Text>

<TouchableOpacity
onPress={() => setSuccessModalVisible(false)}
  style={{
    backgroundColor: '#f4c7ab',         
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  }}
>
  <Text style={{
    color: '#3d2a1f',
    fontSize: 18,
    fontWeight: '700',
  }}>
    知道了
  </Text>
</TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
  • 點大頭針可發送聊天邀請{'\n\n'}
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
      
<View style={styles.header}>
  {/* 左邊返回按鈕*/}
  <TouchableOpacity 
    onPress={() => router.back()} 
    style={[styles.backButton, { zIndex: 10 }]}  // 加 zIndex
  >
    <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
  </TouchableOpacity>

  {/* 中間標題 */}
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

  {/* 右邊說明按鈕*/}
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
          附近有 {nearbyUsers.length} 位用戶，點擊大頭針可聊天
        </Text>
      </View>


    </SafeAreaView>
  );
}

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
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0e9e2',
    borderWidth: 1.5,
    borderColor: '#d9c2ad',
  },
  confirmButton: {
    backgroundColor: '#f4c7ab',
  },
  cancelText: {
    color: '#8b5e3c',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmText: {
    color: '#5c4033',
    fontSize: 16,
    fontWeight: '700',
  },
  infoButton: {
  padding: 8,
  borderRadius: 20,
  backgroundColor: 'rgba(244,199,171,0.25)',
},
});