// app/chat/search.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chatAPI, fixImageUrl } from '../../utils/api';

export default function SearchScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      // 呼叫後端的 MBTI 匹配 API
      const response = await chatAPI.mbtiMatching(); // 請確認此方法存在
      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('獲取匹配用戶失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    console.log('點擊加好友，userId =', userId, '類型 =', typeof userId);
    setSendingRequest(userId);
    try {
      const res = await chatAPI.sendFriendRequest(userId);
      if (res.data.success) {
        alert('好友請求已送出');
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, isRequestPending: true } : u
        ));
      }
    } catch (error) {
      console.error('發送好友請求失敗:', error);
      // 嘗試獲取後端返回的錯誤訊息
      let errorMsg = '發送失敗，請稍後再試';
      if (error.response) {
        // 後端有回應，但狀態碼不是 2xx
        console.log('後端錯誤回應:', error.response.data);
        errorMsg = error.response.data?.error || error.response.data?.message || `錯誤 ${error.response.status}`;
      } else if (error.request) {
        // 請求已發送但冇收到回應
        errorMsg = '網絡連接失敗，請檢查網絡';
      } else {
        // 其他錯誤
        errorMsg = error.message;
      }
      alert(`發送失敗: ${errorMsg}`);
    } finally {
      setSendingRequest(null);
    }
  };

  const renderUserItem = ({ item }) => (
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
        style={[styles.addButton, item.isFriend && styles.disabledButton]}
        onPress={() => handleSendRequest(item.id)}
        disabled={item.isFriend || sendingRequest === item.id}
      >
        {sendingRequest === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.addButtonText}>
            {item.isFriend ? '已是好友' : '加好友'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f4c7ab" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.title}>尋找匹配</Text>
          <View style={{ width: 40 }} />
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
          />
        )}
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
    minWidth: 70,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#d9b8a3',
    opacity: 0.6,
  },
  addButtonText: {
    color: '#5c4033',
    fontWeight: '600',
    fontSize: 14,
  },
});