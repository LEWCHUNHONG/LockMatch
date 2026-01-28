// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const API_URL = 'http://192.168.1.11:3000';

// 創建 axios 實例
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器 - 自動添加 token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('獲取 token 失敗:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器 - 處理錯誤
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response) {
      // 伺服器返回錯誤狀態碼
      if (error.response.status === 401) {
        // 未授權，清除 token
        await AsyncStorage.multiRemove(['token', 'user']);
      } else if (error.response.status === 403) {
        // 權限不足
        console.error('權限不足:', error.response.data);
      } else if (error.response.status === 404) {
        // 資源不存在
        console.error('資源不存在:', error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

// Socket.io 連接實例
let socket = null;

// 初始化 Socket 連接
const initSocket = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.error('未找到 token，無法建立 Socket 連接');
      return null;
    }

    // 如果已有連接，先斷開
    if (socket && socket.connected) {
      socket.disconnect();
    }

    // 建立新連接
    socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    // 連接事件處理
    socket.on('connect', () => {
      console.log('Socket 連接成功，ID:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket 連接錯誤:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket 連接斷開:', reason);
    });

    return socket;
  } catch (error) {
    console.error('初始化 Socket 失敗:', error);
    return null;
  }
};

// 獲取 Socket 實例
const getSocket = () => {
  return socket;
};

// 斷開 Socket 連接
const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// 加入房間
const joinRoom = (roomId) => {
  if (socket && socket.connected) {
    socket.emit('join-room', roomId);
    console.log(`加入房間: ${roomId}`);
  }
};

// 離開房間
const leaveRoom = (roomId) => {
  if (socket && socket.connected) {
    socket.emit('leave-room', roomId);
    console.log(`離開房間: ${roomId}`);
  }
};

// 輔助函數：獲取 MIME 類型
function getMimeType(fileUri, fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/m4a',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

// 輔助函數：修復圖片URL
const fixImageUrl = (url) => {
  if (!url) return null;
  
  url = url.trim();
  
  if (url === 'undefined' || url === 'null' || url.includes('undefined')) {
    return null;
  }
  
  // 如果是完整的URL，直接返回
  if (url.startsWith('http') || url.startsWith('file://')) {
    return url;
  }
  
  // 如果是相對路徑，添加基礎URL
  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }
  
  // 嘗試修復沒有斜杠開頭的路徑
  if (url.includes('uploads/')) {
    return `${API_URL}/${url}`;
  }
  
  // 默認處理：加上斜杠和基礎URL
  return `${API_URL}/${url}`;
};

// 聊天相關 API 函數
const chatAPI = {
  // 獲取聊天室列表
  getChatRooms: () => api.get('/api/chat-rooms'),
  
  // 獲取聊天室詳情
  getChatRoomInfo: (roomId) => {
    console.log(`調用 getChatRoomInfo, roomId=${roomId}`);
    return api.get(`/api/chat-room/${roomId}`);
  },
  
  // 獲取聊天消息
  getChatMessages: (roomId) => {
    console.log(`調用 getChatMessages, roomId=${roomId}`);
    return api.get(`/api/chat-messages/${roomId}`);
  },
  
  // 發送文字消息
  sendMessage: (roomId, content) => api.post('/api/send-message', { roomId, content }),
  
  // 發送多媒體消息
  sendMediaMessage: async (roomId, fileUri, fileType, fileName, fileSize) => {
    try {
      console.log('發送媒體消息參數:', { roomId, fileUri, fileType, fileName, fileSize });
      
      const formData = new FormData();
      formData.append('roomId', roomId.toString());
      
      let finalFileName = fileName;
      if (!finalFileName || finalFileName === '') {
        finalFileName = `file_${Date.now()}`;
      }
      
      // 根據文件類型添加擴展名
      if (fileType === 'image' && !finalFileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        finalFileName = `${finalFileName.split('.')[0] || 'image'}.jpg`;
      } else if (fileType === 'audio' && !finalFileName.toLowerCase().match(/\.(mp3|wav|ogg|m4a)$/)) {
        finalFileName = `${finalFileName.split('.')[0] || 'audio'}.mp3`;
      } else if (fileType === 'video' && !finalFileName.toLowerCase().match(/\.(mp4|mov|avi)$/)) {
        finalFileName = `${finalFileName.split('.')[0] || 'video'}.mp4`;
      }
      
      const mimeType = getMimeType(fileUri, finalFileName);
      
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: finalFileName,
      });
      
      console.log('FormData 內容:', {
        roomId: roomId,
        fileName: finalFileName,
        fileType: fileType,
        mimeType: mimeType,
        fileSize: fileSize
      });
      
      return api.post('/api/send-media-message', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });
    } catch (error) {
      console.error('發送多媒體消息失敗:', error);
      throw error;
    }
  },
  
  // 標記消息為已讀
  markAsRead: (roomId, messageId) => api.post('/api/mark-as-read', { roomId, messageId }),
  
  // 搜索用戶
  searchUsers: (query) => api.get(`/api/search-users?query=${encodeURIComponent(query)}`),
  
  // 獲取好友列表
  getFriends: () => api.get('/api/friends'),
  
  // 獲取待處理的好友請求
  getPendingRequests: () => api.get('/api/pending-friend-requests'),
  
  // 發送好友請求
  sendFriendRequest: (toUserId) => api.post('/api/friend-request', { toUserId }),
  
  // 接受好友請求
  acceptFriendRequest: (requestId) => api.post('/api/accept-friend-request', { requestId }),
  
  // 拒絕好友請求
  declineFriendRequest: (requestId) => api.post('/api/decline-friend-request', { requestId }),
  
  // 創建私聊聊天室
  createPrivateChat: (userId) => api.post('/api/create-private-chat', { userId }),
  
  // 群組相關 API
  createGroup: (name, description, userIds) => api.post('/api/create-group', { name, description, userIds }),
  getGroupMembers: (roomId) => api.get(`/api/group-members/${roomId}`),
  addGroupMember: (roomId, userId) => api.post('/api/add-group-member', { roomId, userId }),
  removeGroupMember: (roomId, userId) => api.post('/api/remove-group-member', { roomId, userId }),
  
  // 多媒體消息相關 API
  getChatMedia: (roomId) => api.get(`/api/chat-media/${roomId}`),
  getChatStats: (roomId) => api.get(`/api/chat-stats/${roomId}`),
  
  // 除錯 API
  debugMediaFiles: () => api.get('/api/debug-media-files'),
  debugFile: (filename) => api.get(`/api/debug-file/${filename}`),
  debugMessage: (messageId) => api.get(`/api/debug-message/${messageId}`),
  testUpload: (formData) => api.post('/api/test-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// 用戶相關 API 函數
const userAPI = {
  login: (username, password) => api.post('/api/login', { username, password }),
  register: (username, password, email) => api.post('/api/register', { username, password, email }),
  getCurrentUser: () => api.get('/api/me'),
  uploadAvatar: (formData) => api.post('/api/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAvatar: () => api.delete('/api/delete-avatar'),
  updateProfile: (data) => api.put('/api/update-profile', data),
};

// MBTI 相關 API 函數
const mbtiAPI = {
  // 更新 MBTI 結果
  updateMbti: (mbti) => api.post('/api/update-mbti', { mbti }),
  
  // 獲取 MBTI 匹配推薦
  getMbtiMatches: () => api.get('/api/mbti-matches'),
  
  // 根據 MBTI 搜索用戶
  searchByMbti: (mbtiType) => api.get(`/api/search-by-mbti?type=${mbtiType}`),
};

// Socket.io 相關函數
const socketAPI = {
  initSocket,
  getSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
};

export { 
  api, 
  chatAPI, 
  userAPI, 
  mbtiAPI,  // 新增
  socketAPI,
  API_URL, 
  fixImageUrl 
};
export default api;