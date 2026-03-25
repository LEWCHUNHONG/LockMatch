//terms/privacy.js

import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { useCallback } from 'react';

export default function PrivacyScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
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
        <Text style={styles.title}>隱私政策</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>最後更新日期：2026 年 3 月</Text>

        <Text style={styles.paragraph}>
          LockMATCH 重視您的隱私。我們會依據本政策收集、使用及保護您的個人資料。
        </Text>

        <Text style={styles.sectionTitle}>我們收集的資料</Text>
        <Text style={styles.paragraph}>
          • 註冊時：使用者名稱、電子郵件、密碼、MBTI 類型{'\n'}
          • 使用時：配對記錄、聊天記錄、裝置資訊（IP、裝置型號等）{'\n'}
          • 可選：頭像、自我介紹
        </Text>

        <Text style={styles.sectionTitle}>資料使用目的</Text>
        <Text style={styles.paragraph}>
          • 提供 MBTI 配對與聊天功能{'\n'}
          • 改善 App 體驗與安全性{'\n'}
          • 寄送重要通知（例如配對成功、安全提醒）
        </Text>

        <Text style={styles.sectionTitle}>資料分享</Text>
        <Text style={styles.paragraph}>
          除非獲得您的同意或法律要求，我們不會將您的個人資料出售或提供給第三方。
          配對時只會顯示必要資訊（暱稱、MBTI、自我介紹）。
        </Text>

        <Text style={styles.sectionTitle}>您的權利</Text>
        <Text style={styles.paragraph}>
          您隨時可以： {'\n'}
          • 查詢、更正您的資料{'\n'}
          • 要求刪除帳號（將清除大部分個人資料）{'\n'}
          • 撤回同意（可能影響部分服務）
        </Text>

        <Text style={styles.sectionTitle}>資料安全</Text>
        <Text style={styles.paragraph}>
          我們採用合理的安全措施保護您的資料，但無法保證絕對安全。
        </Text>

        <Text style={styles.paragraph}>如有隱私相關問題，請聯絡我們。 {'\n'}</Text> 
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
  lastUpdated: { fontSize: 13, color: '#a0785e', marginBottom: 20 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#5c4033', 
    marginTop: 24, 
    marginBottom: 8 
  },
  paragraph: { 
    fontSize: 15.5, 
    lineHeight: 24, 
    color: '#4d342e', 
    marginBottom: 16 
  },
});