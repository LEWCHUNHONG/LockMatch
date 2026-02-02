// app/chat/[roomId].js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  ScrollView,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
// 移除 NetInfo 導入，先不使用
import { chatAPI, socketAPI, fixImageUrl, API_URL } from '../../utils/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ChatRoom() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 確保 roomId 是正確的
  let roomId = params.roomId;
  
  const [message, setMessage] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [errorInfo, setErrorInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const flatListRef = useRef(null);
  const messageInputRef = useRef(null);
  const userRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const pendingMessagesRef = useRef({}); // 改為對象用於追蹤臨時消息
  const lastMessageTimeRef = useRef(0); // 用於防止重複發送

  useEffect(() => {
    // 再次驗證 roomId
    if (!roomId || roomId === 'image-preview' || isNaN(parseInt(roomId))) {
      console.error('錯誤的 roomId:', roomId);
      Alert.alert(
        '錯誤',
        '無法進入此聊天室',
        [
          { 
            text: '返回聊天列表', 
            onPress: () => router.replace('/chat') 
          }
        ]
      );
      return;
    }

    // 初始化聊天室
    initializeChatRoom();

    // 監聽鍵盤事件 - 使用新的 API
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      // 清除鍵盤監聽器 - 使用新的 API
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      
      // 清除打字指示器計時器
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // 離開房間並斷開Socket連接
      if (socketRef.current && socketRef.current.connected) {
        socketAPI.leaveRoom(roomId);
        socketAPI.disconnectSocket();
      }
      
      // 清空待處理消息
      pendingMessagesRef.current = {};
    };
  }, [roomId]);

  const initializeChatRoom = async () => {
    try {
      // 驗證 roomId
      if (!roomId || roomId === 'image-preview' || isNaN(parseInt(roomId))) {
        console.error('無效的 roomId:', roomId);
        setErrorInfo({
          type: 'invalid_room',
          message: '無效的聊天室ID'
        });
        setLoading(false);
        return;
      }

      console.log('初始化聊天室，roomId:', roomId);
      
      // 1. 先載入用戶
      await loadUser();
      
      // 2. 初始化Socket連接
      await initSocketConnection();
      
      // 3. 載入聊天室資訊
      await loadRoomInfo();
      
      // 4. 載入消息
      await loadMessages();
      
      // 5. 加入Socket房間
      if (socketRef.current && socketRef.current.connected) {
        socketAPI.joinRoom(roomId);
      }
    } catch (error) {
      console.error('初始化聊天室失敗:', error);
      setErrorInfo({
        type: 'init_error',
        message: '初始化聊天室失敗'
      });
      setLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // 確保 ID 是字串型別
        parsedUser.id = String(parsedUser.id);
        setUser(parsedUser);
        userRef.current = parsedUser;
        console.log('載入使用者成功:', parsedUser.id, parsedUser.username);
        return parsedUser;
      } else {
        console.error('沒有找到使用者信息');
        Alert.alert('錯誤', '請重新登入');
        router.replace('/login');
        return null;
      }
    } catch (error) {
      console.error('載入使用者失敗:', error);
      Alert.alert('錯誤', '載入使用者信息失敗');
      return null;
    }
  };

  const initSocketConnection = async () => {
    try {
      console.log('初始化 Socket 連接...');
      
      // 斷開現有連接
      if (socketRef.current) {
        socketAPI.disconnectSocket();
      }
      
      // 初始化新連接
      const socket = await socketAPI.initSocket();
      
      if (!socket) {
        console.error('Socket 初始化失敗');
        return;
      }
      
      socketRef.current = socket;
      
      // 監聽連接事件
      socket.on('connect', () => {
        //console.log('Socket 連接成功，ID:', socket.id);
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket 連接錯誤:', error.message);
        setIsConnected(false);
        
        // 嘗試重新連接
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current++;
          console.log(`嘗試重新連接 (${reconnectAttemptRef.current}/${maxReconnectAttempts})...`);
          setTimeout(() => {
            initSocketConnection();
          }, 2000 * reconnectAttemptRef.current); // 指數退避
        }
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket 連接斷開:', reason);
        setIsConnected(false);
      });
      
      // 監聽新消息
      socket.on('new-message', (newMessage) => {
        //console.log('收到即時新消息:', newMessage);
        handleNewMessage(newMessage, false);
      });
      
      // 監聽自己發送的消息（確保同步）
      socket.on('message-sent', (message) => {
        //console.log('消息發送成功:', message);
        handleNewMessage(message, true);
      });
      
      // 監聽打字指示器
      socket.on('user-typing', (data) => {
        if (data.userId !== userRef.current?.id) {
          setTypingUsers(prev => {
            const exists = prev.find(u => u.userId === data.userId);
            if (data.isTyping && !exists) {
              return [...prev, data];
            } else if (!data.isTyping && exists) {
              return prev.filter(u => u.userId !== data.userId);
            }
            return prev;
          });
        }
      });
      
      // 監聽消息已讀回執
      socket.on('message-read', (data) => {
        console.log('消息已讀:', data);
        // 更新消息的已讀狀態
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId ? { ...msg, read_count: (msg.read_count || 0) + 1 } : msg
        ));
      });
      
      // 監聽用戶加入房間
      socket.on('user-joined', (data) => {
        //console.log('用戶加入房間:', data);
        // 可以顯示通知或更新UI
      });
      
      // 監聽錯誤
      socket.on('error', (error) => {
        console.error('Socket 錯誤:', error);
      });
      
    } catch (error) {
      console.error('初始化 Socket 連接失敗:', error);
    }
  };

  const loadRoomInfo = async () => {
    try {
      //console.log(`開始載入聊天室資訊: roomId=${roomId}`);
      setErrorInfo(null);
      
      const response = await chatAPI.getChatRoomInfo(roomId);
      //console.log('聊天室資訊響應:', response.data);
      
      if (response.data.success) {
        const room = response.data.room;
        setRoomInfo({
          id: String(room.id),
          name: room.name || '未知聊天室',
          type: room.type || 'private',
          members_count: room.members_count || 1,
          description: room.description,
          avatar: room.avatar,
          mbti: room.mbti,
          is_online: room.is_online,
          status: room.is_online ? '在線' : '離線',
        });
      } else {
        console.error('獲取聊天室資訊失敗:', response.data.error);
        setErrorInfo({
          type: 'room_error',
          message: response.data.error || '無法載入聊天室資訊'
        });
      }
    } catch (error) {
      console.error('載入聊天室資訊失敗:', error);
      
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code
      };
      console.error('錯誤詳情:', errorDetails);
      
      setErrorInfo({
        type: 'network_error',
        message: '無法載入聊天室資訊',
        details: errorDetails
      });
      
      // 設置默認聊天室資訊
      setRoomInfo({
        id: String(roomId),
        name: '聊天室',
        type: 'unknown',
        members_count: 0,
        is_online: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (showLoading = true) => {
    // 確保用戶已載入
    if (!userRef.current || !userRef.current.id) {
      console.log('用戶未載入，等待載入...');
      await loadUser();
      return;
    }
    
    try {
      if (showLoading) setLoadingMessages(true);
      
      //console.log(`開始載入消息，roomId=${roomId}, user.id=${userRef.current.id}`);
      
      const response = await chatAPI.getChatMessages(roomId);
      //console.log('載入消息響應:', response.data);
      
      if (response.data.success) {
        const formattedMessages = response.data.messages.map(msg => {
          // 確保比較時都是字串
          const senderIdStr = String(msg.sender_id);
          const userIdStr = String(userRef.current.id);
          const isOwn = senderIdStr === userIdStr;
          
          return formatMessageData(msg, isOwn);
        });
        
        setMessages(formattedMessages);
        
        // 滾動到最新消息
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.error('載入消息失敗，服務器返回錯誤:', response.data.error);
        setErrorInfo({
          type: 'messages_error',
          message: response.data.error || '無法載入訊息'
        });
      }
    } catch (error) {
      console.error('載入訊息失敗:', error);
      
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code
      };
      console.error('錯誤詳情:', errorDetails);
      
      setErrorInfo({
        type: 'messages_error',
        message: '無法載入訊息，請檢查網路連線',
        details: errorDetails
      });
      
      if (showLoading) {
        if (error.response?.status === 403) {
          Alert.alert(
            '權限不足',
            '您無法訪問此聊天室\n\n可能原因：\n1. 您不是此聊天室的成員\n2. 聊天室已被刪除\n3. 您沒有訪問權限',
            [
              { text: '返回聊天列表', onPress: () => router.back() },
              { text: '調試', onPress: debugRoomAccess }
            ]
          );
        } else if (error.response?.status === 404) {
          Alert.alert('聊天室不存在', '此聊天室已被刪除或不存在');
        }
      }
    } finally {
      if (showLoading) setLoadingMessages(false);
      setRefreshing(false);
    }
  };

  const formatMessageData = (msg, isOwn) => {
    // 處理圖片URL
    let imageUrl = null;
    
    if (msg.message_type === 'image' && msg.content) {
      if (typeof msg.content === 'string' && msg.content.trim() !== '') {
        imageUrl = fixImageUrl(msg.content);
      }
    }
    
    // 計算消息狀態
    let status = 'sent';
    if (msg.isTemp || msg.isSending) {
      status = 'sending';
    } else if (msg.isFailed) {
      status = 'failed';
    }
    
    return {
      id: String(msg.id || msg.tempId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
      text: msg.content,
      senderId: String(msg.sender_id || msg.senderId),
      senderName: msg.username || msg.senderName || '未知用戶',
      time: formatTime(msg.created_at || msg.time),
      isOwn: isOwn,
      avatar: msg.avatar,
      type: msg.message_type || msg.type || 'text',
      read_count: msg.read_count || 0,
      is_read_by_me: msg.is_read_by_me || false,
      file_name: msg.file_name || msg.fileName,
      file_size: msg.file_size || msg.fileSize,
      content: msg.content,
      imageUrl: imageUrl || msg.imageUrl,
      isLoaded: true,
      status: status,
      isTemp: msg.isTemp || false,
      isSending: msg.isSending || false,
      isFailed: msg.isFailed || false,
      created_at: msg.created_at || new Date().toISOString(),
      tempId: msg.tempId,
      localUri: msg.localUri, // 保存本地URI
    };
  };

  const handleNewMessage = (newMessage, isOwnMessage = false) => {
    // 防止過於頻繁的處理
    const now = Date.now();
    if (now - lastMessageTimeRef.current < 100) {
      return;
    }
    lastMessageTimeRef.current = now;
    
    // 確保 ID 是字串
    const messageId = String(newMessage.id);
    const senderIdStr = String(newMessage.sender_id);
    const userIdStr = userRef.current?.id;
    const isOwn = isOwnMessage || senderIdStr === userIdStr;
    
    console.log('處理新消息:', { 
      id: messageId, 
      isOwn, 
      type: newMessage.message_type,
      senderId: senderIdStr,
      userId: userIdStr
    });
    
    // 如果是自己的消息，檢查是否有對應的臨時消息
    if (isOwn) {
      // 查找對應的臨時消息
      let tempIdToRemove = null;
      for (const tempId in pendingMessagesRef.current) {
        const tempMessage = pendingMessagesRef.current[tempId];
        // 對於圖片消息，我們無法直接比較內容，因為本地URI和伺服器URL不同
        // 我們使用時間戳和發送者來判斷
        if (tempMessage.type === newMessage.message_type &&
            tempMessage.senderId === senderIdStr) {
          
          // 檢查時間是否接近（10秒內）
          const serverTime = new Date(newMessage.created_at || new Date()).getTime();
          const tempTime = new Date(tempMessage.created_at || new Date()).getTime();
          const timeDiff = Math.abs(serverTime - tempTime);
          
          if (timeDiff < 10000) {
            tempIdToRemove = tempId;
            break;
          }
        }
      }
      
      if (tempIdToRemove) {
        console.log('找到需要替換的臨時消息:', tempIdToRemove);
        delete pendingMessagesRef.current[tempIdToRemove];
        
        // 用伺服器消息替換臨時消息
        setMessages(prev => {
          // 先移除臨時消息
          const filteredMessages = prev.filter(msg => msg.id !== tempIdToRemove);
          
          // 檢查是否已存在相同的伺服器消息
          const exists = filteredMessages.some(msg => 
            msg.id === messageId || 
            (msg.content === newMessage.content && 
             String(msg.senderId) === senderIdStr)
          );
          
          if (!exists) {
            const formattedMessage = formatMessageData(newMessage, isOwn);
            const updatedMessages = [...filteredMessages, formattedMessage];
            
            // 確保消息按時間排序
            return updatedMessages.sort((a, b) => {
              const timeA = new Date(a.created_at || a.time).getTime();
              const timeB = new Date(b.created_at || b.time).getTime();
              return timeA - timeB;
            });
          }
          
          return filteredMessages;
        });
        
        // 滾動到底部
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        // 如果是自己的消息，標記為已讀
        if (newMessage.id) {
          chatAPI.markAsRead(roomId, newMessage.id).catch(console.error);
        }
        
        return;
      }
    }
    
    // 如果沒有匹配的臨時消息，直接添加新消息
    setMessages(prev => {
      // 檢查是否已存在相同的消息
      const exists = prev.some(msg => 
        msg.id === messageId || 
        (msg.content === newMessage.content && 
         String(msg.senderId) === senderIdStr &&
         msg.type === newMessage.message_type)
      );
      
      if (!exists) {
        const formattedMessage = formatMessageData(newMessage, isOwn);
        const updatedMessages = [...prev, formattedMessage];
        
        // 確保消息按時間排序
        return updatedMessages.sort((a, b) => {
          const timeA = new Date(a.created_at || a.time).getTime();
          const timeB = new Date(b.created_at || b.time).getTime();
          return timeA - timeB;
        });
      }
      
      return prev;
    });
    
    // 滾動到底部
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // 如果是自己的消息，標記為已讀
    if (isOwn && newMessage.id) {
      chatAPI.markAsRead(roomId, newMessage.id).catch(console.error);
    }
  };

  const debugRoomAccess = async () => {
    try {
      // 直接顯示當前狀態
      Alert.alert(
        '調試信息',
        `房間ID: ${roomId}\n` +
        `用戶ID: ${userRef.current?.id}\n` +
        `用戶名: ${userRef.current?.username}\n` +
        `Socket連接: ${isConnected ? '已連接' : '未連接'}\n` +
        `房間信息: ${roomInfo ? '已加載' : '未加載'}\n` +
        `消息數量: ${messages.length}\n` +
        `待處理消息數量: ${Object.keys(pendingMessagesRef.current).length}`
      );
    } catch (error) {
      console.error('調試失敗:', error);
      Alert.alert('調試失敗', error.message);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const sendMessage = async () => {
    if (!message.trim() || !userRef.current || sending) return;

    const messageText = message.trim();
    setMessage('');
    
    // 隱藏鍵盤
    if (messageInputRef.current) {
      messageInputRef.current.blur();
    }

    try {
      setSending(true);
      
      // 創建臨時消息ID
      const tempId = `temp_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 先本地顯示發送的消息（臨時消息）
      const tempMessage = {
        id: tempId,
        text: messageText,
        content: messageText,
        senderId: userRef.current.id,
        senderName: userRef.current.username || '我',
        time: formatTime(new Date()),
        created_at: new Date().toISOString(),
        isOwn: true,
        isTemp: true,
        isSending: true,
        isFailed: false,
        type: 'text',
        status: 'sending',
      };

      // 添加到待處理消息
      pendingMessagesRef.current[tempId] = tempMessage;
      
      setMessages(prev => [...prev, tempMessage]);

      // 滾動到最新訊息
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // 發送到伺服器
      const response = await chatAPI.sendMessage(roomId, messageText);
      
      if (response.data.success) {
        console.log('文本消息發送成功，響應:', response.data);
        
        // 更新臨時消息狀態
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, isSending: false, isSent: true } : msg
        ));
        
        // 標記消息為已讀
        if (response.data.messageId) {
          chatAPI.markAsRead(roomId, response.data.messageId).catch(console.error);
        }
      } else {
        // 發送失敗，更新臨時消息狀態
        console.error('文本消息發送失敗:', response.data.error);
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, isSending: false, isFailed: true } : msg
        ));
        Alert.alert('錯誤', response.data.error || '訊息發送失敗');
      }
    } catch (error) {
      console.error('發送訊息失敗:', error);
      setMessages(prev => prev.map(msg => 
        msg.id?.startsWith('temp_') && msg.isSending ? { ...msg, isSending: false, isFailed: true } : msg
      ));
      Alert.alert('錯誤', '無法發送訊息，請檢查網路連線');
    } finally {
      setSending(false);
    }
  };

  // 使用新的FileSystem API獲取文件信息
  const getFileInfo = async (fileUri) => {
    try {
      // 從legacy導入舊的API
      const legacyFileSystem = await import('expo-file-system/legacy');
      const fileInfo = await legacyFileSystem.getInfoAsync(fileUri, { size: true });
      return fileInfo;
    } catch (error) {
      console.error('獲取文件信息失敗:', error);
      return null;
    }
  };

  const sendMediaMessage = async (fileUri, fileType, fileName) => {
    // 防止重複發送
    const now = Date.now();
    if (now - lastMessageTimeRef.current < 1000) {
      console.log('發送過於頻繁，跳過');
      return;
    }
    lastMessageTimeRef.current = now;
    
    if (!userRef.current || sending) return;

    try {
      setSending(true);
      
      // 使用新的getFileInfo函數獲取文件信息
      const fileInfo = await getFileInfo(fileUri);
      
      const fileSize = fileInfo?.size || 0;
      
      // 創建臨時消息ID
      const tempId = `temp_${fileType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 顯示臨時消息，包含圖片預覽
      const tempMessage = {
        id: tempId,
        senderId: userRef.current.id,
        senderName: userRef.current.username || '我',
        time: formatTime(new Date()),
        created_at: new Date().toISOString(),
        isOwn: true,
        isTemp: true,
        isSending: true,
        isFailed: false,
        type: fileType,
        content: fileUri, // 本地URI
        imageUrl: fileUri, // 本地URI，用於顯示
        fileName: fileName || 'file',
        fileSize: fileSize,
        status: 'sending',
        tempId: tempId,
        localUri: fileUri, // 保存本地URI
      };

      // 添加到待處理消息
      pendingMessagesRef.current[tempId] = tempMessage;

      setMessages(prev => [...prev, tempMessage]);

      // 滾動到底部
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // 發送到伺服器 - 使用更穩定的方法
      console.log('發送圖片消息，fileUri:', fileUri, 'fileType:', fileType, 'fileSize:', fileSize);
      
      // 添加超時處理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('上傳超時 (30秒)')), 30000); // 30秒超時
      });
      
      try {
        // 使用Promise.race來處理超時
        const response = await Promise.race([
          chatAPI.sendMediaMessage(roomId, fileUri, fileType, fileName || 'file', fileSize),
          timeoutPromise
        ]);
        
        console.log('圖片消息發送響應:', response.data);
        
        if (response.data.success) {
          // 更新臨時消息狀態
          setMessages(prev => prev.map(msg => 
            msg.id === tempId ? { ...msg, isSending: false, isSent: true } : msg
          ));
          
          // 標記消息為已讀
          if (response.data.messageId) {
            chatAPI.markAsRead(roomId, response.data.messageId).catch(console.error);
          }
          
          // 如果伺服器返回了完整消息，直接調用handleNewMessage
          if (response.data.message) {
            console.log('伺服器返回了完整消息，觸發handleNewMessage');
            setTimeout(() => {
              handleNewMessage(response.data.message, true);
            }, 500);
          }
        } else {
          // 發送失敗，更新狀態
          console.error('圖片消息發送失敗:', response.data.error);
          setMessages(prev => prev.map(msg => 
            msg.id === tempId ? { ...msg, isSending: false, isFailed: true } : msg
          ));
          Alert.alert('錯誤', response.data.error || '發送失敗');
        }
      } catch (error) {
        // 處理超時或網路錯誤
        console.error('發送多媒體失敗:', error);
        console.error('錯誤詳情:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, isSending: false, isFailed: true } : msg
        ));
        
        // 顯示具體的錯誤信息
        let errorMessage = '無法發送檔案';
        if (error.message === '上傳超時 (30秒)') {
          errorMessage = '上傳超時，請檢查網路連線或嘗試較小的檔案';
        } else if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
          errorMessage = '網路錯誤，請檢查：\n1. 伺服器是否運行\n2. 網路連接是否正常\n3. 伺服器地址是否正確';
        } else if (error.message.includes('timeout')) {
          errorMessage = '請求超時，請稍後重試';
        } else {
          errorMessage = `無法發送檔案: ${error.message || '未知錯誤'}`;
        }
        
        Alert.alert('錯誤', errorMessage);
      }
    } catch (error) {
      console.error('發送多媒體整體失敗:', error);
      setMessages(prev => prev.map(msg => 
        msg.id?.startsWith('temp_') && msg.isSending ? { ...msg, isSending: false, isFailed: true } : msg
      ));
      Alert.alert('錯誤', `無法發送檔案: ${error.message || '未知錯誤'}`);
    } finally {
      setSending(false);
      setSelectedImage(null);
    }
  };

  // 處理打字指示器
  const handleTyping = (isTyping) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('typing', {
        roomId,
        isTyping
      });
    }
  };

  // 當用戶輸入時觸發打字指示器
  const handleInputChange = (text) => {
    setMessage(text);
    
    // 清除之前的計時器
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // 發送打字開始
    if (text.length > 0) {
      handleTyping(true);
      
      // 設置計時器，2秒後停止打字指示
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 2000);
    } else {
      handleTyping(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('需要相機權限', '請允許相機權限以使用拍照功能');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // 降低質量以減少文件大小
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
        await sendMediaMessage(asset.uri, 'image', fileName);
      }
    } catch (error) {
      console.error('拍照失敗:', error);
      Alert.alert('錯誤', '拍照失敗，請重試');
    }
    setShowAttachmentMenu(false);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // 降低質量以減少文件大小
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        await sendMediaMessage(asset.uri, 'image', fileName);
      }
    } catch (error) {
      console.error('選擇圖片失敗:', error);
      Alert.alert('錯誤', '選擇圖片失敗，請重試');
    }
    setShowAttachmentMenu(false);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'audio/*', 'video/*', 'application/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const fileType = file.mimeType?.split('/')[0] || 'file';
        await sendMediaMessage(file.uri, fileType, file.name);
      }
    } catch (error) {
      console.error('選擇檔案失敗:', error);
      Alert.alert('錯誤', '選擇檔案失敗，請重試');
    }
    setShowAttachmentMenu(false);
  };

  // 修改：只設置狀態，不導航
  const handleViewImage = (imageUri) => {
    let uri = imageUri;
    // 如果是相對路徑，則使用 fixImageUrl 修復
    if (uri && !uri.startsWith('http') && !uri.startsWith('file://')) {
      uri = fixImageUrl(uri);
    }
    setSelectedImage(uri);
  };

  const handleViewMediaGallery = () => {
    router.push(`/chat/media-viewer?roomId=${roomId}`);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMessages();
  }, []);

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderMessage = ({ item }) => {
    const userIdStr = userRef.current?.id;
    const senderIdStr = item.senderId?.toString();
    const isOwn = userIdStr === senderIdStr;
    
    // 根據狀態決定如何渲染
    const isSending = item.status === 'sending' || item.isSending;
    const isFailed = item.status === 'failed' || item.isFailed;
    const isTemp = item.isTemp;
    
    // 獲取圖片URI
    let imageUri = item.imageUrl || item.content;
    let isLocalImage = false;
    
    if (item.type === 'image') {
      // 如果是臨時消息或上傳中，使用本地URI
      if (isTemp || isSending) {
        imageUri = item.localUri || item.content;
        isLocalImage = true;
      } else {
        // 已上傳的消息，修復URL
        imageUri = fixImageUrl(item.content);
      }
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
      ]}>
        {!isOwn && roomInfo?.type !== 'private' && (
          <View style={styles.messageHeader}>
            {item.avatar ? (
              <Image 
                source={{ uri: fixImageUrl(item.avatar) }} 
                style={styles.senderAvatar}
              />
            ) : null}
            <Text style={styles.senderName}>{item.senderName}</Text>
            <Text style={styles.messageTime}>{item.time}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
          isSending && styles.sendingMessageBubble,
          item.type !== 'text' && styles.mediaMessageBubble,
        ]}>
          {/* 消息內容 */}
          {item.type === 'image' ? (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                if (isSending || isFailed || !imageUri) {
                  // 上傳中、失敗或沒有URI的圖片不點擊查看
                  return;
                }
                handleViewImage(imageUri);
              }}
              disabled={isSending || isFailed || !imageUri}
            >
              <Image 
                source={{ uri: imageUri }}
                style={styles.messageImage}
                resizeMode="cover"
                defaultSource={require('../../assets/placeholder.png')}
                onError={(e) => {
                  console.log('圖片載入失敗:', e.nativeEvent.error, '圖片URI:', imageUri);
                  // 如果是伺服器URL載入失敗，嘗試使用本地URI
                  if (!isLocalImage && item.localUri) {
                    // 這裡可以設置重試邏輯，但我們先記錄日誌
                  }
                }}
              />
              
              {/* 上傳指示器 */}
              {isSending && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.uploadingText}>上傳中...</Text>
                </View>
              )}
              
              {/* 發送失敗指示器 */}
              {isFailed && (
                <View style={styles.failedOverlay}>
                  <MaterialCommunityIcons name="alert-circle" size={24} color="#fff" />
                  <Text style={styles.failedText}>發送失敗</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : item.type === 'audio' ? (
            <View style={styles.audioMessage}>
              <MaterialCommunityIcons name="music-note" size={24} color="#fff" />
              <Text style={styles.audioText}>音頻消息</Text>
              <Text style={styles.fileSize}>{formatFileSize(item.fileSize)}</Text>
            </View>
          ) : item.type === 'video' ? (
            <View style={styles.videoMessage}>
              <MaterialCommunityIcons name="video" size={24} color="#fff" />
              <Text style={styles.videoText}>視頻消息</Text>
              <Text style={styles.fileSize}>{formatFileSize(item.fileSize)}</Text>
            </View>
          ) : item.type === 'file' ? (
            <View style={styles.fileMessage}>
              <MaterialCommunityIcons name="file-document" size={24} color="#fff" />
              <Text style={styles.fileText} numberOfLines={1}>
                {item.fileName || '檔案'}
              </Text>
              <Text style={styles.fileSize}>{formatFileSize(item.fileSize)}</Text>
            </View>
          ) : (
            <Text style={[
              styles.messageText,
              isOwn ? styles.ownMessageText : styles.otherMessageText,
            ]}>
              {item.text}
            </Text>
          )}
        </View>

        {isOwn && (
          <View style={styles.ownMessageFooter}>
            <Text style={styles.ownMessageTime}>{item.time}</Text>
            
            {/* 已讀狀態 */}
            {item.read_count > 0 && !isSending && !isFailed && (
              <MaterialCommunityIcons 
                name={item.read_count > 1 ? "check-all" : "check"} 
                size={14} 
                color={item.read_count > 1 ? "#2ecc71" : "#95a5a6"} 
                style={styles.readIcon} 
              />
            )}
            
            {/* 發送中狀態 */}
            {isSending && (
              <MaterialCommunityIcons 
                name="clock-outline" 
                size={12} 
                color="#a0785e" 
                style={styles.sendingIcon} 
              />
            )}
            
            {/* 發送失敗狀態 */}
            {isFailed && (
              <MaterialCommunityIcons 
                name="alert-circle-outline" 
                size={12} 
                color="#e74c3c" 
                style={styles.failedIcon} 
              />
            )}
          </View>
        )}
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    return (
      <View style={styles.typingIndicator}>
        <ActivityIndicator size="small" color="#8b5e3c" />
        <Text style={styles.typingText}>
          {typingUsers.length === 1 
            ? `${typingUsers[0].username} 正在輸入...`
            : `${typingUsers.length} 人正在輸入...`
          }
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#5c4033" />
      </TouchableOpacity>

      {roomInfo?.type === 'private' && roomInfo.avatar ? (
        <View style={styles.avatarContainer}>
          <Image source={{ uri: fixImageUrl(roomInfo.avatar) }} style={styles.headerAvatar} />
          {roomInfo.is_online && <View style={styles.onlineDot} />}
        </View>
      ) : (
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons 
            name={roomInfo?.type === 'group' ? "account-group" : "account"} 
            size={24} 
            color="#5c4033" 
          />
        </View>
      )}

      <TouchableOpacity 
        style={styles.headerInfo}
        onPress={() => {
          // 如果是群組，跳轉到群組詳情頁面
          if (roomInfo?.type === 'group') {
            router.push(`/chat/group-details?roomId=${roomId}`);
          }
        }}
      >
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {roomInfo?.name || '載入中...'}
          </Text>
        </View>
        
        <View style={styles.headerSubtitleRow}>
          {roomInfo?.type === 'private' ? (
            <>
              {roomInfo?.mbti ? (
                <View style={styles.mbtiContainer}>
                  <Text style={styles.mbtiText}>{roomInfo.mbti}</Text>
                </View>
              ) : null}
              
              <View style={styles.statusContainer}>
                {/* 在線狀態指示器 */}
                <View style={[
                  styles.statusDot,
                  roomInfo.is_online ? styles.onlineDotSmall : styles.offlineDotSmall
                ]} />
                <Text style={styles.statusText}>
                  {roomInfo.is_online ? '在線' : '離線'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.headerSubtitle}>
              {roomInfo?.members_count || 0} 位成員 • {roomInfo?.description || ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.headerActions}>
        
         {/* 
             網路狀態指示器

        <View style={styles.connectionStatus}>
          <View style={[
            styles.connectionDot,
            isConnected ? styles.connectedDot : styles.disconnectedDot
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? '連線' : '離線'}
          </Text>
        </View> 
        
        */}
      
        {/* 多媒體查看按鈕 */}
        <TouchableOpacity 
          style={styles.headerActionButton}
          onPress={handleViewMediaGallery}
        >
          <MaterialCommunityIcons name="image-multiple" size={24} color="#5c4033" />
        </TouchableOpacity>
        
        {/* 如果是群組，添加群組管理按鈕 */}
        {roomInfo?.type === 'group' && (
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={() => router.push(`/chat/group-details?roomId=${roomId}`)}
          >
            <MaterialCommunityIcons name="account-group" size={24} color="#5c4033" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.headerActionButton}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#5c4033" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#e74c3c" />
      <Text style={styles.errorText}>
        {errorInfo?.type === 'invalid_room' ? '無效的聊天室' : 
         errorInfo?.type === 'room_error' ? '聊天室載入失敗' : 
         '消息載入失敗'}
      </Text>
      <Text style={styles.errorSubtext}>{errorInfo?.message}</Text>
      
      <View style={styles.errorButtons}>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => {
            setErrorInfo(null);
            initializeChatRoom();
          }}
        >
          <Text style={styles.errorButtonText}>重新載入</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.errorButton, styles.debugButton]}
          onPress={debugRoomAccess}
        >
          <Text style={styles.errorButtonText}>調試</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.errorButton, styles.backButtonStyle]}
          onPress={() => router.replace('/chat')}
        >
          <Text style={styles.errorButtonText}>返回聊天列表</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyChat}>
      <MaterialCommunityIcons name="message-text-outline" size={60} color="#f4c7ab" />
      <Text style={styles.emptyText}>開始新的對話吧！</Text>
      <Text style={styles.emptySubtext}>發送第一條訊息來開始聊天</Text>
    </View>
  );

  const renderAttachmentMenu = () => (
    <Modal
      visible={showAttachmentMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAttachmentMenu(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowAttachmentMenu(false)}
      >
        <View style={[styles.attachmentMenu, { bottom: keyboardHeight + 20 }]}>
          <TouchableOpacity style={styles.attachmentItem} onPress={handleTakePhoto}>
            <MaterialCommunityIcons name="camera" size={24} color="#5c4033" />
            <Text style={styles.attachmentText}>拍照</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachmentItem} onPress={handlePickImage}>
            <MaterialCommunityIcons name="image" size={24} color="#5c4033" />
            <Text style={styles.attachmentText}>相冊</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachmentItem} onPress={handlePickFile}>
            <MaterialCommunityIcons name="file-document" size={24} color="#5c4033" />
            <Text style={styles.attachmentText}>檔案</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderImagePreview = () => (
    <Modal
      visible={!!selectedImage}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedImage(null)}
    >
      <View style={styles.imagePreviewContainer}>
        <StatusBar hidden />
        <TouchableOpacity
          style={styles.imagePreviewBackground}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        />
        
        <View style={styles.imagePreviewWrapper}>
          <TouchableOpacity 
            style={styles.imagePreviewClose}
            onPress={() => setSelectedImage(null)}
          >
            <MaterialCommunityIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          
          <ScrollView
            style={styles.imageScrollView}
            contentContainerStyle={styles.imageScrollViewContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.imagePreview}
              resizeMode="contain"
            />
          </ScrollView>
          
          <View style={styles.imagePreviewActions}>
            <TouchableOpacity 
              style={styles.imageActionButton}
              onPress={() => {
                Alert.alert('提示', '保存圖片功能將在後續版本添加');
              }}
            >
              <MaterialCommunityIcons name="download" size={24} color="#fff" />
              <Text style={styles.imageActionText}>保存</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imageActionButton}
              onPress={() => {
                Alert.alert('提示', '分享圖片功能將在後續版本添加');
              }}
            >
              <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
              <Text style={styles.imageActionText}>分享</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
            <Text style={styles.loadingText}>載入聊天室中...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (errorInfo && !roomInfo?.name) {
    return (
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {renderErrorState()}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {renderHeader()}

          {errorInfo ? (
            renderErrorState()
          ) : loadingMessages ? (
            <View style={styles.messagesLoadingContainer}>
              <ActivityIndicator size="large" color="#f4c7ab" />
              <Text style={styles.loadingText}>載入訊息中...</Text>
            </View>
          ) : (
            <View style={styles.messagesContainer}>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#f4c7ab']}
                    tintColor="#f4c7ab"
                  />
                }
                ListEmptyComponent={renderEmptyState}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={21}
              />
              {renderTypingIndicator()}
            </View>
          )}

          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.attachmentButton}
              onPress={() => setShowAttachmentMenu(true)}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#5c4033" />
            </TouchableOpacity>
            
            <View style={styles.inputWrapper}>
              <TextInput
                ref={messageInputRef}
                style={styles.input}
                placeholder="輸入訊息..."
                placeholderTextColor="#a0785e"
                value={message}
                onChangeText={handleInputChange}
                multiline
                maxLength={1000}
                editable={!sending}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                onFocus={() => handleTyping(true)}
                onBlur={() => handleTyping(false)}
              />

             {/* 

              <TouchableOpacity
                style={styles.emojiButton}
                onPress={() => {
                  // 表情符號功能
                  Alert.alert('提示', '表情符號功能將在後續版本添加');
                }}
              >
                <MaterialCommunityIcons 
                  name="emoticon-happy-outline" 
                  size={24} 
                  color="#8b5e3c" 
                />
              </TouchableOpacity>

               */}

            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!message.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#a0785e" />
              ) : (
                <MaterialCommunityIcons 
                  name="send" 
                  size={22} 
                  color={message.trim() ? "#5c4033" : "#a0785e"} 
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {renderAttachmentMenu()}
      {renderImagePreview()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 250, 245, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.3)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f4c7ab',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2ecc71',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
    flex: 1,
    marginRight: 8,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  mbtiContainer: {
    backgroundColor: 'rgba(92, 64, 51, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  mbtiText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5c4033',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  onlineDotSmall: {
    backgroundColor: '#2ecc71',
  },
  offlineDotSmall: {
    backgroundColor: '#95a5a6',
  },
  statusText: {
    fontSize: 12,
    color: '#8b5e3c',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8b5e3c',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  connectedDot: {
    backgroundColor: '#2ecc71',
  },
  disconnectedDot: {
    backgroundColor: '#e74c3c',
  },
  connectionText: {
    fontSize: 12,
    color: '#5c4033',
    fontWeight: '600',
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 20,
    flexGrow: 1,
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
  messageContainer: {
    marginBottom: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 8,
  },
  senderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5c4033',
    marginRight: 8,
  },
  messageTime: {
    fontSize: 11,
    color: '#a0785e',
  },
  ownMessageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginRight: 8,
  },
  ownMessageTime: {
    fontSize: 11,
    color: '#a0785e',
    marginRight: 4,
  },
  readIcon: {
    marginLeft: 4,
  },
  sendingIcon: {
    marginLeft: 4,
  },
  failedIcon: {
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '80%',
  },
  ownMessageBubble: {
    backgroundColor: '#f4c7ab',
    borderTopRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
  },
  sendingMessageBubble: {
    opacity: 0.7,
  },
  mediaMessageBubble: {
    padding: 0,
    overflow: 'hidden',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#5c4033',
  },
  otherMessageText: {
    color: '#5c4033',
  },
  messageImage: {
    width: Math.min(screenWidth * 0.6, 300),
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  failedText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 10,
    width: Math.min(screenWidth * 0.6, 250),
  },
  audioText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  videoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 10,
    width: Math.min(screenWidth * 0.6, 250),
  },
  videoText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  fileMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5e3c',
    padding: 12,
    borderRadius: 10,
    width: Math.min(screenWidth * 0.6, 250),
  },
  fileText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  fileSize: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginLeft: 8,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5c4033',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e74c3c',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 30,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  errorButton: {
    backgroundColor: '#f4c7ab',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  debugButton: {
    backgroundColor: '#3498db',
  },
  backButtonStyle: {
    backgroundColor: '#8b5e3c',
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8b5e3c',
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 250, 245, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 199, 171, 0.3)',
  },
  attachmentButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
    marginRight: 12,
    alignSelf: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#5c4033',
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  emojiButton: {
    padding: 4,
  },
  sendButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
    marginLeft: 12,
    alignSelf: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentMenu: {
    backgroundColor: '#fffaf5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
  },
  attachmentItem: {
    alignItems: 'center',
    padding: 15,
  },
  attachmentText: {
    fontSize: 14,
    color: '#5c4033',
    marginTop: 8,
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imagePreviewBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  imagePreviewWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  imageScrollView: {
    width: screenWidth,
    height: screenHeight,
  },
  imageScrollViewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: screenHeight,
  },
  imagePreview: {
    width: screenWidth,
    height: screenHeight,
  },
  imagePreviewActions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  imageActionButton: {
    alignItems: 'center',
    padding: 10,
  },
  imageActionText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
});