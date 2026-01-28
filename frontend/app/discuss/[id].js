// app/discuss/[id].js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Vibration,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../utils/api';
import PostCard from './components/PostCard';
import Modal from 'react-native-modal';

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDeleteCommentModal, setShowConfirmDeleteCommentModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [commentToDelete, setCommentToDelete] = useState(null);

  const baseURL = api.defaults.baseURL;

  // 共用：載入貼文 + 留言
  const fetchPostAndComments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [postRes, commentsRes] = await Promise.all([
        api.get(`/api/posts/${id}`),
        api.get(`/api/posts/${id}/comments`),
      ]);

      setPost(postRes.data.post);
      setComments(commentsRes.data.comments || []);
    } catch (err) {
      console.error('載入/刷新失敗:', err);
      if (!isRefresh) {
        setErrorTitle('錯誤');
        setErrorMessage('無法載入貼文或評論，請稍後再試');
        setShowErrorModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const onRefresh = useCallback(() => {
    fetchPostAndComments(true);
  }, [fetchPostAndComments]);

  // 載入當前使用者資訊
  const loadCurrentUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await api.get('/api/me');
      if (res.data?.user) {
        setCurrentUserId(res.data.user.id);
      }
    } catch (err) {
      console.warn('無法獲取當前用戶資訊', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCurrentUser();
      fetchPostAndComments(false);
    }, [loadCurrentUser, fetchPostAndComments])
  );

  // 讚切換
  const handleLikeToggle = async (postId, currentlyLiked) => {
    try {
      await api.post(`/api/posts/${postId}/like`);
      setPost((prev) => ({
        ...prev,
        is_liked_by_me: currentlyLiked ? 0 : 1,
        like_count: currentlyLiked ? prev.like_count - 1 : prev.like_count + 1,
      }));
    } catch (err) {
      console.error('讚切換失敗', err);
    }
  };

  // 送出新留言
  const handleAddComment = async () => {
    if (!commentContent.trim()) {
      setErrorTitle('提示');
      setErrorMessage('請輸入評論內容');
      setShowErrorModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/api/posts/${id}/comment`, {
        content: commentContent.trim(),
      });

      if (res.data.success) {
        setCommentContent('');
        await fetchPostAndComments(false);

        setMessageTitle('成功');
        setMessageText('留言已發布');
        setShowMessageModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error('發布留言失敗', err);
      setErrorTitle('錯誤');
      setErrorMessage('發布失敗，請稍後再試');
      setShowErrorModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } finally {
      setSubmitting(false);
    }
  };

  // 刪除留言相關
  const handleDeleteCommentPress = (commentId) => {
    setCommentToDelete(commentId);
    setShowConfirmDeleteCommentModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const executeDeleteComment = async () => {
    if (!commentToDelete) return;
    setShowConfirmDeleteCommentModal(false);

    try {
      const res = await api.delete(`/api/posts/${id}/comments/${commentToDelete}`);
      if (res.data.success) {
        await fetchPostAndComments(false);
        setMessageTitle('成功');
        setMessageText('評論已刪除');
        setShowMessageModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        throw new Error(res.data.error || '刪除失敗');
      }
    } catch (err) {
      console.error('刪除評論失敗', err);
      setMessageTitle('錯誤');
      setMessageText('刪除失敗，請稍後再試');
      setShowMessageModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } finally {
      setCommentToDelete(null);
    }
  };

  // 時間格式化
  const timeAgo = (dateString) => {
    if (!dateString) return '未知時間';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins <= 1) return '剛剛';
    if (diffMins < 60) return `${diffMins}分鐘前`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}小時前`;

    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#f4c7ab" />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>
          貼文不存在或已被刪除
        </Text>
      </SafeAreaView>
    );
  }

  // FlashList Header：貼文 + 評論標題
  const ListHeader = () => (
    <>
      <View style={styles.postContainer}>
        <PostCard
          post={post}
          onLikeToggle={handleLikeToggle}
          currentUserId={currentUserId}
          onDelete={() => router.back()}
        />
      </View>

      <View style={styles.commentsHeader}>
        <Text style={styles.commentsTitle}>
          評論 {post.comment_count ? `(${post.comment_count})` : ''}
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
        style={styles.gradient}
      >
        {/* 頂部導航 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>貼文詳情</Text>
          <View style={styles.headerRight} />
        </View>

        {/* 主內容：FlashList */}
        <FlashList
          data={comments}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.commentCard}>
              <Image
                source={{
                  uri:
                    item.avatar?.startsWith('/')
                      ? `${baseURL}${item.avatar}`
                      : item.avatar ||
                        'https://ui-avatars.com/api/?name=User&size=64&background=f4c7ab&color=5c4033',
                }}
                style={styles.commentAvatar}
              />
              <View style={styles.commentInfo}>
                <Text style={styles.commentUsername}>{item.username || '匿名用戶'}</Text>
                <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
                <Text style={styles.commentContent}>{item.content}</Text>
              </View>

              {item.user_id === currentUserId && (
                <TouchableOpacity
                  style={{ marginLeft: 'auto', padding: 8 }}
                  onPress={() => handleDeleteCommentPress(item.id)}
                >
                  <MaterialCommunityIcons name="delete" size={20} color="#8b5e3c" />
                </TouchableOpacity>
              )}
            </View>
          )}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <Text style={styles.emptyComments}>還沒有評論，來寫第一則吧～</Text>
          }
          estimatedItemSize={110}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f4c7ab"
              colors={['#f4c7ab', '#e89b6e', '#d68a5a']}
              progressBackgroundColor="#fffaf5"
            />
          }
          contentContainerStyle={styles.listContent}
        />

        {/* 底部輸入框 */}
        <View style={styles.bottomInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="添加評論..."
            placeholderTextColor="#a0785e"
            value={commentContent}
            onChangeText={setCommentContent}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!commentContent.trim() || submitting) && styles.sendBtnDisabled,
            ]}
            onPress={handleAddComment}
            disabled={submitting || !commentContent.trim()}
          >
            {submitting ? (
              <ActivityIndicator color="#fffaf5" size="small" />
            ) : (
              <Ionicons name="send" size={24} color="#fffaf5" />
            )}
          </TouchableOpacity>
        </View>

        {/* 各種 Modal */}
{/* 錯誤 Modal */}
<Modal isVisible={showErrorModal} onBackdropPress={() => setShowErrorModal(false)}
onBackButtonPress={() => setShowErrorModal(false)}>
  <View style={modalStyles.container}>
    <Text style={modalStyles.title}>{errorTitle}</Text>
    <Text style={modalStyles.message}>{errorMessage}</Text>
    <TouchableOpacity
      style={[modalStyles.actionButton, modalStyles.confirmButton]}
      onPress={() => setShowErrorModal(false)}
    >
      <Text style={[modalStyles.buttonText, modalStyles.confirmText]}>確認</Text>
    </TouchableOpacity>
  </View>
</Modal>

{/* 成功 Modal */}
<Modal isVisible={showMessageModal} onBackdropPress={() => setShowMessageModal(false)}
onBackButtonPress={() => setShowMessageModal(false)}>
  <View style={modalStyles.container}>
    <Text style={modalStyles.title}>{messageTitle}</Text>
    <Text style={modalStyles.message}>{messageText}</Text>
    <TouchableOpacity
      style={[modalStyles.actionButton, modalStyles.confirmButton]}
      onPress={() => setShowMessageModal(false)}
    >
      <Text style={[modalStyles.buttonText, modalStyles.confirmText]}>確認</Text>
    </TouchableOpacity>
  </View>
</Modal>

{/* del comment Modal */}
<Modal
  isVisible={showConfirmDeleteCommentModal}
  onBackdropPress={() => setShowConfirmDeleteCommentModal(false)}
  onBackButtonPress={() => setShowConfirmDeleteCommentModal(false)}
>
  <View style={modalStyles.container}>
    <Text style={modalStyles.title}>確認刪除</Text>
    <Text style={modalStyles.message}>
      確定要刪除這則評論嗎？此操作無法復原。
    </Text>
    <View style={modalStyles.buttonRow}>
      <TouchableOpacity
        style={[modalStyles.actionButton, modalStyles.cancelButton]}
        onPress={() => setShowConfirmDeleteCommentModal(false)}
      >
        <Text style={[modalStyles.buttonText, modalStyles.cancelText]}>取消</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[modalStyles.actionButton, modalStyles.destructiveButton]}
        onPress={executeDeleteComment}
      >
        <Text style={[modalStyles.buttonText, modalStyles.destructiveText]}>刪除</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

{/* confirm message Modal */}
<Modal isVisible={showMessageModal} onBackdropPress={() => setShowMessageModal(false)}
onBackButtonPress={() => setShowMessageModal(false)}>
  <View style={modalStyles.container}>
    <Text style={modalStyles.title}>{messageTitle}</Text>
    <Text style={modalStyles.message}>{messageText}</Text>
    <TouchableOpacity
      style={[modalStyles.actionButton, modalStyles.confirmButton]}
      onPress={() => setShowMessageModal(false)}
    >
      <Text style={[modalStyles.buttonText, modalStyles.confirmText]}>確認</Text>
    </TouchableOpacity>
  </View>
</Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fffaf5' },
  gradient: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 250, 245, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.3)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5c4033',
  },
  headerRight: { width: 44 },

  postContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  commentsHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  commentsTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#5c4033',
  },

  commentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f4c7ab',
  },
  commentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  commentInfo: { flex: 1 },
  commentUsername: { fontWeight: '700', fontSize: 15, color: '#111' },
  commentTime: { fontSize: 12, color: '#888', marginTop: 1, marginBottom: 4 },
  commentContent: { fontSize: 15, color: '#222', lineHeight: 21 },

  emptyComments: {
    textAlign: 'center',
    color: '#a0785e',
    fontSize: 16,
    marginTop: 40,
    paddingHorizontal: 30,
  },

  listContent: {
    paddingBottom: 100, // 為底部輸入欄預留空間
  },

  bottomInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fffaf5',
    borderTopWidth: 1,
    borderTopColor: '#f4c7ab',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#f4c7ab',
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: '#f4c7ab',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fffaf5',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginHorizontal: 32,           // 稍微縮小外邊距，增加內部空間
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5c4033',
    marginBottom: 16,
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
    gap: 16,                        // 兩個按鈕間距加大一點
    justifyContent: 'center',
  },
  // 共用按鈕基礎樣式
  actionButton: {
    paddingHorizontal: 32,          // 左右內距決定按鈕寬度
    paddingVertical: 14,
    minWidth: 120,                  // 保證至少這個寬，不會太窄
    maxWidth: 180,                  // 防止太大頂到邊
    minHeight: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#f4c7ab',
  },
  confirmButton: {
    backgroundColor: '#f4c7ab',
  },
  destructiveButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  confirmText: {
    color: '#5c4033',
  },
  cancelText: {
    color: '#5c4033',
  },
  destructiveText: {
    color: '#fff',
  },
});