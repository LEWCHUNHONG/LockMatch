// app/mbti-game/visual-effects/particle-system.js
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';

export const Particle = ({ 
  startPosition, 
  endPosition, 
  color = '#FFD700',
  size = 10,
  duration = 1000,
  delay = 0 
}) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // 粒子動畫
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic)
      })
    );
    
    // 淡出動畫
    opacity.value = withDelay(
      delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const x = startPosition.x + (endPosition.x - startPosition.x) * progress.value;
    const y = startPosition.y + (endPosition.y - startPosition.y) * progress.value;
    
    // 添加一些隨機曲線
    const curve = Math.sin(progress.value * Math.PI) * 30;
    
    return {
      transform: [
        { translateX: x + curve },
        { translateY: y - curve }
      ],
      opacity: opacity.value
    };
  });

  return (
    <Animated.View style={[
      styles.particle,
      {
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: size / 2
      },
      animatedStyle
    ]} />
  );
};

export const ParticleSystem = ({ 
  count = 10, 
  startPosition, 
  spread = 100,
  color,
  onComplete 
}) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      startPosition,
      endPosition: {
        x: startPosition.x + (Math.random() - 0.5) * spread * 2,
        y: startPosition.y - Math.random() * spread
      },
      color: color || `hsl(${Math.random() * 60 + 30}, 100%, 60%)`,
      size: Math.random() * 8 + 4,
      duration: Math.random() * 500 + 500,
      delay: i * 50
    }));
    
    setParticles(newParticles);
    
    // 所有粒子動畫完成後回調
    const totalDuration = count * 50 + 1000;
    setTimeout(() => {
      if (onComplete) onComplete();
    }, totalDuration);
    
  }, [count, startPosition]);

  return (
    <>
      {particles.map(particle => (
        <Particle key={particle.id} {...particle} />
      ))}
    </>
  );
};

// MBTI特效系統
export const MbtiParticleEffect = ({ mbtiType, position }) => {
  const colors = {
    E: '#FF6B6B',
    I: '#3498DB',
    S: '#2ECC71',
    N: '#9B59B6',
    T: '#34495E',
    F: '#E74C3C',
    J: '#F39C12',
    P: '#1ABC9C'
  };
  
  return (
    <ParticleSystem
      count={15}
      startPosition={position}
      spread={80}
      color={colors[mbtiType]}
    />
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5
  }
});