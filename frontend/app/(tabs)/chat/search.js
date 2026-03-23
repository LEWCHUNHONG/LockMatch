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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chatAPI, fixImageUrl } from '../../../utils/api';

export default function SearchScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);              // 用於 RefreshControl 的下拉刷新狀態
  const [isFullScreenLoading, setIsFullScreenLoading] = useState(true); // 控制全屏載入
  const [sendingRequest, setSendingRequest] = useState(null);
  const router = useRouter();

  // 每次這個畫面被 focus 時（包含從 tab 切換進來），強制顯示全屏 loading 並刷新資料
  useFocusEffect(
    useCallback(() => {
      // 強制顯示全屏 spinner
      setIsFullScreenLoading(true);
      setLoading(true);

      fetchMatches();

      return () => {
        // 可選：cleanup，例如取消請求（如果有使用 axios cancel token 等）
      };
    }, [])
  );

  const fetchMatches = async () => {
    try {
      const response = await chatAPI.mbtiMatching();
      if (response.data.success) {
        setUsers(response.data.users || []);
      } else {
        console.warn('API 返回不成功:', response.data);
      }
    } catch (error) {
      console.error('獲取匹配用戶失敗:', error);
    } finally {
      setLoading(false);
      // 讓全屏至少顯示一小段時間，避免閃太快（可調整秒數）
      setTimeout(() => {
        setIsFullScreenLoading(false);
      }, 400); // 至少顯示 0.4 秒
    }
  };

  // 下拉刷新
  const onRefresh = () => {
    setLoading(true);
    fetchMatches(); // 下拉只觸發小 spinner，不強制全屏
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
      let errorMsg = '發送失敗，請稍後再試';
      if (error.response) {
        console.log('後端錯誤回應:', error.response.data);
        errorMsg = error.response.data?.error || error.response.data?.message || `錯誤 ${error.response.status}`;
      } else if (error.request) {
        errorMsg = '網絡連接失敗，請檢查網絡';
      } else {
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

  // 當全屏載入狀態為 true 時，顯示全屏 spinner
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
            bounces={!loading} // 幫助 iOS RefreshControl spinner 更容易顯示
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={onRefresh}
                tintColor="#f4c7ab"
                title="正在更新匹配列表..."
                titleColor="#8b5e3c"
                // colors 主要給 Android
                colors={['#f4c7ab', '#e8b88a']}
                progressBackgroundColor="#fffaf5"
              />
            }
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