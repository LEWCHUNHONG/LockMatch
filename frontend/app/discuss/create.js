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
  Vibration,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ImageCropPicker from 'react-native-image-crop-picker';
import * as Haptics from 'expo-haptics';
import api from '../../utils/api';
import Modal from 'react-native-modal';

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]); // 修改为数组，支持多张 { uri, originalUri, isEditing }
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');

  const router = useRouter();
  const MAX_IMAGES = 10; // 最大图片数

  // 选择多张图片
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
      }));

      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      if (err.code !== 'E_PICKER_CANCELLED') {
        console.error('選擇圖片錯誤:', err);
      }
    }
  };

  // 编辑/裁剪特定图片
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
      newImages[index] = { ...newImages[index], uri: cropped.path, isEditing: true };
      setImages(newImages);
    } catch (err) {
      if (err.code !== 'E_PICKER_CANCELLED') {
        console.error('裁剪錯誤:', err);
      }
    }
  };

  // 恢复特定图片的原始版本
  const useOriginal = (index) => {
    const img = images[index];
    if (img.originalUri) {
      const newImages = [...images];
      newImages[index] = { ...newImages[index], uri: img.originalUri, isEditing: false };
      setImages(newImages);
    }
  };

  // 删除特定图片
  const deleteImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      setMessageTitle('提示');
      setMessageText('至少要寫點文字或選張圖片哦～');
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
        let filename = mediaUri.split('/').pop() || `photo_${Date.now()}_${i}.jpg`;
        let mimeType = 'image/jpeg';

        const manipResult = await ImageManipulator.manipulateAsync(
          mediaUri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        mediaUri = manipResult.uri;
        filename = `post_${i}.jpg`;

        const lowerName = filename.toLowerCase();
        if (lowerName.endsWith('.png')) mimeType = 'image/png';
        else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
        else if (lowerName.endsWith('.gif')) mimeType = 'image/gif';

        formData.append('media', {
          uri: mediaUri,
          name: filename,
          type: mimeType,
        });
      }

      const token = await AsyncStorage.getItem('token');

      const upload = async () => {
        const response = await fetch(`${api.defaults.baseURL}/api/posts`, {
          method: 'POST',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `伺服器回應 ${response.status}`);
        }

        return await response.json();
      };

      let res;
      try {
        res = await upload();
      } catch (err) {
        if (
          err.message.includes('Network request failed') ||
          err.message.includes('Network') ||
          err.message.includes('failed to fetch')
        ) {
          console.log('第一次上傳失敗，正在自動重試...');
          res = await upload();
        } else {
          throw err;
        }
      }

      if (res.success) {
        setMessageTitle('成功');
        setMessageText('貼文已發佈！');
        setShowMessageModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // 重置表单
        setContent('');
        setImages([]);
      } else {
        throw new Error(res.error || '發文失敗');
      }
    } catch (err) {
      console.error('發文失敗完整錯誤:', err);
      setMessageTitle('發文失敗');
      setMessageText(err.message || '請稍後再試');
      setShowMessageModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
              onPress={() => {
                setShowMessageModal(false);
				router.replace('/discuss');
              }}
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