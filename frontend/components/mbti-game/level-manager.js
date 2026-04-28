// app/components/mbti-game/level-manager.js
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { MBTI_DIMENSION_LEVELS } from '../../data/levels';

export const useLevelManager = (userId) => {
  const [levels] = useState(MBTI_DIMENSION_LEVELS);
  const [completedLevels, setCompletedLevels] = useState({});
  const [currentLevel, setCurrentLevel] = useState(null);
  const [playerStats, setPlayerStats] = useState({
    totalScore: 0,
    completionRate: 0,
    averageTime: 0,
    favoriteDimension: null
  });

  useEffect(() => {
    if (userId) {
      loadGameProgress(userId);
    }
  }, [userId]);

  const loadGameProgress = async (uid) => {
    try {
      const savedProgress = await AsyncStorage.getItem(`mbti_game_progress_${uid}`);
      if (savedProgress) {
        const { completed, stats } = JSON.parse(savedProgress);
        setCompletedLevels(completed || {});
        setPlayerStats(stats || {
          totalScore: 0,
          completionRate: 0,
          averageTime: 0,
          favoriteDimension: null
        });
      }
    } catch (error) {
      console.error('載入遊戲進度失敗:', error);
    }
  };

  const saveGameProgress = async (levelId, results) => {
    if (!userId) return { success: false, error: 'No user ID' };

    try {
      const newCompletedLevels = {
        ...completedLevels,
        [levelId]: {
          completedAt: new Date().toISOString(),
          score: results.score || 0,
          mbtiScores: results.scores || {},
          itemsCollected: results.itemsCollected?.length || 0,
          playTime: results.playTime || 0
        }
      };

      const totalScore = Object.values(newCompletedLevels).reduce(
        (sum, level) => sum + (level.score || 0), 0
      );
      
      const completionRate = (Object.keys(newCompletedLevels).length / levels.length) * 100;
      
      const totalTime = Object.values(newCompletedLevels).reduce(
        (sum, level) => sum + (level.playTime || 0), 0
      );
      const averageTime = Object.keys(newCompletedLevels).length > 0 
        ? Math.round(totalTime / Object.keys(newCompletedLevels).length) 
        : 0;

      const dimensionCounts = {};
      Object.keys(newCompletedLevels).forEach((lvlId) => {
        const levelData = levels.find(l => l.id === lvlId);
        if (levelData?.dimension) {
          dimensionCounts[levelData.dimension] = (dimensionCounts[levelData.dimension] || 0) + 1;
        }
      });

      let favoriteDimension = null;
      let maxCount = 0;
      Object.entries(dimensionCounts).forEach(([dimension, count]) => {
        if (count > maxCount) {
          maxCount = count;
          favoriteDimension = dimension;
        }
      });

      const newStats = {
        totalScore,
        completionRate,
        averageTime,
        favoriteDimension
      };

      setCompletedLevels(newCompletedLevels);
      setPlayerStats(newStats);

      await AsyncStorage.setItem(`mbti_game_progress_${userId}`, JSON.stringify({
        completed: newCompletedLevels,
        stats: newStats
      }));

      await checkAchievements(newCompletedLevels);

      return { success: true, stats: newStats };
    } catch (error) {
      console.error('保存遊戲進度失敗:', error);
      return { success: false, error: error.message };
    }
  };

  const checkAchievements = async (completed) => {
    try {
      const achievements = await AsyncStorage.getItem(`mbti_achievements_${userId}`) || '[]';
      const parsed = JSON.parse(achievements);
      const newAchievements = [];

      if (Object.keys(completed).length === 1 && !parsed.includes('first_level')) {
        newAchievements.push('first_level');
      }
      if (Object.keys(completed).length === levels.length && !parsed.includes('all_levels')) {
        newAchievements.push('all_levels');
      }
      const highScore = Object.values(completed).some(level => level.score >= 200);
      if (highScore && !parsed.includes('high_score')) {
        newAchievements.push('high_score');
      }

      if (newAchievements.length > 0) {
        await AsyncStorage.setItem(`mbti_achievements_${userId}`, 
          JSON.stringify([...parsed, ...newAchievements])
        );
        Alert.alert(
          '🎉 達成成就！',
          `你獲得了 ${newAchievements.length} 個新成就`,
          [{ text: '太棒了！' }]
        );
      }
    } catch (error) {
      console.error('檢查成就失敗:', error);
    }
  };

  const startLevel = (levelId) => {
    const level = levels.find(l => l.id === levelId);
    if (level) {
      const levelCopy = JSON.parse(JSON.stringify(level));
      setCurrentLevel(levelCopy);
      return levelCopy;
    }
    return null;
  };

  const completeLevel = async (levelId, results) => {
    return await saveGameProgress(levelId, results);
  };

  const getLevelProgression = () => {
    return levels.map((level, index) => ({
      ...level,
      completed: !!completedLevels[level.id],
      score: completedLevels[level.id]?.score || 0,
      stars: calculateStars(completedLevels[level.id]?.score || 0)
    }));
  };

  const calculateStars = (score) => {
    if (score >= 200) return 3;
    if (score >= 150) return 2;
    if (score >= 100) return 1;
    return 0;
  };

  const resetProgress = async () => {
    try {
      await AsyncStorage.removeItem(`mbti_game_progress_${userId}`);
      setCompletedLevels({});
      setPlayerStats({
        totalScore: 0,
        completionRate: 0,
        averageTime: 0,
        favoriteDimension: null
      });
      return true;
    } catch (error) {
      console.error('重置進度失敗:', error);
      return false;
    }
  };

  return {
    levels,
    completedLevels,
    currentLevel,
    playerStats,
    startLevel,
    completeLevel,
    getLevelProgression,
    resetProgress
  };
};