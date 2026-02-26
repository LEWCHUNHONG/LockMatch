// app/dashboard.js
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Vibration,
  BackHandler,
  Dimensions,
  Animated,
  Pressable,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, usePathname } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../utils/api';

// 可重用的按壓卡片組件（獨立動畫）
const AnimatedCard = ({ icon, title, desc, buttonText, onPress, cardWidth }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;




  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.96,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState('');

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={{ width: cardWidth }}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: '#ffffff',
            borderRadius: 24,
            opacity: backgroundOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4],
            }),
          }}
        />
        <MaterialCommunityIcons name={icon} size={56} color="#f4c7ab" />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
        <View style={[styles.cardBtn, { backgroundColor: '#f4c7ab' }]}>
          <Text style={styles.cardBtnText}>{buttonText}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userPoints, setUserPoints] = useState({ points: 0, level: '新手會員', completed_tasks_count: 0 });
  const [checkinStatus, setCheckinStatus] = useState({ checked_in_today: false, consecutive_week_days: 0 });
  const [showCheckinSuccessModal, setShowCheckinSuccessModal] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');
  const [dailyTasks, setDailyTasks] = useState([]);
  const [achievementTasks, setAchievementTasks] = useState([]);
  const [processingTask, setProcessingTask] = useState(null);

  const [couponCount, setCouponCount] = useState(0);


  // 簽到狀態變量
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // 登出按鈕動畫
  const logoutScale = useRef(new Animated.Value(1)).current;

  // 附近按鈕動畫
  const nearbyScale = useRef(new Animated.Value(1)).current;
  const nearbyBackgroundOpacity = useRef(new Animated.Value(0)).current;

  const router = useRouter();
  const pathname = usePathname();

  // 動態計算卡片寬度
  const screenWidth = Dimensions.get('window').width;
  const gap = 16;
  const horizontalPadding = 40;
  const cardWidth = (screenWidth - horizontalPadding - gap) / 2;

  // 從後端獲取最新用戶信息
  const fetchLatestUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return null;
      }

      const response = await api.get('/api/me');
      if (response.data && response.data.user) {
        let latestUser = response.data.user;

        // 確保頭像有完整的URL
        if (latestUser.avatar && !latestUser.avatar.startsWith('http')) {
          if (latestUser.avatar.startsWith('/')) {
            latestUser.avatar = `${api.defaults.baseURL}${latestUser.avatar}`;
          } else {
            latestUser.avatar = `${api.defaults.baseURL}/${latestUser.avatar}`;
          }
        }

        // 添加cache buster確保頭像刷新
        if (latestUser.avatar) {
          latestUser.avatar = `${latestUser.avatar.split('?')[0]}?cb=${Date.now()}`;
        }

        await AsyncStorage.setItem('user', JSON.stringify(latestUser));
        return latestUser;
      }
    } catch (error) {
      console.error('從後端獲取用戶信息失敗:', error);
      // 如果API失敗，嘗試使用緩存數據
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        let parsed = JSON.parse(storedUser);
        if (parsed.avatar) {
          parsed.avatar = `${parsed.avatar.split('?')[0]}?cb=${Date.now()}`;
        }
        return parsed;
      }
    }
    return null;
  };

  // 獲取用戶積分
  const fetchUserPoints = async () => {
    try {
      const response = await api.get('/api/user-points');
      if (response.data.success) {
        setUserPoints(response.data);
      }
    } catch (error) {
      console.error('獲取用戶積分失敗:', error);
    }
  };

  // 獲取簽到狀態
  const fetchCheckinStatus = async () => {
    try {
      const response = await api.get('/api/checkin-status');
      if (response.data.success) {
        setCheckinStatus(response.data);
      }
    } catch (error) {
      console.error('獲取簽到狀態失敗:', error);
    }
  };


  const fetchCouponCount = async () => {
    try {
      const res = await api.get('/api/user-coupons');
      if (res.data.success) {
        setCouponCount(res.data.coupons.length);
      }
    } catch (error) {
      console.error('獲取優惠券數量失敗', error);
    }
  };

  // 獲取任務
  const fetchTasks = async () => {
    try {
      const response = await api.get('/api/tasks');
      if (response.data.success) {
        const tasksData = response.data.tasks || {};
        setDailyTasks(Array.isArray(tasksData.daily) ? tasksData.daily : []);
        setAchievementTasks(Array.isArray(tasksData.achievement) ? tasksData.achievement : []);
      }
    } catch (error) {
      console.error('獲取任務失敗:', error);
    }
  };

  // 每日簽到
  const handleDailyCheckin = async () => {
    // 防重複點擊：如果已經簽到或正在簽到，直接返回
    if (checkinStatus.checked_in_today || isCheckingIn) {
      return;
    }

    setIsCheckingIn(true);

    try {
      //Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await api.post('/api/daily-checkin');

      if (response.data.success) {
        // 立即更新本地簽到狀態，防止重複點擊
        setCheckinStatus(prev => ({
          ...prev,
          checked_in_today: true,
          consecutive_week_days: response.data.streak || (prev.consecutive_week_days || 0) + 1
        }));

        // 更新積分
        await fetchUserPoints();

        // 準備顯示自訂 modal
        const successMessage = response.data.message || `簽到成功！獲得 ${response.data.points_earned} 積分`;
        setCheckinMessage(successMessage);
        setShowCheckinSuccessModal(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // 返回成功，不需要再做其他事情
        return;
      }
    } catch (error) {
      console.error('簽到失敗:', error);

      // 詳細記錄錯誤信息（開發階段）
      if (error.response?.data) {
        console.log('錯誤細節:', error.response.data);
      }

      // 處理各種錯誤情況
      if (error.response?.status === 400) {
        const errorMsg = error.response.data?.error || error.response.data?.message || '今日已簽到';

        if (errorMsg.includes('今日已簽到') || errorMsg.includes('已经签到')) {
          // 更新本地狀態為已簽到
          setCheckinStatus(prev => ({
            ...prev,
            checked_in_today: true
          }));

          // 顯示用戶友好的提示
          const friendlyMsg = error.response.data?.message || '您今天已經簽到過了！明天再來獲得更多積分～';
          alert(friendlyMsg);
        } else {
          // 其他400錯誤
          alert(errorMsg || '簽到失敗，請稍後再試');
        }
      } else if (error.response?.status === 401) {
        alert('登入過期，請重新登入');
        // 導向登入頁
        setTimeout(() => {
          router.replace('/login');
        }, 1000);
      } else if (error.response?.status === 500) {
        alert('伺服器出了點問題，請稍後再試或聯絡管理員');
      } else if (!error.response) {
        // 網絡錯誤
        alert('網路連接錯誤，請檢查連線後再試');
      } else {
        // 其他錯誤
        alert('簽到失敗，請稍後再試');
      }
    } finally {
      // 無論成功或失敗，都結束簽中狀態
      setIsCheckingIn(false);
    }
  };

  // 測試原生模組
  const testNativeModules = async () => {
    try {
      setTestResult('正在測試位置功能...');

      // 測試 Location
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        setTestResult('❌ 位置權限被拒絕');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setTestResult(`✅ 位置獲取成功\n緯度: ${location.coords.latitude.toFixed(4)}\n經度: ${location.coords.longitude.toFixed(4)}`);

      // 測試 Notifications
      setTestResult(prev => prev + '\n\n正在測試推播功能...');
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        setTestResult(prev => prev + '\n❌ 推播權限被拒絕');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setTestResult(prev => prev + `\n✅ 推播 Token 獲取成功\n${token.substring(0, 20)}...`);

    } catch (error) {
      setTestResult(`❌ 測試失敗：${error.message}`);
    }
  };

  // 處理任務操作
  const handleTaskAction = async (task) => {
    if (processingTask === task.id) return;

    setProcessingTask(task.id);

    try {
      if (task.user_status === 'completed') {
        alert('提示', '此任務已完成');
        return;
      }

      if (!task.user_status || task.user_status === 'not_started') {
        // 開始任務
        const response = await api.post('/api/start-task', { taskId: task.id });
        if (response.data.success) {
          if (response.data.completed) {
            alert(
              '恭喜!',
              `任務完成!\n獲得 ${response.data.points_earned} 積分`,
              [{ text: '太好了!', onPress: () => loadUser(false) }]
            );
          } else {
            alert('任務已開始', '請完成任務要求後再來檢查進度');
            loadUser(false);
          }
        }
      } else if (task.user_status === 'in_progress') {
        // 檢查進度
        const response = await api.post('/api/check-task-progress', { taskId: task.id });
        if (response.data.success) {
          if (response.data.completed) {
            alert(
              '恭喜完成!',
              `獲得 ${response.data.points_earned} 積分`,
              [{ text: '太好了!', onPress: () => loadUser(false) }]
            );
          } else {
            const progress = response.data.current_progress || 0;
            const required = response.data.required_progress || 1;
            alert(
              '任務進度',
              `當前進度: ${progress}/${required}\n${response.data.message || '繼續加油!'}`,
              [{ text: '知道了', onPress: () => loadUser(false) }]
            );
          }
        }
      }
    } catch (error) {
      console.error('任務操作失敗:', error);
      alert('操作失敗', error.response?.data?.error || '請稍後再試');
    } finally {
      setProcessingTask(null);
    }
  };

  // 獲取任務按鈕配置
  const getTaskButtonConfig = (task) => {
    if (task.user_status === 'completed') {
      return {
        text: '已完成',
        icon: 'check-circle',
        style: styles.taskButtonCompleted,
        disabled: true
      };
    } else if (task.user_status === 'in_progress') {
      return {
        text: '檢查進度',
        icon: 'progress-clock',
        style: styles.taskButtonInProgress,
        disabled: false
      };
    } else {
      return {
        text: '開始任務',
        icon: 'play-circle',
        style: styles.taskButton,
        disabled: false
      };
    }
  };

  // 渲染任務項目
  const renderTaskItem = (task, index) => {
    const buttonConfig = getTaskButtonConfig(task);
    const isProcessing = processingTask === task.id;
    const isDaily = task.task_type === 'daily';

    return (
      <View key={task.id || index} style={styles.taskItem}>
        <View style={styles.taskItemHeader}>
          <View style={[styles.taskItemIcon, { backgroundColor: isDaily ? '#9b59b6' : '#2ecc71' }]}>
            <MaterialCommunityIcons
              name={isDaily ? 'calendar-today' : 'trophy'}
              size={16}
              color="#fff"
            />
          </View>
          <View style={styles.taskItemInfo}>
            <Text style={styles.taskItemTitle}>{task.title}</Text>
            <View style={styles.taskItemReward}>
              <MaterialCommunityIcons name="star-circle" size={12} color="#f4c7ab" />
              <Text style={styles.taskItemPoints}>+{task.points_reward} 積分</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.taskItemButton, buttonConfig.style, isProcessing && styles.taskButtonDisabled]}
          onPress={() => handleTaskAction(task)}
          disabled={buttonConfig.disabled || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name={buttonConfig.icon} size={12} color="#fff" />
              <Text style={styles.taskItemButtonText}>{buttonConfig.text}</Text>
            </>
          )}
        </TouchableOpacity>

        {task.user_status === 'in_progress' && task.progress !== undefined && (
          <View style={styles.taskItemProgress}>
            <View style={styles.taskItemProgressBar}>
              <View
                style={[
                  styles.taskItemProgressFill,
                  { width: `${Math.min(100, task.progress)}%` }
                ]}
              />
            </View>
            <Text style={styles.taskItemProgressText}>
              {task.current_progress || 0}/{task.points_required || 1}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // 清除所有加載狀態
  const resetAllStates = () => {
    setIsLoading(false);
    setIsCheckingIn(false);
    setRefreshing(false);
  };

  // 載入用戶（每次 focus 重新載入）
  const loadUser = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);

    try {
      // 1. 先從後端獲取最新數據
      const latestUser = await fetchLatestUser();
      if (latestUser) {
        setUser(latestUser);
        // 獲取積分、簽到狀態和任務
        await Promise.all([
          fetchUserPoints(),
          fetchCheckinStatus(),
          fetchTasks(),
        ]);
        setIsLoading(false);
        return;
      }

      // 2. 如果後端失敗，使用本地緩存
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        let parsed = JSON.parse(storedUser);
        if (parsed.avatar) {
          parsed.avatar = `${parsed.avatar.split('?')[0]}?cb=${Date.now()}`;
        }
        setUser(parsed);
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('載入用戶失敗:', error);
    } finally {
      setIsLoading(false);
      setIsCheckingIn(false); // 確保簽中狀態被重置
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUser(true);
      return () => {
        // 當畫面失去焦點時，重置加載狀態
        setIsCheckingIn(false);
      };
    }, [router])
  );

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUser(false);
    setRefreshing(false);
  }, []);

  // 返回鍵攔截
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        setShowLogoutModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [])
  );

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'user']);
      setShowLogoutModal(false);
      setTimeout(() => {
        router.replace('/');
      }, 300);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLogoutPressIn = () => {
    Animated.spring(logoutScale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handleLogoutPressOut = () => {
    Animated.spring(logoutScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleNearbyPressIn = () => {
    Animated.parallel([
      Animated.spring(nearbyScale, {
        toValue: 0.93,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(nearbyBackgroundOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNearbyPressOut = () => {
    Animated.parallel([
      Animated.spring(nearbyScale, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(nearbyBackgroundOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openLogoutModal = () => {
    setShowLogoutModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // MBTI 顏色映射
  const getMbtiColor = (mbti) => {
    if (!mbti) return '#f4c7ab';

    const mbtiColors = {
      'ISTJ': '#3498db', 'ISFJ': '#2ecc71', 'INFJ': '#9b59b6', 'INTJ': '#1abc9c',
      'ISTP': '#e74c3c', 'ISFP': '#f39c12', 'INFP': '#d35400', 'INTP': '#34495e',
      'ESTP': '#e67e22', 'ESFP': '#f1c40f', 'ENFP': '#2ecc71', 'ENTP': '#9b59b6',
      'ESTJ': '#3498db', 'ESFJ': '#1abc9c', 'ENFJ': '#e74c3c', 'ENTJ': '#f39c12'
    };

    return mbtiColors[mbti] || '#f4c7ab';
  };

  // 等級顏色映射
  const getLevelColor = (level) => {
    switch (level) {
      case '鉑金會員': return '#E5E4E2';
      case '黃金會員': return '#FFD700';
      case '白銀會員': return '#C0C0C0';
      case '青銅會員': return '#CD7F32';
      default: return '#f4c7ab';
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <MaterialCommunityIcons name="brain" size={80} color="#f4c7ab" />
            <Text style={styles.loadingText}>載入中...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // 過濾未完成的任務，優先顯示每日任務
  const uncompletedDailyTasks = dailyTasks.filter(task => task.user_status !== 'completed');
  const uncompletedAchievementTasks = achievementTasks.filter(task => task.user_status !== 'completed');
  const allUncompletedTasks = [...uncompletedDailyTasks, ...uncompletedAchievementTasks].slice(0, 3);

  return (
    <LinearGradient
      colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* 頂部欄 */}
        <View style={styles.topBar}>
          {/* 左邊：優惠券按鈕 */}
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/coupons')}>
            <View style={{ position: 'relative' }}>
              <MaterialCommunityIcons name="ticket-percent" size={28} color="#5c4033" />
              {couponCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{couponCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/insights')}
          >
            <MaterialCommunityIcons name="heart-flash" size={28} color="#5c4033" />
          </TouchableOpacity>

          {/* 中間：Logo / 名稱 */}
          <Text style={styles.logo}>LockMATCH</Text>

          {/* 右邊：登出按鈕 */}
          <TouchableOpacity
            style={styles.iconButton}
            onPressIn={handleLogoutPressIn}
            onPressOut={handleLogoutPressOut}
            onPress={openLogoutModal}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
              <MaterialCommunityIcons name="logout" size={28} color="#e74c3c" />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#f4c7ab']}
              tintColor="#f4c7ab"
            />
          }
        >
          {/* 歡迎卡片 - 加入頭像和 MBTI 顯示 */}
          <View style={styles.welcomeCard}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                {user?.avatar ? (
                  <Image
                    source={{
                      uri: user.avatar.includes('http')
                        ? user.avatar
                        : `${api.defaults.baseURL}${user.avatar}?cb=${Date.now()}`
                    }}
                    style={styles.avatarImage}
                    onError={() => {
                      // 如果圖片加載失敗，使用默認頭像
                      setUser(prev => ({
                        ...prev,
                        avatar: `${api.defaults.baseURL}/uploads/avatars/default.png?cb=${Date.now()}`
                      }));
                    }}
                  />
                ) : (
                  <Text style={styles.avatarNumber}>{user?.id || '?'}</Text>
                )}
              </View>
            </View>

            <View style={styles.welcomeInfo}>
              <Text style={styles.welcomeText}>嗨，{user?.username || '使用者'}！</Text>
              <View style={styles.statusContainer}>
                {user?.mbti ? (
                  <View style={[styles.statusTag, { backgroundColor: getMbtiColor(user.mbti) }]}>
                    <MaterialCommunityIcons name="account-check" size={16} color="#fff" />
                    <Text style={[styles.statusTagText, { color: '#fff' }]}>
                      {user.mbti} 型
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.statusTag}
                    onPress={() => router.push('/mbti-test')}
                  >
                    <Text style={styles.statusTagText}>待測 MBTI</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => router.push('/rewards')}>
                  <Text style={styles.points}>★ {userPoints.points} 積分 →</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f4c7ab' }]}
                onPress={() => router.push('/mbti-test')}
              >
                <Text style={styles.actionBtnText}>
                  {user?.mbti ? '重新測試 MBTI' : '開始 MBTI 測試'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f4c7ab' }]}
                onPress={() => router.push('/chat/search')}
              >
                <Text style={[styles.actionBtnText, { color: '#8b5e3c' }]}>尋找匹配</Text>
              </TouchableOpacity>
            </View>

            {/* 新增：AI 聊天 + 匹配聊天 按鈕組 */}
            <View style={styles.chatButtonsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f4c7ab', flex: 1 }]}
                onPress={() => router.push('/chat/ai-chat')}
              >
                <Text style={styles.actionBtnText}>與 AI 聊天</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f4c7ab', flex: 1 }]}
                onPress={() => router.push('/chat')}
              >
                <Text style={[styles.actionBtnText, { color: '#8b5e3c' }]}>匹配聊天</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chatButtonsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f4c7ab', flex: 1 }]}
                onPress={() => router.push('/insights')}
              >
                <Text style={styles.actionBtnText}>性格分析</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.levelContainer}>
              <View style={styles.levelBadge}>
                <MaterialCommunityIcons name="crown" size={16} color={getLevelColor(userPoints.level)} />
                <Text style={styles.levelText}>{userPoints.level}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.checkinButton,
                  (checkinStatus.checked_in_today || isCheckingIn) && {
                    backgroundColor: '#d9b8a3',
                    opacity: 0.8
                  }
                ]}
                onPress={handleDailyCheckin}
                disabled={checkinStatus.checked_in_today || isCheckingIn || refreshing || isLoading}
                activeOpacity={0.7}
              >
                {isCheckingIn ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={checkinStatus.checked_in_today ? "check-circle" : "calendar-check"}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.checkinButtonText}>
                      {checkinStatus.checked_in_today ? '今日已簽到' : '每日簽到'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 功能卡片網格 - 使用獨立動畫卡片 */}
          <View style={styles.cardsGrid}>
            <AnimatedCard
              icon="gamepad-variant"
              title="MBTI 遊戲測試"
              desc="透過有趣的互動遊戲了解你的真實個性"
              buttonText={user?.mbti ? '重新測試' : '開始測試'}
              onPress={() => router.push('/mbti-test')}
              cardWidth={cardWidth}
            />

            <AnimatedCard
              icon="heart-multiple"
              title="智能匹配"
              desc="基於 MBTI 找到最適合的學習夥伴、運動搭檔"
              buttonText="尋找匹配"
              onPress={() => router.push('/chat/search')}
              cardWidth={cardWidth}
            />

            <AnimatedCard
              icon="map-marker-radius"
              title="探索附近"
              desc="發現附近的社交活動和 AR 互動點"
              buttonText="開始探索"
              onPress={() => {
                //router.push('/nearby');
              }}
              cardWidth={cardWidth}
            />

            <AnimatedCard
              icon="star-circle"
              title="獎勵任務"
              desc="完成任務賺積分，兌換優惠券、電影票等獎勵！"
              buttonText="查看任務"
              onPress={() => router.push('/rewards')}
              cardWidth={cardWidth}
            />
          </View>

          {/* 如果用戶已測試 MBTI，顯示匹配推薦 */}
          {user?.mbti && (
            <View style={styles.recommendationSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>為你推薦</Text>
                <TouchableOpacity onPress={() => router.push('/chat/search')}>
                  <Text style={styles.seeAll}>查看全部</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recommendationCard}>
                <MaterialCommunityIcons name="lightbulb-on" size={32} color="#f4c7ab" />
                <Text style={styles.recommendationTitle}>找到同類型的夥伴</Text>
                <Text style={styles.recommendationText}>
                  你屬於 {user.mbti} 類型，系統為你推薦相似性格的用戶，開始聊天認識新朋友吧！
                </Text>
                <TouchableOpacity
                  style={styles.recommendationButton}
                  onPress={() => router.push('/chat/search')}
                >
                  <Text style={styles.recommendationButtonText}>查看推薦用戶</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#5c4033" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 每日任務 */}
          <View style={styles.tasksSection}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="calendar-today" size={24} color="#9b59b6" />
                <Text style={styles.sectionTitle}>每日任務</Text>
              </View>

              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/rewards')}
              >
                <Text style={styles.viewAllText}>查看全部</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#8b5e3c" />
              </TouchableOpacity>
            </View>

            {allUncompletedTasks.length > 0 ? (
              <View style={styles.tasksCard}>
                {allUncompletedTasks.map((task, index) => renderTaskItem(task, index))}

                <View style={styles.tasksFooter}>
                  <Text style={styles.tasksFooterText}>
                    完成更多任務可以獲得更多積分！
                  </Text>
                  <TouchableOpacity
                    style={styles.tasksFooterButton}
                    onPress={() => router.push('/rewards')}
                  >
                    <Text style={styles.tasksFooterButtonText}>前往任務中心</Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#5c4033" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.emptyTasksCard}>
                <MaterialCommunityIcons name="check-circle-outline" size={48} color="#f4c7ab" />
                <Text style={styles.emptyTasksTitle}>暫無未完成任務</Text>
                <Text style={styles.emptyTasksText}>
                  太棒了！你已經完成了所有推薦任務。
                </Text>
                <TouchableOpacity
                  style={styles.emptyTasksButton}
                  onPress={() => router.push('/rewards')}
                >
                  <Text style={styles.emptyTasksButtonText}>查看所有任務</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 底部導航欄 */}
        <View style={styles.bottomTabContainer}>
          <View style={styles.bottomTab}>
            <TouchableOpacity style={styles.tabItem}>
              <MaterialCommunityIcons name="home" size={28} color="#5c4033" />
              <Text style={styles.tabLabel}>首頁</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/chat/search')}>
              <MaterialCommunityIcons name="heart-multiple" size={28} color="#5c4033" />
              <Text style={styles.tabLabel}>匹配</Text>
            </TouchableOpacity>

            <Pressable
              style={[styles.tabItem, styles.centerTab]}
              onPressIn={handleNearbyPressIn}
              onPressOut={handleNearbyPressOut}
              android_ripple={{ color: 'transparent' }}
              android_disableSound={true}
            >
              <Animated.View style={{ transform: [{ scale: nearbyScale }] }}>
                <View style={styles.centerIconWrapper}>
                  <View style={StyleSheet.absoluteFillObject} />
                  <Animated.View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: '#ffffff',
                      borderRadius: 34,
                      opacity: nearbyBackgroundOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.45],
                      }),
                    }}
                  />
                  <MaterialCommunityIcons name="map-marker-radius-outline" size={36} color="#5c4033" />
                </View>
              </Animated.View>
              <Text style={styles.centerLabel}>附近</Text>
            </Pressable>

            <TouchableOpacity style={styles.tabItem}
              onPress={() => router.push('/discuss')}
            >
              <MaterialCommunityIcons name="forum" size={28} color="#5c4033" />
              <Text style={styles.tabLabel}>討論區</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/profile')}>
              <MaterialCommunityIcons name="account" size={28} color="#5c4033" />
              <Text style={styles.tabLabel}>我的</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* 登出確認 Modal */}
      <Modal
        isVisible={showLogoutModal}
        onBackdropPress={() => setShowLogoutModal(false)}
        onBackButtonPress={() => setShowLogoutModal(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>確定要登出嗎？</Text>
          <Text style={modalStyles.message}>你將需要重新登入才能繼續使用</Text>
          <View style={modalStyles.buttonRow}>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.cancelButton]}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={modalStyles.cancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={modalStyles.logoutText}>登出</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        isVisible={showCheckinSuccessModal}
        onBackdropPress={() => setShowCheckinSuccessModal(false)}
        onBackButtonPress={() => setShowCheckinSuccessModal(false)}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropOpacity={0.4}
      >
        <View style={modalStyles.container}>
          <MaterialCommunityIcons
            name="check-circle"
            size={64}
            color="#2ecc71"
            style={{ marginBottom: 16 }}
          />

          <Text style={modalStyles.title}>簽到成功！</Text>

          <Text style={[modalStyles.message, { fontSize: 18, fontWeight: '700', color: '#5c4033' }]}>
            {checkinMessage}
          </Text>

          {checkinStatus.consecutive_week_days >= 2 && (
            <Text style={[modalStyles.message, { marginTop: 8, color: '#e67e22' }]}>
              連續簽到 {checkinStatus.consecutive_week_days} 天 🎉
            </Text>
          )}

          <TouchableOpacity
            style={[modalStyles.checkinSuccessButton]}
            onPress={() => setShowCheckinSuccessModal(false)}
          >
            <Text style={modalStyles.checkinSuccessButtonText}>
              好的
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#5c4033',
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(255, 250, 245, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.3)',
  },
  logo: {
    color: '#5c4033',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
    position: 'relative',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 28,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  avatarWrapper: { marginBottom: 16 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fffaf5',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarNumber: {
    color: '#5c4033',
    fontSize: 36,
    fontWeight: '800',
  },
  welcomeInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusTagText: {
    color: '#5c4033',
    fontSize: 13,
    fontWeight: '600',
  },
  points: {
    color: '#c47c5e',
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#5c4033',
    fontSize: 15,
    fontWeight: '600',
  },
  // 新增：聊天按鈕組水平佈局
  chatButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    width: '100%',
    marginBottom: 16,
  },
  levelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 199, 171, 0.2)',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5e3c',
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  checkinButtonText: {
    color: '#5c4033',
    fontSize: 13,
    fontWeight: '600',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 14,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  cardBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
  },
  cardBtnText: {
    color: '#5c4033',
    fontSize: 15,
    fontWeight: '600',
  },
  recommendationSection: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
  },
  seeAll: {
    fontSize: 14,
    color: '#8b5e3c',
    fontWeight: '600',
  },
  recommendationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
    marginTop: 16,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#8b5e3c',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  recommendationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  recommendationButtonText: {
    color: '#5c4033',
    fontSize: 15,
    fontWeight: '600',
  },
  // 任務部分樣式
  tasksSection: {
    marginTop: 32,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#8b5e3c',
    fontWeight: '600',
  },
  tasksCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  taskItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.2)',
  },
  taskItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  taskItemInfo: {
    flex: 1,
  },
  taskItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5c4033',
    marginBottom: 2,
  },
  taskItemReward: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskItemPoints: {
    fontSize: 12,
    color: '#f4c7ab',
    fontWeight: '600',
    marginLeft: 4,
  },
  taskItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  taskButton: {
    backgroundColor: '#f4c7ab',
  },
  taskButtonInProgress: {
    backgroundColor: '#3498db',
  },
  taskButtonCompleted: {
    backgroundColor: '#95a5a6',
  },
  taskButtonDisabled: {
    opacity: 0.6,
  },
  taskItemButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  taskItemProgress: {
    marginTop: 4,
  },
  taskItemProgressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  taskItemProgressFill: {
    height: '100%',
    backgroundColor: '#2ecc71',
  },
  taskItemProgressText: {
    fontSize: 10,
    color: '#8b5e3c',
    textAlign: 'center',
  },
  tasksFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 199, 171, 0.2)',
    alignItems: 'center',
  },
  tasksFooterText: {
    fontSize: 12,
    color: '#8b5e3c',
    marginBottom: 12,
    textAlign: 'center',
  },
  tasksFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  tasksFooterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5c4033',
  },
  emptyTasksCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  emptyTasksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5c4033',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyTasksText: {
    fontSize: 13,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyTasksButton: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  emptyTasksButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5c4033',
  },
  bottomTabContainer: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bottomTab: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 36,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    width: '100%',
    maxWidth: 440,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  centerTab: {
    marginTop: -36,
  },
  centerIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#c47c5e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 4,
    overflow: 'hidden',
  },
  centerLabel: {
    color: '#8b5e3c',
    fontWeight: '600',
    fontSize: 13,
  },
  tabLabel: {
    color: '#8b5e3c',
    fontSize: 12,
    fontWeight: '500',
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
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f4c7ab',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#5c4033',
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fffaf5',
  },
  checkinSuccessButton: {
    backgroundColor: '#f4c7ab',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    marginTop: 24,
    minWidth: 120,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkinSuccessButtonText: {
    color: '#3d2a1f',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});