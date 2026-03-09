// app/login.js
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { BackHandler } from 'react-native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const router = useRouter();
  const scaleValue = new Animated.Value(1);

  // 攔截系統返回手勢，強制回到歡迎首頁
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace('/');
        return true; // 阻止預設返回行為（不會退出 App）
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [router])
  );

  const showModal = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  const handlePressIn = () => {
    Animated.spring(scaleValue, { toValue: 0.96, friction: 9, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, { toValue: 1, friction: 9, useNativeDriver: true }).start();
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      showModal('請填寫完整', '請輸入帳號與密碼');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/login', { username, password });
      await AsyncStorage.setItem('token', res.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
      router.replace('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || '登入失敗，請檢查帳號密碼';
      showModal('無法登入', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* 左上角返回按鈕 */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/')}
          >
            <Ionicons name="arrow-back" size={28} color="#5c4033" />
          </TouchableOpacity>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.innerContent}>
                <View style={styles.header}>
                  <Text style={styles.avatar}>😊</Text>
                  <Text style={styles.welcome}>歡迎回來</Text>
                  <Text style={styles.tagline}>登入你的寧靜小天地</Text>
                </View>

                <View style={styles.formCard}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="使用者名稱"
                      placeholderTextColor="#d4a373"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="密碼"
                        placeholderTextColor="#d4a373"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={24}
                          color="#a0785e"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                    <TouchableOpacity
                      style={[styles.loginButton, loading && styles.buttonDisabled]}
                      onPressIn={handlePressIn}
                      onPressOut={handlePressOut}
                      onPress={handleLogin}
                      disabled={loading}
                      activeOpacity={0.82}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? '登入中…' : '登入'}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <TouchableOpacity
                    style={styles.signupRow}
                    onPress={() => router.push('/register')}  // 改回 push
                  >
                    <Text style={styles.signupText}>
                      還沒有帳號？ <Text style={styles.signupHighlight}>立即註冊</Text>
                    </Text>
                  </TouchableOpacity>

                  {/* 其他方式登入 */}
                  <View style={styles.orContainer}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>或其他方式登入</Text>
                    <View style={styles.orLine} />
                  </View>

                  <View style={styles.socialRow}>
                    <TouchableOpacity style={styles.socialButton}>
                      <Ionicons name="logo-google" size={20} color="#DB4437" />
                      <Text style={styles.socialLabel}>Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.socialButton}>
                      <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                      <Text style={styles.socialLabel}>Facebook</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>{modalTitle}</Text>
            <Text style={modalStyles.message}>{modalMessage}</Text>
            <TouchableOpacity
              style={modalStyles.button}
              onPress={() => setModalVisible(false)}
            >
              <Text style={modalStyles.buttonText}>確定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 28,
  },
  innerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  // 新增：左上角返回按鈕
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  avatar: {
    fontSize: 64,
    marginBottom: 16,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: '#a0785e',
    letterSpacing: 0.2,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 36,
    paddingTop: 40,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fffaf5',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#4d342e',
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#4d342e',
  },
  eyeButton: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  loginButton: {
    backgroundColor: '#f4c7ab',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#5c4033',
    fontSize: 16.5,
    fontWeight: '600',
  },
  signupRow: {
    alignItems: 'center',
    marginBottom: 32,
  },
  signupText: {
    color: '#8b5e3c',
    fontSize: 15,
  },
  signupHighlight: {
    color: '#c47c5e',
    fontWeight: '600',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f4c7ab',
  },
  orText: {
    color: '#a0785e',
    fontSize: 14,
    paddingHorizontal: 16,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: '#f4c7ab',
    minWidth: 100,
    justifyContent: 'center',
    gap: 10,
  },
  socialLabel: {
    color: '#5c4033',
    fontSize: 15,
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fffaf5',
    borderRadius: 28,
    padding: 32,
    width: '84%',
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#f4c7ab',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  buttonText: {
    color: '#5c4033',
    fontSize: 16,
    fontWeight: '600',
  },
});