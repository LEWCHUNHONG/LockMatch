// components/MbtiTestChoiceModal.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const MbtiTestChoiceModal = ({ 
  visible, 
  onClose 
}) => {
  const router = useRouter();

  const handleSelectGame = () => {
    onClose();
    setTimeout(() => {
      router.push('/mbti-game');
    }, 300);
  };

  const handleSelectTraditional = () => {
    onClose();
    setTimeout(() => {
      router.push('/mbti-test');
    }, 300);
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropOpacity={0.65}
      statusBarTranslucent
    >
      <View style={styles.container}>
        
        {/* 右上角 X 關閉按鈕 */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons 
            name="close" 
            size={28} 
            color="#8b5e3c" 
          />
        </TouchableOpacity>

        <MaterialCommunityIcons 
          name="brain" 
          size={68} 
          color="#9b59b6" 
          style={styles.icon}
        />
        
        <Text style={styles.title}>選擇 MBTI 測試方式</Text>
        <Text style={styles.subtitle}>
          你想用哪種方式探索自己的性格？
        </Text>

        <View style={styles.optionsContainer}>

          {/* MBTI 冒險遊戲 */}
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={handleSelectGame}
            activeOpacity={0.85}
          >
            <View style={styles.optionIcon}>
              <MaterialCommunityIcons name="gamepad-variant" size={34} color="#f4c7ab" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>MBTI 冒險遊戲</Text>
              <Text style={styles.optionDesc}>
                射擊闖關 + 關卡挑戰{'\n'}邊玩邊累積性格分數
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#8b5e3c" />
          </TouchableOpacity>

          {/* 傳統 MBTI 測試 */}
          <TouchableOpacity 
            style={styles.optionButton} 
            onPress={handleSelectTraditional}
            activeOpacity={0.85}
          >
            <View style={styles.optionIcon}>
              <MaterialCommunityIcons name="clipboard-text" size={34} color="#f4c7ab" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>傳統情境測試</Text>
              <Text style={styles.optionDesc}>
                經典情境題目{'\n'}約 8-12 分鐘快速完成
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#8b5e3c" />
          </TouchableOpacity>

        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 32,
    paddingTop: 52,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(244, 199, 171, 0.4)',
    position: 'relative',
  },
  
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 199, 171, 0.25)',
  },

  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5c4033',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8b5e3c',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 199, 171, 0.7)',
  },
  optionIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#5c4033',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 6,
  },
  optionDesc: {
    fontSize: 14,
    color: '#8b5e3c',
    lineHeight: 20,
  },
});

export default MbtiTestChoiceModal;