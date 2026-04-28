// app/(tabs)/chat/search.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chatAPI, fixImageUrl } from '../../../utils/api';

export default function SearchScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFullScreenLoading, setIsFullScreenLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success');

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      setIsFullScreenLoading(true);
      setLoading(true);
      fetchMatches();
      return () => {};
    }, [])
  );

  const fetchMatches = async () => {
    try {
      const response = await chatAPI.mbtiMatching();
      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('獲取匹配用戶失敗:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setIsFullScreenLoading(false), 400);
    }
  };

  const onRefresh = () => {
    setLoading(true);
    fetchMatches();
  };

  const showModal = (title, message, type = 'success') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const handleSendRequest = async (userId) => {
    setSendingRequest(userId);

    try {
      const res = await chatAPI.sendFriendRequest(userId);
      if (res.data.success) {
        showModal('好友請求已送出', '對方會在收到通知後決定是否接受～', 'success');

        setUsers(prev => prev.map(u =>
          u.id === userId 
            ? { ...u, isRequestPending: true } 
            : u
        ));
      }
    } catch (error) {
      console.error('發送好友請求失敗:', error);
      
      let errorMsg = '發送失敗，請稍後再試';
      if (error.response) {
        errorMsg = error.response.data?.error || 
                   error.response.data?.message || 
                   `錯誤 ${error.response.status}`;
      } else if (error.request) {
        errorMsg = '網絡連接失敗，請檢查網絡';
      } else {
        errorMsg = error.message;
      }

      showModal('發送失敗', errorMsg, 'error');
    } finally {
      setSendingRequest(null);
    }
  };

  const renderUserItem = ({ item }) => {
    const isPending = item.isRequestPending === true;
    const isFriend = item.isFriend === true;

    return (
      <View style={styles.userCard}>
        <Image
          source={{ uri: fixImageUrl(item.avatar) || 'https://via.placeholder.com/60' }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.mbti}>{item.mbti}</Text>
          {item.matchReason && <Text style={styles.reason}>{item.matchReason}</Text>}
        </View>

        <TouchableOpacity
          style={[
            styles.addButton,
            (isFriend || isPending) && styles.disabledButton
          ]}
          onPress={() => handleSendRequest(item.id)}
          disabled={isFriend || isPending || sendingRequest === item.id}
        >
          {sendingRequest === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>
              {isFriend 
                ? '已是好友' 
                : isPending 
                  ? '已送出請求' 
                  : '加好友'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isFullScreenLoading) {
    return (
      <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f4c7ab" />
            <Text style={styles.loadingText}>正在載入匹配推薦...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {/* 已移除左側返回箭頭，這裡只保留標題並置中 */}
          <Text style={styles.title}>尋找匹配</Text>
        </View>

        {users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-search" size={80} color="#f4c7ab" />
            <Text style={styles.emptyText}>目前沒有推薦的匹配對象</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            bounces={!loading}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={onRefresh}
                tintColor="#f4c7ab"
                title="正在更新匹配列表..."
                titleColor="#8b5e3c"
                colors={['#f4c7ab', '#e8b88a']}
                progressBackgroundColor="#fffaf5"
              />
            }
          />
        )}

        {/* Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <MaterialCommunityIcons 
                name={modalType === 'success' ? "check-circle" : "alert-circle"} 
                size={60} 
                color={modalType === 'success' ? "#4caf50" : "#f44336"} 
                style={styles.modalIcon}
              />
              
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Text style={styles.modalMessage}>{modalMessage}</Text>

              <Pressable
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>確定</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 250, 245, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.3)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8b5e3c',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginTop: 16,
  },
  listContent: {
    padding: 20,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#f4c7ab',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
    marginBottom: 4,
  },
  mbti: {
    fontSize: 14,
    color: '#8b5e3c',
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    color: '#a0785e',
    fontStyle: 'italic',
  },


  addButton: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 88,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#d9d9d9',
    opacity: 0.75,
  },
  addButtonText: {
    color: '#5c4033',
    fontWeight: '600',
    fontSize: 14,
  },

  // Modal 樣式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#5c4033',
    fontWeight: '600',
    fontSize: 16,
  },
});