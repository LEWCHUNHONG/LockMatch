// app/chat/search.js
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatAPI } from '../../utils/api';
import { API_URL } from '../../utils/api';
import Modal from 'react-native-modal';

export default function SearchFriends() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [recommendedFriends, setRecommendedFriends] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Modal state
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
    loadUser();
    loadRecommendedFriends();

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('載入使用者失敗:', error);
    }
  };

  const loadRecommendedFriends = async () => {
    try {
      setLoadingRecommended(true);
      setTimeout(() => {
        const mockRecommended = [
          { id: '6', name: '趙小剛', username: 'zhaogang', mbti: 'ENFP', matchScore: 92, avatar: 'https://randomuser.me/api/portraits/men/36.jpg', reason: '與你的MBTI高度匹配' },
          { id: '7', name: '吳小莉', username: 'wulili', mbti: 'ENFJ', matchScore: 88, avatar: 'https://randomuser.me/api/portraits/women/42.jpg', reason: '有共同的興趣愛好' },
        ];
        setRecommendedFriends(mockRecommended);
        setLoadingRecommended(false);
      }, 1000);
    } catch (error) {
      console.error('載入推薦好友失敗:', error);
      setLoadingRecommended(false);
    }
  };

const handleSearch = useCallback(async () => {
  if (!searchQuery.trim()) return setSearchResults([]);

  try {
    setLoading(true);
    Keyboard.dismiss();
    const response = await chatAPI.searchUsers(searchQuery);
    if (response.data.success) {
      const formattedResults = response.data.users.map(user => {
        let avatarUrl = null;

        if (user.avatar) {
          // 情況1：後端已經給完整 URL（http 或 https 開頭）
          if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
            avatarUrl = user.avatar;
          } 
          // 情況2：後端給相對路徑（例如 /uploads/... 或 uploads/...）
          else {
            const path = user.avatar.startsWith('/') ? user.avatar : '/' + user.avatar;
            avatarUrl = `${API_URL}${path}`;
          }

        }

        return {
          id: user.id.toString(),
          name: user.name || user.username,
          username: user.username,
          mbti: user.mbti || '待測',
          distance: user.distance ? `${user.distance}km` : '未知',
          avatar: avatarUrl,  // 存最終可直接使用的完整 URL
          status: user.status || '尋找朋友中',
          isFriend: user.is_friend || false,
          isRequestPending: user.is_request_pending || false,
        };
      });
      setSearchResults(formattedResults);
    } else {
      openAlert('錯誤', response.data.error || '搜尋失敗');
      setSearchResults([]);
    }
  } catch (error) {
    console.error('搜尋失敗:', error);
    openAlert('錯誤', '搜尋失敗，請檢查網路連線');
    setSearchResults([]);
  } finally {
    setLoading(false);
  }
}, [searchQuery]);

  const handleAddFriend = async (userId) => {
    try {
      const response = await chatAPI.sendFriendRequest(userId);
      if (response.data.success) {
        openAlert('成功', '好友請求已發送', 'success');
        setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, isRequestPending: true } : u));
      } else {
        openAlert('錯誤', response.data.error || '無法發送好友請求');
      }
    } catch (error) {
      console.error('發送好友請求失敗:', error);
      openAlert('錯誤', '無法發送好友請求');
    }
  };

  const handleStartChat = async (userId) => {
    try {
      const response = await chatAPI.createPrivateChat(userId);
      if (response.data.success) {
        router.push(`/chat/${response.data.roomId}`);
      } else {
        openAlert('錯誤', response.data.error || '無法開始對話');
      }
    } catch (error) {
      console.error('創建聊天室失敗:', error);
      openAlert('錯誤', '無法開始對話');
    }
  };

  const renderSearchResult = ({ item }) => (
    <View style={styles.resultItem}>
      <View style={styles.resultAvatar}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
        )}
      </View>

      <View style={styles.resultInfo}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultName}>{item.name}</Text>
          <View style={styles.mbtiTag}>
            <Text style={styles.mbtiText}>{item.mbti}</Text>
          </View>
        </View>
        <Text style={styles.resultUsername}>@{item.username}</Text>
        <View style={styles.resultFooter}>
          <Text style={styles.resultStatus} numberOfLines={1}>{item.status}</Text>
          {item.distance !== '未知' && (
            <View style={styles.distanceTag}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#fffaf5" />
              <Text style={styles.distanceText}>{item.distance}</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.addButton,
          item.isFriend && styles.friendButton,
          item.isRequestPending && styles.pendingButton,
        ]}
        onPress={() => {
          if (item.isFriend) handleStartChat(item.id);
          else if (!item.isRequestPending) handleAddFriend(item.id);
        }}
        disabled={item.isRequestPending}
      >
        {item.isFriend ? (
          <>
            <MaterialCommunityIcons name="message" size={18} color="#fffaf5" />
            <Text style={styles.addText}>聊天</Text>
          </>
        ) : item.isRequestPending ? (
          <>
            <MaterialCommunityIcons name="clock" size={18} color="#8b5e3c" />
            <Text style={styles.pendingText}>已發送</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="account-plus" size={18} color="#fffaf5" />
            <Text style={styles.addText}>加好友</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderRecommendedItem = ({ item }) => (
    <View style={styles.recommendedItem}>
      <View style={styles.recommendedAvatar}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{item.matchScore}%</Text>
        </View>
      </View>

      <View style={styles.recommendedInfo}>
        <View style={styles.recommendedHeader}>
          <Text style={styles.recommendedName}>{item.name}</Text>
          <View style={styles.mbtiTag}>
            <Text style={styles.mbtiText}>{item.mbti}</Text>
          </View>
        </View>
        <Text style={styles.recommendedUsername}>@{item.username}</Text>
        <Text style={styles.recommendedReason}>{item.reason}</Text>
      </View>

      <TouchableOpacity style={styles.recommendedAddButton} onPress={() => handleAddFriend(item.id)}>
        <MaterialCommunityIcons name="account-plus" size={20} color="#fffaf5" />
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>搜尋新朋友</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 搜尋 + 篩選區域 */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={22} color="#8b5e3c" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="搜尋使用者名稱或MBTI類型..."
              placeholderTextColor="#a0785e"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={20} color="#a0785e" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {[
              { id: 'all', label: '全部', icon: 'account-group' },
              { id: 'mbti', label: 'MBTI匹配', icon: 'heart-outline' },
              { id: 'nearby', label: '附近的人', icon: 'map-marker-outline' },
              { id: 'online', label: '在線', icon: 'wifi' },
              { id: 'recent', label: '最近活躍', icon: 'history' },
            ].map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  activeFilter === filter.id && styles.activeFilterButton,
                ]}
                onPress={() => setActiveFilter(filter.id)}
              >
                <MaterialCommunityIcons
                  name={filter.icon}
                  size={16}
                  color={activeFilter === filter.id ? '#fffaf5' : '#8b5e3c'}
                />
                <Text style={[
                  styles.filterButtonText,
                  activeFilter === filter.id && styles.activeFilterButtonText
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!searchQuery && (
            <View style={styles.recommendedSection}>
              <Text style={styles.sectionTitle}>為你推薦</Text>
              <Text style={styles.sectionSubtitle}>基於你的MBTI和興趣匹配</Text>

              {loadingRecommended ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#f4c7ab" />
                  <Text style={styles.loadingText}>載入推薦中...</Text>
                </View>
              ) : recommendedFriends.length > 0 ? (
                recommendedFriends.map(item => (
                  <View key={item.id}>{renderRecommendedItem({ item })}</View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="account-star" size={60} color="#f4c7ab" />
                  <Text style={styles.emptyText}>暫無推薦好友</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? `搜尋結果 (${searchResults.length})` : '附近的人'}
            </Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#f4c7ab" />
                <Text style={styles.loadingText}>搜尋中...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map(item => <View key={item.id}>{renderSearchResult({ item })}</View>)
            ) : searchQuery ? (
              <View style={styles.noResults}>
                <MaterialCommunityIcons name="account-search" size={80} color="#f4c7ab" />
                <Text style={styles.noResultsText}>沒有找到相關使用者</Text>
                <Text style={styles.noResultsSubtext}>試試其他關鍵字或篩選條件</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {keyboardVisible && searchQuery.trim() && (
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>搜尋</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Custom Alert Modal - matches dashboard style */}
      <Modal
        isVisible={showAlertModal}
        onBackdropPress={() => setShowAlertModal(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.5}
      >
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>{alertTitle}</Text>
          <Text style={modalStyles.message}>{alertMessage}</Text>

          <View style={modalStyles.buttonRow}>
            <TouchableOpacity
              style={[
                modalStyles.button,
                alertType === 'success' ? modalStyles.successButton : modalStyles.errorButton
              ]}
              onPress={() => setShowAlertModal(false)}
            >
              <Text style={[
                modalStyles.buttonText,
                alertType === 'success' ? { color: '#fffaf5' } : { color: '#5c4033' }
              ]}>
                確定
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// Modal Styles (matching dashboard.js)
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
  },
});

// Original styles (unchanged)
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
  searchFilterContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    marginBottom: 6,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#5c4033',
  },
  filterContent: {
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    gap: 6,
  },
  activeFilterButton: {
    backgroundColor: '#8b5e3c',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5e3c',
    includeFontPadding: false,
  },
  activeFilterButtonText: {
    color: '#fffaf5',
    fontWeight: '700',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 60,
  },
  recommendedSection: {
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 16,
  },
  resultsSection: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8b5e3c',
    marginBottom: 12,
  },
  resultItem: {
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
  recommendedItem: {
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
    borderWidth: 2,
    borderColor: '#f4c7ab',
  },
  resultAvatar: { marginRight: 16, position: 'relative' },
  recommendedAvatar: { marginRight: 16, position: 'relative' },
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
  avatarText: { fontSize: 24, fontWeight: '800', color: '#5c4033' },
  matchBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  matchText: { color: '#fffaf5', fontSize: 11, fontWeight: '700' },
  resultInfo: { flex: 1, justifyContent: 'center' },
  recommendedInfo: { flex: 1, justifyContent: 'center' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  recommendedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  resultName: { fontSize: 17, fontWeight: '700', color: '#5c4033', marginRight: 8 },
  recommendedName: { fontSize: 17, fontWeight: '700', color: '#5c4033', marginRight: 8 },
  mbtiTag: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  mbtiText: { fontSize: 12, fontWeight: '700', color: '#5c4033' },
  resultUsername: { fontSize: 14, color: '#8b5e3c', marginBottom: 6 },
  recommendedUsername: { fontSize: 14, color: '#8b5e3c', marginBottom: 6 },
  resultFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultStatus: { flex: 1, fontSize: 14, color: '#8b5e3c', opacity: 0.8 },
  recommendedReason: { fontSize: 13, color: '#8b5e3c', fontStyle: 'italic' },
  distanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5e3c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  distanceText: { fontSize: 12, color: '#fffaf5', fontWeight: '600' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f4c7ab',
    alignSelf: 'center',
    gap: 6,
  },
  pendingButton: { backgroundColor: 'rgba(244, 199, 171, 0.25)' },
  friendButton: { backgroundColor: '#2ecc71' },
  addText: { color: '#5c4033', fontSize: 14, fontWeight: '600' },
  pendingText: { color: '#8b5e3c', fontSize: 14, fontWeight: '600' },
  recommendedAddButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#f4c7ab',
    alignSelf: 'center',
  },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 16, color: '#8b5e3c', marginTop: 12 },
  noResults: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noResultsText: { fontSize: 20, fontWeight: '600', color: '#5c4033', marginTop: 20 },
  noResultsSubtext: { fontSize: 16, color: '#8b5e3c', marginTop: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#8b5e3c', marginTop: 12 },
  searchButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#f4c7ab',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  searchButtonText: { color: '#5c4033', fontSize: 17, fontWeight: '600' },
});