// app/discuss/edit.js
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ImageCropPicker from 'react-native-image-crop-picker';
import * as Haptics from 'expo-haptics';
import api from '../../utils/api';
import Modal from 'react-native-modal';

export default function EditPost() {
  const { id } = useLocalSearchParams(); // 從路由獲取 post ID
  const router = useRouter();
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]); // { uri, originalUri, isEditing, isNew, serverUrl (for existing) }
  const [removedImages, setRemovedImages] = useState([]); // 追蹤被刪除或替換的舊圖片 serverUrl
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');

  const baseURL = api.defaults.baseURL;
  const MAX_IMAGES = 10;

  // 載入現有貼文資料
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await api.get(`/api/posts/${id}`);
        if (res.data.success) {
          setContent(res.data.post.content || '');
          const mediaUrls = res.data.post.media_urls || [];
          setImages(mediaUrls.map(url => ({
            uri: `${baseURL}${url}`,
            originalUri: `${baseURL}${url}`,
            isEditing: false,
            isNew: false,
            serverUrl: url, // 用來標記舊媒體
          })));
        } else {
          throw new Error('載入失敗');
        }
      } catch (err) {
        console.error('載入貼文失敗:', err);
        setMessageTitle('錯誤');
        setMessageText('無法載入貼文，請稍後再試');
        setShowMessageModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  // 選擇新圖片 (支援多選)
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
      const result = await ImageCropPicker.openPicker({
        multiple: true,
        maxFiles: MAX_IMAGES - images.length,
        mediaType: 'photo',
        compressImageQuality: 0.92,
        includeBase64: false,
      });

      const newImages = result.map((img) => ({
        uri: img.path,
        originalUri: img.path,
        isEditing: false,
        isNew: true, // 標記為新上傳
      }));

      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      if (err.code !== 'E_PICKER_CANCELLED') {
        console.error('選擇圖片錯誤:', err);
      }
    }
  };

  // 編輯/裁剪特定圖片
  const editImage = async (index) => {
    const img = images[index];
    if (!img) return;

    try {
      const cropped = await ImageCropPicker.openCropper({
        path: img.uri,
        cropperCircleOverlay: false,
        compressImageQuality: 0.88,
        showCropGuidelines: true,
        freeStyleCropEnabled: true,
        includeBase64: false,
      });

      const newImages = [...images];
      // 如果是舊圖片被編輯，將舊 serverUrl 添加到 removedImages
      if (!img.isNew) {
        setRemovedImages((prev) => [...new Set([...prev, img.serverUrl])]);
      }
      newImages[index] = { ...newImages[index], uri: cropped.path, isEditing: true };
      setImages(newImages);
    } catch (err) {
      if (err.code !== 'E_PICKER_CANCELLED') {
        console.error('裁剪錯誤:', err);
      }
    }
  };

  // 恢復原始圖片
  const useOriginal = (index) => {
    const img = images[index];
    if (img.originalUri) {
      const newImages = [...images];
      // 如果是舊圖片並已編輯，移除從 removedImages 的舊 serverUrl
      if (!img.isNew && img.isEditing) {
        setRemovedImages((prev) => prev.filter((url) => url !== img.serverUrl));
      }
      newImages[index] = { ...newImages[index], uri: img.originalUri, isEditing: false };
      setImages(newImages);
    }
  };

  // 刪除圖片 (標記要刪除的舊圖片，或直接移除新圖片)
  const deleteImage = (index) => {
    const img = images[index];
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    // 如果是舊圖片，將 serverUrl 添加到 removedImages
    if (!img.isNew) {
      setRemovedImages((prev) => [...new Set([...prev, img.serverUrl])]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // 提交更新
  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      setMessageTitle('提示');
      setMessageText('至少要寫點文字或選張圖片哦～');
      setShowMessageModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('content', content.trim());

      // 收集要刪除的舊媒體 URL (包括被刪除和被替換的)
      formData.append('removeMedia', JSON.stringify(removedImages));

      // 上傳新/編輯過的圖片
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img.isNew && !img.isEditing) continue; // 舊的未變動跳過

        let mediaUri = img.uri;
        let filename = mediaUri.split('/').pop() || `photo_${Date.now()}_${i}.jpg`;
        let mimeType = 'image/jpeg';

        const manipResult = await ImageManipulator.manipulateAsync(
          mediaUri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        mediaUri = manipResult.uri;
        filename = `post_${i}.jpg`;

        formData.append('media', {
          uri: mediaUri,
          name: filename,
          type: mimeType,
        });
      }

      const res = await api.put(`/api/posts/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setMessageTitle('成功');
        setMessageText('貼文已更新！');
        setShowMessageModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // 更新後導航回詳情頁
        setTimeout(() => router.replace(`/discuss/${id}`), 1500);
      } else {
        throw new Error(res.data.error || '更新失敗');
      }
    } catch (err) {
      console.error('更新貼文失敗:', err);
      setMessageTitle('更新失敗');
      setMessageText(err.message || '請稍後再試');
      setShowMessageModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>編輯貼文</Text>

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
                    <TouchableOpacity style={styles.editButton} onPress={() => editImage(index)}>
                      <MaterialCommunityIcons name="image-edit-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteImage(index)}>
                      <Ionicons name="trash-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {images.length > 0 && (
              <View style={styles.imageControlContainer}>
                <TouchableOpacity style={styles.replaceButton} onPress={pickImages}>
                  <MaterialCommunityIcons name="image-sync" size={20} color="#5c4033" />
                  <Text style={styles.replaceButtonText}>新增/更換圖片</Text>
                </TouchableOpacity>

                {images.some((img) => img.isEditing) && (
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => { /* 批量恢復邏輯 */ }}>
                    <Text style={styles.secondaryButtonText}>恢復所有原圖</Text>
                  </TouchableOpacity>
                )}
              </View>
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

  imagePreviewContainer: {
    position: 'relative',
    marginTop: 16,
    marginBottom: 12,
  },

  preview: {
    width: '100%',
    height: 340,
    borderRadius: 16,
    backgroundColor: '#f8f1eb',
  },

  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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

  imageControlContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },

  replaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#c47c5e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  replaceButtonText: {
    color: '#5c4033',
    fontSize: 16,
    fontWeight: '700',
  },

  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    backgroundColor: 'transparent',
  },

  secondaryButtonText: {
    color: '#8b5e3c',
    fontSize: 15,
    fontWeight: '500',
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
  imagePreviewScroll: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 12, // 图片间距
  },
  preview: {
    width: 200, // 缩小预览宽度，便于横向滚动
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