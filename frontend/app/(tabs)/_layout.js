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
          bottom: 15,
          left: 16,
          right: 16,
          height: 80,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderRadius: 36,
          borderWidth: 1,
          borderColor: 'rgba(244, 199, 171, 0.4)',
          shadowColor: '#8b5e3c',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 12,
          paddingHorizontal: 20,
        },
        tabBarActiveTintColor: '#f4c7ab',
        tabBarInactiveTintColor: '#5c4033',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: '首頁',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home" size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name="chat/search"
        options={{
          tabBarLabel: '匹配',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="heart-multiple" size={28} color={color} />,
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
          <MaterialCommunityIcons name="map-marker-radius-outline" size={32} color="#5c4033" />
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
          { marginTop: -36 },
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
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons name="forum" size={28} color={focused ? '#f4c7ab' : '#5c4033'} />
          ),
          tabBarLabelStyle: ({ focused }) => focused ? { color: '#f4c7ab', fontWeight: '700' } : {},
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f4c7ab',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#c47c5e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
});