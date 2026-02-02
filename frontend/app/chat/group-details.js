// app/chat/group-details.js
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatAPI } from '../../utils/api';
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

  // 確認類 Modal
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // 通知類 Modal
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('success'); // success | error | info
  const [notificationMessage, setNotificationMessage] = useState('');

  const showNotificationModal = (type, message) => {
    setNotificationType(type);
    setNotificationMessage(message);
    setShowNotification(true);
  };

  useEffect(() => {
    loadUser();
    loadGroupDetails();
  }, [roomId]);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
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
      const roomResponse = await chatAPI.getChatRoomInfo(roomId);
      if (roomResponse.data.success) {
        setGroupInfo(roomResponse.data.room);
      }

      const membersResponse = await chatAPI.getGroupMembers(roomId);
      if (membersResponse.data.success) {
        setMembers(membersResponse.data.members);
      }
    } catch (error) {
      console.error('載入群組詳情失敗:', error);
      showNotificationModal('error', '無法載入群組資訊');
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
        const filteredResults = response.data.users.filter(
          userResult => !members.some(member => member.id === userResult.id)
        );
        setSearchResults(filteredResults);
      } else {
        showNotificationModal('error', response.data.message || '搜尋失敗');
      }
    } catch (error) {
      console.error('搜尋用戶失敗:', error);
      showNotificationModal('error', '搜尋用戶失敗，請稍後再試');
    }
  };

  const handleAddMember = async (userId) => {
    try {
      setAddingMember(true);
      const response = await chatAPI.addGroupMember(roomId, userId);
      if (response.data.success) {
        showNotificationModal('success', '已成功添加成員');
        loadGroupDetails();
        setShowAddMemberModal(false);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        showNotificationModal('error', response.data.message || '添加成員失敗');
      }
    } catch (error) {
      console.error('添加成員失敗:', error);
      showNotificationModal('error', '添加成員失敗，請稍後再試');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = (memberId) => {
    if (memberId === user?.id) {
      showNotificationModal('info', '您不能移除自己');
      return;
    }

    setMemberToRemove(memberId);
    setShowRemoveConfirm(true);
  };

  const handleLeaveGroup = () => {
    setShowLeaveConfirm(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroupDetails();
    setRefreshing(false);
  };

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberItem}>
      <Image
        source={{ uri: item.avatar || 'https://via.placeholder.com/50' }}
        style={styles.memberAvatar}
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
            <Text style={styles.memberStatusText}>最後上線: {item.last_active}</Text>
          )}
        </View>
        {item.mbti && <Text style={styles.memberMbti}>{item.mbti}</Text>}
      </View>
      {item.id !== user?.id && item.role !== 'creator' && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMember(item.id)}
        >
          <Ionicons name="close" size={20} color="#e74c3c" />
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
        {item.mbti && <Text style={styles.searchResultMbti}>{item.mbti}</Text>}
        {item.is_friend && <Text style={styles.friendBadge}>好友</Text>}
      </View>
      {addingMember ? (
        <ActivityIndicator size="small" color="#f4c7ab" />
      ) : (
        <MaterialCommunityIcons name="plus" size={24} color="#f4c7ab" />
      )}
    </TouchableOpacity>
  );

  // 確認對話框 Modal
  const ConfirmModal = ({
    visible,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = '確定',
    cancelText = '取消',
    confirmColor = '#e74c3c',
  }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          <Text style={styles.confirmModalTitle}>{title}</Text>
          <Text style={styles.confirmModalMessage}>{message}</Text>

          <View style={styles.confirmModalButtons}>
            <TouchableOpacity
              style={[styles.confirmModalButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmModalButton, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 通知 Modal（成功/失敗/提示）
  const NotificationModal = () => {
    const getIconAndColor = () => {
      switch (notificationType) {
        case 'success':
          return { icon: 'checkmark-circle', color: '#2ecc71' };
        case 'error':
          return { icon: 'close-circle', color: '#e74c3c' };
        case 'info':
        default:
          return { icon: 'information-circle', color: '#3498db' };
      }
    };

    const { icon, color } = getIconAndColor();

    return (
      <Modal
        visible={showNotification}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotification(false)}
      >
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationContent}>
            <Ionicons name={icon} size={64} color={color} style={styles.notificationIcon} />

            <Text style={styles.notificationTitle}>
              {notificationType === 'success' ? '成功' : notificationType === 'error' ? '失敗' : '提示'}
            </Text>

            <Text style={styles.notificationMessage}>{notificationMessage}</Text>

            <TouchableOpacity
              style={[styles.notificationButton, { backgroundColor: color }]}
              onPress={() => setShowNotification(false)}
            >
              <Text style={styles.notificationButtonText}>好的</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
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
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        {/* 頂部導航 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>群組詳情</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton} onPress={handleLeaveGroup}>
              <MaterialCommunityIcons name="exit-to-app" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 群組資訊 */}
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
          <Text style={styles.memberCount}>{members.length} 位成員</Text>
        </View>

        {/* 成員列表 */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>群組成員</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddMemberModal(true)}>
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

        {/* 添加成員 Modal */}
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

        {/* 移除成員確認 */}
        <ConfirmModal
          visible={showRemoveConfirm}
          title="移除成員"
          message="確定要將此成員移出群組嗎？此操作無法復原。"
          confirmText="移除"
          confirmColor="#e74c3c"
          onConfirm={async () => {
            try {
              const response = await chatAPI.removeGroupMember(roomId, memberToRemove);
              if (response.data.success) {
                showNotificationModal('success', '已成功移除成員');
                loadGroupDetails();
              } else {
                showNotificationModal('error', response.data.message || '移除失敗');
              }
            } catch (error) {
              console.error('移除成員失敗:', error);
              showNotificationModal('error', '移除成員失敗，請稍後再試');
            } finally {
              setShowRemoveConfirm(false);
              setMemberToRemove(null);
            }
          }}
          onCancel={() => {
            setShowRemoveConfirm(false);
            setMemberToRemove(null);
          }}
        />

        {/* 離開群組確認 */}
        <ConfirmModal
          visible={showLeaveConfirm}
          title="離開群組"
          message="確定要離開此群組嗎？離開後將無法再接收此群組訊息。"
          confirmText="離開"
          confirmColor="#e74c3c"
          onConfirm={async () => {
            try {
              const response = await chatAPI.leaveGroup(roomId);
              await AsyncStorage.setItem('refresh_chat_list', 'true');
              if (response.data.success) {
                showNotificationModal('success', '已成功離開群組');
                router.push('/chat');
              } else {
                showNotificationModal('error', response.data.message || '離開失敗');
              }
            } catch (error) {
              console.error('離開群組失敗:', error);
              showNotificationModal('error', '離開群組失敗，請稍後再試');
            } finally {
              setShowLeaveConfirm(false);
            }
          }}
          onCancel={() => setShowLeaveConfirm(false)}
        />

        {/* 通知 Modal */}
        <NotificationModal />
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
  groupAvatarContainer: { marginBottom: 16 },
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
  membersList: { paddingBottom: 20 },
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
  memberInfo: { flex: 1 },
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
  memberStatusText: { fontSize: 14, color: '#8b5e3c' },
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
  modalCloseButton: { padding: 4 },
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
  searchIcon: { marginRight: 10 },
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
  searchResultInfo: { flex: 1 },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
    marginBottom: 4,
  },
  searchResultMbti: { fontSize: 13, color: '#8b5e3c' },
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
  emptySearchText: { fontSize: 16, color: '#8b5e3c' },

  // Confirm Modal 樣式
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#fffaf5',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: { backgroundColor: '#f4c7ab' },
  cancelButtonText: {
    color: '#5c4033',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Notification Modal 樣式
  notificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notificationContent: {
    backgroundColor: '#fffaf5',
    borderRadius: 24,
    padding: 32,
    width: '80%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  notificationIcon: { marginBottom: 16 },
  notificationTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
  },
  notificationMessage: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  notificationButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  notificationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});