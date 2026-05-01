// app/chat/add-friends.js
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { chatAPI, fixImageUrl } from '../../utils/api';

export default function SearchUsers() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(null);

  // Modal 控制
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success');

  const showModal = (title, message, type = 'success') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  // 即時搜尋
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await chatAPI.searchUsers(query);
      
      if (response.data && response.data.success) {
        setSearchResults(response.data.users || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('搜尋用戶失敗:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const sendFriendRequest = async (userId, username) => {
    setSendingRequest(userId);
    try {
      const response = await chatAPI.sendFriendRequest(userId);
      
      if (response.data && response.data.success) {
        showModal('請求已發送', `已向 ${username} 發送好友請求`, 'success');
        
        setSearchResults(prev =>
          prev.map(user =>
            user.id === userId ? { ...user, requestSent: true } : user
          )
        );
      } else {
        showModal('發送失敗', response.data.message || '請稍後再試', 'error');
      }
    } catch (error) {
      console.error('發送好友請求失敗:', error);
      showModal('錯誤', '發送好友請求失敗，請稍後再試', 'error');
    } finally {
      setSendingRequest(null);
    }
  };
  
  const renderUserItem = ({ item }) => {
    const isFriend = item.is_friend === 1 || 
                     item.isFriend === true || 
                     item.is_friend === '1';

    const isRequestSent = 
      item.is_request_pending === 1 || 
      item.is_request_pending === true || 
      item.requestSent === true || 
      item.request_sent === true;

    let buttonText = '加好友';
    let buttonStyle = styles.addButton;
    let textStyle = styles.addButtonText;
    let isDisabled = false;

    if (isFriend) {
      buttonText = '已是好友';
      buttonStyle = styles.friendButton;
      textStyle = styles.friendButtonText;
      isDisabled = true;
    } 
    else if (isRequestSent) {
      buttonText = '請求已發送';
      buttonStyle = styles.sentButton;
      textStyle = styles.sentButtonText;
      isDisabled = true;
    }

    const handlePress = () => {
      if (isDisabled || sendingRequest !== null) return;
      sendFriendRequest(item.id, item.username);
    };

    return (
      <View style={styles.userItem}>
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image
              source={{ uri: fixImageUrl(item.avatar) }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {item.username ? item.username.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          {item.is_online ? <View style={styles.onlineIndicator} /> : null}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username || '未知用戶'}</Text>
          {item.mbti ? (
            <View style={styles.mbtiTag}>
              <Text style={styles.mbtiText}>{item.mbti}</Text>
            </View>
          ) : null}
          {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
        </View>

        <TouchableOpacity
          style={[buttonStyle, sendingRequest === item.id ? styles.disabledButton : null]}
          onPress={handlePress}
          disabled={isDisabled || sendingRequest === item.id}
        >
          {sendingRequest === item.id ? (
            <ActivityIndicator size="small" color="#fffaf5" />
          ) : (
            <Text style={textStyle}>{buttonText}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>尋找好友</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={22} color="#8b5e3c" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="輸入用戶名或ID搜尋..."
            placeholderTextColor="#a0785e"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f4c7ab" />
            <Text style={styles.loadingText}>正在搜尋...</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={item => (item.id ? item.id.toString() : Math.random().toString())}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              searchQuery.trim().length > 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="account-search" size={70} color="#f4c7ab" />
                  <Text style={styles.emptyText}>沒有找到符合的用戶</Text>
                  <Text style={styles.emptySubtext}>試試其他關鍵字吧</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="account-group" size={70} color="#f4c7ab" />
                  <Text style={styles.emptyText}>搜尋好友</Text>
                  <Text style={styles.emptySubtext}>輸入用戶名開始尋找新朋友</Text>
                </View>
              )
            }
          />
        )}
      </SafeAreaView>

      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.5}
      >
        <View style={styles.modalContainer}>
          <MaterialCommunityIcons
            name={modalType === 'success' ? 'check-circle' : 'alert-circle'}
            size={60}
            color={modalType === 'success' ? '#2ecc71' : '#e74c3c'}
            style={styles.modalIcon}
          />
          
          <Text style={styles.modalTitle}>{modalTitle || ''}</Text>
          <Text style={styles.modalMessage}>{modalMessage || ''}</Text>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>確定</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(255, 250, 245, 0.95)',
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
    fontWeight: '700',
    color: '#5c4033',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    margin: 20,
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatar: {
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
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
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
  userInfo: { flex: 1 },
  username: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 4,
  },
  mbtiTag: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  mbtiText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5c4033',
  },
  bio: {
    fontSize: 14,
    color: '#8b5e3c',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentButton: {
    backgroundColor: '#d4b5a0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#5c4033',
    fontWeight: '600',
    fontSize: 15,
  },
  friendButtonText: {
    color: '#fffaf5',
    fontWeight: '600',
    fontSize: 15,
  },
  sentButtonText: {
    color: '#fffaf5',
    fontWeight: '600',
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8b5e3c',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    textAlign: 'center',
  },
  modalContainer: {
    backgroundColor: '#fffaf5',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  modalButton: {
    backgroundColor: '#f4c7ab',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#5c4033',
  },
});