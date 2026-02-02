// app/profile.js
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from 'react-native-modal';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import api from '../utils/api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mbti, setMbti] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  const router = useRouter();

  // Android 實體返回鍵處理
  useEffect(() => {
    const backAction = () => {
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  // 載入使用者資料並確保 avatar URL 帶有 cache buster
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          let parsed = JSON.parse(storedUser);

          // 確保 avatar 是完整 URL 並刷新 cache buster
          if (parsed.avatar) {
            parsed.avatar = refreshCacheBuster(parsed.avatar);
            await AsyncStorage.setItem('user', JSON.stringify(parsed));
          }

          setUser(parsed);
          setUsername(parsed.username || '');
          setEmail(parsed.email || '');
          setMbti(parsed.mbti || '');
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

  // 先移除舊的 cb 參數（無論是 ?cb= 或 &cb=）
  let cleanUrl = url.replace(/[?&]cb=\d+(&?)/g, (match, amp) => amp ? '&' : '');

  // 移除可能的尾巴 & 或 ?
  cleanUrl = cleanUrl.replace(/[?&]$/, '');

  // 判斷要用 ? 還是 &
  const hasQuery = cleanUrl.includes('?');
  const separator = hasQuery ? '&' : '?';

  return `${cleanUrl}${separator}cb=${cacheBuster}`;
};

  // MBTI 顏色映射
  const getMbtiColor = (mbti) => {
    if (!mbti) return '#f4c7ab';

    const mbtiColors = {
      ISTJ: '#3498db',
      ISFJ: '#2ecc71',
      INFJ: '#9b59b6',
      INTJ: '#1abc9c',
      ISTP: '#e74c3c',
      ISFP: '#f39c12',
      INFP: '#d35400',
      INTP: '#34495e',
      ESTP: '#e67e22',
      ESFP: '#f1c40f',
      ENFP: '#2ecc71',
      ENTP: '#9b59b6',
      ESTJ: '#3498db',
      ESFJ: '#1abc9c',
      ENFJ: '#e74c3c',
      ENTJ: '#f39c12',
    };

    return mbtiColors[mbti.toUpperCase()] || '#f4c7ab';
  };

  const showModal = (title, message, type = 'error') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const handleUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setUploadErrorMsg('需要圖庫權限才能上傳頭像');
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
      formData.append('avatar', {
        uri: manipResult.uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${api.defaults.baseURL}/api/upload-avatar`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.error || '上傳失敗');
      }

      if (res.success && res.avatar) {
        const updatedAvatar = refreshCacheBuster(res.avatar);
        const updatedUser = { ...user, avatar: updatedAvatar };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        throw new Error(res.error || '上傳失敗');
      }
    } catch (err) {
      console.error('頭像上傳錯誤:', err);
      let msg = '上傳失敗，請再試一次';
      if (err.message.includes('Network')) {
        msg = '網路連線問題，請檢查網路後再試';
      }
      setUploadErrorMsg(msg);
      setShowUploadError(true);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${api.defaults.baseURL}/api/delete-avatar`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '刪除失敗');
      }

      const res = await response.json();

      if (res.success && res.avatar) {
        const updatedAvatar = refreshCacheBuster(res.avatar);
        const updatedUser = { ...user, avatar: updatedAvatar };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);

        showModal('成功', '頭像已恢復為預設圖片', 'success');
      }
    } catch (err) {
      console.error('刪除頭像失敗:', err);
      showModal('刪除失敗', err.message || '無法刪除頭像，請再試一次');
    }
  };

  const handleAvatarPress = () => {
    if (!user?.avatar || user.avatar.includes('default.png')) {
      handleUploadAvatar();
    } else {
      setShowAvatarActionModal(true);
    }
  };

  const handleUpdate = async () => {
    if (!username.trim() || !email.trim()) {
      showModal('錯誤', '使用者名稱和信箱不能為空');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      showModal('錯誤', '新密碼與確認密碼不一致');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      showModal('錯誤', '新密碼至少 6 個字元');
      return;
    }

    if (mbti.trim() && !/^[IE][SN][TF][JP]$/i.test(mbti.trim())) {
      showModal('錯誤', 'MBTI 格式錯誤，應為四個字母（如 INFJ）');
      return;
    }

    setLoading(true);

    try {
      const dataToSend = {
        username: username.trim(),
        email: email.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
        mbti: mbti.trim().toUpperCase() || undefined,
      };

      await api.put('/api/update-profile', dataToSend);

      const updatedUser = {
        ...user,
        username: username.trim(),
        email: email.trim(),
        mbti: mbti.trim().toUpperCase() || user.mbti,
      };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      showModal('更新成功！', '您的個人資料已成功儲存', 'success');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      let errorMessage = '請稍後再試';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (errorMessage.includes('目前密碼錯誤')) errorMessage = '目前密碼輸入錯誤';
        if (errorMessage.includes('已被使用')) errorMessage = '此使用者名稱或信箱已被使用';
      } else if (error.request) {
        errorMessage = '網路連線失敗，請檢查您的網路';
      }
      showModal('更新失敗', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    setModalVisible(false);
    if (modalType === 'success') {
      router.back();
    }
  };

  const handleMbtiTest = () => {
    router.push('/mbti-test');
  };

  if (!user) return null;

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.back}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>個人資料</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
                <View style={styles.avatar}>
                  {user.avatar ? (
                    <Image
                      source={{ uri: user.avatar }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                      onError={(e) => console.log('頭像載入失敗:', e.nativeEvent.error, '\nURL:', user.avatar)}
                    />
                  ) : (
                    <Text style={styles.avatarText}>{username[0]?.toUpperCase() || 'U'}</Text>
                  )}
                </View>
                <View style={styles.avatarEditIcon}>
                  <Ionicons name="camera" size={24} color="#5c4033" />
                </View>
              </TouchableOpacity>

              <Text style={styles.avatarHintNew}>點擊頭像編輯</Text>

              {/* MBTI 顯示區域 */}
              <View style={styles.mbtiDisplay}>
                {user.mbti ? (
                  <TouchableOpacity
                    style={[styles.mbtiBadge, { backgroundColor: getMbtiColor(user.mbti) }]}
                    onPress={() => setShowMbtiInfoModal(true)}
                  >
                    <MaterialCommunityIcons name="account-check" size={20} color="#fff" />
                    <Text style={styles.mbtiBadgeText}>{user.mbti}</Text>
                    <Ionicons name="information-circle" size={18} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.mbtiEmpty} onPress={handleMbtiTest}>
                    <MaterialCommunityIcons name="account-question" size={20} color="#8b5e3c" />
                    <Text style={styles.mbtiEmptyText}>進行 MBTI 測試</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>使用者名稱</Text>
              <TextInput style={styles.input} value={username} onChangeText={setUsername} />

              <Text style={styles.label}>電子信箱</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.mbtiInputContainer}>
                <View style={styles.mbtiLabelContainer}>
                  <Text style={styles.label}>MBTI 類型</Text>
                  <TouchableOpacity onPress={() => setShowMbtiInfoModal(true)}>
                    <Ionicons name="information-circle-outline" size={20} color="#8b5e3c" />
                  </TouchableOpacity>
                </View>
                <View style={styles.mbtiInputRow}>
                  <TextInput
                    style={[styles.input, styles.mbtiInput]}
                    value={mbti}
                    onChangeText={setMbti}
                    placeholder="例如: INFJ"
                    maxLength={4}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity style={styles.mbtiTestButton} onPress={handleMbtiTest}>
                    <MaterialCommunityIcons name="gamepad-variant" size={20} color="#5c4033" />
                    <Text style={styles.mbtiTestButtonText}>測試</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>目前密碼（更改密碼時必填）</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="留空表示不更改"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Ionicons name={showCurrentPassword ? 'eye-off' : 'eye'} size={24} color="#8b5e3c" />
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
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={24} color="#8b5e3c" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>確認新密碼</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder=""
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color="#8b5e3c" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                onPress={handleUpdate}
                disabled={loading}
              >
                <Text style={styles.saveText}>{loading ? '儲存中...' : '儲存變更'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* 各種 Modal */}
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => modalType === 'success' && handleModalConfirm()}
        backdropOpacity={0.5}
        animationIn="fadeInUp"
        animationOut="fadeOutDown"
        style={modalStyles.modal}
      >
        <View style={modalStyles.container}>
          <Text style={[modalStyles.title, modalType === 'success' ? modalStyles.successTitle : modalStyles.errorTitle]}>
            {modalTitle}
          </Text>
          <Text style={modalStyles.message}>{modalMessage}</Text>
          <TouchableOpacity
            style={[modalStyles.button, modalType === 'success' ? modalStyles.successButton : modalStyles.errorButton]}
            onPress={handleModalConfirm}
          >
            <Text style={modalStyles.buttonText}>
              {modalType === 'success' ? '返回主頁' : '我知道了'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        isVisible={showUploadError}
        onBackdropPress={() => setShowUploadError(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={modalStyles.container}>
          <Text style={[modalStyles.title, { color: '#e74c3c' }]}>上傳失敗</Text>
          <Text style={modalStyles.message}>{uploadErrorMsg}</Text>
          <TouchableOpacity
            style={[modalStyles.button, { backgroundColor: '#e74c3c' }]}
            onPress={() => setShowUploadError(false)}
          >
            <Text style={modalStyles.buttonText}>確定</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        isVisible={showMbtiInfoModal}
        onBackdropPress={() => setShowMbtiInfoModal(false)}
		onBackButtonPress={() => setShowMbtiInfoModal(false)}
        backdropOpacity={0.5}
        animationIn="fadeInUp"
        animationOut="fadeOutDown"
        style={modalStyles.modal}
      >
        <View style={modalStyles.container}>
          <Text style={[modalStyles.title, { color: '#5c4033' }]}>關於 MBTI</Text>
          <Text style={modalStyles.message}>
            MBTI（邁爾斯-布里格斯類型指標）是一種人格類型理論，將人格分為16種類型。{'\n\n'}
            每個類型由4個字母組成：{'\n'}
            • E（外向）或 I（內向）{'\n'}
            • S（實感）或 N（直覺）{'\n'}
            • T（思考）或 F（情感）{'\n'}
            • J（判斷）或 P（感知）{'\n\n'}
            完成 MBTI 測試後，系統會根據你的性格類型為你推薦最匹配的朋友！
          </Text>
          <TouchableOpacity
            style={[modalStyles.button, { backgroundColor: '#f4c7ab' }]}
            onPress={() => setShowMbtiInfoModal(false)}
          >
            <Text style={modalStyles.buttonText}>我了解了</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        isVisible={showAvatarActionModal}
        onBackdropPress={() => setShowAvatarActionModal(false)}
        onSwipeComplete={() => setShowAvatarActionModal(false)}
        onBackButtonPress={() => setShowAvatarActionModal(false)}
        swipeDirection={['down']}
        swipeThreshold={100}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        avoidKeyboard={true}
        propagateSwipe={true}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={modalStyles.actionSheet}>
          <View style={modalStyles.actionSheetHandle} />

          <TouchableOpacity
            style={modalStyles.actionItem}
            onPress={() => {
              setShowAvatarActionModal(false);
              handleUploadAvatar();
            }}
          >
            <Ionicons name="camera-outline" size={26} color="#5c4033" />
            <Text style={modalStyles.actionText}>更換頭像</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[modalStyles.actionItem, modalStyles.destructiveItem]}
            onPress={() => {
              setShowAvatarActionModal(false);
              handleDeleteAvatar();
            }}
          >
            <Ionicons name="trash-outline" size={26} color="#e74c3c" />
            <Text style={[modalStyles.actionText, { color: '#e74c3c' }]}>刪除頭像</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[modalStyles.actionItem, modalStyles.cancelItem]}
            onPress={() => setShowAvatarActionModal(false)}
          >
            <Text style={modalStyles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  back: { fontSize: 32, color: '#5c4033' },
  title: { fontSize: 26, fontWeight: '800', color: '#5c4033' },
  avatarSection: { alignItems: 'center', marginBottom: 40 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { fontSize: 48, fontWeight: '800', color: '#5c4033' },
  avatarEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fffaf5',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#f4c7ab',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarHintNew: {
    color: '#8b5e3c',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    opacity: 0.8,
  },
  mbtiDisplay: {
    marginTop: 16,
  },
  mbtiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mbtiBadgeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  mbtiEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    borderRadius: 20,
    gap: 10,
    backgroundColor: 'rgba(244, 199, 171, 0.1)',
  },
  mbtiEmptyText: {
    color: '#8b5e3c',
    fontSize: 16,
    fontWeight: '600',
  },
  form: { gap: 8 },
  label: { fontSize: 15, color: '#5c4033', marginTop: 12 },
  mbtiLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mbtiInputContainer: {
    marginBottom: 8,
  },
  mbtiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mbtiInput: {
    flex: 1,
    textTransform: 'uppercase',
  },
  mbtiTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  mbtiTestButtonText: {
    color: '#5c4033',
    fontWeight: '600',
    fontSize: 14,
  },
  input: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, borderWidth: 1, borderColor: '#f4c7ab' },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f4c7ab',
  },
  passwordInput: { flex: 1, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16 },
  eyeButton: { paddingHorizontal: 16, paddingVertical: 16 },
  saveBtn: { backgroundColor: '#f4c7ab', paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginTop: 40 },
  saveText: { color: '#5c4033', fontSize: 18, fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  modal: { justifyContent: 'center', margin: 0 },
  container: {
    backgroundColor: '#fffaf5',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 32,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  successTitle: { color: '#5c4033' },
  errorTitle: { color: '#e74c3c' },
  message: { fontSize: 16, color: '#8b5e3c', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  button: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 24, minWidth: 180, alignItems: 'center' },
  successButton: { backgroundColor: '#f4c7ab' },
  errorButton: { backgroundColor: '#e74c3c' },
  buttonText: { color: '#5c4033', fontSize: 17, fontWeight: '700' },

  actionSheet: {
    backgroundColor: '#fffaf5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 18,
    color: '#5c4033',
    marginLeft: 16,
    fontWeight: '600',
  },
  destructiveItem: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  cancelItem: {
    marginTop: 12,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
    textAlign: 'center',
  },
});