// app/profile/public/[id].js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import api from '../../../utils/api'; // 根據你的專案結構調整路徑

export default function PublicProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/user/${id}`);

        if (!res.data?.success) {
          throw new Error(res.data?.error || '無法載入資料');
        }

        setProfile(res.data.user);
      } catch (err) {
        console.error('載入公開個人資料失敗:', err);
        Alert.alert('提示', '無法查看此用戶資料，可能已設為隱私或不存在');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const getMbtiColor = (mbti) => {
    if (!mbti) return '#f4c7ab';
    const colors = {
      ISTJ: '#3498db', ISFJ: '#2ecc71', INFJ: '#9b59b6', INTJ: '#1abc9c',
      ISTP: '#e74c3c', ISFP: '#f39c12', INFP: '#d35400', INTP: '#34495e',
      ESTP: '#e67e22', ESFP: '#f1c40f', ENFP: '#2ecc71', ENTP: '#9b59b6',
      ESTJ: '#3498db', ESFJ: '#1abc9c', ENFJ: '#e74c3c', ENTJ: '#f39c12',
    };
    return colors[mbti.toUpperCase()] || '#f4c7ab';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.gradient}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#f4c7ab" />
            <Text style={styles.loadingText}>載入中...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.gradient}>
          <View style={styles.center}>
            <Text style={styles.errorText}>無法載入用戶資料</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>個人卡片</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileCard}>
            <Image
              source={{
                uri:
                  profile.avatar?.startsWith('http')
                    ? profile.avatar
                    : profile.avatar
                    ? `${api.defaults.baseURL}${profile.avatar}`
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&size=128&background=f4c7ab&color=5c4033`,
              }}
              style={styles.avatar}
            />

            <Text style={styles.username}>{profile.username || '匿名用戶'}</Text>

            {profile.mbti && (
              <View style={[styles.mbtiTag, { backgroundColor: getMbtiColor(profile.mbti) }]}>
                <MaterialCommunityIcons name="account-check" size={20} color="#fff" />
                <Text style={styles.mbtiText}>{profile.mbti} 型</Text>
              </View>
            )}

            {profile.status && (
              <Text style={styles.statusText}>
                <MaterialCommunityIcons name="circle" size={12} color="#2ecc71" /> {profile.status}
              </Text>
            )}
          </View>

          {/* 之後想加更多欄位（自我介紹、興趣等）就在這裡擴充 */}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#5c4033' },
  errorText: { fontSize: 18, color: '#e74c3c', marginBottom: 20 },
  backBtn: { backgroundColor: '#f4c7ab', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30 },
  backText: { color: '#5c4033', fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(244,199,171,0.25)' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#5c4033' },

  content: { padding: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,199,171,0.3)',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 20,
    borderWidth: 5,
    borderColor: '#fffaf5',
  },
  username: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 16,
  },
  mbtiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
    marginBottom: 20,
  },
  mbtiText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  statusText: {
    fontSize: 16,
    color: '#5c4033',
    marginTop: 8,
    textAlign: 'center',
  },
});