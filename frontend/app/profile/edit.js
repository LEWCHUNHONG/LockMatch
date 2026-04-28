// app/profile/edit.js
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from 'react-native-modal';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import api from '../../utils/api';
import MbtiTestChoiceModal from '../../components/MbtiTestChoiceModal';

export default function ProfileEdit() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success');

  const [showUploadError, setShowUploadError] = useState(false);
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');

  const [showAvatarActionModal, setShowAvatarActionModal] = useState(false);
  const [showMbtiInfoModal, setShowMbtiInfoModal] = useState(false);
  const [showMbtiChoiceModal, setShowMbtiChoiceModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 硬體返回鍵處理
  useEffect(() => {
    const backAction = () => {
      router.back();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  // 載入使用者資料
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          let parsed = JSON.parse(storedUser);

          if (parsed.avatar) {
            parsed.avatar = refreshCacheBuster(parsed.avatar);
            await AsyncStorage.setItem('user', JSON.stringify(parsed));
          }

          setUser(parsed);
          setUsername(parsed.username || '');
          setEmail(parsed.email || '');
        } else {
          router.replace('/');
        }
      } catch (err) {
        console.error('載入使用者資料失敗:', err);
        router.replace('/');
      }
    };

    loadUser();
  }, []);

  const refreshCacheBuster = (url) => {
    if (!url) return url;
    const cacheBuster = Date.now();
    let cleanUrl = url.replace(/[?&]cb=\d+(&?)/g, (match, amp) => (amp ? '&' : ''));
    cleanUrl = cleanUrl.replace(/[?&]$/, '');
    const hasQuery = cleanUrl.includes('?');
    return `${cleanUrl}${hasQuery ? '&' : '?'}cb=${cacheBuster}`;
  };

  // MBTI 顏色映射
  const getMbtiColor = (mbti) => {
    const mbtiColors = {
      ISTJ: '#3498db', ISFJ: '#2ecc71', INFJ: '#9b59b6', INTJ: '#1abc9c',
      ISTP: '#e74c3c', ISFP: '#f39c12', INFP: '#d35400', INTP: '#34495e',
      ESTP: '#e67e22', ESFP: '#f1c40f', ENFP: '#2ecc71', ENTP: '#9b59b6',
      ESTJ: '#3498db', ESFJ: '#1abc9c', ENFJ: '#e74c3c', ENTJ: '#f39c12',
    };
    return mbtiColors[mbti?.toUpperCase()] || '#f4c7ab';
  };

  const showModal = (title, message, type = 'error') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  // ==================== 頭像相關 ====================
  const handleAvatarPress = () => {
    if (!user?.avatar || user.avatar.includes('default.png')) {
      handleUploadAvatar();
    } else {
      setShowAvatarActionModal(true);
    }
  };

  const handleUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setUploadErrorMsg('需要相簿權限才能更改頭像');
        setShowUploadError(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      const imageUri = Platform.OS === 'android'
        ? manipResult.uri.replace(/^file:\/\//, 'file:///')
        : manipResult.uri;

      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${api.defaults.baseURL}/api/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: formData,
      });

      if (!response.ok) throw new Error((await response.text()) || '上傳失敗');

      const res = await response.json();

      if (res.success && res.avatar) {
        const updatedAvatar = refreshCacheBuster(res.avatar);
        const updatedUser = { ...user, avatar: updatedAvatar };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        showModal('頭像更新成功', '您的頭像已成功更換！', 'success');
      } else {
        throw new Error(res.error || '上傳失敗');
      }
    } catch (err) {
      console.error('頭像上傳失敗:', err);
      const msg = err.message.includes('timeout') || err.message.includes('超時')
        ? '上傳超時，請檢查網路'
        : err.message || '上傳失敗，請稍後再試';
      setUploadErrorMsg(msg);
      setShowUploadError(true);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${api.defaults.baseURL}/api/delete-avatar`, {
        method: 'DELETE',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });

      if (!response.ok) throw new Error('刪除失敗');

      const res = await response.json();
      if (res.success) {
        const updatedUser = { ...user, avatar: res.avatar };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        showModal('頭像已刪除', '已恢復為預設頭像', 'success');
      }
    } catch (err) {
      showModal('刪除失敗', err.message || '請稍後再試');
    } finally {
      setShowAvatarActionModal(false);
    }
  };

  // ==================== 資料更新 ====================
  const handleUpdate = async () => {
    if (!username.trim() || !email.trim()) {
      showModal('資料不完整', '使用者名稱與電子信箱不能為空');
      return;
    }

    if ((newPassword || confirmPassword) && !currentPassword) {
      showModal('密碼錯誤', '修改密碼時必須輸入目前密碼');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      showModal('密碼太短', '新密碼至少需要 6 個字元');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      showModal('密碼不一致', '新密碼與確認密碼不相符');
      return;
    }

    setLoading(true);

    try {
      await api.put('/api/update-profile', {
        username: username.trim(),
        email: email.trim(),
      });

      if (newPassword && currentPassword) {
        await api.post('/api/change-password', { currentPassword, newPassword });
      }

      const updatedUser = {
        ...user,
        username: username.trim(),
        email: email.trim(),
      };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      showModal('更新成功！', '您的個人資料已儲存', 'success');

      // 清空密碼欄位
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || '更新失敗，請稍後再試';
      showModal('更新失敗', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setModalVisible(false);
    if (modalType === 'success') {
      router.push('/dashboard');
    }
  };

// ==================== MBTI 重置 ====================
const handleResetPress = () => {
  setShowMbtiChoiceModal(false);
  setTimeout(() => setShowResetConfirmModal(true), 300);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

const handleResetMBTI = async () => {
  setShowResetConfirmModal(false);

  try {
    const response = await api.post('/api/game/reset-mbti');

    if (response.data.success) {
      const updatedUser = { ...user, mbti: null };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        showModal(
          '重置成功 ✅',
          'MBTI 類型與遊戲分數已清除\n\n您可以重新進行測試',
          'success'
        );
      }, 450);

    } else {
      showModal('重置失敗', response.data.message || '請稍後再試');
    }
  } catch (error) {
    console.error('重置 MBTI 失敗:', error);
    showModal('重置失敗', '網路連線異常，請稍後再試');
  }
};

  if (!user) return null;

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={28} color="#5c4033" />
              </TouchableOpacity>
              <Text style={styles.title}>編輯個人資料</Text>
              <View style={{ width: 28 }} />
            </View>

            {/* 頭像區塊 */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    {user.avatar ? (
                      <Image
                        source={{ uri: user.avatar }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.avatarText}>{username?.[0]?.toUpperCase() || 'U'}</Text>
                    )}
                  </View>
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={22} color="#5c4033" />
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>點擊頭像更換或刪除</Text>

{/* MBTI 顯示 */}
<View style={styles.mbtiContainer}>
  {user.mbti ? (
    <View style={styles.mbtiRow}>
      {/* 可點擊的 MBTI 徽章 + 資訊圖示 */}
      <TouchableOpacity
        style={[styles.mbtiBadge, { backgroundColor: getMbtiColor(user.mbti) }]}
        onPress={() => setShowMbtiInfoModal(true)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="account-check" size={20} color="#fff" />
        <Text style={styles.mbtiText}>{user.mbti}</Text>
        <Ionicons 
          name="information-circle-outline" 
          size={20} 
          color="#fff" 
          style={styles.infoIcon}
        />
      </TouchableOpacity>

      {/* 重置按鈕 */}
      <TouchableOpacity 
        style={styles.resetBtn} 
        onPress={handleResetPress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="restore" size={22} color="#e74c3c" />
      </TouchableOpacity>
    </View>
  ) : (
    <TouchableOpacity 
      style={styles.mbtiEmptyBtn} 
      onPress={() => setShowMbtiChoiceModal(true)}
    >
      <MaterialCommunityIcons name="brain" size={24} color="#8b5e3c" />
      <Text style={styles.mbtiEmptyText}>完成 MBTI 性格測試</Text>
    </TouchableOpacity>
  )}
</View>
</View>

            {/* 表單區塊 */}
            <View style={styles.form}>
              <Text style={styles.label}>使用者名稱</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="請輸入使用者名稱"
                placeholderTextColor="#c9a88a"
              />

              <Text style={styles.label}>電子信箱</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="example@email.com"
                placeholderTextColor="#c9a88a"
              />

              <Text style={styles.sectionTitle}>修改密碼（選填）</Text>

              <Text style={styles.label}>目前密碼</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="輸入目前密碼"
                  placeholderTextColor="#c9a88a"
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showCurrentPassword ? 'eye-off' : 'eye'} size={22} color="#8b5e3c" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>新密碼</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="至少 6 個字元"
                  placeholderTextColor="#c9a88a"
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={22} color="#8b5e3c" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>確認新密碼</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="再次輸入新密碼"
                  placeholderTextColor="#c9a88a"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#8b5e3c" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleUpdate}
                disabled={loading}
              >
                <Text style={styles.saveText}>{loading ? '儲存中...' : '儲存變更'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ==================== 各種 Modal ==================== */}
      {/* 一般提示 Modal */}
      <Modal isVisible={modalVisible} onBackdropPress={handleModalConfirm} backdropOpacity={0.6}>
        <View style={modalStyles.container}>
          <Text style={[modalStyles.title, modalType === 'success' ? modalStyles.successTitle : modalStyles.errorTitle]}>
            {modalTitle}
          </Text>
          <Text style={modalStyles.message}>{modalMessage}</Text>
          <TouchableOpacity
            style={[modalStyles.button, modalType === 'success' ? modalStyles.successBtn : modalStyles.errorBtn]}
            onPress={handleModalConfirm}
          >
            <Text style={modalStyles.buttonText}>
              {modalType === 'success' ? '返回主頁' : '確定'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 上傳錯誤 Modal */}
      <Modal isVisible={showUploadError} onBackdropPress={() => setShowUploadError(false)}>
        <View style={modalStyles.container}>
          <Text style={modalStyles.errorTitle}>上傳失敗</Text>
          <Text style={modalStyles.message}>{uploadErrorMsg}</Text>
          <TouchableOpacity style={modalStyles.errorBtn} onPress={() => setShowUploadError(false)}>
            <Text style={modalStyles.buttonText}>我知道了</Text>
          </TouchableOpacity>
        </View>
      </Modal>

{/* MBTI 說明 Modal */}
<Modal 
  isVisible={showMbtiInfoModal} 
  onBackdropPress={() => setShowMbtiInfoModal(false)}
  onBackButtonPress={() => setShowMbtiInfoModal(false)}
  backdropOpacity={0.6}
>
  <View style={modalStyles.container}>
    <Text style={modalStyles.title}>關於 MBTI</Text>
    
    <Text style={modalStyles.message}>
      MBTI（邁爾斯-布里格斯類型指標）是一種廣泛使用的人格類型理論，{'\n'}
      將人格分為 16 種不同類型。{'\n\n'}
      每個類型由四個字母組成：{'\n'}
      • E（外向） / I（內向）{'\n'}
      • S（實感） / N（直覺）{'\n'}
      • T（思考） / F（情感）{'\n'}
      • J（判斷） / P（感知）{'\n\n'}
      完成測試後，系統會根據你的性格推薦最適合的朋友！
    </Text>

    <TouchableOpacity
      style={modalStyles.successBtn}
      onPress={() => setShowMbtiInfoModal(false)}
    >
      <Text style={modalStyles.buttonText}>我了解了</Text>
    </TouchableOpacity>
  </View>
</Modal>

      {/* 頭像操作 Action Sheet */}
      <Modal
        isVisible={showAvatarActionModal}
        onBackdropPress={() => setShowAvatarActionModal(false)}
        onSwipeComplete={() => setShowAvatarActionModal(false)}
        swipeDirection={['down']}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={modalStyles.actionSheet}>
          <View style={modalStyles.actionSheetHandle} />

          <TouchableOpacity style={modalStyles.actionItem} onPress={() => { setShowAvatarActionModal(false); handleUploadAvatar(); }}>
            <Ionicons name="camera-outline" size={26} color="#5c4033" />
            <Text style={modalStyles.actionText}>更換頭像</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[modalStyles.actionItem, modalStyles.destructiveItem]} onPress={handleDeleteAvatar}>
            <Ionicons name="trash-outline" size={26} color="#e74c3c" />
            <Text style={[modalStyles.actionText, { color: '#e74c3c' }]}>刪除頭像</Text>
          </TouchableOpacity>

          <TouchableOpacity style={modalStyles.cancelItem} onPress={() => setShowAvatarActionModal(false)}>
            <Text style={modalStyles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MBTI 重置確認 Modal */}
      <Modal isVisible={showResetConfirmModal} onBackdropPress={() => setShowResetConfirmModal(false)}>
        <View style={modalStyles.container}>
          <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#e74c3c" style={{ marginBottom: 16 }} />
          <Text style={modalStyles.title}>確定重置 MBTI？</Text>
          <Text style={modalStyles.message}>
            重置後將清除目前的 MBTI 結果與遊戲關卡分數。{'\n\n'}
            歷史記錄會保留，您可以重新進行測試。
          </Text>

          <View style={styles.resetButtonRow}>
            <TouchableOpacity style={styles.resetCancelBtn} onPress={() => setShowResetConfirmModal(false)}>
              <Text style={styles.resetCancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetConfirmBtn} onPress={handleResetMBTI}>
              <Text style={styles.resetConfirmText}>確定重置</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <MbtiTestChoiceModal visible={showMbtiChoiceModal} onClose={() => setShowMbtiChoiceModal(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  container: { paddingHorizontal: 24, paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#5c4033' },

  avatarSection: { alignItems: 'center', marginBottom: 40 },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { fontSize: 52, fontWeight: '800', color: '#5c4033' },
  cameraIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 3,
    borderColor: '#f4c7ab',
  },
  avatarHint: {
    marginTop: 14,
    color: '#8b5e3c',
    fontSize: 14,
    fontWeight: '500',
  },

  mbtiContainer: { marginTop: 20, width: '100%', alignItems: 'center' },
  mbtiRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  mbtiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  mbtiText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700' 
  },
  infoIcon: {
    marginLeft: 4,
  },

  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fffaf5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },
  mbtiEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    gap: 12,
  },
  mbtiEmptyText: { color: '#5c4033', fontSize: 17, fontWeight: '600' },

  form: { gap: 16 },
  label: { fontSize: 15, color: '#5c4033', fontWeight: '600', marginBottom: 6 },
  sectionTitle: { fontSize: 17, color: '#5c4033', fontWeight: '700', marginTop: 24, marginBottom: 8 },

  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },
  passwordInput: { flex: 1, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, color: '#5c4033' },
  eyeBtn: { padding: 16 },

  saveButton: {
    backgroundColor: '#f4c7ab',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#f4c7ab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: '#5c4033', fontSize: 18, fontWeight: '700' },

  resetButtonRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 20 },
  resetCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#f4c7ab',
    alignItems: 'center',
  },
  resetConfirmBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  resetCancelText: { color: '#5c4033', fontSize: 16, fontWeight: '600' },
  resetConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fffaf5',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#5c4033', marginBottom: 16, textAlign: 'center' },
  successTitle: { color: '#5c4033' },
  errorTitle: { color: '#e74c3c' },
  message: { fontSize: 16, color: '#8b5e3c', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  button: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 24, minWidth: 160, alignItems: 'center' },
  successBtn: { 
    backgroundColor: '#f4c7ab', 
    paddingVertical: 16, 
    paddingHorizontal: 40, 
    borderRadius: 24, 
    minWidth: 160, 
    alignItems: 'center' 
  },
  errorBtn: { backgroundColor: '#e74c3c' },
  buttonText: { color: '#5c4033', fontSize: 17, fontWeight: '700' },

  actionSheet: {
    backgroundColor: '#fffaf5',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  actionSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#f4c7ab',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 8,
  },
  actionText: { fontSize: 18, color: '#5c4033', marginLeft: 16, fontWeight: '600' },
  destructiveItem: { backgroundColor: 'rgba(231, 76, 60, 0.1)' },
  cancelItem: {
    marginTop: 12,
    backgroundColor: '#f4c7ab',
    paddingVertical: 16,
    borderRadius: 24,
  },
  cancelText: { fontSize: 18, fontWeight: '700', color: '#5c4033', textAlign: 'center' },
});