// app/index.js
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  BackHandler, 
  Platform,
  useWindowDimensions,
  Image 
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // 縮放控制（調整得更保守）
  const scale = Math.min(width / 375, 1.06);
  const s = (size) => Math.round(size * scale);

  // Android 返回鍵
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const backHandler = () => {
      BackHandler.exitApp();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', backHandler);
    return () => subscription.remove();
  }, []);

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
            <View style={[styles.globeOuterCircle, { 
              width: s(48), 
              height: s(48), 
              borderRadius: s(24) 
            }]}>
              <Ionicons name="earth" size={s(28)} color="#000000" />
            </View>
          </TouchableOpacity>

          {/* 整個標語區改成一張圖片 */}
          <View style={styles.sloganContainer}>
            <Image
              source={require('../assets/welcome-slogan.png')}   // ← 改成你的圖片實際路徑
              style={[styles.sloganImage, { 
                width: s(450),     // 可調整這個數字來控制大小
                height: s(165)     // 高度自動保持比例
              }]}
              resizeMode="contain"
            />
          </View>

          {/* 按鈕區 */}
          <View style={[styles.buttonsContainer, { 
            maxWidth: s(340), 
            gap: s(16), 
            marginBottom: s(50) 
          }]}>
            <TouchableOpacity
              style={[styles.getStartedButton, { 
                paddingVertical: s(18), 
                paddingHorizontal: s(32) 
              }]}
              onPress={() => router.replace('/register')}
            >
              <Text style={[styles.buttonText, { fontSize: s(17) }]}>開始使用</Text>
              <Ionicons name="arrow-forward" size={s(24)} color="#5c4033" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.alreadyHaveButton, { 
                paddingVertical: s(18), 
                paddingHorizontal: s(32),
                borderWidth: 1.8 
              }]}
              onPress={() => router.replace('/login')}
            >
              <Ionicons name="log-in-outline" size={s(22)} color="#8b5e3c" style={styles.buttonIconLeft} />
              <Text style={[styles.alreadyText, { fontSize: s(16.5) }]}>我已經有帳號</Text>
            </TouchableOpacity>
          </View>

          {/* 協議文字 */}
          <View style={[styles.agreementContainer, { paddingVertical: s(16) }]}>
            <Text style={[styles.agreementText, { fontSize: s(14.5), lineHeight: s(21) }]}>
              註冊即表示同意
            </Text>

            <View style={[styles.linksRow, { marginTop: s(5) }]}>
              <TouchableOpacity 
                onPress={() => router.push('terms/terms')}
                activeOpacity={0.6}
                style={[styles.linkButton, { paddingHorizontal: s(8), paddingVertical: s(6) }]}
              >
                <Text style={[styles.linkText, { fontSize: s(15.5) }]}>服務條款</Text>
              </TouchableOpacity>

              <Text style={[styles.agreementText, { fontSize: s(14.5) }]}>、</Text>

              <TouchableOpacity 
                onPress={() => router.push('terms/privacy')}
                activeOpacity={0.6}
                style={[styles.linkButton, { paddingHorizontal: s(8), paddingVertical: s(6) }]}
              >
                <Text style={[styles.linkText, { fontSize: s(15.5) }]}>隱私政策</Text>
              </TouchableOpacity>

              <Text style={[styles.agreementText, { fontSize: s(14.5) }]}>與</Text>

              <TouchableOpacity 
                onPress={() => router.push('terms/community-guidelines')}
                activeOpacity={0.6}
                style={[styles.linkButton, { paddingHorizontal: s(8), paddingVertical: s(6) }]}
              >
                <Text style={[styles.linkText, { fontSize: s(15.5) }]}>社群規範</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: '#ffffff',
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
    marginBottom: 85,
    width: '100%',
    paddingHorizontal: 20,
  },
  // 新增的圖片樣式
  sloganImage: {
    marginBottom: 10,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 48,
  },
  getStartedButton: {
    flexDirection: 'row',
    backgroundColor: '#f4c7ab',
    borderRadius: 999,
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
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#5c4033',
    fontWeight: '600',
    marginRight: 8,
  },
  alreadyText: {
    color: '#8b5e3c',
    fontWeight: '600',
  },
  buttonIconLeft: { marginRight: 12 },

  agreementContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  agreementText: {
    color: '#a0785e',
    textAlign: 'center',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  linkText: {
    color: '#c47c5e',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});