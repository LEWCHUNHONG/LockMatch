// app/chat/index.js
import { useState, useEffect, useRef } from 'react';
import { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatAPI } from '../../utils/api';
import { API_URL, fixImageUrl } from '../../utils/api';

export default function ChatRooms() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUser();
    loadChatRooms();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkRefresh = async () => {
        const refresh = await AsyncStorage.getItem('refresh_chat_list');
        if (refresh === 'true') {
          setRefreshing(true);
          await loadChatRooms();
          await AsyncStorage.removeItem('refresh_chat_list');
          setRefreshing(false);
        }
      };
      checkRefresh();
    }, [])
  );

  // 過濾聊天室
  useEffect(() => {
    if (!rooms.length) return;
    
    let filtered = rooms.filter(room => {
      // 根據標籤過濾
      if (activeTab === 'private') return room.type === 'private';
      if (activeTab === 'group') return room.type === 'group';
      if (activeTab === 'unread') return room.unread_count > 0;
      return true; // 'all' 或默認
    });
    
    // 根據搜索關鍵詞過濾
    if (searchQuery.trim()) {
      filtered = filtered.filter(room => 
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.last_message && room.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredRooms(filtered);
  }, [rooms, activeTab, searchQuery]);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('載入使用者失敗:', error);
    }
  };

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getChatRooms();
      
      if (response.data.success) {
        // 格式化聊天室數據
        const formattedRooms = response.data.rooms.map(room => {
          // 格式化最後消息時間
          let lastTime = '還沒有訊息';
          if (room.last_message_time || room.last_activity) {
            const timestamp = room.last_message_time || room.last_activity;
            lastTime = formatTime(timestamp);
            console.log('聊天室列表原始資料：', response.data.rooms);
          }
          
          // 確保有正確的顯示名稱
          let displayName = room.name || '未知聊天室';
          
          return {
            id: room.id.toString(),
            name: displayName,
            type: room.type || (room.members_count > 2 ? 'group' : 'private'),
            members_count: room.members_count|| 1,
            // 修復：確保最後消息不顯示 undefined
            last_message: room.last_message && room.last_message !== 'undefined' 
              ? (room.last_message === '還沒有訊息' ? room.last_message : 
                 room.last_message_type === 'image' ? '[圖片]' :
                 room.last_message_type === 'video' ? '[影片]' :
                 room.last_message_type === 'audio' ? '[音頻]' :
                 room.last_message_type === 'file' ? '[檔案]' :
                 room.last_message)
              : '還沒有訊息',
            last_time: lastTime,
            unread_count: room.unread_count || 0,
            avatar: room.avatar,
            is_online: room.is_online || false,
            description: room.description,
            last_message_type: room.last_message_type || 'text',
            mbti: room.mbti || null, // 添加MBTI
          };
        });
        
        setRooms(formattedRooms);
      } else {
        Alert.alert('錯誤', response.data.error || '無法載入聊天室列表');
      }
    } catch (error) {
      console.error('載入聊天室失敗:', error);
      Alert.alert('錯誤', '無法載入聊天室列表，請檢查網路連線');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '還沒有訊息';
    
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
    
    return date.toLocaleDateString('zh-TW', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

const onRefresh = async () => {
  setRefreshing(true);
  // 加這幾行：檢查 flag + 清空舊 state
  const refresh = await AsyncStorage.getItem('refresh_chat_list');
  if (refresh === 'true') {
    await AsyncStorage.removeItem('refresh_chat_list');
  }
  setRooms([]);  // 先清空 UI，避免顯示舊資料
  setFilteredRooms([]);  // 同步清空過濾結果
  await loadChatRooms();
  setRefreshing(false);
};

  const handleRoomPress = async (room) => {
    // 確保 room.id 是有效的數字
    if (!room.id || room.id === 'image-preview' || isNaN(parseInt(room.id))) {
      console.error('無效的 roomId:', room.id);
      Alert.alert('錯誤', '無法進入此聊天室');
      return;
    }
    
    // 使用正確的路徑格式
    console.log('進入聊天室:', room.id);
    router.push(`/chat/${room.id}`);
  };

  const renderRoomItem = ({ item }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => handleRoomPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.roomAvatar}>
        {item.type === 'private' && item.avatar ? (
          <Image 
            source={{ uri: fixImageUrl(item.avatar) }} 
            style={styles.avatarImage}
          />
        ) : (
          <View style={[
            styles.roomIcon,
            item.type === 'group' && styles.groupIcon,
          ]}>
            {item.type === 'group' ? (
              <MaterialCommunityIcons name="account-group" size={28} color="#5c4033" />
            ) : (
              <MaterialCommunityIcons name="account" size={28} color="#5c4033" />
            )}
          </View>
        )}
        {item.is_online && item.type === 'private' && (
          <View style={styles.onlineIndicator} />
        )}
      </View>

      <View style={styles.roomInfo}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.roomTime}>{item.last_time}</Text>
        </View>
        
        <View style={styles.roomFooter}>
          <Text style={styles.roomMessage} numberOfLines={1}>
            {item.last_message}
          </Text>
          
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>

        {/* 添加狀態行 */}
        {item.type === 'private' && (
          <View style={styles.statusRow}>
            {item.mbti && (
              <View style={styles.mbtiContainer}>
                <Text style={styles.mbtiText}>{item.mbti}</Text>
              </View>
            )}
            
            <View style={styles.statusContainer}>
              {item.is_online ? (
                <>
                  <View style={styles.onlineDotSmall} />
                  <Text style={styles.statusText}>在線</Text>
                </>
              ) : (
                <Text style={styles.offlineText}>離線</Text>
              )}
            </View>
          </View>
        )}
        
        {item.type === 'group' && (
          <View style={styles.memberCount}>
            <MaterialCommunityIcons name="account-group" size={12} color="#8b5e3c" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (initialLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4c7ab" />
          <Text style={styles.loadingText}>載入聊天室中...</Text>
        </View>
      );
    }
    
    if (searchQuery.trim() && filteredRooms.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="magnify" size={80} color="#f4c7ab" />
          <Text style={styles.emptyText}>找不到相關聊天室</Text>
          <Text style={styles.emptySubtext}>試試其他關鍵字或創建新聊天室</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="message-outline" size={80} color="#f4c7ab" />
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
  };

  // 展開/收合動畫
  const toggleFab = () => {
    const toValue = isFabExpanded ? 0 : 1;
    Animated.timing(animatedValue, {
      toValue,
      duration: 280,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    setIsFabExpanded(!isFabExpanded);
  };

  // 子按鈕的位移與透明度
  const translateY1 = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],   // 第一個子按鈕向上移動距離
  });
  const translateY2 = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60],  // 第二個子按鈕更上面
  });
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.3, 1],
  });
  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg'],  // + 變成 ×
  });

  return (
    <LinearGradient
      colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* 頂部欄 */}
        <View style={styles.header}>
          <TouchableOpacity 
          onPress={() => router.push('/dashboard')}
           style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>聊天室</Text>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => router.push('/chat/friends')}
            >
              <MaterialCommunityIcons name="account-group" size={26} color="#5c4033" />
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
            returnKeyType="search"
            onSubmitEditing={() => {}}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#a0785e" />
            </TouchableOpacity>
          )}
        </View>

        {/* 分類標籤 */}
        <View style={styles.tabContainer}>
          {[
            { id: 'all', label: '全部', icon: 'message-text' },
            { id: 'private', label: '私人', icon: 'account' },
            { id: 'group', label: '群組', icon: 'account-group' },
            { id: 'unread', label: '未讀', icon: 'bell' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={tab.icon} 
                size={20} 
                color={activeTab === tab.id ? '#5c4033' : '#8b5e3c'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 聊天室列表 */}
        <FlatList
          data={filteredRooms}
          renderItem={renderRoomItem}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#f4c7ab']} 
              tintColor="#f4c7ab" 
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContainer,
            (filteredRooms.length === 0 || initialLoading) && styles.emptyListContainer
          ]}
          showsVerticalScrollIndicator={false}
        />

        {/* 展開式 FAB 區域 */}
        {isFabExpanded && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={toggleFab}  // 點擊背景收合
          />
        )}

        {/* 子按鈕 1：找人聊天 */}
        <Animated.View
          style={[
            styles.fabAction,
            {
              transform: [{ translateY: translateY1 }],
              opacity,
              right: 20,
              bottom: 30 + 65,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.miniFab}
            onPress={() => {
              router.push('/chat/search');
              toggleFab(); // 點完自動收合
            }}
          >
            <MaterialCommunityIcons name="account-search" size={24} color="#fffaf5" />
          </TouchableOpacity>
          <Text style={styles.fabLabel}>搜尋新朋友</Text>
        </Animated.View>

        {/* 子按鈕 2：創建群組 */}
        <Animated.View
          style={[
            styles.fabAction,
            {
              transform: [{ translateY: translateY2 }],
              opacity,
              right: 20,
              bottom: 30 + 120,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.miniFab}
            onPress={() => {
              router.push('/chat/create-group');
              toggleFab();
            }}
          >
            <MaterialCommunityIcons name="account-multiple-plus" size={24} color="#fffaf5" />
          </TouchableOpacity>
          <Text style={styles.fabLabel}>創建群組</Text>
        </Animated.View>

        {/* 主按鈕 */}
        <TouchableOpacity
          style={[
            styles.newChatButton,
            isFabExpanded && { backgroundColor: '#e74c3c' }, // 展開時變紅色更像關閉
          ]}
          onPress={toggleFab}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color="#fffaf5"
            />
          </Animated.View>
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
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
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
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#5c4033',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
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
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '600',
    color: '#8b5e3c',
  },
  activeTabText: {
    color: '#5c4033',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
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
    marginRight: 16,
    position: 'relative',
  },
  roomIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIcon: {
    backgroundColor: '#a8d1e7',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#f4c7ab',
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
    marginBottom: 6,
  },
  roomName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5c4033',
    flex: 1,
    marginRight: 8,
  },
  roomTime: {
    fontSize: 13,
    color: '#a0785e',
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomMessage: {
    flex: 1,
    fontSize: 15,
    color: '#8b5e3c',
    opacity: 0.8,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fffaf5',
    fontSize: 12,
    fontWeight: '700',
  },
  // 添加狀態行樣式
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  mbtiContainer: {
    backgroundColor: 'rgba(92, 64, 51, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mbtiText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5c4033',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ecc71',
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#2ecc71',
  },
  offlineText: {
    fontSize: 12,
    color: '#95a5a6',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  memberText: {
    fontSize: 13,
    color: '#8b5e3c',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5c4033',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#f4c7ab',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
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
  newChatButton: {
    position: 'absolute',
    bottom: 30,
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
  miniFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabAction: {
    position: 'absolute',
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 12,
  },
  fabLabel: {
    color: '#5c4033',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(255,250,245,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
});