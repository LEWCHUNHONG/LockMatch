// app/chat/group-details.js
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatAPI, api } from '../../utils/api';
import { fixImageUrl } from '../../utils/api';

export default function GroupDetails() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadUser();
    loadGroupDetails();
  }, [roomId]);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // 確保 ID 是字串型別
        parsedUser.id = String(parsedUser.id);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('載入使用者失敗:', error);
    }
  };

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      
      // 載入群組基本信息
      const roomResponse = await chatAPI.getChatRoomInfo(roomId);
      if (roomResponse.data.success) {
        setGroupInfo(roomResponse.data.room);
      }
      
      // 載入群組成員
      const membersResponse = await chatAPI.getGroupMembers(roomId);
      if (membersResponse.data.success) {
        setMembers(membersResponse.data.members);
      }
    } catch (error) {
      console.error('載入群組詳情失敗:', error);
      Alert.alert('錯誤', '無法載入群組資訊');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await chatAPI.searchUsers(searchQuery);
      if (response.data.success) {
        // 過濾掉已經是群組成員的用戶
        const filteredResults = response.data.users.filter(userResult => 
          !members.some(member => member.id === userResult.id)
        );
        setSearchResults(filteredResults);
      }
    } catch (error) {
      console.error('搜尋用戶失敗:', error);
      Alert.alert('錯誤', '搜尋用戶失敗');
    }
  };

  const handleAddMember = async (userId) => {
    try {
      setAddingMember(true);
      const response = await chatAPI.addGroupMember(roomId, userId);
      if (response.data.success) {
        Alert.alert('成功', '已添加成員');
        // 重新載入成員列表
        loadGroupDetails();
        setShowAddMemberModal(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('添加成員失敗:', error);
      Alert.alert('錯誤', '添加成員失敗');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = (memberId) => {
    if (memberId === user?.id) {
      Alert.alert('提示', '您不能移除自己');
      return;
    }

    Alert.alert(
      '移除成員',
      '確定要移除此成員嗎？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '移除', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await chatAPI.removeGroupMember(roomId, memberId);
              if (response.data.success) {
                Alert.alert('成功', '已移除成員');
                loadGroupDetails();
              }
            } catch (error) {
              console.error('移除成員失敗:', error);
              Alert.alert('錯誤', '移除成員失敗');
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      '離開群組',
      '確定要離開此群組嗎？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '離開', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await chatAPI.removeGroupMember(roomId, user.id);
              if (response.data.success) {
                Alert.alert('成功', '已離開群組');
                router.back();
              }
            } catch (error) {
              console.error('離開群組失敗:', error);
              Alert.alert('錯誤', '離開群組失敗');
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroupDetails();
    setRefreshing(false);
  };

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberItem}>
      <Image 
        source={{ uri: fixImageUrl(item.avatar) }} 
        style={styles.memberAvatar}
        defaultSource={require('../../assets/placeholder.png')}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.username}</Text>
        <View style={styles.memberStatus}>
          {item.is_online ? (
            <>
              <View style={styles.onlineDot} />
              <Text style={styles.memberStatusText}>在線</Text>
            </>
          ) : (
            <Text style={styles.memberStatusText}>{item.last_active || '離線'}</Text>
          )}
        </View>
        {item.mbti && (
          <Text style={styles.memberMbti}>{item.mbti}</Text>
        )}
      </View>
      
      {item.id !== user?.id && (
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => handleRemoveMember(item.id)}
        >
          <MaterialCommunityIcons name="close" size={20} color="#e74c3c" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchResultItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={() => handleAddMember(item.id)}
      disabled={addingMember}
    >
      <Image 
        source={{ uri: fixImageUrl(item.avatar) }} 
        style={styles.searchResultAvatar}
        defaultSource={require('../../assets/placeholder.png')}
      />
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{item.username}</Text>
        {item.mbti && (
          <Text style={styles.searchResultMbti}>{item.mbti}</Text>
        )}
        {item.is_friend ? (
          <Text style={styles.friendBadge}>好友</Text>
        ) : null}
      </View>
      {addingMember ? (
        <ActivityIndicator size="small" color="#f4c7ab" />
      ) : (
        <MaterialCommunityIcons name="plus" size={24} color="#f4c7ab" />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f4c7ab" />
            <Text style={styles.loadingText}>載入群組詳情中...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* 頂部欄 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>群組詳情</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={() => setShowAddMemberModal(true)}
            >
              <MaterialCommunityIcons name="account-plus" size={24} color="#5c4033" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleLeaveGroup}
            >
              <MaterialCommunityIcons name="exit-to-app" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 群組基本信息 */}
        <View style={styles.groupInfoSection}>
          <View style={styles.groupAvatarContainer}>
            {groupInfo?.avatar ? (
              <Image 
                source={{ uri: fixImageUrl(groupInfo.avatar) }} 
                style={styles.groupAvatar}
                defaultSource={require('../../assets/placeholder.png')}
              />
            ) : (
              <View style={styles.groupIcon}>
                <MaterialCommunityIcons name="account-group" size={60} color="#5c4033" />
              </View>
            )}
          </View>
          
          <Text style={styles.groupName}>{groupInfo?.name || '未命名群組'}</Text>
          
          {groupInfo?.description ? (
            <Text style={styles.groupDescription}>{groupInfo.description}</Text>
          ) : null}
          
          <Text style={styles.memberCount}>
            {members.length} 位成員
          </Text>
        </View>

        {/* 成員列表 */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>群組成員</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddMemberModal(true)}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>添加成員</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.membersList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={['#f4c7ab']} 
                tintColor="#f4c7ab" 
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyMembers}>
                <MaterialCommunityIcons name="account-group-outline" size={60} color="#f4c7ab" />
                <Text style={styles.emptyMembersText}>暫無成員</Text>
              </View>
            )}
          />
        </View>

        {/* 添加成員模態框 */}
        <Modal
          visible={showAddMemberModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddMemberModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>添加成員</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowAddMemberModal(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#5c4033" />
                </TouchableOpacity>
              </View>

              {/* 搜尋欄 */}
              <View style={styles.searchContainerModal}>
                <Ionicons name="search" size={20} color="#8b5e3c" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInputModal}
                  placeholder="搜尋用戶..."
                  placeholderTextColor="#a0785e"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchUsers}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#a0785e" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 搜尋結果 */}
              <FlatList
                data={searchResults}
                renderItem={renderSearchResultItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.searchResultsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                  <View style={styles.emptySearchResults}>
                    <Text style={styles.emptySearchText}>
                      {searchQuery.trim() ? '找不到用戶' : '輸入用戶名搜尋'}
                    </Text>
                  </View>
                )}
              />
            </View>
          </View>
        </Modal>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
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
  groupInfoSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  groupAvatarContainer: {
    marginBottom: 16,
  },
  groupAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#f4c7ab',
  },
  groupIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(244, 199, 171, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5c4033',
    marginBottom: 8,
    textAlign: 'center',
  },
  groupDescription: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  memberCount: {
    fontSize: 15,
    color: '#a0785e',
    fontWeight: '600',
  },
  membersSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#5c4033',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  membersList: {
    paddingBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#5c4033',
    marginBottom: 4,
  },
  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ecc71',
    marginRight: 6,
  },
  memberStatusText: {
    fontSize: 14,
    color: '#8b5e3c',
  },
  memberMbti: {
    fontSize: 13,
    color: '#a0785e',
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  emptyMembers: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyMembersText: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fffaf5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchContainerModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
  searchInputModal: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#5c4033',
  },
  searchResultsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
  },
  searchResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
    marginBottom: 4,
  },
  searchResultMbti: {
    fontSize: 13,
    color: '#8b5e3c',
  },
  friendBadge: {
    fontSize: 12,
    color: '#2ecc71',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  emptySearchResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#8b5e3c',
  },
});