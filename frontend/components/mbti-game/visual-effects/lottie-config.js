// app/mbti-game/visual-effects/lottie-config.js
import LottieView from 'lottie-react-native';
import { useEffect, useRef } from 'react';

// 預定義的遊戲動畫
export const GAME_ANIMATIONS = {
  COLLECT_ITEM: require('../../../assets/animations/collect-star.json'),
  LEVEL_COMPLETE: require('../../../assets/animations/level-complete.json'),
  JUMP: require('../../../assets/animations/jump-effect.json'),
  MBTI_REVEAL: require('../../../assets/animations/mbti-reveal.json'),
  SCENARIO_TRIGGER: require('../../../assets/animations/scenario-trigger.json')
};

export const LottieAnimation = ({ 
  animation, 
  autoPlay = true, 
  loop = false,
  speed = 1,
  style,
  onAnimationFinish 
}) => {
  const animationRef = useRef(null);

  useEffect(() => {
    if (autoPlay && animationRef.current) {
      animationRef.current.play();
    }
  }, []);

  return (
    <LottieView
      ref={animationRef}
      source={animation}
      autoPlay={autoPlay}
      loop={loop}
      speed={speed}
      style={style}
      onAnimationFinish={onAnimationFinish}
    />
  );
};

// 組合動畫組件
export const CollectEffect = ({ position, onComplete }) => {
  return (
    <LottieAnimation
      animation={GAME_ANIMATIONS.COLLECT_ITEM}
      style={{
        position: 'absolute',
        left: position.x - 50,
        top: position.y - 50,
        width: 100,
        height: 100
      }}
      onAnimationFinish={onComplete}
    />
  );
};

export const JumpEffect = ({ position }) => {
  return (
    <LottieAnimation
      animation={GAME_ANIMATIONS.JUMP}
      style={{
        position: 'absolute',
        left: position.x - 25,
        top: position.y + 20,
        width: 50,
        height: 50
      }}
      loop={false}
    />
  );
};