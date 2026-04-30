// app/chat/friends.js
import React, { 
  useState, 
  useEffect, 
  useCallback 
} from 'react';

import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  Image, 
  FlatList, 
  ActivityIndicator 
} from 'react-native';

import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Modal from 'react-native-modal';

import { useFocusEffect } from 'expo-router';
import { chatAPI, socketAPI } from '../../utils/api';

export default function FriendsList() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);

  // Modal states
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error'); // 'success' | 'error'

  const openAlert = (title, message, type = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingRequests();
    }
  }, [activeTab]);

  useEffect(() => {
    const socket = socketAPI.getSocket();
    if (socket) {
      socket.on('new-friend-request', () => {
        fetchPendingCount();
      });
      return () => socket.off('new-friend-request');
    }
  }, []);

  const fetchPendingCount = async () => {
    try {
      const response = await chatAPI.getPendingRequests();
      if (response.data.success) {
        setPendingCount(response.data.requests.length);
      }
    } catch (error) {
      console.error('獲取未讀請求數量失敗:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPendingCount();
    }, [])
  );

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getFriends();
      if (response.data.success) {
        const formattedFriends = response.data.friends.map(friend => {
          // 修復頭像 URL
          let fixedAvatar = friend.avatar;
          if (friend.avatar) {
            if (friend.avatar.startsWith('http')) {
              fixedAvatar = friend.avatar;
            } else if (friend.avatar.startsWith('/')) {
              fixedAvatar = `${API_URL || ''}${friend.avatar}`;
            }
          }
          if (fixedAvatar) {
            fixedAvatar = `${fixedAvatar.split('?')[0]}?cb=${Date.now()}`;
          }

          return {
            id: friend.id.toString(),
            name: friend.name || friend.username,
            username: friend.username,
            mbti: friend.mbti || '待測',
            isOnline: friend.is_online || false,
            avatar: fixedAvatar,
            status: friend.status || '最近活躍',
            last_active: friend.last_active || '離線',
            isFriend: true,
          };
        });

        setFriends(formattedFriends);
      } else {
        openAlert('錯誤', response.data.error || '載入好友列表失敗');
      }
    } catch (error) {
      console.error('載入好友失敗:', error);
      openAlert('網路錯誤', '無法載入好友列表，請檢查網路連線');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      setLoadingPending(true);
      const response = await chatAPI.getPendingRequests();
      if (response.data.success) {
        const formattedRequests = response.data.requests.map(request => {
          const userData = request.from_user || request;
          let fixedAvatar = userData.avatar;

          if (userData.avatar) {
            if (userData.avatar.startsWith('http')) {
              fixedAvatar = userData.avatar;
            } else if (userData.avatar.startsWith('/')) {
              fixedAvatar = `${API_URL || ''}${userData.avatar}`;
            }
          }
          if (fixedAvatar) {
            fixedAvatar = `${fixedAvatar.split('?')[0]}?cb=${Date.now()}`;
          }

          return {
            id: request.id.toString(),
            userId: request.from_user_id ? request.from_user_id.toString() : userData.id?.toString() || 'unknown',
            name: userData.username || '未知用戶',
            username: userData.username || '',
            mbti: userData.mbti || '待測',
            message: request.message || '想加您為好友',
            avatar: fixedAvatar,
            time: formatTime(request.created_at),
          };
        });

        setPendingRequests(formattedRequests);
      } else {
        openAlert('錯誤', response.data.error || '載入好友請求失敗');
      }
    } catch (error) {
      console.error('載入好友請求失敗:', error);
      openAlert('網路錯誤', '無法載入好友請求');
    } finally {
      setLoadingPending(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await chatAPI.acceptFriendRequest(requestId);
      if (response.data.success) {
        openAlert('成功', '已接受好友請求', 'success');
        loadPendingRequests();
        loadFriends();
      } else {
        openAlert('錯誤', response.data.error || '接受請求失敗');
      }
    } catch (error) {
      console.error('接受好友請求失敗:', error);
      openAlert('錯誤', '無法接受好友請求，請檢查網路連線');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      const response = await chatAPI.declineFriendRequest(requestId);
      if (response.data.success) {
        openAlert('成功', '已拒絕好友請求', 'success');
        loadPendingRequests();
      } else {
        openAlert('錯誤', response.data.error || '拒絕請求失敗');
      }
    } catch (error) {
      console.error('拒絕好友請求失敗:', error);
      openAlert('錯誤', '無法拒絕好友請求');
    }
  };

  const handleMessagePress = async (friendId) => {
    try {
      const response = await chatAPI.createPrivateChat(friendId);
      if (response.data.success) {
        router.push(`/chat/${response.data.roomId}`);
      } else {
        openAlert('錯誤', response.data.error || '無法開始對話');
      }
    } catch (error) {
      console.error('創建聊天室失敗:', error);
      openAlert('錯誤', '無法開始對話，請檢查網路連線');
    }
  };

  const filteredFriends = friends.filter(friend => {
    const matchesSearch =
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'online') return matchesSearch && friend.isOnline;
    if (activeTab === 'pending') return false;

    return matchesSearch;
  });

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity style={styles.friendItem} onPress={() => handleMessagePress(item.id)}>
      <View style={styles.friendAvatar}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
        )}
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.friendInfo}>
        <View style={styles.friendHeader}>
          <Text style={styles.friendName}>{item.name}</Text>
          <View style={styles.mbtiTag}>
            <Text style={styles.mbtiText}>{item.mbti}</Text>
          </View>
        </View>
        <Text style={styles.friendUsername}>@{item.username}</Text>
        <View style={styles.friendFooter}>
          <Text style={styles.friendStatus} numberOfLines={1}>{item.status}</Text>
          <Text style={styles.lastActive}>{item.last_active || '離線'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.messageButton} onPress={() => handleMessagePress(item.id)}>
        <MaterialCommunityIcons name="message-text" size={22} color="#5c4033" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPendingItem = ({ item }) => (
    <View style={styles.pendingItem}>
      <View style={styles.pendingAvatar}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
        )}
      </View>

      <View style={styles.pendingInfo}>
        <View style={styles.pendingHeader}>
          <Text style={styles.pendingName}>{item.name}</Text>
          <View style={styles.mbtiTag}>
            <Text style={styles.mbtiText}>{item.mbti}</Text>
          </View>
        </View>
        <Text style={styles.pendingMessage}>{item.message}</Text>
        <Text style={styles.pendingTime}>{item.time}</Text>
      </View>

      <View style={styles.pendingActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequest(item.id)}>
          <MaterialCommunityIcons name="check" size={20} color="#fffaf5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={() => handleDeclineRequest(item.id)}>
          <MaterialCommunityIcons name="close" size={20} color="#5c4033" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="#5c4033" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>好友列表</Text>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/chat/friend-requests')}>
                <View>
                  <MaterialCommunityIcons name="bell" size={26} color="#5c4033" />
                  {pendingCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={22} color="#8b5e3c" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="搜尋好友..."
              placeholderTextColor="#a0785e"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            {[
              { id: 'all', label: '全部好友', count: friends.length },
              { id: 'online', label: '在線', count: friends.filter(f => f.isOnline).length },
              { id: 'pending', label: '待處理', count: pendingRequests.length },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Pending Requests */}
          {activeTab === 'pending' && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>好友請求 ({pendingRequests.length})</Text>
              {loadingPending ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#f4c7ab" />
                  <Text style={styles.loadingText}>載入中...</Text>
                </View>
              ) : pendingRequests.length > 0 ? (
                <FlatList
                  data={pendingRequests}
                  renderItem={renderPendingItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.pendingList}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="account-clock" size={60} color="#f4c7ab" />
                  <Text style={styles.emptyText}>沒有待處理的好友請求</Text>
                </View>
              )}
            </View>
          )}

          {/* Friends List */}
          {activeTab !== 'pending' && (
            <FlatList
              data={filteredFriends}
              renderItem={renderFriendItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              ListHeaderComponent={
                <Text style={styles.sectionTitle}>
                  {activeTab === 'online' ? '在線好友' : '所有好友'} ({filteredFriends.length})
                </Text>
              }
              ListEmptyComponent={
                loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#f4c7ab" />
                    <Text style={styles.loadingText}>載入好友中...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="account-search" size={80} color="#f4c7ab" />
                    <Text style={styles.emptyText}>沒有找到好友</Text>
                    <Text style={styles.emptySubtext}>去搜尋添加新朋友吧！</Text>
                  </View>
                )
              }
            />
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* 好友浮動按鈕 */}
      <TouchableOpacity
        style={styles.addFriendButton}
        onPress={() => router.push('/chat/add-friends')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="account-plus" size={28} color="#fffaf5" />
      </TouchableOpacity>

      {/* Unified Alert Modal */}
      <Modal
        isVisible={showAlertModal}
        onBackdropPress={() => setShowAlertModal(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.5}
      >
        <View style={modalStyles.container}>
          <MaterialCommunityIcons
            name={alertType === 'success' ? 'check-circle' : 'alert-circle'}
            size={60}
            color={alertType === 'success' ? '#2ecc71' : '#e74c3c'}
            style={{ marginBottom: 16 }}
          />
          <Text style={modalStyles.title}>{alertTitle}</Text>
          <Text style={modalStyles.message}>{alertMessage}</Text>

          <TouchableOpacity
            style={[modalStyles.button, alertType === 'success' ? modalStyles.successButton : modalStyles.errorButton]}
            onPress={() => setShowAlertModal(false)}
          >
            <Text style={[modalStyles.buttonText, alertType === 'success' && { color: '#fffaf5' }]}>
              確定
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
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
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
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
    flexDirection: 'row',
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
    marginRight: 6,
  },
  activeTabText: {
    color: '#5c4033',
  },
  countBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: {
    color: '#fffaf5',
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  pendingSection: {
    paddingHorizontal: 20,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
    marginTop: 8,
  },
  pendingList: {
    paddingBottom: 20,
  },
  friendItem: {
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
  pendingItem: {
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
  friendAvatar: {
    marginRight: 16,
    position: 'relative',
  },
  pendingAvatar: {
    marginRight: 16,
  },
  defaultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#f4c7ab',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5c4033',
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
  friendInfo: { flex: 1, justifyContent: 'center' },
  pendingInfo: { flex: 1, justifyContent: 'center' },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5c4033',
    marginRight: 8,
  },
  pendingName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5c4033',
    marginRight: 8,
  },
  mbtiTag: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  mbtiText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5c4033',
  },
  friendUsername: {
    fontSize: 14,
    color: '#8b5e3c',
    marginBottom: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  friendFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendStatus: {
    flex: 1,
    fontSize: 14,
    color: '#8b5e3c',
    opacity: 0.8,
  },
  pendingMessage: {
    fontSize: 14,
    color: '#8b5e3c',
    marginBottom: 4,
  },
  friendTime: {
    fontSize: 13,
    color: '#a0785e',
    marginLeft: 8,
  },
  pendingTime: {
    fontSize: 13,
    color: '#a0785e',
  },
  messageButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
    alignSelf: 'center',
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#2ecc71',
  },
  declineButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5c4033',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 8,
  },
addFriendButton: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#fffaf5',
  },
  lastActive: {
  fontSize: 13,
  color: '#8b5e3c',
  marginLeft: 8,
},
});

// Modal styles
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
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButton: {
    backgroundColor: '#2ecc71',
  },
  errorButton: {
    backgroundColor: '#f4c7ab',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#5c4033',
  },
});