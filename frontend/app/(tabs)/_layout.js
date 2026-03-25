// app/(tabs)/_layout.js
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, Animated, StyleSheet, Pressable } from 'react-native';
import { useRef } from 'react';

export default function TabLayout() {
  const nearbyScale = useRef(new Animated.Value(1)).current;
  const nearbyBackgroundOpacity = useRef(new Animated.Value(0)).current;

  const handleNearbyPressIn = () => {
    Animated.parallel([
      Animated.spring(nearbyScale, { toValue: 0.93, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(nearbyBackgroundOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handleNearbyPressOut = () => {
    Animated.parallel([
      Animated.spring(nearbyScale, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(nearbyBackgroundOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: 15,
          bottom: 20,               // 稍微再抬高，增加懸浮感
          left: 24,                 // ← 從 8 加大到 24（左右各留更多空間）
          right: 24,
          height: 82,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderRadius: 36,
          borderWidth: 0.5,
          borderColor: 'rgba(244, 199, 171, 0.3)',
          shadowColor: '#8b5e3c',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 12,
          paddingHorizontal: 10,    // 內部間距加大，避免 icon 太擠
        },
        tabBarActiveTintColor: '#f4c7ab',
        tabBarInactiveTintColor: '#5c4033',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          paddingTop: 34,          // 讓文字稍微離 icon 遠一點
          fontSize: 13,           // 可選：字小一點，避免太擠
          marginTop: -2,
          fontStyle: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: '首頁',
          tabBarIcon: ({ color }) => (
            <View style={{ transform: [{ translateY: 15 }] }}>
              <MaterialCommunityIcons name="home" size={28} color={color} />
            </View>
          ),
          tabBarLabelStyle: { paddingTop: 15 },
        }}
      />

      <Tabs.Screen
        name="chat/search"
        options={{
          tabBarLabel: '匹配',
          tabBarIcon: ({ color }) => (
            <View style={{ transform: [{ translateY: 15 }] }}>
              <MaterialCommunityIcons name="heart-multiple" size={28} color={color} />
            </View>
          ),
          tabBarLabelStyle: { paddingTop: 15 },
        }}
      />


      <Tabs.Screen
        name="location-checkin"
        options={{
          tabBarLabel: '附近',
          tabBarIcon: () => (
            <Animated.View style={{ transform: [{ scale: nearbyScale }] }}>
              <View style={styles.centerIconWrapper}>
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      backgroundColor: '#ffffff',
                      borderRadius: 34,
                      opacity: nearbyBackgroundOpacity,
                    },
                  ]}
                />
                <MaterialCommunityIcons name="map-marker-radius-outline" size={38} color="#5c4033" />
              </View>
            </Animated.View>
          ),
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPressIn={handleNearbyPressIn}
              onPressOut={handleNearbyPressOut}
              style={({ pressed }) => [
                props.style,
                { marginTop: -10 },
                pressed && { opacity: 0.8 },
              ]}
            >
              {props.children}
            </Pressable>
          ),

          // ── 新增這段：隱藏這個頁面的 tab bar ──
          tabBarStyle: { display: 'none' },
        }}

      />


      <Tabs.Screen
        name="discuss/index"
        options={{
          tabBarLabel: '討論區',
          tabBarIcon: ({ color }) => (
            <View style={{ transform: [{ translateY: 15 }] }}>
              <MaterialCommunityIcons name="forum" size={28} color={color} />
            </View>
          ),
          tabBarLabelStyle: { paddingTop: 15 },
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ color }) => (
            <View style={{ transform: [{ translateY: 15 }] }}>
              <MaterialCommunityIcons name="account" size={28} color={color} />
            </View>
          ),
          tabBarLabelStyle: { paddingTop: 15 },
        }}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#c47c5e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 14,
    overflow: 'hidden',
  },
});