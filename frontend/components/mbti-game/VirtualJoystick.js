// app/components/mbti-game/VirtualJoystick.js
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

const KNOB_SIZE = 40;
const CONTAINER_SIZE = 120;

export default function VirtualJoystick({ onMove, simultaneousWith }) {
  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);

  // 建立手勢
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      // 使用相對於容器的座標 (event.x, event.y)
      const centerX = CONTAINER_SIZE / 2;
      const centerY = CONTAINER_SIZE / 2;
      let dx = event.x - centerX;
      let dy = event.y - centerY;

      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = CONTAINER_SIZE / 2 - KNOB_SIZE / 2;

      if (distance > maxDistance) {
        dx = (dx / distance) * maxDistance;
        dy = (dy / distance) * maxDistance;
      }

      knobX.value = dx;
      knobY.value = dy;

      const normalizedX = dx / maxDistance;
      const normalizedY = dy / maxDistance;
      runOnJS(onMove)({ x: normalizedX, y: normalizedY });
    })
    .onEnd(() => {
      knobX.value = withSpring(0);
      knobY.value = withSpring(0);
      runOnJS(onMove)({ x: 0, y: 0 });
    });

  // 設定同時手勢（如果提供了 external 手勢）
  if (simultaneousWith) {
    pan.simultaneousWithExternalGesture(simultaneousWith);
  }

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobX.value }, { translateY: knobY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={styles.container} collapsable={false}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    borderRadius: CONTAINER_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#fff',
  },
});