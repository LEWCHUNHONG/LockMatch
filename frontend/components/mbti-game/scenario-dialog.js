// app/mbti-game/scenario-dialog.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions,
  Animated 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ScenarioDialog({ 
  scenario, 
  onChoice, 
  onClose 
}) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

  useEffect(() => {
    // 进场动画
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const handleClose = () => {
    // 退场动画
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => onClose?.());
  };

  const handleChoice = (option) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: -SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => onChoice?.(option));
  };

  if (!scenario) return null;

  return (
    <Animated.View 
      style={[
        styles.overlay,
        { opacity: fadeAnim }
      ]}
    >
      <Animated.View 
        style={[
          styles.dialogContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        {/* 对话框标题 */}
        <View style={styles.header}>
          <MaterialCommunityIcons 
            name="chat-question" 
            size={32} 
            color="#5c4033" 
          />
          <Text style={styles.title}>情境選擇</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleClose}
          >
            <MaterialCommunityIcons name="close" size={24} color="#5c4033" />
          </TouchableOpacity>
        </View>

        {/* 问题文本 */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{scenario.question}</Text>
        </View>

        {/* 选项列表 */}
        <View style={styles.optionsContainer}>
          {scenario.options?.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleChoice(option)}
            >
              {option.icon && (
                <MaterialCommunityIcons 
                  name={option.icon} 
                  size={24} 
                  color="#fff" 
                  style={styles.optionIcon}
                />
              )}
              <View style={styles.optionContent}>
                <Text style={styles.optionText}>{option.text}</Text>
                {option.description && (
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color="rgba(255,255,255,0.7)" 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* 提示文字 */}
        <View style={styles.hintContainer}>
          <MaterialCommunityIcons 
            name="information" 
            size={16} 
            color="rgba(92, 64, 51, 0.7)" 
          />
          <Text style={styles.hintText}>
            你的選擇會影響性格分數
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  dialogContainer: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: '#fffaf5',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f4c7ab'
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#5c4033',
    marginLeft: 12
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  questionContainer: {
    backgroundColor: 'rgba(244, 199, 171, 0.15)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5c4033',
    lineHeight: 26,
    textAlign: 'center'
  },
  optionsContainer: {
    marginBottom: 20
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(92, 64, 51, 0.1)',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  optionIcon: {
    marginRight: 12
  },
  optionContent: {
    flex: 1
  },
  optionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 4
  },
  optionDescription: {
    fontSize: 12,
    color: 'rgba(92, 64, 51, 0.7)',
    fontStyle: 'italic'
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(92, 64, 51, 0.1)'
  },
  hintText: {
    fontSize: 14,
    color: 'rgba(92, 64, 51, 0.7)',
    marginLeft: 8,
    fontStyle: 'italic'
  }
});