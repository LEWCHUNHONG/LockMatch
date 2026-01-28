// app/discuss/index.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../utils/api';
import PostCard from './components/PostCard';

const { width } = Dimensions.get('window');

export default function Discuss() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // 附近按鈕動畫
  const nearbyScale = useRef(new Animated.Value(1)).current;
  const nearbyBackgroundOpacity = useRef(new Animated.Value(0)).current;

  // 獲取當前用戶 ID
  const loadCurrentUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await api.get('/api/me');
      if (res.data?.user?.id) {
        setCurrentUserId(res.data.user.id);
      }
    } catch (err) {
      console.warn('無法獲取當前用戶 ID', err);
    }
  }, []);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    // 防止重複請求
    if (!isRefresh && (!hasMore || loading)) return;

    setLoading(true);
    if (isRefresh) setRefreshing(true);

    const currentPage = isRefresh ? 0 : page;

    try {
      //console.log(`[Discuss] 開始載入貼文 page=${currentPage}`);

      const res = await api.get('/api/posts', {
        params: { limit: 15, offset: currentPage * 15 },
        timeout: 12000, // 建議加上 timeout 避免卡死
      });

      const newPosts = res.data.posts || [];

      if (isRefresh) {
        setPosts(newPosts);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        setPage(currentPage + 1);
      }

      setHasMore(newPosts.length >= 15);
    } catch (err) {
      console.error('載入討論區失敗:', err);
      // 發生錯誤時顯示提示，並視為沒有更多資料
      Alert.alert('載入失敗', '無法載入討論區內容，請檢查網路後再試');
      setHasMore(false);
      // 如果是第一次載入失敗，也讓它顯示「還沒有貼文」
      if (isRefresh) {
        setPosts([]);
      }
    } finally {
      //console.log('[Discuss] 載入結束');
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, hasMore]);

  useFocusEffect(
    useCallback(() => {
      loadCurrentUser();
      fetchPosts(true);
    }, [loadCurrentUser, fetchPosts])
  );

  const onRefresh = () => {
    setHasMore(true);
    fetchPosts(true);
  };

  const filteredPosts = posts.filter(post =>
    post.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      console.error('讚切換失敗', err);
    }
  };

  const handlePressComment = (postId) => {
    router.push(`/discuss/${postId}`);
  };

  const handleDeletePost = (deletedId) => {
    setPosts(prev => prev.filter(p => p.id !== deletedId));
  };

  const handleNearbyPressIn = () => {
    Animated.parallel([
      Animated.spring(nearbyScale, { toValue: 0.93, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(nearbyBackgroundOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handleNearbyPressOut = () => {
    Animated.parallel([
      Animated.spring(nearbyScale, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(nearbyBackgroundOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  return (
    <LinearGradient
      colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>討論區</Text>

          <View style={styles.headerRight}>
<TouchableOpacity style={styles.iconButton}
onPress={() => router.push('/discuss/moments')}
>
    <Image
      source={require('../../assets/icons/group.png')}
      style={styles.iconImage}
    />
  </TouchableOpacity>
          </View>
        </View>

        {/* 搜尋欄 */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={22} color="#8b5e3c" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜尋貼文..."
            placeholderTextColor="#a0785e"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#a0785e" />
            </TouchableOpacity>
          )}
        </View>

        {/* 貼文列表 */}
        <FlashList
          data={filteredPosts}
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
              tintColor="#f4c7ab"
            />
          }
          onEndReached={() => fetchPosts(false)}
          onEndReachedThreshold={0.5}
          estimatedItemSize={340}
          ListFooterComponent={
            loading && hasMore && posts.length > 0 ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="large" color="#f4c7ab" />
              </View>
            ) : !hasMore && posts.length > 0 ? (
              <View style={styles.footerEnd}>
                <Text style={styles.footerText}>已經到底囉～</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={() => {
            // 正在第一次載入，且還沒有任何資料
            if (loading && posts.length === 0) {
              return (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color="#f4c7ab" />
                  <Text style={styles.loadingText}>載入討論區中...</Text>
                </View>
              );
            }

            // 載入完成，或搜尋結果為空
            if (filteredPosts.length === 0) {
              return (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons
                    name={searchQuery ? "magnify-close" : "comment-text-multiple-outline"}
                    size={80}
                    color="#f4c7ab"
                  />
                  <Text style={styles.emptyText}>
                    {searchQuery ? "沒有找到相關貼文" : "還沒有貼文"}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? "試試其他關鍵字吧～" : "來分享你的想法吧！"}
                  </Text>
                </View>
              );
            }

            return null;
          }}
          contentContainerStyle={styles.listContent}
        />

        {/* 底部導航欄 */}
        <View style={styles.bottomTabContainer}>
          <View style={styles.bottomTab}>
            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/dashboard')}>
              <MaterialCommunityIcons name="home" size={28} color="#5c4033" />
              <Text style={styles.tabLabel}>首頁</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/chat/search')}>
              <MaterialCommunityIcons name="heart-multiple" size={28} color="#5c4033" />
              <Text style={styles.tabLabel}>匹配</Text>
            </TouchableOpacity>

            <Pressable
              style={[styles.tabItem, styles.centerTab]}
              onPressIn={handleNearbyPressIn}
              onPressOut={handleNearbyPressOut}
            >
              <Animated.View style={[styles.centerIconWrapper, { transform: [{ scale: nearbyScale }] }]}>
                <Animated.View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: '#ffffff',
                    borderRadius: 34,
                    opacity: nearbyBackgroundOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.3],
                    }),
                  }}
                />
                <MaterialCommunityIcons name="map-marker-radius-outline" size={32} color="#5c4033" />
              </Animated.View>
              <Text style={styles.centerLabel}>附近</Text>
            </Pressable>

            <TouchableOpacity style={styles.tabItem}>
              <MaterialCommunityIcons name="forum" size={28} color="#5c4033" />
              <Text style={styles.tabLabel}>討論區</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/profile')}>
              <MaterialCommunityIcons name="account" size={28} color="#5c4033" />
              <Text style={styles.tabLabel}>我的</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAB - 發文按鈕 */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/discuss/create')}
        >
          <MaterialCommunityIcons name="pencil-plus" size={28} color="#fffaf5" />
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },

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
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },
  iconImage: {
  width: 28,
  height: 28,
  resizeMode: 'contain',
},

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#5c4033',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },

  footerLoading: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerEnd: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#a0785e',
    fontSize: 15,
    fontWeight: '500',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: width > 400 ? 140 : 100,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingText: {
    marginTop: 20,
    color: '#8b5e3c',
    fontSize: 16,
  },

  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#fffaf5',
  },

  bottomTabContainer: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bottomTab: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 36,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    width: '100%',
    maxWidth: 440,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  centerTab: {
    marginTop: -36,
  },
  centerIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#c47c5e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 4,
    overflow: 'hidden',
  },
  centerLabel: {
    color: '#8b5e3c',
    fontWeight: '600',
    fontSize: 13,
  },
  tabLabel: {
    color: '#8b5e3c',
    fontSize: 12,
    fontWeight: '500',
  },
});