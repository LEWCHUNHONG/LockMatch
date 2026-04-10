// app/mbti-game/EndlessMode.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ShootingGameEngine from '../../components/mbti-game/ShootingGameEngine';

export default function EndlessMode({ character, onBack, onGameComplete, mbtiScores, setMbtiScores, remainingPoints, pickQuestion, returnQuestions }) {
  const generateEndlessFloor = (floorIndex) => {
    const monsters = [];
    const count = 5 + Math.floor(floorIndex / 2);
    for (let i = 0; i < count; i++) {
      monsters.push({
        instanceId: `m_${Date.now()}_${i}`,
        x: 100 + Math.random() * 600,
        y: 100 + Math.random() * 400,
        hp: 30 + floorIndex * 5,
        attack: 5 + floorIndex,
        expReward: 10 + floorIndex * 2,
        speed: 2,
        color: '#e74c3c',
        image: null,
      });
    }
    return {
      floorIndex,
      monsters,
      obstacles: [],
      items: [],
      exit: { x: 700, y: 500, width: 50, height: 50 },
    };
  };

  const endlessLevel = {
    id: 'endless',
    name: '無盡深淵',
    bgColor: '#2c3e50',
    backgroundImage: null,
    floors: [generateEndlessFloor(0)],
    totalFloors: Infinity,
  };

  return (
    <View style={{ flex: 1 }}>
      {remainingPoints !== undefined && (
        <View style={styles.remainingBanner}>
          <Text style={styles.remainingText}>本週剩餘積分: {remainingPoints}</Text>
        </View>
      )}
      <ShootingGameEngine
        level={endlessLevel}
        character={character}
        onGameComplete={onGameComplete}
        onBack={onBack}
        mbtiScores={mbtiScores}
        setMbtiScores={setMbtiScores}
        gameMode="endless"
        pickQuestion={pickQuestion}
        returnQuestions={returnQuestions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  remainingBanner: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 100,
  },
  remainingText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});