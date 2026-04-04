// app/mbti-game/visual-effects/index.js
import { useRef, useState, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS
} from 'react-native-reanimated';

import { 
  LottieAnimation, 
  GAME_ANIMATIONS,
  CollectEffect,
  JumpEffect 
} from './lottie-config';
import { 
  ParticleSystem, 
  MbtiParticleEffect 
} from './particle-system';

export const useVisualEffects = () => {
  const [activeEffects, setActiveEffects] = useState([]);
  const effectsRef = useRef([]);

  const addEffect = (type, config) => {
    const id = Date.now() + Math.random();
    const effect = { id, type, config };
    
    setActiveEffects(prev => [...prev, effect]);
    
    // 自動清理效果
    const cleanupTime = config.duration || 2000;
    setTimeout(() => {
      removeEffect(id);
    }, cleanupTime);
    
    return id;
  };

  const removeEffect = (id) => {
    setActiveEffects(prev => prev.filter(effect => effect.id !== id));
  };

  const clearAllEffects = () => {
    setActiveEffects([]);
  };

  // 預定義的效果觸發器
  const triggerCollectEffect = (position, itemType) => {
    return addEffect('collect', {
      position,
      itemType,
      duration: 1200
    });
  };

  const triggerJumpEffect = (position) => {
    return addEffect('jump', {
      position,
      duration: 800
    });
  };

  const triggerScenarioEffect = (position) => {
    return addEffect('scenario', {
      position,
      duration: 1500
    });
  };

  const triggerMbtiReveal = (position, mbtiType) => {
    return addEffect('mbti_reveal', {
      position,
      mbtiType,
      duration: 3000
    });
  };

  const triggerLevelComplete = () => {
    return addEffect('level_complete', {
      duration: 4000
    });
  };

  // 渲染所有活動效果
  const renderEffects = () => {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {activeEffects.map(effect => {
          switch (effect.type) {
            case 'collect':
              return (
                <CollectEffect
                  key={effect.id}
                  position={effect.config.position}
                  onComplete={() => removeEffect(effect.id)}
                />
              );
              
            case 'jump':
              return (
                <JumpEffect
                  key={effect.id}
                  position={effect.config.position}
                />
              );
              
            case 'scenario':
              return (
                <LottieAnimation
                  key={effect.id}
                  animation={GAME_ANIMATIONS.SCENARIO_TRIGGER}
                  style={{
                    position: 'absolute',
                    left: effect.config.position.x - 75,
                    top: effect.config.position.y - 75,
                    width: 150,
                    height: 150
                  }}
                />
              );
              
            case 'mbti_reveal':
              return (
                <View key={effect.id}>
                  <MbtiParticleEffect
                    mbtiType={effect.config.mbtiType}
                    position={effect.config.position}
                  />
                  <LottieAnimation
                    animation={GAME_ANIMATIONS.MBTI_REVEAL}
                    style={{
                      position: 'absolute',
                      left: effect.config.position.x - 100,
                      top: effect.config.position.y - 100,
                      width: 200,
                      height: 200
                    }}
                  />
                </View>
              );
              
            case 'level_complete':
              return (
                <LottieAnimation
                  key={effect.id}
                  animation={GAME_ANIMATIONS.LEVEL_COMPLETE}
                  style={{
                    position: 'absolute',
                    top: '30%',
                    alignSelf: 'center',
                    width: 300,
                    height: 300
                  }}
                />
              );
              
            default:
              return null;
          }
        })}
      </View>
    );
  };

  return {
    activeEffects,
    triggerCollectEffect,
    triggerJumpEffect,
    triggerScenarioEffect,
    triggerMbtiReveal,
    triggerLevelComplete,
    renderEffects,
    clearAllEffects
  };
};

// 屏幕震動效果
export const ScreenShake = ({ intensity = 10, duration = 300, children }) => {
  const shake = useSharedValue(0);
  
  const triggerShake = () => {
    shake.value = withSequence(
      withTiming(intensity, { duration: duration / 4 }),
      withTiming(-intensity, { duration: duration / 4 }),
      withTiming(intensity / 2, { duration: duration / 4 }),
      withTiming(0, { duration: duration / 4 })
    );
  };
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shake.value }]
    };
  });
  
  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};