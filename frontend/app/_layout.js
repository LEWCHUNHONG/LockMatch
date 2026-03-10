// app/_layout.js
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Alert } from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { socketAPI } from '../utils/api';

export default function Layout() {
  const router = useRouter();
  const listenersRegistered = useRef(false);

  useEffect(() => {
    const setupSocket = async () => {
      try {
        const socket = await socketAPI.initSocket();
        if (!socket) {
          console.error('❌ Socket 初始化失敗');
          return;
        }

        // 避免重複註冊
        if (listenersRegistered.current) {
          socket.off('temp-chat-invite');
          socket.off('new-friend-request');
          socket.off('friend-request-accepted');
          socket.off('temp-chat-accepted');
          socket.off('temp-chat-rejected');
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
            `${data.toUsername} 已經接受你嘅好友請求`,
            [
              { text: '稍後', style: 'cancel' },
              { text: '去聊天', onPress: () => router.push(`/chat/${data.roomId}`) }
            ]
          );
        });

        socket.on('temp-chat-accepted', (data) => {
          console.log('📩 收到 temp-chat-accepted 事件:', data);
          // 雙方都直接跳轉到臨時聊天室（重要：路徑必須是 /temp-chat/ 開頭）
          router.push(`/temp-chat/${data.roomId}?otherUserId=${data.withUserId}`);
        });

        socket.on('temp-chat-rejected', () => {
          Alert.alert('邀請已拒絕', '對方拒絕了你的臨時聊天邀請');
        });

        listenersRegistered.current = true;
      } catch (error) {
        console.error('❌ Socket 設置失敗:', error);
      }
    };

    setupSocket();

    return () => {
      const socket = socketAPI.getSocket();
      if (socket) {
        socket.off('temp-chat-invite');
        socket.off('new-friend-request');
        socket.off('friend-request-accepted');
        socket.off('temp-chat-accepted');
        socket.off('temp-chat-rejected');
        listenersRegistered.current = false;
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <Stack screenOptions={{ headerShown: false }} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});