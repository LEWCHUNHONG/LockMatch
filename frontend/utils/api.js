// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { AppState } from 'react-native';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || "https://lockmatch.shamough1792.synology.me";

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
        // 未授權，清除 token 並停止心跳
        await AsyncStorage.multiRemove(['token', 'user']);
        stopHeartbeat();
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

// 心跳相關變數
let heartbeatInterval = null;
let heartbeatIntervalTime = 60000; // 每60秒發送一次心跳
let isHeartbeatRunning = false;
let lastHeartbeatTime = null;



// 發送心跳訊號
const sendHeartbeat = async () => {
  try {
    console.log('❤️ 發送心跳訊號...');
    const response = await api.post('/api/heartbeat');
    lastHeartbeatTime = new Date();
    console.log('✅ 心跳發送成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ 心跳發送失敗:', error);

    // 如果心跳失敗且是 401 錯誤，可能需要重新登入
    if (error.response && error.response.status === 401) {
      console.error('❌ 心跳失敗，token 可能已過期');
      await AsyncStorage.multiRemove(['token', 'user']);
      stopHeartbeat();
    }

    throw error;
  }
};

// 啟動心跳機制
const startHeartbeat = () => {
  // 先清除現有的心跳
  stopHeartbeat();

  // 立即發送第一次心跳
  sendHeartbeat();

  // 設定定期心跳
  heartbeatInterval = setInterval(async () => {
    try {
      await sendHeartbeat();
    } catch (error) {
      console.error('❌ 定期心跳發送失敗:', error);
    }
  }, heartbeatIntervalTime);

  isHeartbeatRunning = true;
  console.log('✅ 啟動心跳機制，間隔:', heartbeatIntervalTime, 'ms');

  return heartbeatInterval;
};

// 停止心跳機制
const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    isHeartbeatRunning = false;
    console.log('🛑 停止心跳機制');
  }
};

// 檢查心跳是否在運行
const isHeartbeatActive = () => {
  return isHeartbeatRunning;
};

// 獲取最後心跳時間
const getLastHeartbeatTime = () => {
  return lastHeartbeatTime;
};

// 更新心跳間隔時間
const setHeartbeatInterval = (interval) => {
  if (interval < 10000) {
    console.warn('⚠️ 心跳間隔時間太短，建議至少10秒');
    return;
  }

  heartbeatIntervalTime = interval;
  console.log('🔄 更新心跳間隔時間:', interval, 'ms');

  // 如果已經有運行中的心跳，重啟它
  if (isHeartbeatRunning) {
    startHeartbeat();
  }
};

// 應用狀態監聽器
let appStateListener = null;

// 監聽應用狀態變化
const setupAppStateListener = () => {
  if (appStateListener) {
    AppState.removeEventListener('change', appStateListener);
  }

  appStateListener = async (nextAppState) => {
    console.log('📱 應用狀態改變:', nextAppState);

    if (nextAppState === 'active') {
      // 應用回到前台，立即發送心跳
      console.log('📱 應用回到前台，發送心跳');
      await sendHeartbeat();

      // 如果心跳沒有運行，重新啟動
      if (!isHeartbeatRunning) {
        startHeartbeat();
      }
    } else if (nextAppState === 'background') {
      // 應用進入後台，停止心跳以節省資源
      console.log('📱 應用進入後台，停止心跳');
      stopHeartbeat();
    } else if (nextAppState === 'inactive') {
      // 應用不活躍，也停止心跳
      console.log('📱 應用不活躍，停止心跳');
      stopHeartbeat();
    }
  };

  AppState.addEventListener('change', appStateListener);
};

// 移除應用狀態監聽器
const removeAppStateListener = () => {
  if (appStateListener) {
    AppState.removeEventListener('change', appStateListener);
    appStateListener = null;
  }
};

// 初始化心跳機制（包含應用狀態監聽）
const initHeartbeat = () => {
  // 啟動心跳
  startHeartbeat();

  // 設置應用狀態監聽
  setupAppStateListener();

  console.log('✅ 初始化心跳機制完成');
};

// 停止心跳機制（包含清理監聽器）
const stopHeartbeatComplete = () => {
  stopHeartbeat();
  removeAppStateListener();
  console.log('✅ 完全停止心跳機制');
};

const initSocket = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        reject(new Error('No token'));
        return;
      }

      if (socket && socket.connected) {
        resolve(socket);
        return;
      }

      if (socket) {
        socket.disconnect();
      }

      socket = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      socket.on('connect', () => {
        console.log('✅ Socket 連接成功，ID:', socket.id);
        resolve(socket);
      });

      socket.on('connect_error', (err) => {
        console.error('❌ Socket 連接錯誤:', err.message);
        reject(err);
      });

      setTimeout(() => reject(new Error('Socket connection timeout')), 10000);
    } catch (error) {
      reject(error);
    }
  });
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
  sendMessage: (roomId, content) => {
    // 發送消息時也更新心跳
    sendHeartbeat().catch(err => console.error('發送消息時心跳失敗:', err));
    return api.post('/api/send-message', { roomId, content });
  },

  // 發送多媒體消息
  sendMediaMessage: async (roomId, fileUri, fileType, fileName, fileSize) => {
    try {
      console.log('發送媒體消息參數:', { roomId, fileUri, fileType, fileName, fileSize });

      // 發送消息前更新心跳
      await sendHeartbeat().catch(err => console.error('發送媒體消息前心跳失敗:', err));

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

  // MBTI 匹配
  mbtiMatching: () => api.post('/api/ai/matching'),

  // 標記消息為已讀
  markAsRead: (roomId, messageId) => {
    sendHeartbeat().catch(err => console.error('標記已讀時心跳失敗:', err));
    return api.post('/api/mark-as-read', { roomId, messageId });
  },

  // 搜索用戶
  searchUsers: (query) => api.get(`/api/search-users?query=${encodeURIComponent(query)}`),

  // 獲取好友列表
  getFriends: () => api.get('/api/friends'),

  // 獲取待處理的好友請求
  getPendingRequests: () => api.get('/api/pending-friend-requests'),

  // 發送好友請求
  sendFriendRequest: (toUserId) => {
    sendHeartbeat().catch(err => console.error('發送好友請求時心跳失敗:', err));
    return api.post('/api/friend-request', { toUserId });
  },

  // 接受好友請求
  acceptFriendRequest: (requestId) => {
    sendHeartbeat().catch(err => console.error('接受好友請求時心跳失敗:', err));
    return api.post('/api/accept-friend-request', { requestId });
  },

  // 拒絕好友請求
  declineFriendRequest: (requestId) => {
    sendHeartbeat().catch(err => console.error('拒絕好友請求時心跳失敗:', err));
    return api.post('/api/decline-friend-request', { requestId });
  },

  // 創建私聊聊天室
  createPrivateChat: (userId) => {
    sendHeartbeat().catch(err => console.error('創建私聊時心跳失敗:', err));
    return api.post('/api/create-private-chat', { userId });
  },

  // 群組相關 API
  createGroup: (name, description, userIds) => {
    sendHeartbeat().catch(err => console.error('創建群組時心跳失敗:', err));
    return api.post('/api/create-group', { name, description, userIds });
  },
  getGroupMembers: (roomId) => api.get(`/api/group-members/${roomId}`),
  addGroupMember: (roomId, userId) => {
    sendHeartbeat().catch(err => console.error('添加群成員時心跳失敗:', err));
    return api.post('/api/add-group-member', { roomId, userId });
  },
  removeGroupMember: (roomId, userId) => {
    sendHeartbeat().catch(err => console.error('移除群成員時心跳失敗:', err));
    return api.post('/api/remove-group-member', { roomId, userId });
  },
  leaveGroup: (roomId) => {
    sendHeartbeat().catch(err => console.error('離開群組時心跳失敗:', err));
    return api.post('/api/leave-group', { roomId });
  },

  // 多媒體消息相關 API
  getChatMedia: (roomId) => api.get(`/api/chat-media/${roomId}`),
  getChatStats: (roomId) => api.get(`/api/chat-stats/${roomId}`),

  // 群組邀請
  sendGroupInvite: (groupId, toUserId) => api.post('/api/group-invite', { groupId, toUserId }),
  acceptGroupInvite: (inviteId) => api.post('/api/accept-group-invite', { inviteId }),
  rejectGroupInvite: (inviteId) => api.post('/api/reject-group-invite', { inviteId }),
  getPendingGroupInvites: () => api.get('/api/pending-group-invites'),

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
  login: async (username, password) => {
    const response = await api.post('/api/login', { username, password });
    if (response.data.success) {
      initHeartbeat();
      await initSocket();
    }
    return response;
  },

  register: async (username, password, email) => {
    const response = await api.post('/api/register', { username, password, email });
    if (response.data.success) {
      initHeartbeat();
      await initSocket();
    }

    return response;
  },

  getCurrentUser: () => api.get('/api/me'),

  uploadAvatar: (formData) => {
    sendHeartbeat().catch(err => console.error('上傳頭像時心跳失敗:', err));
    return api.post('/api/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  deleteAvatar: () => {
    sendHeartbeat().catch(err => console.error('刪除頭像時心跳失敗:', err));
    return api.delete('/api/delete-avatar');
  },

  updateProfile: (data) => {
    sendHeartbeat().catch(err => console.error('更新資料時心跳失敗:', err));
    return api.put('/api/update-profile', data);
  },

  // 新增登出功能
  logout: async () => {
    try {
      // 停止心跳機制
      stopHeartbeatComplete();

      // 斷開 socket 連接
      disconnectSocket();

      // 清除本地儲存
      await AsyncStorage.multiRemove(['token', 'user']);

      console.log('✅ 登出完成');
      return { success: true };
    } catch (error) {
      console.error('❌ 登出失敗:', error);
      throw error;
    }
  },
};

// MBTI 相關 API 函數
const mbtiAPI = {
  // 更新 MBTI 結果
  updateMbti: (mbti) => {
    sendHeartbeat().catch(err => console.error('更新MBTI時心跳失敗:', err));
    return api.put('/api/update-mbti', { mbti });
  },

  // 獲取 MBTI 匹配推薦
  getMbtiMatches: () => api.get('/api/mbti-matches'),

  // 根據 MBTI 搜索用戶
  searchByMbti: (mbtiType) => api.get(`/api/search-by-mbti?type=${mbtiType}`),
};

// 遊戲相關 API 函數
const gameAPI = {
  // 上傳遊戲結果
  uploadGameResult: (gameData) => {
    sendHeartbeat().catch(err => console.error('上傳遊戲結果時心跳失敗:', err));
    return api.post('/api/game/upload-result', gameData);
  },
  
  // 獲取遊戲歷史
  getGameHistory: () => api.get('/api/game/history'),
  
  // 獲取排行榜
  getLeaderboard: () => api.get('/api/game/leaderboard'),
  
  // 解鎖獎勵
  unlockReward: (rewardId) => {
    sendHeartbeat().catch(err => console.error('解鎖獎勵時心跳失敗:', err));
    return api.post('/api/unlock-reward', { rewardId });
  },
  
  // 獲取遊戲統計
  getGameStats: () => api.get('/api/game/stats'),
  
  // 保存遊戲進度
  saveGameProgress: (progressData) => {
    sendHeartbeat().catch(err => console.error('保存進度時心跳失敗:', err));
    return api.post('/api/game/save-progress', progressData);
  },
  
  // 加載遊戲進度
  loadGameProgress: () => api.get('/api/game/load-progress'),
  
  // 測試遊戲API連接
  testGameConnection: () => api.get('/api/game/test'),

  // 獲取本週已用積分（無限模式）
  getWeeklyPoints: () => api.get('/api/game/weekly-points'),

  // ✅ 新增：獲取 MBTI 累計分數與已完成預設關卡
  getMbtiScores: () => api.get('/api/game/mbti-scores'),

  // ✅ 新增：重置 MBTI 進度
  resetMbti: () => api.post('/api/game/reset-mbti'),
};

// 自定義關卡相關 API 函數
const customLevelAPI = {
  // 獲取所有自定義關卡
  getAll: () => api.get('/api/custom-levels'),
  
  // 獲取單個關卡
  get: (id) => api.get(`/api/custom-levels/${id}`),
  
  // 創建新關卡
  create: (levelData) => api.post('/api/custom-levels', levelData),
  
  // 更新關卡
  update: (id, levelData) => api.put(`/api/custom-levels/${id}`, levelData),
  
  // 刪除關卡
  delete: (id) => api.delete(`/api/custom-levels/${id}`),
};

// 臨時聊天相關 API 函數（新增）
const tempChatAPI = {
  // 發送臨時聊天邀請
  sendInvite: (targetUserId) => {
    sendHeartbeat().catch(err => console.error('發送臨時聊天邀請時心跳失敗:', err));
    return api.post('/api/temp-chat/invite', { targetUserId });
  },
  // 接受邀請
  acceptInvite: (inviteId) => {
    sendHeartbeat().catch(err => console.error('接受臨時聊天邀請時心跳失敗:', err));
    return api.post('/api/temp-chat/accept', { inviteId });
  },
  // 拒絕邀請
  rejectInvite: (inviteId) => {
    sendHeartbeat().catch(err => console.error('拒絕臨時聊天邀請時心跳失敗:', err));
    return api.post('/api/temp-chat/reject', { inviteId });
  },
  // 獲取待處理邀請
  getPendingInvites: () => api.get('/api/temp-chat/pending'),
};

// Socket.io 相關函數
const socketAPI = {
  initSocket,
  getSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
};

// 心跳相關函數
const heartbeatAPI = {
  initHeartbeat,
  stopHeartbeatComplete,
  sendHeartbeat,
  startHeartbeat,
  stopHeartbeat,
  isHeartbeatActive,
  getLastHeartbeatTime,
  setHeartbeatInterval,
};

export {
  api,
  chatAPI,
  userAPI,
  mbtiAPI,
  gameAPI,
  customLevelAPI,
  tempChatAPI,      // 新增導出
  socketAPI,
  heartbeatAPI,
  API_URL,
  fixImageUrl
};
export default api;