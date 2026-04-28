//terms/community-guidelines.js

import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { useCallback } from 'react';

export default function CommunityGuidelinesScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace('/');
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [router])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#5c4033" />
        </TouchableOpacity>
        <Text style={styles.title}>社群規範</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>最後更新日期：2026 年 3 月</Text>

        <Text style={styles.intro}>
          為了讓每位 LockMATCH 使用者都能在安全、尊重、愉快的環境中找到靈魂夥伴，請共同遵守以下規範：
        </Text>

        <Text style={styles.sectionTitle}>✅ 請這樣做</Text>
        <Text style={styles.paragraph}>
          • 以真誠、尊重的態度與他人互動{'\n'}
          • 分享真實的 MBTI 體驗與正面故事{'\n'}
          • 保護自己與他人的隱私（勿要求或分享電話 等聯絡方式）{'\n'}
          • 遇到不適立即使用「檢舉」功能
        </Text>

        <Text style={styles.sectionTitle}>❌ 禁止行為</Text>
        <Text style={styles.paragraph}>
          • 任何形式的騷擾、歧視、辱罵、性暗示{'\n'}
          • 發送廣告、直銷、詐騙訊息{'\n'}
          • 冒用他人照片或假造 MBTI 類型{'\n'}
          • 發表涉及政治、宗教爭議、暴力、色情內容{'\n'}
          • 未經同意私下要求見面或索取個人聯絡方式
        </Text>

        <Text style={styles.sectionTitle}>違規後果</Text>
        <Text style={styles.paragraph}>
          違反規範將視情節輕重，受到警告、暫停配對功能、永久停權等處分。
        </Text>

        <Text style={styles.paragraph}>
          感謝您一起維護 LockMATCH 這個溫暖的 MBTI 社群！{'\n'}如果您發現任何違規行為，歡迎隨時檢舉，我們會盡快處理。{'\n'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fffaf5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f4c7ab',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    textAlign: 'center',
  },
  content: { flex: 1, padding: 20 },
  lastUpdated: { fontSize: 13, color: '#a0785e', marginBottom: 16 },
  intro: { 
    fontSize: 16, 
    lineHeight: 24, 
    color: '#5c4033', 
    fontWeight: '500', 
    marginBottom: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#5c4033', 
    marginTop: 24, 
    marginBottom: 10 
  },
  paragraph: { 
    fontSize: 15.5, 
    lineHeight: 24, 
    color: '#4d342e', 
    marginBottom: 14 
  },
});