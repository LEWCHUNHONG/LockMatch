// app/mbti-game/index.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ShootingGameEngine from './ShootingGameEngine';
import NewLevelEditor from './NewLevelEditor';
import LevelSelect from './LevelSelect';
import CharacterCustomScreen from '../../components/mbti-game/character-custom';
import EndlessMode from './EndlessMode';
import GameResults from '../../components/mbti-game/game-results';
import { useLevelManager } from '../../components/mbti-game/level-manager';
import { MBTI_DESCRIPTIONS, calculateMbtiResult, getAllQuestions } from '../../data/mbti-questions';
import { gameAPI, customLevelAPI, userAPI, mbtiAPI } from '../../utils/api';
import { MBTI_DIMENSION_LEVELS } from '../../data/levels';

const WEEKLY_LIMIT = 1000;
const PRESET_LEVEL_IDS = ['ei-dimension', 'sn-dimension', 'tf-dimension', 'jp-dimension'];

export default function MBTIGameMain({ onBackToHome }) {
  const [gameState, setGameState] = useState('menu');
  const [character, setCharacter] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [mbtiScores, setMbtiScores] = useState({
    E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0
  });
  const [mbtiResult, setMbtiResult] = useState(null);
  const [customLevels, setCustomLevels] = useState([]);
  const [weeklyPoints, setWeeklyPoints] = useState({ used: 0, limit: WEEKLY_LIMIT, remaining: WEEKLY_LIMIT });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [userId, setUserId] = useState(null);
  const [completedPresetLevels, setCompletedPresetLevels] = useState([]);

  // ========== 全局題目管理 ==========
  const [globalRemainingQuestions, setGlobalRemainingQuestions] = useState([]);

  // 初始化全局題目池
  useEffect(() => {
    setGlobalRemainingQuestions(getAllQuestions());
  }, []);

  // 抽題函數（全局不重複）
  const pickGlobalQuestion = useCallback(() => {
    if (globalRemainingQuestions.length === 0) {
      // 所有題目用完，重置題目池
      setGlobalRemainingQuestions(getAllQuestions());
      // 重新抽題（此時池子已重置）
      return pickGlobalQuestion();
    }
    const idx = Math.floor(Math.random() * globalRemainingQuestions.length);
    const question = globalRemainingQuestions[idx];
    setGlobalRemainingQuestions(prev => prev.filter((_, i) => i !== idx));
    return question;
  }, [globalRemainingQuestions]);

  // 放回題目（用於關卡中途退出）
  const returnQuestions = useCallback((questions) => {
    if (!questions || questions.length === 0) return;
    // 使用 Set 基於 id 去重，避免重複放回
    setGlobalRemainingQuestions(prev => {
      const currentIds = new Set(prev.map(q => q.id));
      const toAdd = questions.filter(q => !currentIds.has(q.id));
      return [...prev, ...toAdd];
    });
  }, []);

  const { levels, completedLevels, playerStats, completeLevel } = useLevelManager(userId);

  // 載入使用者 ID
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserId(user.id || 'guest');
        } else {
          setUserId('guest');
        }
      } catch (error) {
        setUserId('guest');
      }
    };
    loadUserId();
  }, []);

  // 當 userId 變化時，載入所有使用者相關資料
  useEffect(() => {
    if (userId) {
      loadCharacter();
      loadCustomLevels();
      loadMbtiScores();
      loadMbtiResult();
    }
  }, [userId]);

  // 初始載入每週積分
  useEffect(() => {
    loadWeeklyPoints();
  }, []);

  // 當遊戲狀態變為選單時，刷新使用者資料
// 推薦改法
useEffect(() => {
  if (gameState === 'menu') {
    refreshUserData();
  }
}, [gameState]);   // 先保持這樣，但必須修 refreshUserData

const refreshUserData = useCallback(async () => {
  if (gameState !== 'menu') return;

  try {
    const response = await userAPI.getCurrentUser();
    if (!response?.data?.success) return;

    const user = response.data.user;

    // 只在真的有變化時才 setState
    if (user.id && user.id !== userId) {
      setUserId(user.id);
    }

    const newChar = user.character && user.character !== 'null' && user.character !== ''
      ? JSON.parse(user.character)
      : null;

    // 避免每次都 set 相同物件導致無限迴圈
    if (JSON.stringify(character) !== JSON.stringify(newChar)) {
      setCharacter(newChar);
    }

    await loadWeeklyPoints();
  } catch (err) {
    console.error('刷新失敗', err);
  }
}, [gameState, userId, character]);   // 加入依賴，但小心循環

  // 從後端載入 MBTI 累計分數與已完成預設關卡，並返回數據
  const loadMbtiScores = async () => {
    if (!userId) return null;
    try {
      const response = await gameAPI.getMbtiScores();
      if (response.data.success) {
        setMbtiScores(response.data.scores);
        setCompletedPresetLevels(response.data.completedPresetLevels);
        return response.data;
      }
    } catch (error) {
      console.error('❌ 載入 MBTI 分數失敗:', error);
    }
    return null;
  };

  // 從 AsyncStorage 載入已保存的 MBTI 結果
  const loadMbtiResult = async () => {
    if (!userId) return;
    try {
      const saved = await AsyncStorage.getItem(`mbti_result_${userId}`);
      if (saved) {
        setMbtiResult(JSON.parse(saved));
      }
    } catch (error) {
      console.error('載入 MBTI 結果失敗:', error);
    }
  };

  const loadCharacter = async () => {
    if (!userId) return;
    try {
      const response = await userAPI.getCurrentUser();
      if (response.data.success && response.data.user) {
        const user = response.data.user;
        if (user.character && user.character !== 'null' && user.character !== '') {
          setCharacter(JSON.parse(user.character));
        } else {
          setCharacter(null);
        }
      }
    } catch (error) {
      console.error('載入角色失敗', error);
      setCharacter(null);
    }
  };

  const loadCustomLevels = async () => {
    try {
      const response = await customLevelAPI.getAll();
      if (response.data.success) {
        const levels = response.data.levels || [];
        console.log('自定義關卡原始資料:', levels);
        setCustomLevels(levels);
      } else {
        console.error('載入自定義關卡失敗:', response.data.error);
      }
    } catch (error) {
      console.error('載入自定義關卡失敗:', error);
      try {
        const saved = await AsyncStorage.getItem('custom_levels');
        if (saved) setCustomLevels(JSON.parse(saved));
      } catch (e) {}
    }
  };

  const loadWeeklyPoints = async () => {
    try {
      const response = await gameAPI.getWeeklyPoints();
      if (response.data.success) {
        setWeeklyPoints(response.data);
      }
    } catch (error) {
      console.error('載入每週積分失敗:', error);
    }
  };

  const saveMbtiResult = async (result) => {
    if (!userId) return;
    await AsyncStorage.setItem(`mbti_result_${userId}`, JSON.stringify(result));
  };

const handleCharacterComplete = async (customized) => {
  console.log('【角色完成】收到的 customized:', customized);

  if (!customized || typeof customized !== 'object' || Object.keys(customized).length === 0) {
    Alert.alert('錯誤', '角色資料無效，請重新自訂');
    setGameState('levelSelect');
    return;
  }

  setCharacter(customized);

  try {
    // 優先嘗試傳物件（推薦）
    const response = await userAPI.updateProfile({ 
      character: customized 
    });

    console.log('角色儲存成功:', response.data);

  } catch (error) {
    console.error('儲存角色失敗:', error);
  }

  setGameState('levelSelect');
};

  const originalToCustom = {};
  customLevels.forEach(level => {
    if (level.originalId && PRESET_LEVEL_IDS.includes(level.originalId)) {
      originalToCustom[level.originalId] = level;
    }
  });

  const mergedBuiltinLevels = MBTI_DIMENSION_LEVELS.map(preset => {
    const custom = originalToCustom[preset.id];
    if (custom) {
      if (!custom.backgroundImage && preset.backgroundImage) {
        custom.backgroundImage = preset.backgroundImage;
      }
      return custom;
    }
    return preset;
  });

  const builtinIds = new Set(mergedBuiltinLevels.map(l => l.id));
  const filteredCustom = customLevels.filter(level => {
    if (builtinIds.has(level.id)) return false;
    if (level.originalId && PRESET_LEVEL_IDS.includes(level.originalId)) return false;
    return true;
  });

  console.log('過濾後的自定義關卡數量:', filteredCustom.length);

  const handleLevelSelect = (level) => {
    loadWeeklyPoints();
    const levelCopy = JSON.parse(JSON.stringify(level));
    setSelectedLevel(levelCopy);
    setGameState('playing');
  };

  const handleEndlessSelect = () => {
    loadWeeklyPoints();
    setGameState('endless');
  };

  const handleGameComplete = async (results) => {
    try {
      const gameData = {
        level_id: selectedLevel?.id,
        game_type: results.gameMode || 'normal',
        play_data: {
          score: results.score,
          playTime: results.playTime,
          itemsCollected: results.itemsCollected,
          choices: results.choices,
          scores: results.scores,
        },
        calculated_mbti: null,
        score: results.score || 0,
        play_time_seconds: results.playTime || 0,
      };
      const response = await gameAPI.uploadGameResult(gameData);
      if (response.data.success) {
        if (response.data.totalMbtiScores) {
          setMbtiScores(response.data.totalMbtiScores);
        }

        if (response.data.pointsEarned > 0) {
          Alert.alert('積分 +' + response.data.pointsEarned, '繼續加油！');
        }
        if (response.data.totalPoints !== undefined) {
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            user.points = response.data.totalPoints;
            await AsyncStorage.setItem('user', JSON.stringify(user));
          }
        }
        await loadWeeklyPoints();

        const mbtiData = await loadMbtiScores();
        const currentCompleted = mbtiData ? mbtiData.completedPresetLevels : completedPresetLevels;

        const isFinal = currentCompleted.length === 4;
        let finalMbtiType = null;
        if (isFinal) {
          if (response.data.mbti) {
            finalMbtiType = response.data.mbti;
          } else {
            const latestScores = response.data.totalMbtiScores || (mbtiData ? mbtiData.scores : mbtiScores);
            finalMbtiType = calculateMbtiResult(latestScores).type;
          }
          setMbtiResult({ type: finalMbtiType });
          await saveMbtiResult({ type: finalMbtiType });
          try {
            await mbtiAPI.updateMbti(finalMbtiType);
          } catch (e) {
            console.error('更新使用者 MBTI 失敗', e);
          }
        }

        setGameResult({ ...results, isFinal, finalMbti: finalMbtiType });
        setGameState('results');
      }
    } catch (error) {
      console.error('❌ 上傳遊戲結果失敗:', error);
    }
  };

  const getNextLevel = (currentLevel) => {
    if (!currentLevel) return null;
    let currentPresetId = currentLevel.id;
    if (currentLevel.originalId && PRESET_LEVEL_IDS.includes(currentLevel.originalId)) {
      currentPresetId = currentLevel.originalId;
    }
    const presetIndex = PRESET_LEVEL_IDS.indexOf(currentPresetId);
    if (presetIndex !== -1 && presetIndex < PRESET_LEVEL_IDS.length - 1) {
      const nextId = PRESET_LEVEL_IDS[presetIndex + 1];
      return mergedBuiltinLevels.find(l => l.id === nextId || l.originalId === nextId);
    }
    return null;
  };

  const openEditor = (levelToEdit = null, isPreset = false) => {
    setEditingLevel({ level: levelToEdit, isPreset });
    setEditorOpen(true);
  };

  const handleEditLevel = (level) => {
    const isPreset = PRESET_LEVEL_IDS.includes(level.id);
    openEditor(level, isPreset);
  };

  const getExistingCustomIdForEdit = () => {
    if (!editingLevel) return null;
    if (!editingLevel.isPreset) {
      return editingLevel.level.id;
    } else {
      const customVersion = originalToCustom[editingLevel.level.id];
      return customVersion ? customVersion.id : null;
    }
  };

  const handleEditorSave = async (newLevel, action, targetPresetId) => {
    try {
      if (action === 'saveToPreset') {
        Alert.alert('提示', '請使用「另存為新自定義關卡」來修改預設關卡');
        setEditorOpen(false);
        return;
      }

      let response;
      if (action === 'updateExisting' && targetPresetId) {
        response = await customLevelAPI.update(targetPresetId, newLevel);
      } else {
        response = await customLevelAPI.create(newLevel);
      }

      if (response.data.success) {
        Alert.alert('成功', '關卡已儲存');
        setEditorOpen(false);
        await loadCustomLevels();
      } else {
        Alert.alert('錯誤', response.data.error || '儲存失敗');
      }
    } catch (error) {
      console.error('儲存關卡失敗:', error);
      Alert.alert('錯誤', '儲存關卡失敗，已儲存至本地');
      try {
        const saved = await AsyncStorage.getItem('custom_levels') || '[]';
        const list = JSON.parse(saved);
        const index = list.findIndex(l => l.id === newLevel.id);
        if (index >= 0) {
          list[index] = newLevel;
        } else {
          list.push(newLevel);
        }
        await AsyncStorage.setItem('custom_levels', JSON.stringify(list));
        setCustomLevels(list);
        setEditorOpen(false);
      } catch (e) {}
    }
  };

  const handleDeleteLevel = async (level) => {
    try {
      const response = await customLevelAPI.delete(level.id);
      if (response.data.success) {
        Alert.alert('成功', '關卡已刪除');
        await loadCustomLevels();
      } else {
        Alert.alert('錯誤', response.data.error || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除關卡失敗:', error);
      Alert.alert('錯誤', '刪除關卡失敗，已從本地移除');
      try {
        const updated = customLevels.filter(l => l.id !== level.id);
        await AsyncStorage.setItem('custom_levels', JSON.stringify(updated));
        setCustomLevels(updated);
      } catch (e) {}
    }
  };

  const resetGame = () => {
    setGameResult(null);
    setSelectedLevel(null);
  };

  const handleRestart = () => {
    resetGame();
    if (selectedLevel) setGameState('playing');
  };

  const handleBackToMenu = () => {
    resetGame();
    setGameState('menu');
  };

  const handleResetMBTI = async () => {
    Alert.alert(
      '重置 MBTI 進度',
      '確定要重置所有預設關卡的 MBTI 分數嗎？此操作無法復原，但已獲得的積分不會消失。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await gameAPI.resetMbti();
              if (response.data.success) {
                await loadMbtiScores();
                setMbtiResult(null);
                await AsyncStorage.removeItem(`mbti_result_${userId}`);
                // 重置全局題目池
                setGlobalRemainingQuestions(getAllQuestions());
                Alert.alert('成功', 'MBTI 分數已重置，可重新測試');
              } else {
                Alert.alert('錯誤', response.data.error || '重置失敗');
              }
            } catch (error) {
              console.error('❌ 重置 MBTI 失敗:', error);
              Alert.alert('錯誤', '網路錯誤，請稍後重試');
            }
          },
        },
      ]
    );
  };

  if (editorOpen) {
    const customIdForEdit = getExistingCustomIdForEdit();
    return (
      <NewLevelEditor
        initialLevel={editingLevel?.level}
        isPreset={editingLevel?.isPreset}
        existingCustomId={customIdForEdit}
        onSave={handleEditorSave}
        onClose={() => setEditorOpen(false)}
      />
    );
  }

  switch (gameState) {
    case 'menu':
      return (
        <SafeAreaView style={styles.container}>
          {onBackToHome && (
            <TouchableOpacity style={styles.backToHomeButton} onPress={onBackToHome}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
            </TouchableOpacity>
          )}

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <MaterialCommunityIcons name="brain" size={60} color="#f4c7ab" />
              <Text style={styles.title}>MBTI 冒險</Text>
              <Text style={styles.subtitle}>透過遊戲探索你的性格</Text>
            </View>

            {character && (
              <View style={styles.characterCard}>
                <View style={[styles.characterAvatar, { backgroundColor: character.outfitColor }]}>
                  {character.avatar ? (
                    <Image source={{ uri: character.avatar }} style={styles.avatarImage} />
                  ) : (
                    <MaterialCommunityIcons name="account" size={40} color="#fff" />
                  )}
                </View>
                <View style={styles.characterInfo}>
                  <Text style={styles.characterName}>{character.name}</Text>
                  <Text style={styles.characterLabel}>目前角色</Text>
                </View>
              </View>
            )}

            {mbtiResult && (
              <View style={styles.mbtiCard}>
                <Text style={styles.mbtiType}>{mbtiResult.type}</Text>
                <Text style={styles.mbtiDesc}>{MBTI_DESCRIPTIONS[mbtiResult.type]?.name}</Text>
              </View>
            )}

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>冒險統計</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="trophy" size={32} color="#FFD700" />
                  <Text style={styles.statValue}>{playerStats.totalScore || 0}</Text>
                  <Text style={styles.statLabel}>總分數</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="flag-checkered" size={32} color="#3498db" />
                  <Text style={styles.statValue}>
                    {Object.keys(completedLevels).length}/{mergedBuiltinLevels.length}
                  </Text>
                  <Text style={styles.statLabel}>關卡完成</Text>
                </View>
              </View>
            </View>

            <View style={styles.menuButtons}>
              <TouchableOpacity style={styles.startButton} onPress={() => setGameState('character')}>
                <MaterialCommunityIcons name="account-plus" size={28} color="#fff" />
                <Text style={styles.startButtonText}>
                  {character ? '更換角色' : '創建角色'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.playButton, !character && styles.disabledButton]}
                onPress={() => {
                  if (character) setGameState('levelSelect');
                  else Alert.alert('提示', '請先創建角色');
                }}
                disabled={!character}
              >
                <MaterialCommunityIcons name="play" size={32} color="#fff" />
                <Text style={styles.playButtonText}>開始冒險</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={handleResetMBTI}>
              <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
              <Text style={styles.resetButtonText}>重置 MBTI 進度</Text>
            </TouchableOpacity>
          </ScrollView>

          {__DEV__ && (
            <TouchableOpacity style={styles.debugButton} onPress={() => openEditor()}>
              <MaterialCommunityIcons name="pencil" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </SafeAreaView>
      );

    case 'character':
      return (
        <CharacterCustomScreen
          initialCharacter={character}
          onComplete={handleCharacterComplete}
          onBack={() => setGameState('menu')}
        />
      );

    case 'levelSelect':
      return (
        <LevelSelect
          builtinLevels={mergedBuiltinLevels}
          customLevels={filteredCustom}
          completedLevels={completedLevels}
          completedPresetLevels={completedPresetLevels}
          onSelectLevel={handleLevelSelect}
          onSelectEndless={handleEndlessSelect}
          onBack={() => setGameState('menu')}
          character={character}
          hasMbtiResult={!!mbtiResult}
          remainingPoints={weeklyPoints.remaining}
          onEditLevel={handleEditLevel}
          onDeleteLevel={handleDeleteLevel}
          showBuiltinEdit={false}
        />
      );

    case 'playing':
      return (
        <ShootingGameEngine
          level={selectedLevel}
          character={character}
          onGameComplete={handleGameComplete}
          onBack={handleBackToMenu}
          mbtiScores={mbtiScores}
          setMbtiScores={setMbtiScores}
          pickQuestion={pickGlobalQuestion}
          returnQuestions={returnQuestions}
        />
      );

    case 'endless':
      return (
        <EndlessMode
          character={character}
          onBack={handleBackToMenu}
          onGameComplete={handleGameComplete}
          mbtiScores={mbtiScores}
          setMbtiScores={setMbtiScores}
          remainingPoints={weeklyPoints.remaining}
          pickQuestion={pickGlobalQuestion}
          returnQuestions={returnQuestions}
        />
      );

    case 'results':
      return (
        <GameResults
          gameData={gameResult}
          level={selectedLevel}
          onRestart={handleRestart}
          onBack={handleBackToMenu}
          onNextLevel={() => {
            const next = getNextLevel(selectedLevel);
            if (next) {
              handleLevelSelect(next);
            } else {
              Alert.alert('提示', '沒有下一關了');
            }
          }}
          character={character}
        />
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf5' },
  scrollContent: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 30 },
  title: { fontSize: 42, fontWeight: '900', color: '#5c4033', marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#8b5e3c' },
  characterCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 20, marginBottom: 20, padding: 16, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 3,
  },
  characterAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
  characterInfo: { flex: 1, marginLeft: 16 },
  characterName: { fontSize: 20, fontWeight: '700', color: '#5c4033' },
  characterLabel: { fontSize: 14, color: '#8b5e3c', marginTop: 4 },
  mbtiCard: {
    backgroundColor: '#9b59b6', marginHorizontal: 20, padding: 16, borderRadius: 16,
    alignItems: 'center', marginBottom: 20,
  },
  mbtiType: { fontSize: 32, fontWeight: '900', color: '#fff' },
  mbtiDesc: { fontSize: 16, color: '#fff', marginTop: 5 },
  statsCard: {
    backgroundColor: '#fff', marginHorizontal: 20, padding: 24, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1,
    shadowRadius: 12, elevation: 5, marginBottom: 30,
  },
  statsTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033', marginBottom: 20, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '800', color: '#5c4033', marginTop: 8, marginBottom: 4 },
  statLabel: { fontSize: 14, color: '#8b5e3c' },
  menuButtons: { marginHorizontal: 20 },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#9b59b6', paddingVertical: 16, borderRadius: 16, marginBottom: 16,
  },
  startButtonText: { fontSize: 18, fontWeight: '700', color: '#fff', marginLeft: 12 },
  playButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f4c7ab', paddingVertical: 20, borderRadius: 16,
    shadowColor: '#8b5e3c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2,
    shadowRadius: 8, elevation: 6,
  },
  playButtonText: { fontSize: 24, fontWeight: '800', color: '#5c4033', marginLeft: 12 },
  disabledButton: { opacity: 0.5 },
  debugButton: {
    position: 'absolute', bottom: 20, right: 20, backgroundColor: '#f39c12',
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3,
    shadowRadius: 8, elevation: 8, zIndex: 1000,
  },
  backToHomeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e67e22',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});