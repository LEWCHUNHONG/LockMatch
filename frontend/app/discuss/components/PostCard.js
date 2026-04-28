// components/PostCard.js
import React, { useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, TouchableWithoutFeedback, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../../utils/api';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';

export default function PostCard({ 
  post, 
  onLikeToggle, 
  onPressComment,
  currentUserId,
  onDelete
}) {
  const router = useRouter();
  const baseURL = api.defaults.baseURL;
  const scaleValue = new Animated.Value(1);

  // Modal states
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);
  const [fullImageIndex, setFullImageIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {

      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;

        if (dx > 80 && currentImageIndex > 0) {
          // 往右滑 → 上一張
          setCurrentImageIndex(prev => prev - 1);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (dx < -80 && currentImageIndex < post.media_urls.length - 1) {
          // 往左滑 → 下一張
          setCurrentImageIndex(prev => prev + 1);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
    })
  ).current;

const handleLikePress = () => {

  Animated.sequence([
    Animated.timing(scaleValue, { toValue: 1.4, duration: 100, useNativeDriver: true }),
    Animated.timing(scaleValue, { toValue: 1, duration: 150, useNativeDriver: true }),
  ]).start();

  if (post.is_liked_by_me) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  onLikeToggle(post.id, !!post.is_liked_by_me);
};

  const handleMorePress = () => {
    setShowOptionsModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleEdit = () => {
    setShowOptionsModal(false);
    router.push(`/discuss/edit?id=${post.id}`);
  };

const confirmDelete = () => {
  setShowOptionsModal(false);

  setTimeout(() => {
    setShowConfirmDeleteModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, 600);
};

  const handleDelete = async () => {
    setShowConfirmDeleteModal(false);
    try {
      const res = await api.delete(`/api/posts/${post.id}`);
      if (res.data.success) {
        setMessageTitle('成功');
        setMessageText('貼文已刪除');
        setShowMessageModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete?.(post.id);
      } else {
        setMessageTitle('失敗');
        setMessageText(res.data.error || '刪除失敗');
        setShowMessageModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error('刪除貼文失敗', err);
      setMessageTitle('錯誤');
      setMessageText('無法刪除貼文，請稍後再試');
      setShowMessageModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleReport = () => {
    setShowOptionsModal(false);
    setMessageTitle('已報告');
    setMessageText('感謝您的回報，我們會審核此內容。');
    setTimeout(() => {
    setShowMessageModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, 600);
  };


  const openFullImage = (index) => {
    setFullImageIndex(index);
    setShowFullImage(true);
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <Image
            source={{ uri: post.avatar?.startsWith('/') ? `${baseURL}${post.avatar}` : post.avatar || 'https://ui-avatars.com/api/?name=User&size=64&background=f4c7ab&color=5c4033' }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{post.username || '匿名'}</Text>
            <Text style={styles.time}>{post.created_at}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn} onPress={handleMorePress}>
            <MaterialCommunityIcons name="dots-horizontal" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {post.content ? <Text style={styles.content}>{post.content}</Text> : null}


		
        {post.media_urls?.length > 0 && (
          <View style={styles.mediaContainer} {...panResponder.panHandlers}>
            {/* 目前顯示的圖片 */}
            <TouchableOpacity onPress={() => openFullImage(currentImageIndex)}>
              <Image
                source={{ uri: `${baseURL}${post.media_urls[currentImageIndex]}` }}
                style={styles.media}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* 只有多張圖片才顯示控制區域 */}
            {post.media_urls.length > 1 && (
              <>
                {/* 左箭頭：只有不是第一張時才顯示 */}
                {currentImageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.arrowButton, styles.leftArrow]}
                    onPress={() => setCurrentImageIndex(prev => prev - 1)}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
                  </TouchableOpacity>
                )}

                {/* 右箭頭：只有不是最後一張時才顯示 */}
                {currentImageIndex < post.media_urls.length - 1 && (
                  <TouchableOpacity
                    style={[styles.arrowButton, styles.rightArrow]}
                    onPress={() => setCurrentImageIndex(prev => prev + 1)}
                  >
                    <MaterialCommunityIcons name="chevron-right" size={32} color="#fff" />
                  </TouchableOpacity>
                )}

                {/* 頁碼指示 */}
                <View style={styles.pageIndicator}>
                  <Text style={styles.pageText}>
                    {currentImageIndex + 1} / {post.media_urls.length}
                  </Text>
                </View>

                {/* 小圓點 */}
                <View style={styles.dotsContainer}>
                  {post.media_urls.map((_, index) => (
                    <TouchableOpacity key={index} onPress={() => setCurrentImageIndex(index)}>
                      <View
                        style={[
                          styles.dot,
                          index === currentImageIndex && styles.activeDot,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress}>
            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
              <MaterialCommunityIcons
                name={post.is_liked_by_me ? 'heart' : 'heart-outline'}
                size={26}
                color={post.is_liked_by_me ? '#ff3366' : '#666'}
              />
            </Animated.View>
            <Text style={[styles.actionCount, post.is_liked_by_me && styles.likedCount]}>
              {post.like_count || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onPressComment?.(post.id)}
          >
            <MaterialCommunityIcons name="comment-outline" size={26} color="#666" />
            <Text style={styles.actionCount}>{post.comment_count || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialCommunityIcons name="repeat-variant" size={26} color="#666" />
            <Text style={styles.actionCount}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialCommunityIcons name="share-outline" size={26} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Options Modal */}
      <Modal
        isVisible={showOptionsModal}
        onBackdropPress={() => setShowOptionsModal(false)}
        onBackButtonPress={() => setShowOptionsModal(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>貼文選項</Text>

          <View style={modalStyles.optionsContainer}>
            {currentUserId && post.user_id === currentUserId ? (
              <>
                <TouchableOpacity
                  style={[modalStyles.optionButton, { backgroundColor: '#f4c7ab' }]}
                  onPress={handleEdit}
                >
                  <Text style={{ color: '#5c4033', fontSize: 16, fontWeight: '700' }}>編輯貼文</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.optionButton, modalStyles.destructiveButton]}
                  onPress={confirmDelete}
                >
                  <Text style={modalStyles.destructiveText}>刪除貼文</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[modalStyles.optionButton, modalStyles.destructiveButton]}
                onPress={handleReport}
              >
                <Text style={modalStyles.destructiveText}>報告貼文</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[modalStyles.optionButton, modalStyles.cancelButton]}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={modalStyles.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isVisible={showConfirmDeleteModal}
        onBackdropPress={() => setShowConfirmDeleteModal(false)}
        onBackButtonPress={() => setShowConfirmDeleteModal(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>確認刪除</Text>
          <Text style={modalStyles.message}>
            確定要刪除這篇貼文嗎？此操作無法復原，且相關評論與讚都會一併移除。
          </Text>
          <View style={modalStyles.buttonRow}>
            <TouchableOpacity
              style={[modalStyles.confirmButtonStyle, modalStyles.cancelButton]}
              onPress={() => setShowConfirmDeleteModal(false)}
            >
              <Text style={modalStyles.cancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.confirmButtonStyle, modalStyles.destructiveButton]}
              onPress={handleDelete}
            >
              <Text style={modalStyles.destructiveText}>刪除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Message Modal */}
      <Modal
        isVisible={showMessageModal}
        onBackdropPress={() => setShowMessageModal(false)}
        onBackButtonPress={() => setShowMessageModal(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>{messageTitle}</Text>
          <Text style={modalStyles.message}>{messageText}</Text>

          <TouchableOpacity
            style={[modalStyles.ReportconfirmButtonStyle, modalStyles.confirmButton]}
            onPress={() => setShowMessageModal(false)}
          >
            <Text style={modalStyles.confirmText}>確認</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 全圖查看 Modal */}
      <Modal
        isVisible={showFullImage}
        onBackdropPress={() => setShowFullImage(false)}
        onBackButtonPress={() => setShowFullImage(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <TouchableWithoutFeedback onPress={() => setShowFullImage(false)}>
          <View style={fullImageStyles.modalContainer}>
            <Image
              source={{ uri: `${baseURL}${post.media_urls[fullImageIndex]}` }}
              style={fullImageStyles.fullImage}
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginVertical: 10,
    marginHorizontal: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  userInfo: { flex: 1 },
  username: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111',
  },
  time: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  moreBtn: {
    padding: 8,
  },
  content: {
    fontSize: 15.5,
    lineHeight: 23,
    color: '#222',
    marginBottom: 12,
  },
  media: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  likedCount: {
    color: '#ff3366',
    fontWeight: '700',
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: 350,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f8f1eb',
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leftArrow: {
    left: 12,
  },
  rightArrow: {
    right: 12,
  },
  pageIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    zIndex: 10,
  },
  pageText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 13,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    zIndex: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(115, 188, 212, 0.4)',
  },
  activeDot: {
    backgroundColor: 'rgba(115, 188, 212, 0.95)',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fffaf5',
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5c4033',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },


  optionsContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  optionButton: {
    width: '85%',
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },


  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
  },
  confirmButtonStyle: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ReportconfirmButtonStyle: {
    width: '80%',
    minHeight: 54,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 6,
  },
  

  destructiveButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButton: {
    backgroundColor: '#f4c7ab',
  },
  confirmButton: {
    backgroundColor: '#f4c7ab',
  },
  destructiveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelText: {
    color: '#5c4033',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmText: {
    color: '#5c4033',
    fontSize: 16,
    fontWeight: '700',
  },
});


const fullImageStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});