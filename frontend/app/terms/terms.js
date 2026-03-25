//terms/terms.js

import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#5c4033" />
        </TouchableOpacity>
        <Text style={styles.title}>服務條款</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>最後更新日期：2026 年 3 月</Text>

        <Text style={styles.sectionTitle}>1. 接受條款</Text>
        <Text style={styles.paragraph}>
          歡迎使用 LockMATCH（以下簡稱「本 App」）。當您註冊或使用本 App，即表示您已閱讀、理解並同意本服務條款的所有內容。
        </Text>

        <Text style={styles.sectionTitle}>2. 使用資格</Text>
        <Text style={styles.paragraph}>
          • 您必須年滿 18 歲（或所在地區法定成年年齡）。{'\n'}
          • 您保證提供的 MBTI 類型及其他資料真實、準確。
        </Text>

        <Text style={styles.sectionTitle}>3. 使用者義務</Text>
        <Text style={styles.paragraph}>
          您同意不會：
          • 建立虛假帳號或冒用他人身分
          • 發送垃圾訊息、廣告或商業訊息
          • 騷擾、威脅、歧視其他使用者
          • 上傳含有色情、暴力、非法內容的照片或文字
        </Text>

        <Text style={styles.sectionTitle}>4. 智慧財產權</Text>
        <Text style={styles.paragraph}>
          本 App 所有內容（包括但不限於設計、文字、圖標）均屬 LockMATCH 或其授權人所有，未經書面許可不得複製、修改或散布。
        </Text>

        <Text style={styles.sectionTitle}>5. 免責聲明</Text>
        <Text style={styles.paragraph}>
          本 App 僅提供 MBTI 配對平台，不對任何使用者之間的互動、約會結果或後續行為負責。請保持謹慎，保護自身安全。
        </Text>

        <Text style={styles.sectionTitle}>6. 帳號終止</Text>
        <Text style={styles.paragraph}>
          若您嚴重違反本條款，我們有權隨時暫停或終止您的帳號，無需事先通知。
        </Text>

        <Text style={styles.sectionTitle}>7. 條款修改</Text>
        <Text style={styles.paragraph}>
          我們保留隨時修改本條款的權利，修改後將於 App 內公告。繼續使用即視為同意新條款。
        </Text>

        <Text style={styles.paragraph}>如有任何問題，歡迎聯絡我們。</Text>
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