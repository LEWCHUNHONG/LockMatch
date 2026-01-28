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
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

const { width } = Dimensions.get('window');

export default function RewardsScreen() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [userPoints, setUserPoints] = useState({ 
    total_points: 0, 
    level: '新手會員', 
    completed_tasks_count: 0 
  });
  const [tasks, setTasks] = useState({ 
    daily: [], 
    achievement: [], 
    special: [] 
  });
  const [shopItems, setShopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState({ 
    checked_in_today: false, 
    consecutive_week_days: 0 
  });

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
          daily: Array.isArray(tasksData.daily) ? tasksData.daily : [],
          achievement: Array.isArray(tasksData.achievement) ? tasksData.achievement : [],
          special: Array.isArray(tasksData.special) ? tasksData.special : []
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
    try {
      const response = await api.post('/api/daily-checkin');
      if (response.data.success) {
        alert(`簽到成功！獲得 ${response.data.points_earned} 積分`);
        loadAllData();
      }
    } catch (error) {
      alert(error.response?.data?.error || '簽到失敗');
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      const response = await api.post('/api/start-task', { taskId });
      if (response.data.success) {
        alert('任務已開始！');
        loadAllData();
      }
    } catch (error) {
      alert(error.response?.data?.error || '開始任務失敗');
    }
  };

  const renderTaskItem = (task, index) => (
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
      
      {(!task.user_status || task.user_status === 'not_started') && (
        <TouchableOpacity 
          style={styles.taskButton}
          onPress={() => handleStartTask(task.id)}
        >
          <Text style={styles.taskButtonText}>開始任務</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderShopItem = (item, index) => (
    <View key={item.id || index} style={styles.shopCard}>
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
    </View>
  );

  const getTaskColor = (type) => {
    switch(type) {
      case 'daily': return '#3498db';
      case 'achievement': return '#2ecc71';
      case 'special': return '#9b59b6';
      default: return '#f4c7ab';
    }
  };

  const getTaskIcon = (type) => {
    switch(type) {
      case 'daily': return 'calendar-check';
      case 'achievement': return 'trophy';
      case 'special': return 'star-circle';
      default: return 'checkbox-marked-circle';
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
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
        {activeTab === 'tasks' && (
          <>
            {/* 每日任務 */}
            {tasks.daily.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="calendar-check" size={24} color="#3498db" />
                  <Text style={styles.sectionTitle}>每日任務 ({tasks.daily.length})</Text>
                </View>
                {tasks.daily.map((task, index) => renderTaskItem(task, index))}
              </View>
            )}
            
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
            
            {/* 特殊任務 */}
            {tasks.special.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="star-circle" size={24} color="#9b59b6" />
                  <Text style={styles.sectionTitle}>特殊任務 ({tasks.special.length})</Text>
                </View>
                {tasks.special.map((task, index) => renderTaskItem(task, index))}
              </View>
            )}

            {/* 空狀態 */}
            {tasks.daily.length === 0 && tasks.achievement.length === 0 && tasks.special.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="checkbox-multiple-blank-circle" size={48} color="#f4c7ab" />
                <Text style={styles.emptyStateText}>暫無可用任務</Text>
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
              <Text style={styles.totalPoints}>{userPoints.total_points}</Text>
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
          style={[styles.tab, activeTab === 'tasks' && styles.activeTab]}
          onPress={() => setActiveTab('tasks')}
        >
          <MaterialCommunityIcons 
            name="checkbox-multiple-marked-circle" 
            size={22} 
            color={activeTab === 'tasks' ? '#5c4033' : '#8b5e3c'} 
          />
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>
            任務中心
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'shop' && styles.activeTab]}
          onPress={() => setActiveTab('shop')}
        >
          <MaterialCommunityIcons 
            name="store" 
            size={22} 
            color={activeTab === 'shop' ? '#5c4033' : '#8b5e3c'} 
          />
          <Text style={[styles.tabText, activeTab === 'shop' && styles.activeTabText]}>
            積分商店
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <MaterialCommunityIcons 
            name="history" 
            size={22} 
            color={activeTab === 'history' ? '#5c4033' : '#8b5e3c'} 
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            積分歷史
          </Text>
        </TouchableOpacity>
      </View>

      {/* 主要內容區域 */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
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
    marginLeft: 8,
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
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  taskButtonText: {
    color: '#5c4033',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
    marginTop: 16,
  },
  bottomSpacing: {
    height: 40,
  },
});