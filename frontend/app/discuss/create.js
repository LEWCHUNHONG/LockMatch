// app/discuss/create.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import api from '../../utils/api';
import Modal from 'react-native-modal';

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [modalType, setModalType] = useState('success'); // 'success', 'error'

  const router = useRouter();
  const MAX_IMAGES = 10;

  // 選擇多張圖片（使用 expo-image-picker）
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setMessageTitle('需要權限');
      setMessageText('請允許存取相簿');
      setModalType('error');
      setShowMessageModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - images.length,
        quality: 0.92,
        base64: false,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          originalUri: asset.uri,
        }));
        setImages((prev) => [...prev, ...newImages]);
      }
    } catch (err) {
      console.error('選擇圖片錯誤:', err);
    }
  };

  // 刪除特定圖片
  const deleteImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      setMessageTitle('提示');
      setMessageText('至少要寫點文字或選張圖片哦～');
      setModalType('error');
      setShowMessageModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('content', content.trim());

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        let mediaUri = img.uri;

        // 壓縮圖片
        const manipResult = await ImageManipulator.manipulateAsync(
          mediaUri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        mediaUri = manipResult.uri;
        const filename = `post_${Date.now()}_${i}.jpg`;

        formData.append('media', {
          uri: mediaUri,
          name: filename,
          type: 'image/jpeg',
        });
      }

      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${api.defaults.baseURL}/api/posts`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('解析 JSON 失敗:', e);
        throw new Error('伺服器回應格式錯誤');
      }

      if (response.ok && data.success) {
        setMessageTitle('成功');
        setMessageText('貼文已發佈！');
        setModalType('success');
        setShowMessageModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // 重置表单
        setContent('');
        setImages([]);
      } else {
        let errorMsg = '發文失敗，請稍後再試';
        let errorTitle = '發文失敗';

        if (data.error) errorMsg = data.error;
        if (data.message) errorMsg = data.message;

        // 內容審核失敗
        if (response.status === 403 || (data.error && data.error.includes('審核'))) {
          errorTitle = '內容不恰當';
          errorMsg = data.message || '您的言論包含不當內容，無法發佈';
          if (data.details?.reasons) {
            errorMsg += '\n\n原因: ' + data.details.reasons.join(', ');
          }
          if (data.details?.suggestion) {
            errorMsg += '\n\n建議: ' + data.details.suggestion;
          }
        }

        setMessageTitle(errorTitle);
        setMessageText(errorMsg);
        setModalType('error');
        setShowMessageModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error('發文失敗:', err);
      let errorMessage = err.message || '請稍後再試';
      if (err.message.includes('Network')) {
        errorMessage = '網路連線不穩定，請檢查網路後再試';
      } else if (err.message.includes('伺服器') || err.message.includes('500')) {
        errorMessage = '伺服器暫時出現問題，請稍後再試';
      }

      setMessageTitle('發文失敗');
      setMessageText(errorMessage);
      setModalType('error');
      setShowMessageModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>撰寫貼文</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="分享你的想法..."
              placeholderTextColor="#a0785e"
              multiline
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />

            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                {images.map((img, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                    <Image source={{ uri: img.uri }} style={styles.preview} />
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteImage(index)}>
                      <Ionicons name="trash-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.imageBtn} onPress={pickImages}>
                <MaterialCommunityIcons name="image-plus" size={26} color="#f4c7ab" />
                <Text style={styles.imageBtnText}>新增圖片 ({images.length}/{MAX_IMAGES})</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={styles.bottomSubmitContainer}>
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fffaf5" size="small" />
            ) : (
              <Text style={styles.submitText}>發 布</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* 簡單彈窗 */}
      <Modal
        isVisible={showMessageModal}
        onBackdropPress={() => setShowMessageModal(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={[
          modalStyles.container,
          modalType === 'success' ? modalStyles.successContainer : modalStyles.errorContainer
        ]}>
          <View style={modalStyles.iconContainer}>
            {modalType === 'success' ? (
              <MaterialCommunityIcons name="check-circle" size={50} color="#2e7d32" />
            ) : (
              <MaterialCommunityIcons name="alert-circle" size={50} color="#d32f2f" />
            )}
          </View>
          <Text style={modalStyles.title}>{messageTitle}</Text>
          <Text style={modalStyles.message}>{messageText}</Text>
          <View style={modalStyles.buttonRow}>
            <TouchableOpacity
              style={[
                modalStyles.button,
                modalType === 'success' ? modalStyles.successButton : modalStyles.errorButton
              ]}
              onPress={() => {
                setShowMessageModal(false);
                if (modalType === 'success') {
                  router.replace('/discuss');
                }
              }}
            >
              <Text style={modalStyles.buttonText}>確認</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffaf5',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 250, 245, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.3)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5c4033',
  },
  headerRight: {
    width: 44,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 180,
  },
  inputCard: {
    backgroundColor: '#fffaf5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  input: {
    minHeight: 140,
    fontSize: 16,
    color: '#5c4033',
    paddingTop: 4,
  },
  imagePreviewScroll: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: '#f8f1eb',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.65)',
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(244,199,171,0.18)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,199,171,0.4)',
  },
  imageBtnText: {
    color: '#8b5e3c',
    fontWeight: '600',
    fontSize: 15,
  },
  bottomSubmitContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  submitBtn: {
    backgroundColor: '#f4c7ab',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#c47c5e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#5c4033',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fffaf5',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    marginHorizontal: 24,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  successContainer: {
    borderTopWidth: 6,
    borderTopColor: '#2e7d32',
  },
  errorContainer: {
    borderTopWidth: 6,
    borderTopColor: '#d32f2f',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButton: {
    backgroundColor: '#4caf50',
  },
  errorButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});