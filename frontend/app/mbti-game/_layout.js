// app/mbti-game/_layout.js
import { Stack } from 'expo-router';

export default function MBTIGameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'MBTI 冒險' }} />
    </Stack>
  );
}