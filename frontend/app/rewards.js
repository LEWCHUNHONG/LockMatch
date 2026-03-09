// app/rewards.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../utils/api';
import Modal from 'react-native-modal';

const { width } = Dimensions.get('window');

export default function RewardsScreen() {
  const [activeTab, setActiveTab] = useState('daily');
  const [userPoints, setUserPoints] = useState({
    points: 0,
    level: '新手會員',
    completed_tasks_count: 0
  });
  const [tasks, setTasks] = useState({
    achievement: [],
    daily: []
  });
  const [shopItems, setShopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState({
    checked_in_today: false,
    consecutive_week_days: 0
  });
  const [processingTask, setProcessingTask] = useState(null);
  const [showCheckinSuccessModal, setShowCheckinSuccessModal] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');

  const router = useRouter();

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);

      // 平行加載所有資料
      const [pointsRes, tasksRes, checkinRes] = await Promise.all([
        api.get('/api/user-points').catch(() => ({ data: { success: false } })),
        api.get('/api/tasks').catch(() => ({ data: { success: false } })),
        api.get('/api/checkin-status').catch(() => ({ data: { success: false } }))
      ]);

      if (pointsRes.data.success) {
        setUserPoints(pointsRes.data);
      }

      if (tasksRes.data.success) {
        const tasksData = tasksRes.data.tasks || {};
        setTasks({
          achievement: Array.isArray(tasksData.achievement) ? tasksData.achievement : [],
          daily: Array.isArray(tasksData.daily) ? tasksData.daily : []
        });
      }

      if (checkinRes.data.success) {
        setCheckinStatus(checkinRes.data);
      }

      // 如果當前是商店標籤，加載商店資料
      if (activeTab === 'shop') {
        const shopRes = await api.get('/api/shop-items').catch(() => ({ data: { success: false } }));
        if (shopRes.data.success) {
          setShopItems(Array.isArray(shopRes.data.items) ? shopRes.data.items : []);
        }
      }
    } catch (error) {
      console.error('加載資料失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const handleRedeem = async (item) => {
    // 前端積分檢查（可選）
    if (userPoints.points < item.points_required) {
      Alert.alert('積分不足', '你嘅積分唔夠兌換呢個商品');
      return;
    }

    try {
      const response = await api.post('/api/redeem-item', { itemId: item.id });
      if (response.data.success) {
        Alert.alert(
          '兌換成功！',
          `你已成功兌換 ${response.data.itemName || item.name}\n優惠碼: ${response.data.couponCode || ''}`,
          [
            { text: '查看我的優惠券', onPress: () => router.push('/coupons') },
            { text: '繼續瀏覽', style: 'cancel' }
          ]
        );
        // 重新載入用戶積分和商店列表
        loadAllData();
      }
    } catch (error) {
      Alert.alert('兌換失敗', error.response?.data?.error || '請稍後再試');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  const handleDailyCheckin = async () => {
    if (checkinStatus.checked_in_today) {
      Alert.alert('提示', '今日已簽到,明天再來吧!');
      return;
    }

    try {
      const response = await api.post('/api/daily-checkin');
      if (response.data.success) {
        // 更新簽到狀態
        setCheckinStatus(prev => ({
          ...prev,
          checked_in_today: true,
          consecutive_week_days: response.data.streak || (prev.consecutive_week_days || 0) + 1
        }));

        // 設置彈窗訊息
        const successMessage = `獲得 ${response.data.points_earned} 積分`;
        setCheckinMessage(successMessage);
        setShowCheckinSuccessModal(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // 重新載入資料
        loadAllData();
      }
    } catch (error) {
      Alert.alert('簽到失敗', error.response?.data?.error || '請稍後再試');
    }
  };

  const handleTaskAction = async (task) => {
    if (processingTask === task.id) return;

    setProcessingTask(task.id);

    try {
      if (task.user_status === 'completed') {
        Alert.alert('提示', '此任務已完成');
        return;
      }

      if (!task.user_status || task.user_status === 'not_started') {
        // 開始任務
        const response = await api.post('/api/start-task', { taskId: task.id });
        if (response.data.success) {
          if (response.data.completed) {
            Alert.alert(
              '恭喜!',
              `任務完成!\n獲得 ${response.data.points_earned} 積分`,
              [{ text: '太好了!', onPress: () => loadAllData() }]
            );
          } else {
            Alert.alert('任務已開始', '請完成任務要求後再來檢查進度');
            loadAllData();
          }
        }
      } else if (task.user_status === 'in_progress') {
        // 檢查進度
        const response = await api.post('/api/check-task-progress', { taskId: task.id });
        if (response.data.success) {
          if (response.data.completed) {
            Alert.alert(
              '恭喜完成!',
              `獲得 ${response.data.points_earned} 積分`,
              [{ text: '太好了!', onPress: () => loadAllData() }]
            );
          } else {
            const progress = response.data.current_progress || 0;
            const required = response.data.required_progress || 1;
            Alert.alert(
              '任務進度',
              `當前進度: ${progress}/${required}\n${response.data.message || '繼續加油!'}`,
              [{ text: '知道了', onPress: () => loadAllData() }]
            );
          }
        }
      }
    } catch (error) {
      console.error('任務操作失敗:', error);
      Alert.alert('操作失敗', error.response?.data?.error || '請稍後再試');
    } finally {
      setProcessingTask(null);
    }
  };

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

  const renderTaskItem = (task, index) => {
    const buttonConfig = getTaskButtonConfig(task);
    const isProcessing = processingTask === task.id;

    return (
      <View key={task.id || index} style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <View style={[styles.taskIcon, { backgroundColor: getTaskColor(task.task_type) }]}>
            <MaterialCommunityIcons
              name={getTaskIcon(task.task_type)}
              size={24}
              color="#fff"
            />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskDesc}>{task.description}</Text>
            <View style={styles.taskReward}>
              <MaterialCommunityIcons name="star-circle" size={16} color="#f4c7ab" />
              <Text style={styles.taskPoints}>+{task.points_reward} 積分</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[buttonConfig.style, isProcessing && styles.taskButtonDisabled]}
          onPress={() => handleTaskAction(task)}
          disabled={buttonConfig.disabled || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name={buttonConfig.icon} size={16} color="#fff" />
              <Text style={styles.taskButtonText}>{buttonConfig.text}</Text>
            </>
          )}
        </TouchableOpacity>

        {task.user_status === 'in_progress' && task.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, task.progress)}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {task.current_progress || 0}/{task.points_required || 1} ({task.progress || 0}%)
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderShopItem = (item, index) => (
    <TouchableOpacity
      key={item.id || index}
      style={styles.shopCard}
      onPress={() => handleRedeem(item)}
      activeOpacity={0.7}
    >
      {/* 原有內容不變 */}
      <View style={styles.shopImageContainer}>
        {item.image_url ? (
          <Image
            source={{ uri: `${api.defaults.baseURL}${item.image_url}` }}
            style={styles.shopImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.shopImagePlaceholder, { backgroundColor: getCategoryColor(item.category) }]}>
            <MaterialCommunityIcons name="gift" size={40} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{item.name}</Text>
        <Text style={styles.shopDesc} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.shopFooter}>
          <View style={styles.pointsContainer}>
            <MaterialCommunityIcons name="star-circle" size={18} color="#f4c7ab" />
            <Text style={styles.pointsRequired}>{item.points_required} 積分</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getTaskColor = (type) => {
    switch (type) {
      case 'daily': return '#9b59b6';
      case 'achievement': return '#2ecc71';
      default: return '#f4c7ab';
    }
  };



  const getTaskIcon = (type) => {
    switch (type) {
      case 'daily': return 'calendar-today';
      case 'achievement': return 'trophy';
      default: return 'checkbox-marked-circle';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'coupon': return '#e74c3c';
      case 'virtual': return '#3498db';
      case 'physical': return '#2ecc71';
      default: return '#f4c7ab';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4c7ab" />
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f4c7ab']}
            tintColor="#f4c7ab"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'daily' && (
          <>
            {/* 每日任務 */}
            {tasks.daily.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="calendar-today" size={24} color="#9b59b6" />
                  <Text style={styles.sectionTitle}>每日任務 ({tasks.daily.length})</Text>
                </View>
                {tasks.daily.map((task, index) => renderTaskItem(task, index))}
              </View>
            )}

            {/* 空狀態 */}
            {tasks.daily.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color="#f4c7ab" />
                <Text style={styles.emptyStateText}>暫無每日任務</Text>
                <Text style={styles.emptyStateSubText}>請稍後再來查看新的每日任務</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'achievement' && (
          <>
            {/* 成就任務 */}
            {tasks.achievement.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="trophy" size={24} color="#2ecc71" />
                  <Text style={styles.sectionTitle}>成就任務 ({tasks.achievement.length})</Text>
                </View>
                {tasks.achievement.map((task, index) => renderTaskItem(task, index))}
              </View>
            )}

            {/* 空狀態 */}
            {tasks.achievement.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="trophy-outline" size={48} color="#f4c7ab" />
                <Text style={styles.emptyStateText}>暫無成就任務</Text>
                <Text style={styles.emptyStateSubText}>完成更多任務來解鎖成就</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'shop' && (
          <>
            {shopItems.length > 0 ? (
              <View style={styles.shopGrid}>
                {shopItems.map((item, index) => (
                  <View key={item.id || index} style={styles.shopCardWrapper}>
                    {renderShopItem(item, index)}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="store-off" size={48} color="#f4c7ab" />
                <Text style={styles.emptyStateText}>暫無商品</Text>
                <Text style={styles.emptyStateSubText}>更多商品即將上架，敬請期待</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 頂部欄 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#5c4033" />
        </TouchableOpacity>
        <Text style={styles.title}>獎勵中心</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 積分卡片 */}
      <View style={styles.pointsCard}>
        <LinearGradient
          colors={['#f4c7ab', '#e8b89a', '#dca989']}
          style={styles.pointsCardGradient}
        >
          <View style={styles.pointsHeader}>
            <View>
              <Text style={styles.totalPointsLabel}>當前積分</Text>
              <Text style={styles.totalPoints}>{userPoints.points}</Text>
            </View>
            <View style={styles.levelBadge}>
              <MaterialCommunityIcons name="crown" size={20} color="#FFD700" />
              <Text style={styles.levelText}>{userPoints.level}</Text>
            </View>
          </View>

          <View style={styles.pointsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userPoints.completed_tasks_count}</Text>
              <Text style={styles.statLabel}>已完成任務</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{checkinStatus.consecutive_week_days}</Text>
              <Text style={styles.statLabel}>連續簽到</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.checkinButton,
              checkinStatus.checked_in_today && styles.checkinButtonDisabled
            ]}
            onPress={handleDailyCheckin}
            disabled={checkinStatus.checked_in_today}
          >
            <MaterialCommunityIcons
              name={checkinStatus.checked_in_today ? "check-circle" : "calendar-check"}
              size={20}
              color="#fff"
            />
            <Text style={styles.checkinButtonText}>
              {checkinStatus.checked_in_today ? '今日已簽到' : '每日簽到'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* 標籤欄 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
          onPress={() => setActiveTab('daily')}
        >
          <MaterialCommunityIcons
            name="calendar-today"
            size={20}
            color={activeTab === 'daily' ? '#5c4033' : '#8b5e3c'}
          />
          <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>
            每日任務
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'achievement' && styles.activeTab]}
          onPress={() => setActiveTab('achievement')}
        >
          <MaterialCommunityIcons
            name="trophy"
            size={20}
            color={activeTab === 'achievement' ? '#5c4033' : '#8b5e3c'}
          />
          <Text style={[styles.tabText, activeTab === 'achievement' && styles.activeTabText]}>
            成就
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'shop' && styles.activeTab]}
          onPress={() => setActiveTab('shop')}
        >
          <MaterialCommunityIcons
            name="store"
            size={20}
            color={activeTab === 'shop' ? '#5c4033' : '#8b5e3c'}
          />
          <Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>
            積分商店
          </Text>
        </TouchableOpacity>
      </View>

      {/* 主要內容區域 */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      {/* 簽到成功 Modal */}
      <Modal
        isVisible={showCheckinSuccessModal}
        onBackdropPress={() => setShowCheckinSuccessModal(false)}
        onBackButtonPress={() => setShowCheckinSuccessModal(false)}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropOpacity={0.4}
      >
        <View style={styles.modalContainer}>
          <MaterialCommunityIcons
            name="check-circle"
            size={64}
            color="#2ecc71"
            style={{ marginBottom: 16 }}
          />

          <Text style={styles.modalTitle}>簽到成功！</Text>

          <Text style={[styles.modalMessage, { fontSize: 18, fontWeight: '700', color: '#5c4033' }]}>
            {checkinMessage}
          </Text>

          {checkinStatus.consecutive_week_days >= 2 && (
            <Text style={[styles.modalMessage, { marginTop: 8, color: '#e67e22' }]}>
              連續簽到 {checkinStatus.consecutive_week_days} 天 🎉
            </Text>
          )}

          <TouchableOpacity
            style={[styles.modalCheckinSuccessButton]}
            onPress={() => setShowCheckinSuccessModal(false)}
          >
            <Text style={styles.modalCheckinSuccessButtonText}>
              好的
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fffaf5',
  },
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
  },
  headerRight: {
    width: 40,
  },
  pointsCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pointsCardGradient: {
    padding: 20,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalPointsLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  totalPoints: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  pointsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  checkinButtonDisabled: {
    opacity: 0.7,
  },
  checkinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5e3c',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#5c4033',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    fontSize: 16,
    color: '#5c4033',
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
    marginLeft: 10,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 14,
    color: '#8b5e3c',
    marginBottom: 8,
  },
  taskReward: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4c7ab',
    marginLeft: 6,
  },
  taskButton: {
    backgroundColor: '#f4c7ab',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  taskButtonInProgress: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  taskButtonCompleted: {
    backgroundColor: '#95a5a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  taskButtonDisabled: {
    opacity: 0.6,
  },
  taskButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2ecc71',
  },
  progressText: {
    fontSize: 12,
    color: '#8b5e3c',
    marginTop: 4,
    textAlign: 'center',
  },
  shopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shopCardWrapper: {
    width: (width - 48) / 2,
    marginBottom: 16,
  },
  shopCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  shopImageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: '#f8f8f8',
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  shopImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfo: {
    padding: 12,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 4,
  },
  shopDesc: {
    fontSize: 12,
    color: '#8b5e3c',
    marginBottom: 12,
    lineHeight: 16,
  },
  shopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsRequired: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4c7ab',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(244, 199, 171, 0.1)',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5c4033',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#8b5e3c',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 40,
  },
  // 從 dashboard.js 複製的 modal 樣式（調整為 styles 物件的一部分）
  modalContainer: {
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
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  modalCheckinSuccessButton: {
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
  modalCheckinSuccessButtonText: {
    color: '#3d2a1f',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});