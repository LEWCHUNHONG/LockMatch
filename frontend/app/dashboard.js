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
  const [userPoints, setUserPoints] = useState({ total_points: 0, level: '新手會員', completed_tasks_count: 0 });
  const [checkinStatus, setCheckinStatus] = useState({ checked_in_today: false, consecutive_week_days: 0 });
  const [showCheckinSuccessModal, setShowCheckinSuccessModal] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');
  
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

  // 領取歡迎積分
  const claimWelcomePoints = async () => {
    try {
      const response = await api.post('/api/give-welcome-points');
      if (response.data.success) {
        await AsyncStorage.setItem('has_claimed_welcome_points', 'true');
        await fetchUserPoints();
        alert(`成功獲得 ${response.data.points_earned} 歡迎積分！`);
      }
    } catch (error) {
      console.error('領取歡迎積分失敗:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      }
    }
  };

  // 檢查是否領取過歡迎積分
  const checkWelcomePoints = async () => {
    try {
      const hasClaimed = await AsyncStorage.getItem('has_claimed_welcome_points');
      return !hasClaimed; // 如果沒有記錄，則可以領取
    } catch (error) {
      console.error('檢查歡迎積分失敗:', error);
      return false;
    }
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
        // 獲取積分和簽到狀態
        await Promise.all([
          fetchUserPoints(),
          fetchCheckinStatus(),
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
    switch(level) {
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

  return (
    <LinearGradient
      colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
{/* 頂部欄 */}
<View style={styles.topBar}>
  {/* 左邊：聊天按鈕 */}
  <TouchableOpacity 
    style={styles.iconButton}
    onPress={() => router.push('/chat')}
  >
    <MaterialCommunityIcons name="message-badge" size={28} color="#5c4033" />
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
                  <Text style={styles.points}>★ {userPoints.total_points} 積分 →</Text>
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

            {/* 等級顯示 */}
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

          {/* 積分任務提示 */}
          <View style={styles.pointsTipsSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="rocket-launch" size={24} color="#f4c7ab" />
              <Text style={styles.sectionTitle}>快速賺取積分</Text>
            </View>
            
            <View style={styles.pointsTipsCard}>
              <View style={styles.pointsTip}>
                <MaterialCommunityIcons name="checkbox-marked-circle" size={20} color="#2ecc71" />
                <Text style={styles.pointsTipText}>完成MBTI測試 +100積分</Text>
                {!user?.mbti && (
                  <TouchableOpacity 
                    style={styles.pointsTipButton}
                    onPress={() => router.push('/mbti-test')}
                  >
                    <Text style={styles.pointsTipButtonText}>去完成</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.pointsTip}>
                <MaterialCommunityIcons name="calendar-check" size={20} color="#3498db" />
                <Text style={styles.pointsTipText}>每日簽到 +10~60積分</Text>
                {checkinStatus.checked_in_today ? (
                  <View style={[styles.pointsTipButton, { backgroundColor: '#e0e0e0' }]}>
                    <Text style={[styles.pointsTipButtonText, { color: '#888' }]}>已簽到</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.pointsTipButton, isCheckingIn && { opacity: 0.5 }]}
                    onPress={handleDailyCheckin}
                    disabled={checkinStatus.checked_in_today || isCheckingIn}
                  >
                    {isCheckingIn ? (
                      <ActivityIndicator size="small" color="#8b5e3c" />
                    ) : (
                      <Text style={styles.pointsTipButtonText}>去簽到</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.pointsTip}>
                <MaterialCommunityIcons name="account-plus" size={20} color="#9b59b6" />
                <Text style={styles.pointsTipText}>添加好友 +80積分</Text>
                <TouchableOpacity 
                  style={styles.pointsTipButton}
                  onPress={() => router.push('/chat/search')}
                >
                  <Text style={styles.pointsTipButtonText}>去添加</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  justifyContent: 'space-between',     // 關鍵：左右推開，中間自動置中
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
  pointsTipsSection: {
    marginTop: 32,
  },
  pointsTipsCard: {
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
  pointsTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.2)',
  },
  pointsTipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#5c4033',
    fontWeight: '500',
  },
  pointsTipButton: {
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsTipButtonText: {
    color: '#8b5e3c',
    fontSize: 12,
    fontWeight: '600',
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
});