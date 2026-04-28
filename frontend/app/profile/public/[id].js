// app/profile/public/[id].js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';

import api from '../../../utils/api';
import PostCard from '../../discuss/components/PostCard';

export default function PublicProfile() {
  const params = useLocalSearchParams();
  const id = params?.id ? String(params.id) : null;

  const router = useRouter();

  if (!id) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.gradient}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#f4c7ab" />
            <Text style={styles.loadingText}>載入用戶資料中...</Text>
            <TouchableOpacity
              style={[styles.backBtn, { marginTop: 20 }]}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [relationshipStatus, setRelationshipStatus] = useState('unknown');
  const [isSelf, setIsSelf] = useState(false);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmType, setConfirmType] = useState(null); // 'send' | 'accept'

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('[PublicProfile] params:', params);
    console.log('[PublicProfile] id:', id);
  }, [params, id]);

  const handleLikeToggle = async (postId, currentlyLiked) => {
    try {
      await api.post(`/api/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) =>
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

  const handleAddFriend = () => {
    if (relationshipStatus === 'friends') return;

    if (relationshipStatus === 'pending_sent') {
      setResultMessage('好友請求已送出，等待對方回應');
      setIsSuccess(true);
      setResultModalVisible(true);
      return;
    }

    if (relationshipStatus === 'pending_received') {
      setConfirmType('accept');
    } else if (relationshipStatus === 'not_friend') {
      setConfirmType('send');
    }

    if (confirmType) {
      setConfirmModalVisible(true);
    }
  };

  const handleConfirmAction = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setConfirmModalVisible(false);

    try {
      let message = '';
      if (confirmType === 'send') {
        await api.post('/api/friend-request', { toUserId: id });
        setRelationshipStatus('pending_sent');
        message = '好友請求已成功送出！';
      } else if (confirmType === 'accept') {
        const res = await api.post('/api/friend-request/accept-by-users', {
          fromUserId: Number(id),
        });
        if (res.data?.success) {
          setRelationshipStatus('friends');
          message = '已成功接受好友請求，你們現在是好友囉！';
        } else {
          throw new Error('接受失敗');
        }
      }

      setResultMessage(message);
      setIsSuccess(true);
      setResultModalVisible(true);
    } catch (err) {
      console.error('好友操作失敗:', err);
      const msg = err.response?.data?.error || '操作失敗，請稍後再試';
      setResultMessage(msg);
      setIsSuccess(false);
      setResultModalVisible(true);
    } finally {
      setIsSubmitting(false);
      setConfirmType(null);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoadingProfile(true);
        setLoadingPosts(true);

        const profileRes = await api.get(`/api/user/${id}`);
        if (!profileRes.data?.success) throw new Error('無法載入資料');
        setProfile(profileRes.data.user);

        const selfRes = await api.get('/api/me');
        const currentUserId = selfRes.data.user?.id;
        const isMe = currentUserId === Number(id);
        setIsSelf(isMe);

        if (!isMe) {
          const relationRes = await api.get(`/api/friendship/status/${id}`);
          setRelationshipStatus(relationRes.data.status || 'not_friend');
        } else {
          setRelationshipStatus('self');
        }

        const postsRes = await api.get('/api/user-posts', {
          params: { user_id: id, limit: 5, offset: 0 },
        });

        let fetchedPosts = postsRes.data.posts || [];
        fetchedPosts = fetchedPosts.map((post) => ({
          ...post,
          media_urls: safeParseMedia(post.media_urls, 'media_urls', post.id),
          media_types: safeParseMedia(post.media_types, 'media_types', post.id),
        }));
        setPosts(fetchedPosts);
      } catch (err) {
        console.error('載入失敗:', err);
        setResultMessage('部分資料載入失敗，請稍後再試');
        setIsSuccess(false);
        setResultModalVisible(true);
        if (!profile) router.back();
      } finally {
        setLoadingProfile(false);
        setLoadingPosts(false);
      }
    };

    loadAll();
  }, [id]);

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

  const getMbtiColor = (mbti) => {
    if (!mbti) return '#f4c7ab';
    const colors = {
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
    return colors[mbti.toUpperCase()] || '#f4c7ab';
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.gradient}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#f4c7ab" />
            <Text style={styles.loadingText}>載入中...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.gradient}>
          <View style={styles.center}>
            <Text style={styles.errorText}>無法載入用戶資料</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const displayName = profile.username || '匿名用戶';

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>個人卡片</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileCard}>
            <Image
              source={{
                uri:
                  profile.avatar?.startsWith('http')
                    ? profile.avatar
                    : profile.avatar
                    ? `${api.defaults.baseURL}${profile.avatar}`
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=128&background=f4c7ab&color=5c4033`,
              }}
              style={styles.avatar}
            />

            <Text style={styles.username}>{displayName}</Text>

            {profile.mbti ? (
              <View style={[styles.mbtiTag, { backgroundColor: getMbtiColor(profile.mbti) }]}>
                <MaterialCommunityIcons name="account-check" size={20} color="#fff" />
                <Text style={styles.mbtiText}>{profile.mbti} 型</Text>
              </View>
            ) : (
              <View style={styles.mbtiPlaceholder}>
                <MaterialCommunityIcons name="account-question-outline" size={18} color="#a68a7c" />
                <Text style={styles.mbtiPlaceholderText}>尚未設置 MBTI</Text>
              </View>
            )}

            {!isSelf && (
              <TouchableOpacity
                style={[
                  styles.addFriendButton,
                  relationshipStatus === 'friends' && styles.friendButton,
                  relationshipStatus === 'pending_sent' && styles.pendingButton,
                ]}
                onPress={handleAddFriend}
                disabled={relationshipStatus === 'friends' || relationshipStatus === 'pending_sent'}
              >
                <Text style={styles.addFriendText}>
                  {relationshipStatus === 'friends'
                    ? '已是好友'
                    : relationshipStatus === 'pending_sent'
                    ? '已送出請求'
                    : relationshipStatus === 'pending_received'
                    ? '回應好友請求'
                    : '添加好友'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.extraInfoContainer}>
              <View style={styles.extraInfoCard}>
                <Text style={styles.cardTitle}>
                  <MaterialCommunityIcons name="emoticon-outline" size={18} color="#f39c12" /> 目前心情
                </Text>
                <Text style={styles.cardContent}>
                  {profile.status ? (
                    <>
                      <MaterialCommunityIcons name="circle" size={14} color="#2ecc71" /> {profile.status}
                    </>
                  ) : (
                    '尚未設置心情～'
                  )}
                </Text>
              </View>

              <View style={styles.extraInfoCard}>
                <Text style={styles.cardTitle}>
                  <MaterialCommunityIcons name="card-text-outline" size={18} color="#9b59b6" /> 關於我
                </Text>
                <Text style={styles.cardContent}>{profile.bio || '尚未設置個人簡介～'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.postsSection}>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons 
                name="book-open-variant" 
                size={24} 
                color="#5c4033" 
              />
              <Text style={styles.sectionTitle}>最近 5 篇貼文</Text>
            </View>

            {loadingPosts ? (
              <ActivityIndicator size="small" color="#f4c7ab" style={{ marginTop: 20 }} />
            ) : posts.length === 0 ? (
              <View style={styles.emptyPostsContainer}>
                <MaterialCommunityIcons name="comment-text-multiple-outline" size={80} color="#f4c7ab" />
                <Text style={styles.noPostsText}>該用戶尚未發布任何貼文</Text>
              </View>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onPressComment={handlePressComment}
                  currentProfileId={id}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* 確認 modal */}
        <Modal
          isVisible={confirmModalVisible}
          onBackdropPress={() => !isSubmitting && setConfirmModalVisible(false)}
          backdropOpacity={0.5}
          animationIn="fadeInUp"
          animationOut="fadeOutDown"
          style={{ justifyContent: 'center', margin: 0 }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 28,
              marginHorizontal: 24,
              alignItems: 'center',
              shadowColor: '#8b5e3c',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#5c4033', marginBottom: 16 }}>
              {confirmType === 'send' ? '發送好友請求' : '回應好友請求'}
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: '#6b4e3a',
                textAlign: 'center',
                lineHeight: 24,
                marginBottom: 32,
              }}
            >
              {confirmType === 'send'
                ? `確定要向 ${displayName} 發送好友請求嗎？`
                : `${displayName} 想加你為好友，\n確定要接受嗎？`}
            </Text>

            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  backgroundColor: '#f0e9e2',
                  borderRadius: 16,
                  alignItems: 'center',
                }}
                onPress={() => !isSubmitting && setConfirmModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={{ color: '#5c4033', fontSize: 16, fontWeight: '600' }}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  backgroundColor: confirmType === 'send' ? '#f39c12' : '#2ecc71',
                  borderRadius: 16,
                  alignItems: 'center',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
                disabled={isSubmitting}
                onPress={handleConfirmAction}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                    {confirmType === 'send' ? '送出請求' : '接受'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 結果 modal（成功 / 失敗共用） */}
        <Modal
          isVisible={resultModalVisible}
          onBackdropPress={() => setResultModalVisible(false)}
          backdropOpacity={0.5}
          animationIn="zoomIn"
          animationOut="zoomOut"
          style={{ justifyContent: 'center', margin: 0 }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 32,
              marginHorizontal: 24,
              alignItems: 'center',
              shadowColor: '#8b5e3c',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <MaterialCommunityIcons
              name={isSuccess ? 'check-circle-outline' : 'alert-circle-outline'}
              size={64}
              color={isSuccess ? '#2ecc71' : '#e74c3c'}
              style={{ marginBottom: 16 }}
            />

            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: '#5c4033',
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              {isSuccess ? '操作成功' : '操作失敗'}
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: '#6b4e3a',
                textAlign: 'center',
                lineHeight: 24,
                marginBottom: 28,
              }}
            >
              {resultMessage}
            </Text>

            <TouchableOpacity
              style={{
                paddingVertical: 14,
                paddingHorizontal: 48,
                backgroundColor: isSuccess ? '#2ecc71' : '#e74c3c',
                borderRadius: 16,
              }}
              onPress={() => setResultModalVisible(false)}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                知道了
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#5c4033' },
  errorText: { fontSize: 18, color: '#e74c3c', marginBottom: 20 },
  backBtn: { backgroundColor: '#f4c7ab', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30 },
  backText: { color: '#5c4033', fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(244,199,171,0.25)' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#5c4033' },

  content: { padding: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,199,171,0.3)',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 70,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fffaf5',
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 10,
  },
  mbtiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    gap: 8,
    marginBottom: 12,
  },
  mbtiText: { color: '#fff', fontSize: 17, fontWeight: '700' },

emptyPostsContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 40,
  paddingVertical: 30,
  gap: 16,
},

noPostsText: {
  fontSize: 16,
  color: '#8b5e3c',
  textAlign: 'center',
  opacity: 0.7,
},


  extraInfoContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 0,
    gap: 10,
  },

  extraInfoCard: {
    backgroundColor: 'rgba(255, 245, 237, 1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.5)',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b4e3a',
    marginBottom: 4,
    letterSpacing: 0.3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  cardContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4a2c1f',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // 貼文區塊
postsSection: {
    marginTop: 25,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 16,
    paddingLeft: 8,
  },
  noPostsText: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 20,
    fontStyle: 'italic',
  },
  mbtiPlaceholder: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 9,
  borderRadius: 30,
  backgroundColor: 'rgba(244, 199, 171, 0.15)',
  borderWidth: 1,
  borderColor: 'rgba(244, 199, 171, 0.3)',
  gap: 8,
  marginBottom: 6,
},

mbtiPlaceholderText: {
  color: '#a68a7c',
  fontSize: 15,
  fontWeight: '600',
  letterSpacing: 0.3,
},
addFriendButton: {
  backgroundColor: '#f39c12',
  paddingVertical: 10,
  paddingHorizontal: 28,
  borderRadius: 30,
  alignItems: 'center',
  width: '80%',
},
friendButton: {
  backgroundColor: '#2ecc71',
},
pendingButton: {
  backgroundColor: '#95a5a6',
},
addFriendText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '700',
},
sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
  },
});