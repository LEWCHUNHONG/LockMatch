// app/mbti-game/game-results.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GameResults({ gameData, level, onRestart, onBack, onNextLevel, character }) {
  const { isFinal = false, finalMbti } = gameData;   // 新增 finalMbti

  const calculateMBTI = () => {
    // 如果提供了 finalMbti，直接使用（避免因本地分數不完整而出錯）
    if (finalMbti) return finalMbti;

    const { scores } = gameData;
    if (!scores) return 'UNKN';
    const ei = (scores.E || 0) >= (scores.I || 0) ? 'E' : 'I';
    const sn = (scores.S || 0) >= (scores.N || 0) ? 'S' : 'N';
    const tf = (scores.T || 0) >= (scores.F || 0) ? 'T' : 'F';
    const jp = (scores.J || 0) >= (scores.P || 0) ? 'J' : 'P';
    return ei + sn + tf + jp;
  };

  const getMBTIDescription = (mbti) => {
    const descriptions = {
      'ISTJ': '沉靜、認真、可靠、負責',
      'ISFJ': '安靜、友好、負責、忠誠',
      'INFJ': '有創意、有洞察力、有原則',
      'INTJ': '有策略、有遠見、獨立',
      'ISTP': '靈活、容忍、冷靜的觀察者',
      'ISFP': '安靜、友好、敏感、和善',
      'INFP': '理想主義、忠誠、有價值觀',
      'INTP': '有創意、有洞察力、有好奇心',
      'ESTP': '靈活、容忍、注重實際',
      'ESFP': '外向、友好、接受力強',
      'ENFP': '熱情、有創造力、社交',
      'ENTP': '聰明、好奇、思維敏捷',
      'ESTJ': '實際、現實、有商業頭腦',
      'ESFJ': '有愛心、盡責、善於合作',
      'ENFJ': '有同情心、有責任感、和諧',
      'ENTJ': '坦率、果斷、有領導力'
    };
    return descriptions[mbti] || '探索你的獨特性格特質';
  };

  const getMBTIColor = (mbti) => {
    const colors = {
      'ISTJ': '#3498db', 'ISFJ': '#2ecc71', 'INFJ': '#9b59b6', 'INTJ': '#34495e',
      'ISTP': '#1abc9c', 'ISFP': '#f39c12', 'INFP': '#e74c3c', 'INTP': '#3498db',
      'ESTP': '#e67e22', 'ESFP': '#f1c40f', 'ENFP': '#e74c3c', 'ENTP': '#9b59b6',
      'ESTJ': '#2c3e50', 'ESFJ': '#27ae60', 'ENFJ': '#8e44ad', 'ENTJ': '#c0392b'
    };
    return colors[mbti] || '#f4c7ab';
  };

  const mbtiType = calculateMBTI();
  const mbtiDescription = getMBTIDescription(mbtiType);
  const mbtiColor = getMBTIColor(mbtiType);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const calculateDimensionPercent = (type1, type2) => {
    const scores = gameData.scores || {};
    const total = (scores[type1] || 0) + (scores[type2] || 0);
    if (total === 0) return { [type1]: 50, [type2]: 50 };
    const percent1 = Math.round((scores[type1] || 0) / total * 100);
    return { [type1]: percent1, [type2]: 100 - percent1 };
  };

  const eiPercent = calculateDimensionPercent('E', 'I');
  const snPercent = calculateDimensionPercent('S', 'N');
  const tfPercent = calculateDimensionPercent('T', 'F');
  const jpPercent = calculateDimensionPercent('J', 'P');

  const shareResult = async () => {
    try {
      await Share.share({
        message: `我在「${level?.name}」關卡獲得了 ${gameData.score} 分！\n我的MBTI傾向是：${mbtiType}\n快來挑戰MBTI冒險遊戲吧！`,
        title: 'MBTI冒險遊戲結果'
      });
    } catch (error) {
      console.error('分享失敗:', error);
    }
  };

  const saveToHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('mbti_game_history') || '[]';
      const parsed = JSON.parse(history);
      parsed.unshift({
        id: Date.now(),
        levelName: level?.name,
        mbtiType,
        score: gameData.score,
        date: new Date().toLocaleString()
      });
      await AsyncStorage.setItem('mbti_game_history', JSON.stringify(parsed.slice(0, 20)));
    } catch (error) {
      console.error('保存歷史失敗:', error);
    }
  };

  useEffect(() => {
    saveToHistory();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="trophy" size={60} color="#FFD700" />
        <Text style={styles.title}>冒險完成！</Text>
        <Text style={styles.subtitle}>
          {character?.name || '冒險者'} 完成了 {level?.name || '關卡'}
        </Text>
      </View>

      {isFinal ? (
        <View style={[styles.mbtiCard, { backgroundColor: mbtiColor }]}>
          <Text style={styles.mbtiLabel}>你的MBTI類型</Text>
          <Text style={styles.mbtiType}>{mbtiType}</Text>
          <Text style={styles.mbtiDescription}>{mbtiDescription}</Text>
        </View>
      ) : (
        <View style={styles.hintCard}>
          <MaterialCommunityIcons name="information" size={32} color="#8b5e3c" />
          <Text style={styles.hintTitle}>當前性格傾向</Text>
          <Text style={styles.hintText}>
            完成四個維度關卡後，你將獲得完整的 MBTI 性格分析！
          </Text>
          {/* 移除提前顯示 MBTI 類型的區塊 */}
        </View>
      )}

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>遊戲統計</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trophy" size={32} color="#f39c12" />
            <Text style={styles.statValue}>{gameData.score || 0}</Text>
            <Text style={styles.statLabel}>總分數</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock" size={32} color="#3498db" />
            <Text style={styles.statValue}>{formatTime(gameData.playTime || 0)}</Text>
            <Text style={styles.statLabel}>遊戲時間</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="star" size={32} color="#FFD700" />
            <Text style={styles.statValue}>{gameData.itemsCollected?.length || 0}</Text>
            <Text style={styles.statLabel}>收集物品</Text>
          </View>
        </View>
      </View>

      <View style={styles.dimensionCard}>
        <Text style={styles.dimensionTitle}>性格維度分析</Text>
        
        <View style={styles.dimensionRow}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionLabel}>外向(E) / 內向(I)</Text>
            <Text style={styles.dimensionPercent}>
              {eiPercent.E}% / {eiPercent.I}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${eiPercent.E}%`, backgroundColor: '#FF6B6B' }]} />
            <View style={[styles.progressFill, { width: `${eiPercent.I}%`, backgroundColor: '#3498DB', position: 'absolute', right: 0 }]} />
          </View>
        </View>

        <View style={styles.dimensionRow}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionLabel}>實感(S) / 直覺(N)</Text>
            <Text style={styles.dimensionPercent}>
              {snPercent.S}% / {snPercent.N}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${snPercent.S}%`, backgroundColor: '#2ECC71' }]} />
            <View style={[styles.progressFill, { width: `${snPercent.N}%`, backgroundColor: '#9B59B6', position: 'absolute', right: 0 }]} />
          </View>
        </View>

        <View style={styles.dimensionRow}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionLabel}>思考(T) / 情感(F)</Text>
            <Text style={styles.dimensionPercent}>
              {tfPercent.T}% / {tfPercent.F}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${tfPercent.T}%`, backgroundColor: '#F39C12' }]} />
            <View style={[styles.progressFill, { width: `${tfPercent.F}%`, backgroundColor: '#E74C3C', position: 'absolute', right: 0 }]} />
          </View>
        </View>

        <View style={styles.dimensionRow}>
          <View style={styles.dimensionHeader}>
            <Text style={styles.dimensionLabel}>判斷(J) / 感知(P)</Text>
            <Text style={styles.dimensionPercent}>
              {jpPercent.J}% / {jpPercent.P}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${jpPercent.J}%`, backgroundColor: '#1ABC9C' }]} />
            <View style={[styles.progressFill, { width: `${jpPercent.P}%`, backgroundColor: '#E67E22', position: 'absolute', right: 0 }]} />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareButton} onPress={shareResult}>
          <MaterialCommunityIcons name="share" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>分享結果</Text>
        </TouchableOpacity>
        
        <View style={styles.actionRow}>
          {onNextLevel && (
            <TouchableOpacity style={styles.nextButton} onPress={onNextLevel}>
              <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>下一關</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
            <MaterialCommunityIcons name="replay" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>再玩一次</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectButton} onPress={onBack}>
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>選擇關卡</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf5' },
  header: { alignItems: 'center', padding: 30, paddingBottom: 20 },
  title: { fontSize: 36, fontWeight: '900', color: '#5c4033', marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#8b5e3c', textAlign: 'center' },
  mbtiCard: {
    marginHorizontal: 20, padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8
  },
  mbtiLabel: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 12 },
  mbtiType: { fontSize: 56, fontWeight: '900', color: '#fff', marginBottom: 12, letterSpacing: 4 },
  mbtiDescription: { fontSize: 16, color: '#fff', textAlign: 'center', lineHeight: 24 },
  hintCard: {
    marginHorizontal: 20, padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 20,
    backgroundColor: '#f8f0e8', borderWidth: 2, borderColor: '#f4c7ab',
  },
  hintTitle: { fontSize: 20, fontWeight: '800', color: '#5c4033', marginTop: 8, marginBottom: 8 },
  hintText: { fontSize: 14, color: '#8b5e3c', textAlign: 'center', marginBottom: 12 },
  // miniMbti 樣式已不再使用，但為了避免樣式缺失可保留定義（可選）
  miniMbti: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  miniMbtiText: { fontSize: 16, fontWeight: '700', color: '#5c4033' },
  statsCard: {
    backgroundColor: '#fff', marginHorizontal: 20, padding: 20, borderRadius: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3
  },
  statsTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033', marginBottom: 20, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#5c4033', marginTop: 8, marginBottom: 4 },
  statLabel: { fontSize: 14, color: '#8b5e3c' },
  dimensionCard: {
    backgroundColor: '#fff', marginHorizontal: 20, padding: 20, borderRadius: 20, marginBottom: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3
  },
  dimensionTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033', marginBottom: 20, textAlign: 'center' },
  dimensionRow: { marginBottom: 20 },
  dimensionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dimensionLabel: { fontSize: 14, fontWeight: '600', color: '#5c4033' },
  dimensionPercent: { fontSize: 14, color: '#8b5e3c', fontWeight: '600' },
  progressBar: { height: 12, backgroundColor: '#f0f0f0', borderRadius: 6, overflow: 'hidden', position: 'relative' },
  progressFill: { height: '100%', position: 'absolute', top: 0, bottom: 0 },
  actions: { marginHorizontal: 20, marginBottom: 40 },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3498db',
    paddingVertical: 14, borderRadius: 16, marginBottom: 12, gap: 8
  },
  shareButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  nextButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3498db', paddingVertical: 14, borderRadius: 16, gap: 8
  },
  restartButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f4c7ab', paddingVertical: 14, borderRadius: 16, gap: 8
  },
  selectButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#9b59b6', paddingVertical: 14, borderRadius: 16, gap: 8
  },
  actionButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});