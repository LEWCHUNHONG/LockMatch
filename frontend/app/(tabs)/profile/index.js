// app/(tabs)/profile/index.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
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

  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempStatus, setTempStatus] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [saving, setSaving] = useState(false);
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

      onRefresh();

      const onBackPress = () => {
        router.replace('/dashboard');
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [router])
  );

  const scrollToTop = () => {
    if (flashListRef.current) {
      flashListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const getMbtiColor = (mbti) => {
    if (!mbti) return '#f4c7ab';
    
    const mbtiColors = {
      'ISTJ': '#3498db', 'ISFJ': '#2ecc71', 'INFJ': '#9b59b6', 'INTJ': '#1abc9c',
      'ISTP': '#e74c3c', 'ISFP': '#f39c12', 'INFP': '#d35400', 'INTP': '#34495e',
      'ESTP': '#e67e22', 'ESFP': '#f1c40f', 'ENFP': '#2ecc71', 'ENTP': '#9b59b6',
      'ESTJ': '#3498db', 'ESFJ': '#1abc9c', 'ENFJ': '#e74c3c', 'ENTJ': '#f39c12'
    };
    
    return mbtiColors[mbti.toUpperCase()] || '#f4c7ab';
  };

  const loadUser = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (!storedToken) {
        Alert.alert('提示', '請先登入');
        router.replace('/');
        return;
      }

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setCurrentUserId(parsed.id);
        setTempStatus(parsed.status || '');
        setTempBio(parsed.bio || '');
      }
    } catch (err) {
      console.error('載入使用者資料失敗:', err);
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

  // 下拉刷新 & 切換 Tab 時使用的刷新函式
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

  const handlePressComment = postId => {
    router.push(`/discuss/${postId}`);
  };

  const handleDeletePost = deletedId => {
    setPosts(prev => prev.filter(p => p.id !== deletedId));
  };

  // 儲存 status
  const handleSaveStatus = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.put('/api/update-profile', {
        status: tempStatus.trim() || undefined,
      });

      if (res.data.success) {
        const newStatus = res.data.user?.status ?? tempStatus.trim();
        setUser(prev => ({ ...prev, status: newStatus }));

        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.status = newStatus;
          await AsyncStorage.setItem('user', JSON.stringify(parsed));
        }

        setIsEditingStatus(false);
      }
    } catch (err) {
      Alert.alert('錯誤', err.response?.data?.error || '更新狀態失敗');
    } finally {
      setSaving(false);
    }
  };

  // 儲存 bio
  const handleSaveBio = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = { bio: tempBio.trim() };
      const res = await api.put('/api/update-profile', payload);

      if (res.data.success) {
        const newBio = res.data.user?.bio ?? tempBio.trim();
        setUser(prev => {
          const updated = { ...prev, bio: newBio };
          AsyncStorage.setItem('user', JSON.stringify(updated))
            .catch(e => console.error('AsyncStorage 更新 bio 失敗', e));
          return updated;
        });
        setIsEditingBio(false);
      }
    } catch (err) {
      console.error('更新 bio 失敗:', err);
      Alert.alert('錯誤', err.response?.data?.error || '更新簡介失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setSaving(true);
      let payload = {};

      if (newStatus === null || newStatus === '' || (typeof newStatus === 'string' && newStatus.trim() === '')) {
        payload.status = null;
      } else {
        payload.status = newStatus.trim().slice(0, 255);
      }

      const res = await api.put('/api/update-profile', payload, { timeout: 10000 });

      if (res.data.success) {
        const updatedStatus = res.data.user?.status !== undefined 
          ? (res.data.user.status || '') 
          : (newStatus === null || newStatus === '' ? '' : newStatus.trim() || '');

        setUser(prev => ({ ...prev, status: updatedStatus }));

        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.status = updatedStatus;
          await AsyncStorage.setItem('user', JSON.stringify(parsed));
        }
      } else {
        throw new Error(res.data.error || res.data.message || '後端回應失敗');
      }
    } catch (err) {
      console.error('[handleUpdateStatus] 更新狀態發生錯誤:', err);
      let errorMessage = '更新狀態失敗，請稍後再試';
      if (err.response) {
        errorMessage = err.response.data?.error || err.response.data?.message || `伺服器錯誤 (${err.response.status})`;
      } else if (err.request) {
        errorMessage = '無法連線到伺服器，請檢查網路';
      } else {
        errorMessage = err.message || '發生未知錯誤';
      }
      Alert.alert('更新失敗', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading && !posts.length) {
    return (
      <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
              <MaterialCommunityIcons name="brain" size={80} color="#f4c7ab" />
              <Text style={styles.loadingText}>正在載入你的個人頁面...</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
          <View style={styles.center}>
            <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryText}>重試</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient 
      colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} 
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* 頂部導航 */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity onPress={scrollToTop} activeOpacity={0.6}>
              <Text style={styles.headerTitle}>我的</Text>
            </TouchableOpacity>
          </View>
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
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#f4c7ab']} 
            />
          }
          onEndReached={() => fetchPosts(false)}
          onEndReachedThreshold={0.5}
          estimatedItemSize={340}
          
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 12, paddingTop: 16 }}>
              <View style={styles.profileCard}>
                <Image 
                  source={{ 
                    uri: user?.avatar?.startsWith('http') 
                      ? user.avatar 
                      : user?.avatar 
                        ? `${api.defaults.baseURL}${user.avatar}` 
                        : 'https://ui-avatars.com/api/?name=User&size=128&background=f4c7ab&color=5c4033' 
                  }} 
                  style={styles.avatar} 
                />
                
                <Text style={styles.username}>{user?.username || '使用者'}</Text>

                {/* MBTI */}
                <View style={styles.mbtiWrapper}>
                  {user?.mbti ? (
                    <TouchableOpacity
                      style={[styles.mbtiTag, { backgroundColor: getMbtiColor(user.mbti) }]}
                      onPress={() => setShowMbtiInfoModal(true)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="account-check" size={18} color="#fff" />
                      <Text style={styles.mbtiText}>{user.mbti} 型</Text>
                      <Ionicons name="information-circle" size={18} color="#fff" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.mbtiTagEmpty}
                      onPress={() => setShowMbtiChoiceModal(true)}
                    >
                      <MaterialCommunityIcons name="brain" size={18} color="#c47c5e" />
                      <Text style={styles.mbtiTextEmpty}>完成 MBTI 測試</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Status 編輯區塊 */}
                <View style={{ width: '100%', alignItems: 'center', marginVertical: 14 }}>
                  <View style={{
                    width: '50%',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    backgroundColor: 'rgba(244,199,171,0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(244,199,171,0.35)',
                  }}>
                    {isEditingStatus ? (
                      <View style={{ width: '100%', alignItems: 'center' }}>
                        <TextInput
                          style={localStyles.input}
                          value={tempStatus}
                          onChangeText={setTempStatus}
                          placeholder="一句話描述現在的心情（最多255字）"
                          maxLength={255}
                          autoFocus
                        />
                        <View style={localStyles.buttonRow}>
                          <TouchableOpacity
                            style={localStyles.cancelBtn}
                            onPress={() => {
                              setIsEditingStatus(false);
                              setTempStatus(user?.status || '');
                            }}
                          >
                            <Text style={localStyles.btnText}>取消</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[localStyles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSaveStatus}
                            disabled={saving}
                          >
                            <Text style={localStyles.btnTextSave}>
                              {saving ? '儲存中...' : '儲存'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        style={{
                          width: '100%',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                        }}
                        onPress={() => setShowStatusModal(true)}
                      >
                        {user?.status ? (
                          <>
                            <Text style={localStyles.statusText}>{user.status}</Text>
                            <MaterialCommunityIcons name="pencil" size={18} color="#c47c5e" style={{ opacity: 0.75 }} />
                          </>
                        ) : (
                          <>
                            <Text style={localStyles.placeholderText}>點擊選擇現在的心情狀態</Text>
                            <MaterialCommunityIcons name="pencil" size={18} color="#c47c5e" style={{ opacity: 0.75 }} />
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Bio 編輯區塊 */}
                <View style={{ width: '100%', paddingHorizontal: 12, marginBottom: 24 }}>
                  <View style={{
                    width: '100%',
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: 'rgba(244,199,171,0.06)',
                    borderWidth: 1,
                    borderColor: 'rgba(244,199,171,0.3)',
                  }}>
                    {isEditingBio ? (
                      <View style={{ width: '100%' }}>
                        <TextInput
                          style={[localStyles.input, { minHeight: 110, textAlignVertical: 'top' }]}
                          value={tempBio}
                          onChangeText={setTempBio}
                          placeholder="分享更多關於你的興趣、個性、喜歡的事物、人生故事...（最多500字）"
                          multiline
                          maxLength={500}
                          autoFocus
                        />
                        <View style={localStyles.buttonRow}>
                          <TouchableOpacity
                            style={localStyles.cancelBtn}
                            onPress={() => {
                              setIsEditingBio(false);
                              setTempBio(user?.bio || '');
                            }}
                          >
                            <Text style={localStyles.btnText}>取消</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[localStyles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSaveBio}
                            disabled={saving}
                          >
                            <Text style={localStyles.btnTextSave}>
                              {saving ? '儲存中...' : '儲存'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                        onPress={() => setIsEditingBio(true)}
                      >
                        <View style={{ flex: 1 }}>
                          {user?.bio ? (
                            <Text style={localStyles.bioText}>{user.bio}</Text>
                          ) : (
                            <Text style={localStyles.placeholderText}>
                              點擊這裡新增或編輯個人簡介，讓別人更認識你～
                            </Text>
                          )}
                        </View>
                        <MaterialCommunityIcons name="pencil" size={20} color="#c47c5e" style={{ marginTop: 3, opacity: 0.8 }} />
                      </Pressable>
                    )}
                  </View>
                </View>

                <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/profile/edit')}>
                  <MaterialCommunityIcons name="pencil" size={20} color="#5c4033" />
                  <Text style={styles.editBtnText}>編輯資料</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                <MaterialCommunityIcons name="post" size={22} color="#c47c5e" />
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#5c4033' }}>
                  我的貼文
                </Text>
              </View>
            </View>
          }

          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="comment-text-multiple-outline" size={80} color="#f4c7ab" />
              <Text style={styles.emptyText}>你還沒有發佈任何貼文</Text>
              <TouchableOpacity 
                style={styles.createContainer}
                onPress={() => router.push('/discuss/create')}
              >
                <MaterialCommunityIcons name="plus-circle" size={20} color="#8b5e3c" />
                <Text style={styles.createText}>立即發佈</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={{
            paddingHorizontal: 0,
            paddingTop: 0,
            paddingBottom: 130,
          }}
        />

        {/* MBTI 說明 Modal */}
        <Modal
          isVisible={showMbtiInfoModal}
          onBackdropPress={() => setShowMbtiInfoModal(false)}
          onBackButtonPress={() => setShowMbtiInfoModal(false)}
          backdropOpacity={0.5}
          animationIn="fadeInUp"
          animationOut="fadeOutDown"
          style={{ justifyContent: 'center', margin: 0 }}
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

        {/* 心情狀態選擇 Modal */}
        <Modal
          isVisible={showStatusModal}
          onBackdropPress={() => setShowStatusModal(false)}
          backdropOpacity={0.4}
          animationIn="fadeInUp"
          animationOut="fadeOutDown"
          style={{ justifyContent: 'flex-end', margin: 0 }}
        >
          <View style={{
            backgroundColor: '#fffaf5',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 40,
            maxHeight: '70%',
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#5c4033', marginBottom: 20, textAlign: 'center' }}>
              現在的心情是？
            </Text>

            {STATUS_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id || 'clear'}
                style={{
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(244,199,171,0.3)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
                onPress={async () => {
                  const newStatus = option.isClear ? '' : option.label;
                  await handleUpdateStatus(newStatus);
                  setShowStatusModal(false);
                }}
              >
                {option.emoji && <Text style={{ fontSize: 22 }}>{option.emoji}</Text>}
                <Text style={{ fontSize: 16, color: '#5c4033', flex: 1 }}>
                  {option.label}
                </Text>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#5c4033' },
  errorText: { marginTop: 16, fontSize: 16, color: '#e74c3c', textAlign: 'center' },
  retryBtn: { marginTop: 24, backgroundColor: '#f4c7ab', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30 },
  retryText: { color: '#5c4033', fontWeight: '600', fontSize: 16 },

  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingContent: { 
    alignItems: 'center', 
    gap: 20 
  },
  loadingText: { 
    fontSize: 18, 
    color: '#5c4033', 
    fontWeight: '600' 
  },

  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 30 
  },
  errorText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: '#e74c3c', 
    textAlign: 'center' 
  },
  retryBtn: { 
    marginTop: 24, 
    backgroundColor: '#f4c7ab', 
    paddingVertical: 12, 
    paddingHorizontal: 32, 
    borderRadius: 30 
  },
  retryText: { 
    color: '#5c4033', 
    fontWeight: '600', 
    fontSize: 16 
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 250, 245, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.3)',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  headerLeft: { width: 40, padding: 14 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#5c4033' },
  headerRight: { minWidth: 60 },

  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 7,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.35)',
  },
  avatar: { width: 96, height: 96, borderRadius: 55, marginBottom: 18, borderWidth: 5, borderColor: '#fffaf5' },
  username: { fontSize: 22, fontWeight: '700', color: '#5c4033', marginBottom: 16 },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4c7ab', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 30, gap: 8 },
  editBtnText: { color: '#5c4033', fontWeight: '600', fontSize: 16 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyText: { fontSize: 18, color: '#8b5e3c', marginBottom: 24, marginTop: 20, textAlign: 'center' },
  createContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    marginTop: 10,
  },
  createText: { color: '#8b5e3c', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  mbtiWrapper: { marginBottom: 12, alignItems: 'center' },
  mbtiTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30, gap: 8 },
  mbtiText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  mbtiTagEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 199, 171, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f4c7ab',
  },
  mbtiTextEmpty: { color: '#c47c5e', fontSize: 15, fontWeight: '600' },
});

const modalStyles = StyleSheet.create({
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
  message: { fontSize: 16, color: '#8b5e3c', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  button: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 24, minWidth: 180, alignItems: 'center' },
  buttonText: { color: '#5c4033', fontSize: 17, fontWeight: '700' },
});

const localStyles = StyleSheet.create({
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#5c4033',
    backgroundColor: '#fffaf7',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: '#f4c7ab',
  },
  btnText: { color: '#5c4033', fontWeight: '600', fontSize: 15 },
  btnTextSave: { color: '#5c4033', fontWeight: '700', fontSize: 15 },
  statusText: { fontSize: 15, color: '#8b5e3c', textAlign: 'center', lineHeight: 22 },
  bioText: { fontSize: 14, color: '#6b4e31', lineHeight: 22, textAlign: 'center' },
  placeholderText: {
    fontSize: 14,
    color: '#c47c5e',
    opacity: 0.75,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});