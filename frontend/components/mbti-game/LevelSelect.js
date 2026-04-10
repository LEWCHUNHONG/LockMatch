// app/mbti-game/LevelSelect.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 預設關卡 ID 列表
const PRESET_LEVEL_IDS = ['ei-dimension', 'sn-dimension', 'tf-dimension', 'jp-dimension'];

export default function LevelSelect({
  builtinLevels = [],
  customLevels = [],
  completedLevels = {},          // 來自 useLevelManager（本地，可能不準確）
  completedPresetLevels = [],    // ✅ 新增：從後端獲取的已完成預設關卡列表
  onSelectLevel,
  onSelectEndless,
  onBack,
  character,
  hasMbtiResult,
  remainingPoints,
  onEditLevel,
  onDeleteLevel,
}) {
  
  const getLevelIcon = (theme) => {
    switch(theme) {
      case 'forest': return 'tree';
      case 'cave': return 'mine';
      case 'canyon': return 'terrain';
      case 'plains': return 'grass';
      default: return 'map';
    }
  };

  // ✅ 判斷關卡是否已完成（優先使用後端數據）
  const isLevelCompleted = (level) => {
    if (!level || !level.id) return false;
    
    // 如果是預設關卡，使用 completedPresetLevels
    if (PRESET_LEVEL_IDS.includes(level.id) || 
        (level.originalId && PRESET_LEVEL_IDS.includes(level.originalId))) {
      const targetId = level.originalId || level.id;
      return completedPresetLevels.includes(targetId);
    }
    
    // 其他類型關卡仍使用本地 completedLevels
    return !!completedLevels[level.id];
  };

  const isLevelUnlocked = (level, index, levelList) => {
    if (!level || typeof level !== 'object' || !level.id) return false;

    // 所有預設關卡永久解鎖
    if (PRESET_LEVEL_IDS.includes(level.id) || 
        (level.originalId && PRESET_LEVEL_IDS.includes(level.originalId))) {
      return true;
    }

    // 自定義關卡總是解鎖
    if (typeof level.id === 'string' && level.id.startsWith('custom_')) return true;
    
    if (level.unlockCondition) {
      const { type, previousLevelId, requiredLevel, requireMbti } = level.unlockCondition;
      if (type === 'none') return true;
      if (type === 'previous' && previousLevelId) {
        return isLevelCompleted({ id: previousLevelId });
      }
      if (type === 'level' && requiredLevel) {
        return (character?.level || 1) >= requiredLevel;
      }
      if (type === 'mbti' && requireMbti) {
        return hasMbtiResult;
      }
    }
    
    // 默認解鎖第一個關卡
    const isCompleted = isLevelCompleted(level);
    if (index === 0) return true;
    return isCompleted || isLevelCompleted(levelList[index - 1]);
  };

  // 判斷是否為預設主線關卡
  const isPresetLevel = (levelId) => PRESET_LEVEL_IDS.includes(levelId);

  // 渲染一個關卡卡片
  const renderLevelCard = (level, index, levelList, isCustom = false) => {
    if (!level || typeof level !== 'object' || !level.id) {
      console.warn('無效的關卡物件，跳過渲染:', level);
      return null;
    }

    const isCompleted = isLevelCompleted(level);  // ✅ 使用統一判斷
    const unlocked = isLevelUnlocked(level, index, levelList);

    // 只有自定義關卡才顯示操作按鈕
    const showActions = isCustom && onEditLevel && onDeleteLevel;

    return (
      <View key={level.id} style={styles.levelCardWrapper}>
        <TouchableOpacity
          style={[
            styles.levelCard,
            isCompleted && styles.completedCard,
            !unlocked && styles.lockedCard
          ]}
          onPress={() => unlocked && onSelectLevel(level)}
          disabled={!unlocked}
        >
          {!unlocked && (
            <View style={styles.lockOverlay}>
              <MaterialCommunityIcons name="lock" size={40} color="#fff" />
            </View>
          )}
          
          {/* 已完成標籤 */}
          {isCompleted && (
            <View style={styles.completedBadge}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#2ecc71" />
              <Text style={styles.completedText}>已完成</Text>
            </View>
          )}
          
          <View style={styles.levelHeader}>
            <View style={[styles.levelIcon, { backgroundColor: level.bgColor || '#2ecc71' }]}>
              <MaterialCommunityIcons 
                name={getLevelIcon(level.theme)} 
                size={30} 
                color="#fff" 
              />
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelName}>{level.name}</Text>
              <Text style={styles.levelDimension}>{level.dimension}</Text>
            </View>
          </View>
          
          <Text style={styles.levelDescription}>{level.description}</Text>

          {/* 預設關卡不論是否完成都顯示獎勵提示，但文字和顏色不同 */}
          {isPresetLevel(level.id) && (
            <View style={styles.rewardHint}>
              <MaterialCommunityIcons 
                name="gift" 
                size={16} 
                color={isCompleted ? "#2ecc71" : "#FFD700"} 
              />
              <Text style={[styles.rewardHintText, isCompleted && styles.rewardClaimedText]}>
                {isCompleted ? '獎勵已領取' : '首次通關可得100積分'}
              </Text>
            </View>
          )}
          
          <View style={styles.levelFooter}>
            <TouchableOpacity 
              style={[styles.playButton, !unlocked && styles.disabledButton]}
              onPress={() => unlocked && onSelectLevel(level)}
              disabled={!unlocked}
            >
              <MaterialCommunityIcons name="play" size={20} color="#fff" />
              <Text style={styles.playButtonText}>開始遊戲</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* 自定義關卡的操作按鈕（編輯/刪除） */}
        {showActions && (
          <View style={styles.actionButtons}>
            {onEditLevel && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEditLevel(level)}
              >
                <MaterialCommunityIcons name="pencil" size={20} color="#5c4033" />
              </TouchableOpacity>
            )}
            {onDeleteLevel && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    '刪除關卡',
                    `確定要刪除關卡「${level.name}」嗎？此操作無法復原。`,
                    [
                      { text: '取消', style: 'cancel' },
                      { 
                        text: '刪除', 
                        style: 'destructive',
                        onPress: () => onDeleteLevel(level)
                      }
                    ]
                  );
                }}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#e74c3c" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const validCustomLevels = customLevels.filter(level => level && level.id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
        </TouchableOpacity>
        <Text style={styles.title}>選擇關卡</Text>
        <Text style={styles.subtitle}>
          完成關卡來探索你的MBTI性格維度
        </Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* 主線冒險區塊 */}
        {builtinLevels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📖 主線冒險</Text>
            {builtinLevels.map((level, index) =>
              renderLevelCard(level, index, builtinLevels, false)
            )}
          </View>
        )}

        {/* 無盡深淵區塊 */}
        {hasMbtiResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌌 無盡深淵</Text>
            <View style={styles.endlessCard}>
              <View style={styles.endlessHeader}>
                <MaterialCommunityIcons name="infinity" size={50} color="#9b59b6" />
                <View style={styles.endlessInfo}>
                  <Text style={styles.endlessTitle}>無限挑戰</Text>
                  <Text style={styles.endlessDesc}>每週積分上限 1000，當前剩餘 {remainingPoints}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.endlessButton} onPress={onSelectEndless}>
                <Text style={styles.endlessButtonText}>進入無盡深淵</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 自定義關卡區塊 */}
        {validCustomLevels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ 自定義關卡</Text>
            {validCustomLevels.map((level, index) =>
              renderLevelCard(level, index, validCustomLevels, true)
            )}
          </View>
        )}

        {/* 提示資訊 */}
        <View style={styles.tipContainer}>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color="#f39c12" />
          <Text style={styles.tipText}>
            完成主線關卡後解鎖無盡模式，並可獲得每週積分！
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf5' },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative'
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 40,
    zIndex: 10,
    padding: 8
  },
  title: { fontSize: 32, fontWeight: '900', color: '#5c4033', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#8b5e3c', textAlign: 'center', marginBottom: 10 },
  scrollContainer: { flex: 1, padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 24, fontWeight: '800', color: '#5c4033',
    marginBottom: 16, borderBottomWidth: 2, borderBottomColor: '#f4c7ab', paddingBottom: 8
  },
  levelCardWrapper: { position: 'relative', marginBottom: 16 },
  levelCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1,
    shadowRadius: 12, elevation: 5, position: 'relative'
  },
  completedCard: { borderWidth: 2, borderColor: '#f4c7ab' },
  lockedCard: { opacity: 0.7 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 10
  },
  actionButtons: {
    position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 8, zIndex: 20,
  },
  editButton: {
    backgroundColor: '#fff', width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
    shadowRadius: 4, elevation: 3,
  },
  deleteButton: {
    backgroundColor: '#fff', width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
    shadowRadius: 4, elevation: 3,
  },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  levelIcon: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  levelInfo: { flex: 1 },
  levelName: { fontSize: 22, fontWeight: '700', color: '#5c4033', marginBottom: 4 },
  levelDimension: { fontSize: 16, color: '#8b5e3c', fontWeight: '600' },
  levelDescription: { fontSize: 14, color: '#5c4033', lineHeight: 20, marginBottom: 16, opacity: 0.8 },
  rewardHint: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginBottom: 12, alignSelf: 'flex-start',
  },
  rewardHintText: { fontSize: 12, fontWeight: '600', color: '#5c4033', marginLeft: 4 },
  rewardClaimedText: { color: '#2ecc71' },
  levelFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  playButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4c7ab',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25
  },
  disabledButton: { opacity: 0.5 },
  playButtonText: { fontSize: 16, fontWeight: '700', color: '#5c4033', marginLeft: 8 },
  endlessCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1,
    shadowRadius: 12, elevation: 5,
  },
  endlessHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  endlessInfo: { flex: 1, marginLeft: 16 },
  endlessTitle: { fontSize: 24, fontWeight: '800', color: '#5c4033' },
  endlessDesc: { fontSize: 14, color: '#8b5e3c', marginTop: 4 },
  endlessButton: {
    flexDirection: 'row', backgroundColor: '#9b59b6', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 30, alignItems: 'center', justifyContent: 'center',
  },
  endlessButtonText: { color: '#fff', fontSize: 18, fontWeight: '700', marginRight: 8 },
  tipContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(243, 156, 18, 0.1)',
    padding: 16, borderRadius: 12, marginBottom: 30
  },
  tipText: { flex: 1, fontSize: 14, color: '#8b5e3c', marginLeft: 12, fontWeight: '500' },
  completedBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, zIndex: 15,
  },
  completedText: { fontSize: 12, fontWeight: 'bold', color: '#2ecc71', marginLeft: 4 },
});