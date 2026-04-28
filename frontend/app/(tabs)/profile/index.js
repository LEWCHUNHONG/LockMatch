// app/(tabs)/profile/index.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';

import api from '../../../utils/api';
import PostCard from '../../../app/discuss/components/PostCard';
import MbtiTestChoiceModal from '../../../components/MbtiTestChoiceModal';

export default function Profile() {
  const router = useRouter();
  const flashListRef = useRef(null);

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal 控制
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success'); // success or error

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMbtiChoiceModal, setShowMbtiChoiceModal] = useState(false);
  const [showMbtiInfoModal, setShowMbtiInfoModal] = useState(false);

  const STATUS_OPTIONS = [
    { id: 'happy',    label: '開心 😊',       emoji: '😊' },
    { id: 'relaxed',  label: '放鬆～ 😌',      emoji: '😌' },
    { id: 'sleepy',   label: '想睡覺 😴',      emoji: '😴' },
    { id: 'excited',  label: '超興奮！🔥',     emoji: '🔥' },
    { id: 'thinking', label: '思考人生 🤔',    emoji: '🤔' },
    { id: 'love',     label: '戀愛中 💕',      emoji: '💕' },
    { id: 'busy',     label: '忙到爆炸 💼',    emoji: '💼' },
    { id: 'coffee',   label: '咖啡續命 ☕',    emoji: '☕' },
    { id: 'clear',    label: '清除狀態',       emoji: '✖️', isClear: true },
  ];

  useFocusEffect(
    useCallback(() => {
      loadUser();
      onRefresh();

      const onBackPress = () => {
        router.replace('/dashboard');
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [router, loadUser, onRefresh])
  );

  const scrollToTop = () => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const getMbtiColor = (mbti) => {
    const mbtiColors = {
      ISTJ: '#3498db', ISFJ: '#2ecc71', INFJ: '#9b59b6', INTJ: '#1abc9c',
      ISTP: '#e74c3c', ISFP: '#f39c12', INFP: '#d35400', INTP: '#34495e',
      ESTP: '#e67e22', ESFP: '#f1c40f', ENFP: '#2ecc71', ENTP: '#9b59b6',
      ESTJ: '#3498db', ESFJ: '#1abc9c', ENFJ: '#e74c3c', ENTJ: '#f39c12',
    };
    return mbtiColors[mbti?.toUpperCase()] || '#f4c7ab';
  };

  const showModal = (title, message, type = 'success') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

const loadUser = useCallback(async () => {
  try {
    const storedToken = await AsyncStorage.getItem('token');
    if (!storedToken) {
      Alert.alert('提示', '請先登入');
      router.replace('/');
      return;
    }

    const res = await api.get('/api/me');

    if (res.data.user) {
      const latestUser = res.data.user;
      setUser(latestUser);
      setCurrentUserId(latestUser.id);
      setTempBio(latestUser.bio || '');

      await AsyncStorage.setItem('user', JSON.stringify(latestUser));
    }
  } catch (err) {
    console.error('載入使用者資料失敗:', err);
    
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setCurrentUserId(parsed.id);
        setTempBio(parsed.bio || '');
      }
    } catch (storageErr) {
      console.error('從 AsyncStorage 載入失敗:', storageErr);
    }
    
    setError('無法載入個人資訊');
  }
}, [router]);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (loading && !isRefresh) return;
    if (!isRefresh && !hasMore) return;

    setLoading(true);
    if (isRefresh) setRefreshing(true);
    setError(null);

    const currentPage = isRefresh ? 0 : page;

    const safeParseMedia = (value, fieldName, postId) => {
      if (Array.isArray(value)) return value;
      if (value == null || value === '') return [];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '' || trimmed === 'null' || trimmed === '[]') return [];
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          if (trimmed !== '[]') {
            console.warn(`貼文 ${postId} ${fieldName} 解析失敗:`, trimmed, e.message);
          }
          return [];
        }
      }
      return [];
    };

    try {
      const res = await api.get('/api/user-posts', {
        params: { limit: 15, offset: currentPage * 15 },
        timeout: 15000,
      });

      let newPosts = res.data.posts || [];

      newPosts = newPosts.map(post => ({
        ...post,
        media_urls: safeParseMedia(post.media_urls, 'media_urls', post.id),
        media_types: safeParseMedia(post.media_types, 'media_types', post.id),
      }));

      if (isRefresh) {
        setPosts(newPosts);
        setPage(1);
        setHasMore(newPosts.length >= 15);
      } else {
        const existingIds = new Set(posts.map(p => p.id));
        const uniqueNew = newPosts.filter(p => !existingIds.has(p.id));
        if (uniqueNew.length === 0) {
          setHasMore(false);
        } else {
          setPosts(prev => [...prev, ...uniqueNew]);
          setPage(currentPage + 1);
          setHasMore(newPosts.length >= 15);
        }
      }
    } catch (err) {
      console.error('載入貼文失敗:', err);
      let msg = '無法載入貼文，請稍後再試';
      if (err.response?.status === 404) msg = '後端路由 /api/user-posts 不存在';
      if (err.response?.status === 401) {
        msg = '登入已過期，請重新登入';
        AsyncStorage.multiRemove(['token', 'user']);
        router.replace('/');
      }
      if (err.code === 'ECONNABORTED') msg = '請求超時，請檢查網路';
      setError(msg);
      Alert.alert('錯誤', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, hasMore, loading, posts, router]);

  const onRefresh = useCallback(() => {
    setHasMore(true);
    setPage(0);
    setPosts([]);
    fetchPosts(true);
  }, [fetchPosts]);

  const handleRetry = () => {
    setError(null);
    onRefresh();
  };

  const handleLikeToggle = async (postId, currentlyLiked) => {
    try {
      await api.post(`/api/posts/${postId}/like`);
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                is_liked_by_me: currentlyLiked ? 0 : 1,
                like_count: currentlyLiked ? p.like_count - 1 : p.like_count + 1,
              }
            : p
        )
      );
    } catch (err) {
      console.error('讚切換失敗:', err);
    }
  };

  const handlePressComment = (postId) => {
    router.push(`/discuss/${postId}`);
  };

  const handleDeletePost = (deletedId) => {
    setPosts(prev => prev.filter(p => p.id !== deletedId));
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setSaving(true);
      const payload = { 
        status: (newStatus === '' || newStatus?.isClear) ? null : newStatus.trim().slice(0, 255) 
      };

      const res = await api.put('/api/update-profile', payload);

      if (res.data.success) {
        const updatedStatus = res.data.user?.status ?? (newStatus === '' ? '' : newStatus);
        setUser(prev => ({ ...prev, status: updatedStatus }));

        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.status = updatedStatus;
          await AsyncStorage.setItem('user', JSON.stringify(parsed));
        }
      }
    } catch (err) {
      Alert.alert('更新失敗', err.response?.data?.error || '請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBio = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const bioToSave = tempBio.trim();

      const res = await api.put('/api/update-profile', { bio: bioToSave || null });

      if (res.data.success) {
        const newBio = res.data.user?.bio ?? bioToSave;
        setUser(prev => ({ ...prev, bio: newBio || '' }));

        // 更新 AsyncStorage
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.bio = newBio || '';
          await AsyncStorage.setItem('user', JSON.stringify(parsed));
        }

        setIsEditingBio(false);

        if (bioToSave === '') {
          showModal('清除成功', '個人簡介已清空', 'success');
        } else {
          showModal('更新成功', '個人簡介已成功儲存', 'success');
        }
      } else {
        showModal('更新失敗', res.data.message || '請稍後再試', 'error');
      }
    } catch (err) {
      console.error('更新 bio 失敗:', err);
      showModal('更新失敗', err.response?.data?.error || '網路異常，請稍後再試', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleModalConfirm = () => {
    setModalVisible(false);
  };

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading && !posts.length) {
    return (
      <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons name="account-circle" size={90} color="#f4c7ab" />
            <Text style={styles.loadingText}>載入個人頁面...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2']} style={styles.gradient}>
          <View style={styles.center}>
            <MaterialCommunityIcons name="alert-circle-outline" size={70} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryText}>重新載入</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <TouchableOpacity onPress={scrollToTop} activeOpacity={0.7}>
            <Text style={styles.headerTitle}>我的</Text>
          </TouchableOpacity>
          <View style={styles.headerRight} />
        </View>

        <FlashList
          ref={flashListRef}
          data={posts}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onLikeToggle={handleLikeToggle}
              onPressComment={handlePressComment}
              currentUserId={currentUserId}
              onDelete={handleDeletePost}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f4c7ab']} />}
          onEndReached={() => fetchPosts(false)}
          onEndReachedThreshold={0.6}
          estimatedItemSize={340}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.profileCard}>
                <TouchableOpacity onPress={() => router.push('/profile/edit')} activeOpacity={0.85}>
                  <Image
                    source={{
                      uri: user?.avatar?.startsWith('http')
                        ? user.avatar
                        : user?.avatar
                          ? `${api.defaults.baseURL}${user.avatar}`
                          : 'https://ui-avatars.com/api/?name=User&size=180&background=f4c7ab&color=5c4033',
                    }}
                    style={styles.avatar}
                  />
                </TouchableOpacity>

                <Text style={styles.username}>{user?.username || '使用者'}</Text>

                <View style={styles.mbtiWrapper}>
                  {user?.mbti ? (
                    <TouchableOpacity
                      style={[styles.mbtiTag, { backgroundColor: getMbtiColor(user.mbti) }]}
                      onPress={() => setShowMbtiInfoModal(true)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="account-check" size={19} color="#fff" />
                      <Text style={styles.mbtiText}>{user.mbti} 型</Text>
                      <Ionicons name="information-circle-outline" size={19} color="#fff" style={styles.infoIcon} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.mbtiTagEmpty}
                      onPress={() => setShowMbtiChoiceModal(true)}
                    >
                      <MaterialCommunityIcons name="brain" size={19} color="#c47c5e" />
                      <Text style={styles.mbtiTextEmpty}>完成 MBTI 性格測試</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.statusContainer}>
                  <Pressable style={styles.statusBox} onPress={() => setShowStatusModal(true)}>
                    {user?.status ? (
                      <Text style={styles.statusText}>{user.status}</Text>
                    ) : (
                      <Text style={styles.statusPlaceholder}>點擊選擇現在的心情 ✨</Text>
                    )}
                    <MaterialCommunityIcons name="pencil" size={18} color="#c47c5e" />
                  </Pressable>
                </View>

                {/* Bio 編輯區塊 */}
                <View style={styles.bioContainer}>
                  {isEditingBio ? (
                    <View style={styles.bioEditContainer}>
                      <TextInput
                        style={styles.bioInput}
                        value={tempBio}
                        onChangeText={setTempBio}
                        placeholder="分享更多關於你的興趣、個性...（留空即可清空簡介）"
                        multiline
                        maxLength={500}
                        autoFocus
                      />
                      <View style={styles.bioButtonRow}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => {
                            setIsEditingBio(false);
                            setTempBio(user?.bio || '');
                          }}
                        >
                          <Text style={styles.cancelText}>取消</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                          onPress={handleSaveBio}
                          disabled={saving}
                        >
                          <Text style={styles.saveText}>
                            {saving ? '儲存中...' : '儲存'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Pressable style={styles.bioBox} onPress={() => setIsEditingBio(true)}>
                      {user?.bio ? (
                        <Text style={styles.bioText}>{user.bio}</Text>
                      ) : (
                        <Text style={styles.bioPlaceholder}>
                          點擊這裡新增個人簡介，讓大家更了解你～
                        </Text>
                      )}
                      <MaterialCommunityIcons name="pencil" size={18} color="#c47c5e" style={styles.bioEditIcon} />
                    </Pressable>
                  )}
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/profile/edit')}>
                  <MaterialCommunityIcons name="pencil-outline" size={20} color="#5c4033" />
                  <Text style={styles.editBtnText}>編輯完整資料</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="post" size={24} color="#c47c5e" />
                <Text style={styles.sectionTitle}>我的貼文</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="comment-text-multiple-outline" size={90} color="#f4c7ab" />
              <Text style={styles.emptyText}>還沒有發佈任何貼文</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/discuss/create')}>
                <MaterialCommunityIcons name="plus-circle" size={22} color="#5c4033" />
                <Text style={styles.createBtnText}>立即發佈貼文</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.flashListContent}
        />

        <Modal
          isVisible={modalVisible}
          onBackdropPress={handleModalConfirm}
          backdropOpacity={0.6}
        >
          <View style={modalStyles.container}>
            <Text style={[modalStyles.title, modalType === 'success' ? modalStyles.successTitle : modalStyles.errorTitle]}>
              {modalTitle}
            </Text>
            <Text style={modalStyles.message}>{modalMessage}</Text>
            <TouchableOpacity
              style={[modalStyles.button, modalType === 'success' ? modalStyles.successBtn : modalStyles.errorBtn]}
              onPress={handleModalConfirm}
            >
              <Text style={modalStyles.buttonText}>確定</Text>
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
              MBTI（邁爾斯-布里格斯類型指標）是一種人格類型理論，將人格分為16種類型。{'\n\n'}
              每個類型由4個字母組成：{'\n'}
              • E（外向）或 I（內向）{'\n'}
              • S（實感）或 N（直覺）{'\n'}
              • T（思考）或 F（情感）{'\n'}
              • J（判斷）或 P（感知）{'\n\n'}
              完成測試後，系統會根據你的性格類型為你推薦最匹配的朋友！
            </Text>

            <TouchableOpacity
              style={modalStyles.successBtn}
              onPress={() => setShowMbtiInfoModal(false)}
            >
              <Text style={modalStyles.buttonText}>我了解了</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <Modal
          isVisible={showStatusModal}
          onBackdropPress={() => setShowStatusModal(false)}
          backdropOpacity={0.5}
          style={{ justifyContent: 'flex-end', margin: 0 }}
        >
          <View style={modalStyles.statusModal}>
            <Text style={modalStyles.statusTitle}>現在的心情是？</Text>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={modalStyles.statusOption}
                onPress={async () => {
                  const newStatus = option.isClear ? '' : option.label;
                  await handleUpdateStatus(newStatus);
                  setShowStatusModal(false);
                }}
              >
                <Text style={{ fontSize: 24 }}>{option.emoji}</Text>
                <Text style={modalStyles.statusOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Modal>

        <MbtiTestChoiceModal 
          visible={showMbtiChoiceModal} 
          onClose={() => setShowMbtiChoiceModal(false)} 
        />

      </SafeAreaView>
    </LinearGradient>
  );
}

/* ====================== 樣式 ====================== */
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,250,245,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244,199,171,0.3)',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#5c4033' },
  headerLeft: { width: 40 },
  headerRight: { width: 40 },

  listHeader: { paddingHorizontal: 16, paddingTop: 12 },

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(244,199,171,0.4)',
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    borderColor: '#fffaf5',
    marginBottom: 16,
  },
  username: { fontSize: 24, fontWeight: '700', color: '#5c4033', marginBottom: 12 },

  mbtiWrapper: { marginBottom: 20, alignItems: 'center' },
  mbtiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  mbtiText: { color: '#fff', fontSize: 16.5, fontWeight: '700' },
  infoIcon: { marginLeft: 4 },
  mbtiTagEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,199,171,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },
  mbtiTextEmpty: { color: '#c47c5e', fontSize: 16, fontWeight: '600' },

  statusContainer: { width: '100%', marginBottom: 20 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,199,171,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(244,199,171,0.4)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 10,
  },
  statusText: { fontSize: 16, color: '#8b5e3c', fontWeight: '600' },
  statusPlaceholder: { fontSize: 15.5, color: '#c47c5e', fontStyle: 'italic' },

  bioContainer: { width: '100%', marginBottom: 24 },
  bioBox: {
    backgroundColor: 'rgba(244,199,171,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(244,199,171,0.35)',
    borderRadius: 20,
    padding: 18,
    minHeight: 100,
    position: 'relative',
  },
  bioText: { fontSize: 15, lineHeight: 23, color: '#5c4033' },
  bioPlaceholder: { fontSize: 15, color: '#c47c5e', fontStyle: 'italic', lineHeight: 23 },
  bioEditIcon: { position: 'absolute', top: 16, right: 16 },

  bioEditContainer: {
    width: '100%',
    backgroundColor: 'rgba(244,199,171,0.06)',
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    borderRadius: 20,
    padding: 16,
  },
  bioInput: {
    width: '100%',
    minHeight: 130,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: '#5c4033',
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  bioButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  cancelText: { color: '#5c4033', fontWeight: '600' },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: '#f4c7ab',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: '#5c4033', fontWeight: '700' },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 8,
  },
  editBtnText: { color: '#5c4033', fontWeight: '700', fontSize: 16 },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033' },

  flashListContent: { paddingBottom: 140 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 18, color: '#8b5e3c', marginTop: 20, marginBottom: 32, textAlign: 'center' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 10,
  },
  createBtnText: { color: '#5c4033', fontSize: 16.5, fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  loadingText: { fontSize: 18, color: '#5c4033', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { marginTop: 20, fontSize: 17, color: '#e74c3c', textAlign: 'center' },
  retryBtn: {
    marginTop: 32,
    backgroundColor: '#f4c7ab',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  retryText: { color: '#5c4033', fontWeight: '700', fontSize: 16 },
});

const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fffaf5',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 24,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#5c4033', 
    marginBottom: 16, 
    textAlign: 'center' 
  },
  message: { 
    fontSize: 16, 
    color: '#8b5e3c', 
    textAlign: 'center', 
    lineHeight: 24, 
    marginBottom: 32 
  },
  successBtn: { 
    backgroundColor: '#f4c7ab', 
    paddingVertical: 16, 
    paddingHorizontal: 48, 
    borderRadius: 24, 
    minWidth: 180, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#5c4033', 
    fontSize: 17, 
    fontWeight: '700' 
  },

  // 心情狀態 Modal 樣式
  statusModal: {
    backgroundColor: '#fffaf5',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    textAlign: 'center',
    marginBottom: 24,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244,199,171,0.3)',
    gap: 16,
  },
  statusOptionText: {
    fontSize: 17,
    color: '#5c4033',
    fontWeight: '500',
  },
});