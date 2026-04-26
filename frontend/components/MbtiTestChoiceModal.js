// components/MbtiTestChoiceModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const MbtiTestChoiceModal = ({ 
  visible, 
  onClose,
  hasMBTIType = false,
  onResetMBTI,
}) => {
  const router = useRouter();
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

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


  const handleResetPress = () => {
    setShowResetConfirmModal(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // 確認重置
  const confirmReset = async () => {
    setShowResetConfirmModal(false);
    if (onResetMBTI) {
      await onResetMBTI();
    }
    onClose();
  };

  return (
    <>
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
            <MaterialCommunityIcons name="close" size={28} color="#8b5e3c" />
          </TouchableOpacity>

          <MaterialCommunityIcons name="brain" size={68} color="#9b59b6" style={styles.icon} />
          
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

          {/* 重置 MBTI 按鈕（只有已有結果時顯示） */}
          {hasMBTIType && (
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={handleResetPress}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="refresh" size={22} color="#e74c3c" />
              <Text style={styles.resetText}>重置我的 MBTI 類型</Text>
            </TouchableOpacity>
          )}

        </View>
      </Modal>

      {/* ==================== 重置確認 Modal ==================== */}
      <Modal
        isVisible={showResetConfirmModal}
        onBackdropPress={() => setShowResetConfirmModal(false)}
        onBackButtonPress={() => setShowResetConfirmModal(false)}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropOpacity={0.6}
      >
        <View style={styles.confirmContainer}>
          <MaterialCommunityIcons 
            name="alert-circle-outline" 
            size={60} 
            color="#e74c3c" 
            style={{ marginBottom: 16 }}
          />
          
          <Text style={styles.confirmTitle}>確定要重置嗎？</Text>
          
          <Text style={styles.confirmMessage}>
            這將會清除目前的 MBTI 類型，並把遊戲關卡分數歸零。{'\n\n'}
            歷史記錄會保留，你可以重新開始測試。
          </Text>

          <View style={styles.confirmButtonRow}>
            <TouchableOpacity 
              style={styles.confirmCancelButton}
              onPress={() => setShowResetConfirmModal(false)}
            >
              <Text style={styles.confirmCancelText}>取消</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.confirmResetButton}
              onPress={confirmReset}
            >
              <Text style={styles.confirmResetText}>確定重置</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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

  icon: { marginBottom: 16 },
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
    marginBottom: 24,
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
  optionTextContainer: { flex: 1 },
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

  // 重置按鈕
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 76, 60, 0.08)',
    borderWidth: 1.5,
    borderColor: '#e74c3c',
    marginTop: 8,
  },
  resetText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#e74c3c',
  },

  confirmContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    color: '#8b5e3c',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  confirmButtonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#f4c7ab',
    alignItems: 'center',
  },
  confirmResetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5c4033',
  },
  confirmResetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default MbtiTestChoiceModal;