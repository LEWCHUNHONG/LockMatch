// app/index.js
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  BackHandler, 
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';

export default function WelcomeScreen() {
  const router = useRouter();

  // 只在 Android 上處理返回鍵 → 直接退出 App
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = () => {
      BackHandler.exitApp();
      return true;           // 告訴系統我們已經處理了這個事件
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress', 
      backHandler
    );

    // 清理（非常重要，避免記憶體問題或重複註冊）
    return () => subscription.remove();
  }, []); // 空依賴 → 只在組件 mount 時註冊一次

  return (
    <LinearGradient
      colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* 右上角地球按鈕 */}
          <TouchableOpacity style={styles.languageButton}>
            <View style={styles.globeOuterCircle}>
              <Ionicons name="earth" size={28} color="#000000" />
            </View>
          </TouchableOpacity>

          {/* 標語區域 */}
          <View style={styles.sloganContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.avatar}>LockMATCH</Text>
            </View>

            <Text style={styles.slogan}>
              Matching With Same MBTI{'\n'}type!
            </Text>
            <Text style={styles.subSlogan}>
              找到和你最像的靈魂夥伴
            </Text>
          </View>

          {/* 按鈕區 */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => router.replace('/register')}
            >
              <Text style={styles.buttonText}>開始使用</Text>
              <Ionicons name="arrow-forward" size={24} color="#5c4033" style={styles.buttonIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.alreadyHaveButton}
              onPress={() => router.replace('/login')}
            >
              <Ionicons name="log-in-outline" size={22} color="#8b5e3c" style={styles.buttonIconLeft} />
              <Text style={styles.alreadyText}>我已經有帳號</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.agreementText}>
            註冊即表示同意{' '}
            <Text style={styles.linkText}>服務條款</Text>、{' '}
            <Text style={styles.linkText}>隱私政策</Text> 與{'\n'}
            <Text style={styles.linkText}>社群規範</Text>
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 60,
  },
  languageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  globeOuterCircle: {
    width: 48,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  sloganContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  // 關鍵調整：從 -28 改成 -18，讓鎖頭剛好靠在 Lock 旁邊，不壓到 L
  lockIcon: {
    marginRight: -18,
    zIndex: 2,
  },
  avatar: {
    fontSize: 60,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#5c4033',
    letterSpacing: 2,
    textShadowColor: '#f4c7ab80',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  slogan: {
    fontSize: 30,
    fontWeight: '700',
    color: '#5c4033',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subSlogan: {
    fontSize: 16,
    color: '#a0785e',
    marginTop: 12,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 16,
    marginBottom: 48,
  },
  getStartedButton: {
    flexDirection: 'row',
    backgroundColor: '#f4c7ab',
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  alreadyHaveButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#5c4033',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
  alreadyText: {
    color: '#8b5e3c',
    fontSize: 16.5,
    fontWeight: '600',
  },
  buttonIcon: { marginLeft: 8 },
  buttonIconLeft: { marginRight: 12 },
  agreementText: {
    fontSize: 13.5,
    color: '#a0785e',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  linkText: {
    color: '#c47c5e',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});