// app/chat/index.js
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { chatAPI, socketAPI, fixImageUrl } from '../../utils/api';

export default function ChatRooms() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, private, group, unread
  const [pendingFriendCount, setPendingFriendCount] = useState(0);
  const [pendingGroupInviteCount, setPendingGroupInviteCount] = useState(0);

  // 計算總未讀數
  const totalPending = pendingFriendCount + pendingGroupInviteCount;

  // 獲取聊天室列表
  const fetchRooms = async () => {
    try {
      const response = await chatAPI.getChatRooms();
      if (response.data.success) {
        setRooms(response.data.rooms || []);
      }
    } catch (error) {
      console.error('獲取聊天室失敗:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 獲取未讀好友請求
  const fetchPendingFriendCount = async () => {
    try {
      const res = await chatAPI.getPendingRequests();
      setPendingFriendCount(res.data.requests?.length || 0);
    } catch (error) {
      console.error('獲取好友請求失敗:', error);
    }
  };

  // 獲取未讀群組邀請
  const fetchPendingGroupInviteCount = async () => {
    try {
      const res = await chatAPI.getPendingGroupInvites();
      setPendingGroupInviteCount(res.data.invites?.length || 0);
    } catch (error) {
      console.error('獲取群組邀請失敗:', error);
    }
  };

  // 每次頁面聚焦時刷新數據
  useFocusEffect(
    useCallback(() => {
      fetchRooms();
      fetchPendingFriendCount();
      fetchPendingGroupInviteCount();
    }, [])
  );

  // Socket 監聽新邀請（實時更新未讀數）
  useEffect(() => {
    const socket = socketAPI.getSocket();
    if (socket) {
      socket.on('new-friend-request', fetchPendingFriendCount);
      socket.on('new-group-invite', fetchPendingGroupInviteCount);
    }
    return () => {
      if (socket) {
        socket.off('new-friend-request');
        socket.off('new-group-invite');
      }
    };
  }, []);

  // 下拉刷新
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchRooms(), fetchPendingFriendCount(), fetchPendingGroupInviteCount()]).finally(() => {
      setRefreshing(false);
    });
  }, []);

  // 根據搜尋詞和標籤過濾聊天室
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? true;
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'private') return room.type === 'private' && matchesSearch;
    if (activeTab === 'group') return room.type === 'group' && matchesSearch;
    if (activeTab === 'unread') return (room.unread_count > 0) && matchesSearch;
    return matchesSearch;
  });

  // 格式化時間
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins}分鐘前`;
    if (diffHours < 24) return `${diffHours}小時前`;
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  // 渲染聊天室項目
  const renderRoomItem = ({ item }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={styles.roomAvatar}>
        {item.avatar ? (
          <Image source={{ uri: fixImageUrl(item.avatar) }} style={styles.avatarImage} />
        ) : (
          <View style={styles.defaultAvatar}>
            <MaterialCommunityIcons
              name={item.type === 'group' ? 'account-group' : 'account'}
              size={24}
              color="#5c4033"
            />
          </View>
        )}
        {item.is_online && (
          <View style={styles.onlineIndicator} />
        )}
      </View>

      <View style={styles.roomInfo}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomName} numberOfLines={1}>
            {item.name || '未知聊天室'}
          </Text>
          <Text style={styles.roomTime}>{formatTime(item.last_message_time)}</Text>
        </View>

        <View style={styles.roomFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message || '暫無訊息'}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // 渲染空狀態
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="chat-outline" size={80} color="#f4c7ab" />
      <Text style={styles.emptyText}>還沒有聊天室</Text>
      <Text style={styles.emptySubtext}>開始新的對話吧！</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/chat/search')}
      >
        <Text style={styles.emptyButtonText}>尋找好友</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        {/* 頂部欄 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>聊天室</Text>

          <View style={styles.headerRight}>
            {/* 創建群組按鈕 */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/chat/create-group')}
            >
              <MaterialCommunityIcons name="plus" size={26} color="#5c4033" />
            </TouchableOpacity>

            {/* 邀請鈴鐺（統一邀請頁面） */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/chat/invites')}
            >
              <View>
                <MaterialCommunityIcons name="bell" size={26} color="#5c4033" />
                {totalPending > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalPending}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 搜尋欄 */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={22} color="#8b5e3c" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜尋聊天室或好友..."
            placeholderTextColor="#a0785e"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* 標籤頁 */}
        <View style={styles.tabContainer}>
          {[
            { id: 'all', label: '全部' },
            { id: 'private', label: '私人' },
            { id: 'group', label: '群組' },
            { id: 'unread', label: '未讀' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 聊天室列表 */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f4c7ab" />
            <Text style={styles.loadingText}>載入中...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRooms}
            renderItem={renderRoomItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#f4c7ab']}
                tintColor="#f4c7ab"
              />
            }
            ListEmptyComponent={renderEmpty}
          />
        )}
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
    paddingBottom: 10,
    backgroundColor: 'rgba(255, 250, 245, 0.6)',
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
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fffaf5',
  },
  badgeText: {
    color: '#fffaf5',
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
  },
  activeTab: {
    backgroundColor: '#f4c7ab',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8b5e3c',
  },
  activeTabText: {
    color: '#5c4033',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  roomItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
  },
  roomAvatar: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#f4c7ab',
  },
  defaultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2ecc71',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  roomInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5c4033',
    flex: 1,
  },
  roomTime: {
    fontSize: 13,
    color: '#a0785e',
    marginLeft: 8,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8b5e3c',
    flex: 1,
    opacity: 0.8,
  },
  unreadBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#fffaf5',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5c4033',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#f4c7ab',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 12,
  },
});