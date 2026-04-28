// app/instant-chat/[id].js

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  Keyboard 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal } from 'react-native';
import api, { socketAPI } from '../../utils/api';

export default function InstantChat() {
  const { id, otherUserId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);

  // Modal 相關狀態
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [endModalTitle, setEndModalTitle] = useState('');
  const [endModalMessage, setEndModalMessage] = useState('');

  const timerRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const router = useRouter();
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    getCurrentUserAndSetup();
    startTimer();

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const socket = socketAPI.getSocket();
      if (socket) {
        socket.off('instant-chat-message');
        socket.off('user-typing');
      }
      keyboardDidShowListener.remove();
    };
  }, []);

  const getCurrentUserAndSetup = async () => {
    try {
      const res = await api.get('/api/me');
      const userId = res.data.id;
      const userIdStr = String(userId);
      setMyId(userIdStr);
      setupSocket(userIdStr);
    } catch (error) {
      console.error('獲取用戶失敗', error);
      showEndModal('錯誤', '無法取得您的資料，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleEndInstantChat = async () => {
    try {
        await api.post('/api/instant-chat/end', { roomId: id });
    } catch (err) {
        console.log('清理臨時聊天室失敗（可忽略）', err);
    } finally {
        router.replace('/(tabs)/location-checkin');
    }
};

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          showEndModal(
            '聊天時間結束', 
            '1分鐘即時聊天時間已到，即將返回附近的人頁面',
            handleEndInstantChat,
            () => router.replace('/(tabs)/location-checkin')
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 自訂 Modal 顯示函數
  const showEndModal = (title, message, onConfirm = null) => {
    setEndModalTitle(title);
    setEndModalMessage(message);
    setEndModalVisible(true);

    if (onConfirm) {
      global.tempConfirm = onConfirm;
    }
  };

  const setupSocket = (currentUserId) => {
    const socket = socketAPI.getSocket();
    if (!socket) return;

    socket.emit('join-room', `instant_${id}`);

    socket.on('instant-chat-message', (data) => {
      const message = {
        id: String(data.id || Date.now()),
        senderId: String(data.senderId),
        content: data.content || '',
        createdAt: data.createdAt || new Date(),
      };
      setMessages(prev => [...prev, message]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socket.on('user-typing', (data) => {
      if (String(data.userId) !== currentUserId) {
        setTypingUsers(prev => {
          const exists = prev.find(u => String(u.userId) === String(data.userId));
          if (data.isTyping && !exists) return [...prev, data];
          if (!data.isTyping && exists) return prev.filter(u => String(u.userId) !== String(data.userId));
          return prev;
        });
      }
    });
  };

  const handleTyping = (isTyping) => {
    const socket = socketAPI.getSocket();
    if (socket && socket.connected && myId) {
      socket.emit('typing', {
        roomId: `instant_${id}`,
        userId: myId,
        isTyping
      });
    }
  };

  const handleInputChange = (text) => {
    setInputText(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (text.length > 0) {
      handleTyping(true);
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 2000);
    } else {
      handleTyping(false);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      handleTyping(false);
    }
    if (!myId) {
      showEndModal('錯誤', '尚未取得您的資料，請稍後再試');
      return;
    }

    const message = {
      id: String(Date.now()),
      senderId: myId,
      content: inputText,
      createdAt: new Date(),
    };

    const socket = socketAPI.getSocket();
    if (socket) {
      socket.emit('instant-chat-message', { roomId: `instant_${id}`, message });
      setMessages(prev => [...prev, message]);
      setInputText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f4c7ab" />
      </View>
    );
  }

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    return (
      <View style={styles.typingIndicator}>
        <ActivityIndicator size="small" color="#8b5e3c" />
        <Text style={styles.typingText}>
          {typingUsers.length === 1
            ? `${typingUsers[0].username || '對方'} 正在輸入...`
            : `${typingUsers.length} 人正在輸入...`
          }
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.title}>即時聊天</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.timerContainer}>
          <MaterialCommunityIcons name="timer-outline" size={20} color="#5c4033" />
          <Text style={styles.timerText}>剩餘時間: {formatTime(timeLeft)}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isMyMessage = String(item.senderId) === String(myId);
            return (
              <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage]}>
                <Text style={styles.messageText}>{item.content}</Text>
              </View>
            );
          }}
          contentContainerStyle={styles.messageList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {renderTypingIndicator()}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="輸入訊息..."
            placeholderTextColor="#a68a7c"
            onFocus={() => handleTyping(true)}
            onBlur={() => handleTyping(false)}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <MaterialCommunityIcons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ==================== 自訂聊天結束 Modal ==================== */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={endModalVisible}
        onRequestClose={() => setEndModalVisible(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <MaterialCommunityIcons 
              name="timer-off" 
              size={68} 
              color="#e67e22" 
              style={{ marginBottom: 20 }} 
            />

            <Text style={modalStyles.modalTitle}>{endModalTitle}</Text>
            
            <Text style={modalStyles.modalMessage}>
              {endModalMessage}
            </Text>

            <TouchableOpacity
              style={modalStyles.confirmButton}
              onPress={() => {
                setEndModalVisible(false);
                if (global.tempConfirm) {
                  global.tempConfirm();
                  global.tempConfirm = null;
                }
              }}
            >
              <Text style={modalStyles.confirmText}>確定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf5' },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#5c4033', flex: 1, textAlign: 'center' },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
  },
  timerText: { fontSize: 16, fontWeight: '600', color: '#5c4033', marginLeft: 8 },
  messageList: { padding: 16, paddingBottom: 20 },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#f4c7ab',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f4c7ab',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 16, color: '#5c4033' },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f2e8',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 16,
    color: '#5c4033',
  },
  sendButton: {
    backgroundColor: '#f4c7ab',
    borderRadius: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(244, 199, 171, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 199, 171, 0.3)',
  },
  typingText: {
    fontSize: 14,
    color: '#8b5e3c',
    marginLeft: 8,
    fontStyle: 'italic',
  },
});

// Modal 樣式
const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(92, 64, 51, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 380,
    backgroundColor: '#fffaf5',
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 2,
    borderColor: '#f4c7ab',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 17,
    color: '#5c4033',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  confirmButton: {
    backgroundColor: '#f4c7ab',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 16,
  },
  confirmText: {
    color: '#3d2a1f',
    fontSize: 17,
    fontWeight: '700',
  },
});