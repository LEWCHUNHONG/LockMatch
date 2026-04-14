// app/mbti-test.js
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';


import {
  GAME_MODES,
  getRandomQuestions,
  calculateMbtiResult,
  MBTI_DESCRIPTIONS
} from '../data/mbti-questions';


import { mbtiAPI } from '../utils/api';

export default function MbtiTestGame() {
  const router = useRouter();
  

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [mbtiScores, setMbtiScores] = useState({
    E: 0, I: 0,
    S: 0, N: 0,
    T: 0, F: 0,
    J: 0, P: 0
  });
  const [showResult, setShowResult] = useState(false);
  const [mbtiResult, setMbtiResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameMode, setGameMode] = useState('SCENARIO');
  const [questions, setQuestions] = useState([]);
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [user, setUser] = useState(null);
  const [testCompleted, setTestCompleted] = useState(false);
  

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;


  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          

          if (parsed.avatar && !parsed.avatar.startsWith('http')) {
            parsed.avatar = `${BASE_URL}${parsed.avatar.startsWith('/') ? parsed.avatar : '/' + parsed.avatar}`;
          }
          

          if (parsed.mbti) {
            setTestCompleted(true);
          }
          
          setUser(parsed);
        }
      } catch (error) {
        console.error('載入用戶信息失敗:', error);
      }
    };
    loadUser();
  }, []);


  useEffect(() => {
    if (!showModeSelection) {
      const selectedQuestions = getRandomQuestions(gameMode);
      setQuestions(selectedQuestions);
    }
  }, [gameMode, showModeSelection]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 
    ? ((currentQuestionIndex + 1) / questions.length) * 100 
    : 0;


  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const startGame = (mode) => {
    setGameMode(mode);
    setShowModeSelection(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleAnswer = async (option) => {

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    

    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
    

    const newAnswers = [...answers, {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      option: option.text,
      mbti: option.mbti
    }];
    setAnswers(newAnswers);
    

    const newScores = { ...mbtiScores };
    Object.entries(option.mbti).forEach(([key, value]) => {
      newScores[key] = (newScores[key] || 0) + value;
    });
    setMbtiScores(newScores);
    

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 0,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (currentQuestionIndex < questions.length - 1) {

        setCurrentQuestionIndex(prev => prev + 1);
        

        slideAnim.setValue(50);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ]).start();
      } else {

        const result = calculateMbtiResult(newScores);
        setMbtiResult(result);
        

        setTimeout(() => {
          setShowResult(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 500);
      }
    });
  };


  const saveMbtiResult = async () => {
    if (!mbtiResult || isSubmitting) return;
    
    setIsSubmitting(true);
    try {

      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const updatedUser = {
          ...user,
          mbti: mbtiResult.type,
          status: '已測試',

          avatar: user.avatar ? `${user.avatar.split('?cb=')[0]}?cb=${Date.now()}` : user.avatar
        };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      

      const response = await mbtiAPI.updateMbti(mbtiResult.type);
      
      if (response.data.success) {

        if (response.data.user) {
          const latestUser = response.data.user;

          if (latestUser.avatar && !latestUser.avatar.startsWith('http')) {
            latestUser.avatar = `${BASE_URL}${latestUser.avatar.startsWith('/') ? latestUser.avatar : '/' + latestUser.avatar}`;
          }
          latestUser.avatar = `${latestUser.avatar.split('?cb=')[0]}?cb=${Date.now()}`;
          await AsyncStorage.setItem('user', JSON.stringify(latestUser));
          setUser(latestUser);
        }
        
        setTestCompleted(true);
        

        Alert.alert(
          '測試完成！🎉',
          `你的 MBTI 類型是 ${mbtiResult.type}\n\n${mbtiResult.description.description}`,
          [
            {
              text: '查看個人檔案',
              onPress: () => {

                setTimeout(() => {
                  router.push('/profile');
                }, 100);
              }
            },
            {
              text: '尋找匹配夥伴',
              onPress: () => {
                setTimeout(() => {
                  router.push('/chat/search');
                }, 100);
              }
            },
            {
              text: '返回主頁',
              onPress: () => {
                setTimeout(() => {
                  router.push('/dashboard');
                }, 100);
              }
            }
          ]
        );
      } else {
        throw new Error(response.data.error || '保存失敗');
      }
    } catch (error) {
      console.error('保存 MBTI 失敗:', error);
      

      try {
        const token = await AsyncStorage.getItem('token');
        
        const response = await fetch('${BASE_URL}/api/update-profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            mbti: mbtiResult.type,
            status: '已測試'
          })
        });
        
        if (response.ok) {

          const userResponse = await fetch('${BASE_URL}/api/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.user) {
              const updatedUser = userData.user;

              if (updatedUser.avatar && !updatedUser.avatar.startsWith('http')) {
                updatedUser.avatar = `${BASE_URL}${updatedUser.avatar.startsWith('/') ? updatedUser.avatar : '/' + updatedUser.avatar}`;
              }
              updatedUser.avatar = `${updatedUser.avatar.split('?cb=')[0]}?cb=${Date.now()}`;
              await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
              setUser(updatedUser);
            }
          }
          
          setTestCompleted(true);
          
          Alert.alert(
            '測試完成！',
            `你的 MBTI 類型是 ${mbtiResult.type}\n\n結果已保存到個人檔案`,
            [
              {
                text: '返回主頁',
                onPress: () => {
                  setTimeout(() => {
                    router.push('/dashboard');
                  }, 100);
                }
              },
              {
                text: '確定',
                style: 'default'
              }
            ]
          );
        } else {

          Alert.alert(
            '部分保存成功',
            `你的 MBTI 類型 ${mbtiResult.type} 已保存在本地。\n\n由於網絡問題，結果可能未同步到服務器，建議稍後重新登錄確認。`,
            [
              {
                text: '返回主頁',
                onPress: () => {
                  setTimeout(() => {
                    router.push('/dashboard');
                  }, 100);
                }
              },
              { text: '確定' }
            ]
          );
        }
      } catch (fallbackError) {
        console.error('備用保存方法失敗:', fallbackError);
        

        Alert.alert(
          '本地保存成功',
          `你的 MBTI 類型 ${mbtiResult.type} 已保存在本地。\n\n由於網絡問題，結果可能未同步到服務器，建議檢查網絡後重新測試或稍後重新登錄。`,
          [
            {
              text: '返回主頁',
              onPress: () => {
                setTimeout(() => {
                  router.push('/dashboard');
                }, 100);
              }
            },
            { text: '確定' }
          ]
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const restartTest = () => {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setMbtiScores({
      E: 0, I: 0,
      S: 0, N: 0,
      T: 0, F: 0,
      J: 0, P: 0
    });
    setShowResult(false);
    setMbtiResult(null);
    setTestCompleted(false);
    setShowModeSelection(true);
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
    progressAnim.setValue(0);
  };


  const getMbtiColor = (mbtiType) => {
    const mbtiInfo = MBTI_DESCRIPTIONS[mbtiType];
    return mbtiInfo ? mbtiInfo.color : '#f4c7ab';
  };


  if (showModeSelection) {
    return (
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
            </TouchableOpacity>
            <Text style={styles.title}>MBTI 性格測試</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modeSelectionContainer}>
            <View style={styles.introCard}>
              <MaterialCommunityIcons name="brain" size={60} color="#f4c7ab" />
              <Text style={styles.introTitle}>探索真實的自己</Text>
              <Text style={styles.introText}>
                透過不同模式的測試，發現你的MBTI性格類型
                結果將用於智能匹配與你最契合的朋友
              </Text>
            </View>


            {user?.mbti && testCompleted && (
              <View style={styles.currentMbtiCard}>
                <View style={styles.currentMbtiHeader}>
                  <MaterialCommunityIcons name="star-circle" size={24} color="#f4c7ab" />
                  <Text style={styles.currentMbtiTitle}>你的當前 MBTI 類型</Text>
                </View>
                <View style={[styles.currentMbtiBadge, { backgroundColor: getMbtiColor(user.mbti) }]}>
                  <Text style={styles.currentMbtiText}>{user.mbti}</Text>
                </View>
                <Text style={styles.currentMbtiHint}>
                  重新測試可以更新你的 MBTI 類型
                </Text>
              </View>
            )}

            <Text style={styles.modeTitle}>選擇測試模式</Text>

            {Object.entries(GAME_MODES).map(([key, mode]) => (
              <TouchableOpacity
                key={key}
                style={styles.modeCard}
                onPress={() => startGame(key)}
                activeOpacity={0.8}
              >
                <View style={styles.modeHeader}>
                  <View style={styles.modeIconContainer}>
                    <MaterialCommunityIcons 
                      name={
                        key === 'SCENARIO' ? 'gamepad-variant' : 
                        key === 'TRADITIONAL' ? 'clipboard-text' : 
                        'rocket-launch'
                      } 
                      size={32} 
                      color="#5c4033" 
                    />
                  </View>
                  <View style={styles.modeInfo}>
                    <Text style={styles.modeName}>{mode.name}</Text>
                    <Text style={styles.modeDesc}>{mode.description}</Text>
                  </View>
                </View>
                <View style={styles.modeFooter}>
                  <View style={styles.modeStats}>
                    <MaterialCommunityIcons name="format-list-numbered" size={18} color="#8b5e3c" />
                    <Text style={styles.modeStatText}>{mode.questionCount} 題</Text>
                  </View>
                  <View style={styles.modeStats}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#8b5e3c" />
                    <Text style={styles.modeStatText}>
                      {key === 'QUICK' ? '3-5分鐘' : key === 'SCENARIO' ? '8-10分鐘' : '10-12分鐘'}
                    </Text>
                  </View>
                  <View style={styles.startButton}>
                    <Text style={styles.startButtonText}>
                      {testCompleted ? '重新測試' : '開始測試'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.tipsCard}>
              <MaterialCommunityIcons name="lightbulb-on" size={24} color="#f4c7ab" />
              <Text style={styles.tipsText}>
                💡 提示：選擇最符合你直覺反應的選項，不要想太多！
                測試結果將保存到你的個人檔案，用於智能匹配系統。
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // 測試結果界面
  if (showResult && mbtiResult) {
    const mbtiInfo = mbtiResult.description;
    const mbtiColor = getMbtiColor(mbtiResult.type);
    
    return (
      <LinearGradient
        colors={['#fffaf5', '#fff5ed', '#ffefe2']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
                  Alert.alert(
                    '離開結果頁面',
                    '確定要離開嗎？你的測試結果尚未保存。',
                    [
                      { text: '取消', style: 'cancel' },
                      { 
                        text: '確定', 
                        onPress: () => {
                          restartTest();
                        }
                      }
                    ]
                  );
                }}
              >
                <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
              </TouchableOpacity>
              <Text style={styles.resultTitle}>測試完成！</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.resultCard}>
              <View style={[styles.mbtiBadge, { backgroundColor: mbtiColor }]}>
                <Text style={styles.mbtiBadgeText}>{mbtiResult.type}</Text>
              </View>
              
              <Text style={styles.mbtiName}>{mbtiInfo.name}</Text>
              
              <Text style={styles.mbtiDescription}>{mbtiInfo.description}</Text>
              
              <View style={styles.strengthsContainer}>
                <Text style={styles.sectionTitle}>你的優勢</Text>
                <View style={styles.strengthsGrid}>
                  {mbtiInfo.strengths.map((strength, index) => (
                    <View key={index} style={styles.strengthChip}>
                      <Text style={styles.strengthText}>{strength}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.matchContainer}>
                <Text style={styles.sectionTitle}>最佳配對類型</Text>
                <Text style={styles.matchDescription}>
                  根據 MBTI 理論，以下類型可能與你特別契合：
                </Text>
                <View style={styles.matchTypes}>
                  {mbtiInfo.match.map((type, index) => {
                    const matchInfo = MBTI_DESCRIPTIONS[type];
                    return (
                      <TouchableOpacity 
                        key={index}
                        style={[styles.matchChip, { backgroundColor: matchInfo.color + '20' }]}
                        onPress={() => Alert.alert(type, matchInfo.description)}
                      >
                        <Text style={[styles.matchTypeText, { color: matchInfo.color }]}>
                          {type}
                        </Text>
                        <Text style={styles.matchNameText}>{matchInfo.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={saveMbtiResult}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <MaterialCommunityIcons name="loading" size={24} color="#fff" />
                      <Text style={styles.saveButtonText}>保存中...</Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="content-save" size={24} color="#fff" />
                      <Text style={styles.saveButtonText}>保存到個人檔案</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.shareButton]}
                  onPress={() => {
                    Alert.alert(
                      '分享結果',
                      `我的 MBTI 類型是 ${mbtiResult.type} - ${mbtiInfo.name}\n\n快來 LockMATCH 測試你的 MBTI，找到最匹配的朋友！`,
                      [{ text: '確定' }]
                    );
                  }}
                >
                  <MaterialCommunityIcons name="share-variant" size={24} color="#5c4033" />
                  <Text style={styles.shareButtonText}>分享結果</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.restartButton]}
                  onPress={restartTest}
                >
                  <MaterialCommunityIcons name="reload" size={24} color="#5c4033" />
                  <Text style={styles.restartButtonText}>重新測試</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // 遊戲進行中界面
  if (!currentQuestion) {
    return (
      <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2']} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <Text style={styles.loadingText}>載入題目中...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#fffaf5', '#fff5ed', '#ffefe2']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              Alert.alert(
                '離開測試',
                '確定要離開嗎？你的進度將不會被保存。',
                [
                  { text: '取消', style: 'cancel' },
                  { text: '確定', onPress: () => router.back() }
                ]
              );
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              第 {currentQuestionIndex + 1} / {questions.length} 題
            </Text>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  })}
                ]}
              />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.hintButton}
            onPress={() => {
              Alert.alert('遊戲說明', '在每個情境中選擇最符合你反應的選項，系統會根據你的選擇分析出你的 MBTI 性格類型。');
            }}
          >
            <MaterialCommunityIcons name="help-circle" size={28} color="#5c4033" />
          </TouchableOpacity>
        </View>

        <Animated.View 
          style={[
            styles.sceneContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <View style={styles.sceneHeader}>
            {currentQuestion.title && (
              <>
                <View style={styles.sceneNumber}>
                  <Text style={styles.sceneNumberText}>情境 {currentQuestion.id}</Text>
                </View>
                <Text style={styles.sceneTitle}>{currentQuestion.title}</Text>
              </>
            )}
          </View>

          <View style={styles.sceneContent}>
            {currentQuestion.description && (
              <Text style={styles.sceneDescription}>{currentQuestion.description}</Text>
            )}
            
            <Animated.View 
              style={[
                styles.questionCard,
                { transform: [{ scale: cardScale }] }
              ]}
            >
              <MaterialCommunityIcons 
                name="chat-question" 
                size={40} 
                color="#f4c7ab" 
                style={styles.questionIcon}
              />
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
            </Animated.View>

            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionButton, { borderLeftColor: option.color }]}
                  onPress={() => handleAnswer(option)}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionIconContainer}>
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={24} 
                      color={option.color} 
                    />
                  </View>
                  <Text style={styles.optionText}>{option.text}</Text>
                  <MaterialCommunityIcons 
                    name="chevron-right" 
                    size={24} 
                    color="#f4c7ab" 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerHint}>
              💡 選擇最符合你直覺反應的選項，不要想太多！
            </Text>
            <Text style={styles.footerCounter}>
              已完成 {answers.length} / {questions.length}
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 250, 245, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 199, 171, 0.3)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5c4033',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5c4033',
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(244, 199, 171, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f4c7ab',
    borderRadius: 4,
  },
  hintButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },

  modeSelectionContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  introTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#5c4033',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  introText: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    lineHeight: 24,
  },

  currentMbtiCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  currentMbtiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  currentMbtiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
  },
  currentMbtiBadge: {
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
    marginBottom: 12,
  },
  currentMbtiText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  currentMbtiHint: {
    fontSize: 14,
    color: '#8b5e3c',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 20,
  },
  modeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeInfo: {
    flex: 1,
  },
  modeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 6,
  },
  modeDesc: {
    fontSize: 14,
    color: '#8b5e3c',
    lineHeight: 20,
  },
  modeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  modeStatText: {
    fontSize: 14,
    color: '#8b5e3c',
    marginLeft: 6,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
    marginRight: 8,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(244, 199, 171, 0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-start',
    marginTop: 12,
  },
  tipsText: {
    flex: 1,
    fontSize: 14,
    color: '#8b5e3c',
    marginLeft: 12,
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#8b5e3c',
    textAlign: 'center',
    marginTop: 100,
  },

  sceneContainer: {
    flex: 1,
    padding: 20,
  },
  sceneHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sceneNumber: {
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  sceneNumberText: {
    color: '#5c4033',
    fontSize: 14,
    fontWeight: '700',
  },
  sceneTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5c4033',
    textAlign: 'center',
  },
  sceneContent: {
    flex: 1,
  },
  sceneDescription: {
    fontSize: 18,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 26,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  questionIcon: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    textAlign: 'center',
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  optionButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 6,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
    borderLeftColor: '#f4c7ab',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#5c4033',
    fontWeight: '500',
    lineHeight: 24,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 199, 171, 0.3)',
  },
  footerHint: {
    fontSize: 14,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 12,
  },
  footerCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5c4033',
  },

  resultContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5c4033',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 28,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.4)',
  },
  mbtiBadge: {
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
    marginBottom: 20,
  },
  mbtiBadgeText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  mbtiName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#5c4033',
    textAlign: 'center',
    marginBottom: 16,
  },
  mbtiDescription: {
    fontSize: 18,
    color: '#8b5e3c',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 16,
  },
  strengthsContainer: {
    marginBottom: 32,
  },
  strengthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  strengthChip: {
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.5)',
  },
  strengthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
  },
  matchContainer: {
    marginBottom: 32,
  },
  matchDescription: {
    fontSize: 16,
    color: '#8b5e3c',
    marginBottom: 20,
    lineHeight: 24,
  },
  matchTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  matchChip: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(244, 199, 171, 0.3)',
  },
  matchTypeText: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  matchNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5e3c',
    textAlign: 'center',
  },
  actionButtons: {
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#f4c7ab',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
  },
  shareButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f4c7ab',
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
  },
  restartButton: {
    backgroundColor: 'rgba(244, 199, 171, 0.15)',
  },
  restartButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
  },
});