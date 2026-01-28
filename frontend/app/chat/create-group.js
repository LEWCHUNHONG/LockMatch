// app/chat/create-group.js
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatAPI } from '../../utils/api';
import { API_URL } from '../../utils/api';
import Modal from 'react-native-modal';

export default function CreateGroup() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getFriends();
      if (response.data.success) {
        setFriends(response.data.friends.map(friend => ({
          ...friend,
          isSelected: false
        })));
      }
    } catch (error) {
      console.error('載入好友失敗:', error);
      showAlertMessage('無法載入好友列表');
    } finally {
      setLoading(false);
    }
  };

  const showAlertMessage = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const toggleFriendSelection = (friendId) => {
    const updatedFriends = friends.map(friend => {
      if (friend.id === friendId) {
        const newSelectedState = !friend.isSelected;
        if (newSelectedState) {
          setSelectedFriends(prev => [...prev, friend]);
        } else {
          setSelectedFriends(prev => prev.filter(f => f.id !== friendId));
        }
        return { ...friend, isSelected: newSelectedState };
      }
      return friend;
    });
    setFriends(updatedFriends);
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      showAlertMessage('請輸入群組名稱');
      return;
    }

    if (selectedFriends.length === 0) {
      showAlertMessage('請選擇至少一位好友');
      return;
    }

    try {
      setCreating(true);
      const userIds = selectedFriends.map(friend => friend.id);
      
      const response = await chatAPI.createGroup(
        groupName.trim(),
        groupDescription.trim(),
        userIds
      );

      if (response.data.success) {
        Alert.alert(
          '成功',
          '群組創建成功！',
          [
            {
              text: '進入群組',
              onPress: () => {
                router.replace(`/chat/${response.data.roomId}`);
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        showAlertMessage(response.data.error || '創建群組失敗');
      }
    } catch (error) {
      console.error('創建群組失敗:', error);
      showAlertMessage('創建群組失敗，請檢查網路連線');
    } finally {
      setCreating(false);
    }
  };

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.friendItem,
        item.isSelected && styles.selectedFriendItem
      ]}
      onPress={() => toggleFriendSelection(item.id)}
    >
      <View style={styles.friendAvatar}>
        {item.avatar ? (
          <Image 
            source={{ uri: `${API_URL}${item.avatar}` }} 
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>
              {item.username?.charAt(0) || '?'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        {item.mbti && (
          <View style={styles.mbtiTag}>
            <Text style={styles.mbtiText}>{item.mbti}</Text>
          </View>
        )}
      </View>

      {item.isSelected ? (
        <View style={styles.selectedIcon}>
          <Ionicons name="checkmark-circle" size={24} color="#2ecc71" />
        </View>
      ) : (
        <View style={styles.unselectedIcon}>
          <Ionicons name="ellipse-outline" size={24} color="#a0785e" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* 頭部 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="#5c4033" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>創建群組</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* 群組信息表單 */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>群組信息</Text>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>群組名稱 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="請輸入群組名稱"
                  placeholderTextColor="#a0785e"
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={50}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>群組描述（可選）</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="請輸入群組描述..."
                  placeholderTextColor="#a0785e"
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </View>
            </View>

            {/* 選擇好友 */}
            <View style={styles.friendsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>選擇好友</Text>
                <Text style={styles.selectedCount}>
                  已選 {selectedFriends.length} 人
                </Text>
              </View>
              
              <Text style={styles.sectionSubtitle}>
                請選擇要加入群組的好友
              </Text>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#f4c7ab" />
                  <Text style={styles.loadingText}>載入好友中...</Text>
                </View>
              ) : friends.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="account-group" size={60} color="#f4c7ab" />
                  <Text style={styles.emptyText}>還沒有好友</Text>
                  <Text style={styles.emptySubtext}>先去添加好友吧！</Text>
                </View>
              ) : (
                <FlatList
                  data={friends}
                  renderItem={renderFriendItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.friendsList}
                />
              )}
            </View>

            {/* 創建按鈕 */}
            <TouchableOpacity
              style={[
                styles.createButton,
                (!groupName.trim() || selectedFriends.length === 0 || creating) && 
                styles.createButtonDisabled
              ]}
              onPress={createGroup}
              disabled={!groupName.trim() || selectedFriends.length === 0 || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#5c4033" />
              ) : (
                <>
                  <MaterialCommunityIcons name="account-group" size={20} color="#5c4033" />
                  <Text style={styles.createButtonText}>創建群組</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* 彈窗提示 */}
      <Modal
        isVisible={showAlert}
        onBackdropPress={() => setShowAlert(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.5}
      >
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>提示</Text>
          <Text style={modalStyles.message}>{alertMessage}</Text>
          <TouchableOpacity
            style={modalStyles.button}
            onPress={() => setShowAlert(false)}
          >
            <Text style={modalStyles.buttonText}>確定</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 16,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#5c4033',
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },
  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  friendsSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ecc71',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8b5e3c',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5c4033',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8b5e3c',
    marginTop: 8,
  },
  friendsList: {
    paddingBottom: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },
  selectedFriendItem: {
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    borderColor: '#f4c7ab',
  },
  friendAvatar: {
    marginRight: 12,
  },
  defaultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#f4c7ab',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#5c4033',
  },
  friendInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
    marginRight: 8,
  },
  mbtiTag: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mbtiText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5c4033',
  },
  selectedIcon: {
    padding: 4,
  },
  unselectedIcon: {
    padding: 4,
    opacity: 0.6,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4c7ab',
    borderRadius: 20,
    paddingVertical: 16,
    marginTop: 30,
    gap: 10,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
  },
});

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
  button: {
    backgroundColor: '#f4c7ab',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#5c4033',
  },
});