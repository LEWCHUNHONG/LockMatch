// app/_layout.js
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { socketAPI } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Layout() {
  const router = useRouter();
  const listenersRegistered = useRef(false);

  const [myUserId, setMyUserId] = useState(null);

  // 即時聊天邀請 Modal
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [currentInvite, setCurrentInvite] = useState(null);

  // 聊天結束 Modal
  const [chatEndModalVisible, setChatEndModalVisible] = useState(false);
  const [chatEndMessage, setChatEndMessage] = useState('');

  // 全域 ScenarioAlert
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    iconName: "alert-circle",
    iconColor: "#f39c12"
  });

  const showAlert = (title, message, buttons = [], iconName = "alert-circle", iconColor = "#f39c12") => {
    setAlertConfig({ visible: true, title, message, buttons, iconName, iconColor });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

const getMyUserId = async () => {
  try {

    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.log('👋 未登入狀態，跳過 /api/me 請求（正常）');
      setMyUserId(null);
      return;
    }

    const res = await api.get('/api/me');
    
    if (res.data?.id) {
      const id = Number(res.data.id);
      setMyUserId(id);
      console.log('✅ 取得當前用戶 ID:', id);
    }
  } catch (error) {

    if (error.response?.status === 401) {
      console.log('👋 未登入或 token 失效（正常情況）');
      setMyUserId(null);
      return;
    }


    console.error('取得用戶ID失敗', error);
  }
};

  const acceptInstantChat = async (roomId, fromUserId) => {
    try {
      const res = await api.post('/api/instant-chat/accept', { roomId });
      if (res.data.success) {
        setInviteModalVisible(false);
        router.push(`/instant-chat/${roomId}?otherUserId=${fromUserId}`);
      }
    } catch (error) {
      showAlert('錯誤', '接受邀請失敗，請稍後再試');
    }
  };

  const rejectInstantChat = async (roomId) => {
    try {
      await api.post('/api/instant-chat/reject', { roomId });
      setInviteModalVisible(false);
    } catch (error) {
      showAlert('錯誤', '操作失敗');
    }
  };

  const closeChatEndModal = () => {
    setChatEndModalVisible(false);
    setChatEndMessage('');
  };

  useEffect(() => {
    getMyUserId();

    const trySetupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const socket = await socketAPI.initSocket();
        if (!socket) return;

        console.log('[SOCKET] Socket 已連接，ID:', socket.id);

        if (listenersRegistered.current) {
          socket.off('instant-chat-invite');
          socket.off('instant-chat-accepted');
          socket.off('chat-ended');
          socket.off('temp-chat-invite');
          socket.off('new-friend-request');
          socket.off('friend-request-accepted');
          socket.off('temp-chat-accepted');
          socket.off('temp-chat-rejected');
          socket.off('scenario-started');
          socket.off('scenario-invite');
        }

        socket.on('instant-chat-invite', (data) => {
          setCurrentInvite(data);
          setInviteModalVisible(true);
        });

        socket.on('chat-ended', (data) => {
          setChatEndMessage(data.reason || '本次即時聊天已結束');
          setChatEndModalVisible(true);
        });

        socket.on('instant-chat-accepted', (data) => {
          router.push(`/instant-chat/${data.roomId}?otherUserId=${data.withUserId}`);
        });


        socket.on('scenario-started', (data) => {
          console.log('🎭 收到 scenario-started 事件:', data);

          const scenarioId = data.scenarioId || data.id;
          const fromUserId = data.fromUserId || data.senderId || data.inviterId;
          const scenarioTitle = data.scenarioTitle || data.title || '未知劇本';

          const isInviter = String(fromUserId) === String(myUserId);

          if (isInviter) {

            showAlert(
              '劇本已開始',
              `對方已接受您的邀請！\n\n劇本：${scenarioTitle}`,
              [
                { 
                  text: '立即進入劇本', 
                  onPress: () => router.push(`/scenario/${scenarioId}`) 
                }
              ],
              "play-circle",
              "#2ecc71"
            );
          } else {

            router.push(`/scenario/${scenarioId}`);
          }
        });

        socket.on('scenario-invite', (data) => {
          showAlert(
            '新劇本邀請',
            `${data.fromUsername || '一位朋友'} 邀請你一起玩劇本：\n\n「${data.scenarioTitle || '未知劇本'}」`,
            [
              { text: '稍後再看', style: 'cancel' },
              { text: '立即查看', onPress: () => router.push('/scenario/invites') }
            ],
            "drama-masks",
            "#f4c7ab"
          );
        });

        // 其他事件

        socket.on('new-friend-request', (data) => {
          showAlert('新好友請求', `${data.fromUsername} 想加你為好友`, [
            { text: '稍後', style: 'cancel' },
            { text: '查看', onPress: () => router.push('/chat/friend-requests') }
          ]);
        });

        socket.on('friend-request-accepted', (data) => {
          showAlert('好友請求已接受', `${data.toUsername} 已經接受你的好友請求`, [
            { text: '稍後', style: 'cancel' },
            { text: '去聊天', onPress: () => router.push(`/chat/${data.roomId}`) }
          ], "account-check", "#2ecc71");
        });

        socket.on('temp-chat-accepted', (data) => {
          router.push(`/temp-chat/${data.roomId}?otherUserId=${data.withUserId}`);
        });

        socket.on('temp-chat-rejected', () => {
          showAlert('邀請已拒絕', '對方拒絕了你的臨時聊天邀請');
        });

        listenersRegistered.current = true;
      } catch (error) {
        console.warn('⚠️ Socket 初始化失敗:', error.message);
      }
    };

    trySetupSocket();

    return () => {
      const socket = socketAPI.getSocket();
      if (socket) {
        socket.off('instant-chat-invite');
        socket.off('instant-chat-accepted');
        socket.off('chat-ended');
        socket.off('temp-chat-invite');
        socket.off('new-friend-request');
        socket.off('friend-request-accepted');
        socket.off('temp-chat-accepted');
        socket.off('temp-chat-rejected');
        socket.off('scenario-started');
        socket.off('scenario-invite');
        listenersRegistered.current = false;
      }
    };
  }, [router, myUserId]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="mbti-game" options={{ headerShown: false }} />
        </Stack>

        {/* 即時聊天邀請 Modal */}
        <Modal animationType="fade" transparent={true} visible={inviteModalVisible} onRequestClose={() => setInviteModalVisible(false)}>
          <View style={modalStyles.modalOverlay}>
            <View style={modalStyles.modalContainer}>
              <MaterialCommunityIcons name="chat-alert" size={68} color="#f4c7ab" style={{ marginBottom: 20 }} />
              <Text style={modalStyles.modalTitle}>即時聊天邀請</Text>
              <Text style={modalStyles.modalMessage}>
                {currentInvite?.fromUsername} 邀請你進行即時聊天{'\n\n'}（限時 1 分鐘，接受後即可開始即時對話）
              </Text>
              <View style={modalStyles.buttonContainer}>
                <TouchableOpacity style={modalStyles.rejectButton} onPress={() => rejectInstantChat(currentInvite?.roomId)}>
                  <Text style={modalStyles.rejectText}>拒絕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={modalStyles.acceptButton} onPress={() => acceptInstantChat(currentInvite?.roomId, currentInvite?.fromUserId)}>
                  <Text style={modalStyles.acceptText}>立即接受</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 聊天結束 Modal */}
        <Modal animationType="fade" transparent={true} visible={chatEndModalVisible} onRequestClose={closeChatEndModal}>
          <View style={modalStyles.modalOverlay}>
            <View style={modalStyles.modalContainer}>
              <MaterialCommunityIcons name="chat-off" size={68} color="#e67e22" style={{ marginBottom: 20 }} />
              <Text style={modalStyles.modalTitle}>聊天已結束</Text>
              <Text style={[modalStyles.modalMessage, { marginBottom: 32 }]}>{chatEndMessage}</Text>
              <TouchableOpacity style={modalStyles.confirmButton} onPress={closeChatEndModal}>
                <Text style={modalStyles.confirmText}>確定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 全域 Alert Modal */}
        <Modal animationType="fade" transparent={true} visible={alertConfig.visible} onRequestClose={hideAlert}>
          <View style={modalStyles.modalOverlay}>
            <View style={modalStyles.modalContainer}>
              <MaterialCommunityIcons name={alertConfig.iconName} size={68} color={alertConfig.iconColor} style={{ marginBottom: 20 }} />
              <Text style={modalStyles.modalTitle}>{alertConfig.title}</Text>
              <Text style={modalStyles.modalMessage}>{alertConfig.message}</Text>

              <View style={modalStyles.buttonContainer}>
                {alertConfig.buttons.map((btn, index) => (
                  <TouchableOpacity
                    key={index}
                    style={modalStyles.confirmButton}
                    onPress={() => {
                      btn.onPress?.();
                      hideAlert();
                    }}
                  >
                    <Text style={modalStyles.confirmText}>{btn.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });

const modalStyles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(92, 64, 51, 0.55)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    width: '85%', maxWidth: 380, backgroundColor: '#fffaf5', borderRadius: 28,
    paddingVertical: 40, paddingHorizontal: 28, alignItems: 'center',
    shadowColor: '#8b5e3c', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3,
    shadowRadius: 25, elevation: 20, borderWidth: 2, borderColor: '#f4c7ab'
  },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#5c4033', marginBottom: 16, textAlign: 'center' },
  modalMessage: { fontSize: 17, color: '#5c4033', textAlign: 'center', lineHeight: 26, marginBottom: 32 },
  buttonContainer: { flexDirection: 'row', width: '100%', gap: 14, marginTop: 10 },
  rejectButton: { flex: 1, backgroundColor: '#e6d5c0', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  acceptButton: { flex: 1, backgroundColor: '#f4c7ab', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  rejectText: { color: '#5c4033', fontSize: 17, fontWeight: '600' },
  acceptText: { color: '#3d2a1f', fontSize: 17, fontWeight: '700' },
  confirmButton: { flex: 1, backgroundColor: '#f4c7ab', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  confirmText: { color: '#3d2a1f', fontSize: 17, fontWeight: '700' },
});