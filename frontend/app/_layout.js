// app/_layout.js
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Alert } from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { socketAPI } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';  // 新增導入

export default function Layout() {
  const router = useRouter();
  const listenersRegistered = useRef(false);

  // 定義接受/拒絕函數
  const acceptInstantChat = async (roomId, fromUserId) => {
    try {
      const res = await api.post('/api/instant-chat/accept', { roomId });
      if (res.data.success) {
        router.push(`/instant-chat/${roomId}?otherUserId=${fromUserId}`);
      }
    } catch (error) {
      Alert.alert('錯誤', '接受失敗');
    }
  };

  const rejectInstantChat = async (roomId) => {
    try {
      await api.post('/api/instant-chat/reject', { roomId });
    } catch (error) {
      console.error('拒絕失敗', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const trySetupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('[SOCKET] 尚未登入，跳過 socket 初始化');
          return;
        }
        if (!isMounted) return;
        console.log('[SOCKET] 偵測到 token，開始初始化...');
        const socket = await socketAPI.initSocket();
        if (!socket) {
          console.log('[SOCKET] 初始化返回 null，跳過事件綁定');
          return;
        }
        console.log('[SOCKET] Socket 已連接，ID:', socket.id);
        if (listenersRegistered.current) {
          socket.off('temp-chat-invite');
          socket.off('new-friend-request');
          socket.off('friend-request-accepted');
          socket.off('temp-chat-accepted');
          socket.off('temp-chat-rejected');
          socket.off('scenario-started');
          socket.off('instant-chat-invite');
          socket.off('instant-chat-accepted');
        }


        socket.on('temp-chat-invite', (data) => {
          console.log('📩 收到臨時聊天邀請:', data);
          Alert.alert(
            '新臨時聊天邀請',
            `${data.fromUsername} 邀請你進行臨時聊天`,
            [
              { text: '稍後', style: 'cancel' },
              { text: '查看', onPress: () => router.push('/temp-chat-invites') }
            ]
          );
        });

        socket.on('scenario-started', (data) => {
          console.log('📩 收到 scenario-started 事件:', data);
          Alert.alert(
            '劇本已開始',
            '對方已接受邀請，即將進入劇本',
            [
              { text: '確定', onPress: () => router.push(`/scenario/${data.scenarioId}`) }
            ]
          );
        });

        socket.on('new-friend-request', (data) => {
          Alert.alert(
            '新好友請求',
            `${data.fromUsername} 想加你為好友`,
            [
              { text: '稍後', style: 'cancel' },
              { text: '查看', onPress: () => router.push('/temp-chat-invites') }
            ]
          );
        });

        socket.on('friend-request-accepted', (data) => {
          Alert.alert(
            '好友請求已接受',
            `${data.toUsername} 已經接受你的好友請求`,
            [
              { text: '稍後', style: 'cancel' },
              { text: '去聊天', onPress: () => router.push(`/chat/${data.roomId}`) }
            ]
          );
        });

        socket.on('temp-chat-accepted', (data) => {
          console.log('📩 收到 temp-chat-accepted 事件:', data);
          router.push(`/temp-chat/${data.roomId}?otherUserId=${data.withUserId}`);
        });

        socket.on('temp-chat-rejected', () => {
          Alert.alert('邀請已拒絕', '對方拒絕了你的臨時聊天邀請');
        });

        socket.on('instant-chat-invite', (data) => {
          console.log('📩 收到即時聊天邀請:', data);
          Alert.alert(
            '即時聊天邀請',
            `附近用戶邀請你進行即時聊天（限時1分鐘）`,
            [
              { text: '拒絕', style: 'cancel', onPress: () => rejectInstantChat(data.roomId) },
              { text: '接受', onPress: () => acceptInstantChat(data.roomId, data.fromUserId) }
            ]
          );
        });

        socket.on('instant-chat-accepted', (data) => {
          console.log('📩 收到 instant-chat-accepted 事件:', data);
          router.push(`/instant-chat/${data.roomId}?otherUserId=${data.withUserId}`);
        });





        listenersRegistered.current = true;
        console.log('[SOCKET] 事件監聽器註冊完成');

      } catch (error) {
        if (error.message === 'No token') {
          console.log('[SOCKET] 無有效 token，等待使用者登入');
        } else {
          console.warn('⚠️ Socket 初始化失敗:', error.message);
        }
      }
    };

    trySetupSocket();

    return () => {
      isMounted = false;

      const socket = socketAPI.getSocket();
      if (socket) {
        socket.off('temp-chat-invite');
        socket.off('new-friend-request');
        socket.off('friend-request-accepted');
        socket.off('temp-chat-accepted');
        socket.off('temp-chat-rejected');
        socket.off('scenario-started');
        socket.off('instant-chat-invite');
        listenersRegistered.current = false;
        console.log('[SOCKET] 清理事件監聽器完成');
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="temp-chat-invites" options={{ headerShown: true, title: '邀請' }} />
          <Stack.Screen name="mbti-game" options={{ headerShown: false }} />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});