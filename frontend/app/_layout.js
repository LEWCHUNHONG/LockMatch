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

  useEffect(() => {
    const setupSocketListeners = () => {
      const socket = socketAPI.getSocket();
      if (!socket || !socket.connected) {
        console.log('Socket 未連接，延時重試...');
        setTimeout(setupSocketListeners, 1000);
        return;
      }

      console.log('✅ Socket 已連接，註冊監聽');

      socket.on('new-friend-request', (data) => {
        Alert.alert(
          '新好友請求',
          `${data.fromUsername} 想加你為好友`,
          [
            { text: '稍後', style: 'cancel' },
            { text: '查看', onPress: () => router.push('/chat/friend-requests') }
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
    };

    setupSocketListeners();
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