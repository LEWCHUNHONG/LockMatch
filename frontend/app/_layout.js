// app/_layout.js
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Alert } from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { socketAPI } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Layout() {
  const router = useRouter();
  const listenersRegistered = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const trySetupSocket = async () => {
      try {
        // 先檢查 token 是否存在
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

        listenersRegistered.current = true;
        console.log('[SOCKET] 事件監聽器註冊完成');

      } catch (error) {
        // 只在「不是 No token」的錯誤才顯示較明顯的 warning
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
        listenersRegistered.current = false;
        console.log('[SOCKET] 清理事件監聽器完成');
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