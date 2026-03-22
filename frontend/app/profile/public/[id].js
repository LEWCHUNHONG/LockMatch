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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import api from '../../../utils/api';
import PostCard from '../../discuss/components/PostCard';

export default function PublicProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [relationshipStatus, setRelationshipStatus] = useState('unknown'); // unknown / not_friend / pending_sent / pending_received / friends
  const [isSelf, setIsSelf] = useState(false);

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

  const handleAddFriend = async () => {
  if (relationshipStatus === 'pending_received') {
    // 未來可導向到好友請求列表，或直接呼叫 accept
    Alert.alert('提示', '請至好友請求頁面回應');
    return;
  }

  if (relationshipStatus !== 'not_friend') return;

  try {
    await api.post('/api/friend-request', { toUserId: id });
    setRelationshipStatus('pending_sent');
    Alert.alert('成功', '好友請求已送出！');
  } catch (err) {
    console.error(err);
    const msg = err.response?.data?.error || '發送失敗，請稍後再試';
    Alert.alert('錯誤', msg);
  }
};

useEffect(() => {
  if (!id) return;

  const loadAll = async () => {
    try {
      setLoadingProfile(true);
      setLoadingPosts(true);

      // ── 載入個人資料 ──
      const profileRes = await api.get(`/api/user/${id}`);
      if (!profileRes.data?.success) throw new Error('無法載入資料');
      setProfile(profileRes.data.user);

      // ── 檢查自己 ──
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

      // ── 載入貼文 ──
      const postsRes = await api.get('/api/user-posts', {
        params: { user_id: id, limit: 5, offset: 0 },
      });

      let fetchedPosts = postsRes.data.posts || [];
      fetchedPosts = fetchedPosts.map(post => ({
        ...post,
        media_urls: safeParseMedia(post.media_urls, 'media_urls', post.id),
        media_types: safeParseMedia(post.media_types, 'media_types', post.id),
      }));
      setPosts(fetchedPosts);

    } catch (err) {
      console.error('載入失敗:', err);
      Alert.alert('提示', '部分資料載入失敗');
      // 如果個人資料失敗才 back，貼文失敗可以容忍
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
      ISTJ: '#3498db', ISFJ: '#2ecc71', INFJ: '#9b59b6', INTJ: '#1abc9c',
      ISTP: '#e74c3c', ISFP: '#f39c12', INFP: '#d35400', INTP: '#34495e',
      ESTP: '#e67e22', ESFP: '#f1c40f', ENFP: '#2ecc71', ENTP: '#9b59b6',
      ESTJ: '#3498db', ESFJ: '#1abc9c', ENFJ: '#e74c3c', ENTJ: '#f39c12',
    };
    return colors[mbti.toUpperCase()] || '#f4c7ab';
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
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
      <SafeAreaView style={styles.safeArea}>
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

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
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
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&size=128&background=f4c7ab&color=5c4033`,
              }}
              style={styles.avatar}
            />

            <Text style={styles.username}>{profile.username || '匿名用戶'}</Text>

{/* MBTI 顯示區域 */}
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
      {relationshipStatus === 'friends'     ? '已是好友' :
       relationshipStatus === 'pending_sent' ? '已送出請求' :
       relationshipStatus === 'pending_received' ? '回應好友請求' :
       '添加好友'}
    </Text>
  </TouchableOpacity>
)}

            {/* 目前狀態 + 個人簡介 兩個小卡片 */}
            <View style={styles.extraInfoContainer}>
              {/* 目前心情卡片 */}
              <View style={styles.extraInfoCard}>
                <Text style={styles.cardTitle}>
                  <MaterialCommunityIcons name="emoticon-outline" size={18} color="#f39c12" />{' '}
                  目前心情
                </Text>
                <Text style={styles.cardContent}>
                  {profile.status ? (
                    <>
                      <MaterialCommunityIcons 
                        name="circle" 
                        size={14} 
                        color="#2ecc71" 
                      />{' '}
                      {profile.status}
                    </>
                  ) : (
                    '尚未設置心情～'
                  )}
                </Text>
              </View>

              {/* 關於我卡片（有內容才顯示） */}
              {profile.bio ? (
                <View style={styles.extraInfoCard}>
                  <Text style={styles.cardTitle}>
                    <MaterialCommunityIcons name="card-text-outline" size={18} color="#9b59b6" />{' '}
                    關於我
                  </Text>
                  <Text style={styles.cardContent}>{profile.bio}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* 最近貼文區塊 */}
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>最近 5 篇貼文</Text>

            {loadingPosts ? (
  <ActivityIndicator size="small" color="#f4c7ab" style={{ marginTop: 20 }} />
) : posts.length === 0 ? (
  <View style={styles.emptyPostsContainer}>
    <MaterialCommunityIcons 
      name="comment-text-multiple-outline" 
      size={80} 
      color="#f4c7ab" 
    />
    <Text style={styles.noPostsText}>
      該用戶尚未發布任何貼文
    </Text>
  </View>
) : (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onPressComment={handlePressComment}
                />
              ))
            )}
          </View>
        </ScrollView>
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
    width: 120,
    height: 120,
    borderRadius: 70,
    marginBottom: 20,
    borderWidth: 5,
    borderColor: '#fffaf5',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
  },
  mbtiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
    marginBottom: 16, // 與下方卡片拉開距離
  },
  mbtiText: { color: '#fff', fontSize: 17, fontWeight: '700' },

emptyPostsContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 40,           // 從上方拉開一點距離
  paddingVertical: 30,
  gap: 16,                 // icon 與文字之間的間距
},

noPostsText: {
  fontSize: 16,
  color: '#8b5e3c',
  textAlign: 'center',
  opacity: 0.7,
},

// 兩個小卡片也壓縮一點
  extraInfoContainer: {
    width: '100%',
    marginTop: 12,                     // ← 從 16 降到 12
    marginBottom: 4,
    gap: 12,                           // ← 從 16 降到 12
  },

  extraInfoCard: {
    backgroundColor: 'rgba(255, 245, 237, 1)',
    borderRadius: 16,                  // ← 圓角小一點
    paddingVertical: 12,               // ← 從 16 降到 12
    paddingHorizontal: 16,             // ← 從 20 降到 16
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
    fontSize: 14,                      // ← 從 15 降到 14，更精簡
    fontWeight: '700',
    color: '#6b4e3a',
    marginBottom: 6,                   // ← 從 10 降到 6
    letterSpacing: 0.3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  cardContent: {
    fontSize: 15,                      // ← 從 15.5 降到 15
    lineHeight: 22,                    // ← 行高也稍微壓縮
    color: '#4a2c1f',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // 貼文區塊
  postsSection: {
    marginTop: 32,
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
  backgroundColor: 'rgba(244, 199, 171, 0.15)', // 非常淡的暖灰底
  borderWidth: 1,
  borderColor: 'rgba(244, 199, 171, 0.3)',
  gap: 8,
  marginBottom: 16,
},

mbtiPlaceholderText: {
  color: '#a68a7c',           // 灰棕色，比較低調
  fontSize: 15,
  fontWeight: '600',
  letterSpacing: 0.3,
},
addFriendButton: {
  backgroundColor: '#f39c12',
  paddingVertical: 12,
  paddingHorizontal: 32,
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
});