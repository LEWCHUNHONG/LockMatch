// app/discuss/edit.js (Expo Go 兼容版)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../utils/api';
import Modal from 'react-native-modal';

export default function EditPost() {
  const params = useLocalSearchParams();
  const router = useRouter();

  // 獲取貼文 ID（支援多種參數名稱）
  const id = params.id || params.postId || params.post_id;

  const [content, setContent] = useState('');
  const [images, setImages] = useState([]); // { uri, originalUri, isNew, serverUrl }
  const [removedImages, setRemovedImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [postExists, setPostExists] = useState(false);

  // Modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');

  const baseURL = api.defaults.baseURL;
  const MAX_IMAGES = 10;

  // 載入現有貼文資料
  useEffect(() => {
    if (!id) {
      Alert.alert('錯誤', '找不到貼文編號');
      router.back();
      return;
    }

    const loadPost = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        const response = await fetch(`${baseURL}/api/posts/${id}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.post) {
            const post = data.post;
            setContent(post.content || '');

            // 處理圖片
            const mediaUrls = post.media_urls || [];
            const loadedImages = mediaUrls.map(url => ({
              uri: url.startsWith('http') ? url : `${baseURL}${url}`,
              originalUri: url.startsWith('http') ? url : `${baseURL}${url}`,
              isNew: false,
              serverUrl: url,
            }));

            setImages(loadedImages);
            setPostExists(true);
          } else {
            throw new Error(data.error || '貼文資料不完整');
          }
        } else {
          const errorText = await response.text();
          let errorMessage = '載入失敗';

          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) errorMessage = errorData.error;
          } catch (e) { }

          if (response.status === 404) {
            errorMessage = '找不到此貼文';
          } else if (response.status === 401) {
            errorMessage = '請先登入';
          } else if (response.status === 403) {
            errorMessage = '沒有權限編輯此貼文';
          }

          Alert.alert('錯誤', errorMessage);
          router.back();
        }
      } catch (error) {
        console.error('載入錯誤:', error);
        Alert.alert('網路錯誤', '請檢查網路連線');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

  // 選擇新圖片（使用 expo-image-picker）
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setMessageTitle('需要權限');
      setMessageText('請允許存取相簿');
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
          isNew: true,
        }));
        setImages((prev) => [...prev, ...newImages]);
      }
    } catch (err) {
      console.error('選擇圖片錯誤:', err);
    }
  };

  // 刪除圖片
  const deleteImage = (index) => {
    const img = images[index];
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);

    // 如果是舊圖片，添加到要刪除的列表
    if (!img.isNew && img.serverUrl) {
      setRemovedImages((prev) => [...new Set([...prev, img.serverUrl])]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // 提交更新
  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      Alert.alert('提示', '至少要寫點文字或選張圖片哦～');
      return;
    }

    setSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();

      // 確保內容為字串
      formData.append('content', content.trim() || '');

      // 收集要刪除的舊媒體 URL
      if (removedImages.length > 0) {
        formData.append('removeMedia', JSON.stringify(removedImages));
      }

      // 上傳新圖片
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        // 只上傳新圖片
        if (img.isNew) {
          let mediaUri = img.uri;

          // 壓縮圖片
          const manipResult = await ImageManipulator.manipulateAsync(
            mediaUri,
            [{ resize: { width: 1200 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          mediaUri = manipResult.uri;

          formData.append('media', {
            uri: mediaUri,
            name: `post_${Date.now()}_${i}.jpg`,
            type: 'image/jpeg',
          });
        }
      }

      console.log('提交更新，ID:', id);
      console.log('內容:', content.trim());
      console.log('刪除圖片:', removedImages.length);
      console.log('上傳圖片:', images.filter(img => img.isNew).length);

      const response = await fetch(`${baseURL}/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      console.log('更新回應狀態:', response.status);

      const responseText = await response.text();
      console.log('更新回應內容:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('解析 JSON 失敗:', e);
        throw new Error('伺服器回應格式錯誤');
      }

      if (response.ok && data.success) {
        // 更新成功
        Alert.alert('成功', data.message || '貼文已更新！', [
          {
            text: '確定',
            onPress: () => {
              router.replace(`/discuss/${id}`);
            }
          }
        ]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // 處理失敗情況
        let errorMessage = '更新失敗';
        let errorTitle = '更新失敗';

        if (data.error) errorMessage = data.error;
        if (data.message) errorMessage = data.message;

        // 特別處理內容審核失敗的情況
        if (response.status === 403) {
          errorTitle = '內容不恰當';
          if (data.error && data.error.includes('審核')) {
            errorMessage = data.message || '您的言論包含不當內容，無法更新';
          }
          if (data.details?.reasons) {
            errorMessage += '\n\n原因: ' + data.details.reasons.join(', ');
          }
          if (data.details?.suggestion) {
            errorMessage += '\n\n建議: ' + data.details.suggestion;
          }
        } else if (response.status === 404) {
          errorTitle = '錯誤';
          errorMessage = '貼文不存在或已被刪除';
        } else if (response.status === 400) {
          errorTitle = '輸入錯誤';
        } else if (response.status === 500) {
          errorTitle = '伺服器錯誤';
          errorMessage = '伺服器暫時出現問題，請稍後再試';
        }

        Alert.alert(errorTitle, errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('更新錯誤:', error);
      Alert.alert('更新錯誤', error.message || '請檢查網路連線後再試');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#f4c7ab" />
      </SafeAreaView>
    );
  }

  if (!postExists) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>無法載入貼文</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>編輯貼文</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
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

            {/* Character count */}
            <Text style={styles.charCount}>{content.length} 字元</Text>

            {/* Image preview */}
            {images.length > 0 && (
              <View style={styles.imagesContainer}>
                <Text style={styles.imagesTitle}>圖片 ({images.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                  {images.map((img, index) => (
                    <View key={index} style={styles.imagePreviewContainer}>
                      <Image source={{ uri: img.uri }} style={styles.preview} />

                      {/* Delete button */}
                      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteImage(index)}>
                        <Ionicons name="trash-outline" size={22} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Add image button */}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.imageBtn} onPress={pickImages}>
                <MaterialCommunityIcons name="image-plus" size={26} color="#f4c7ab" />
                <Text style={styles.imageBtnText}>新增圖片 ({images.length}/{MAX_IMAGES})</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Submit button */}
        <View style={styles.bottomSubmitContainer}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fffaf5" size="small" />
            ) : (
              <Text style={styles.submitText}>更 新</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Message Modal */}
      <Modal
        isVisible={showMessageModal}
        onBackdropPress={() => setShowMessageModal(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>{messageTitle}</Text>
          <Text style={modalStyles.message}>{messageText}</Text>
          <View style={modalStyles.buttonRow}>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.confirmButton]}
              onPress={() => setShowMessageModal(false)}
            >
              <Text style={modalStyles.confirmText}>確認</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 樣式部分保持 edit.js 中的原有樣式，僅刪除了 editButton 和 originalButton 相關樣式
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
  charCount: {
    marginTop: 8,
    fontSize: 14,
    color: '#a0785e',
    textAlign: 'right',
  },
  imagesContainer: {
    marginTop: 16,
  },
  imagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
    marginBottom: 12,
  },
  imagePreviewScroll: {
    flexDirection: 'row',
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
    top: 8,
    right: 8,
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
    marginTop: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ff4444',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#5c4033',
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
  confirmButton: {
    backgroundColor: '#f4c7ab',
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#5c4033',
  },
});