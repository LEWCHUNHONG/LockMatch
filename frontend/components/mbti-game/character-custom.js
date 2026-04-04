// app/mbti-game/character-custom.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Image,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 武器定義：優先使用本地圖片，若不存在則使用 MaterialCommunityIcons 備用圖標
const WEAPONS = [
  {
    id: 'pistol',
    name: '手槍',
    description: '傷害較低，射速快',
    icon: 'pistol',           // MaterialCommunityIcons 備用
    image: require('../../assets/images/weapons/pistol.png'), // 本地圖片路徑（請確保存在）
    damage: 8,
    attackSpeed: 200,
    bulletCount: 1,
    range: 300,
  },
  {
    id: 'rifle',
    name: '步槍',
    description: '傷害一般，射速一般',
    icon: 'gun',               // 備用圖標
    image: require('../../assets/images/weapons/rifle.png'),
    damage: 15,
    attackSpeed: 300,
    bulletCount: 1,
    range: 500,
  },
  {
    id: 'sniper',
    name: '狙擊槍',
    description: '傷害極高，射速極慢',
    icon: 'crosshairs',        // 備用圖標
    image: require('../../assets/images/weapons/sniper.png'),
    damage: 40,
    attackSpeed: 800,
    bulletCount: 1,
    range: 800,
  },
  {
    id: 'shotgun',
    name: '散彈槍',
    description: '傷害高，一次射出多顆子彈',
    icon: 'gun',               // 備用圖標
    image: require('../../assets/images/weapons/shotgun.png'),
    damage: 10,
    attackSpeed: 500,
    bulletCount: 5,
    spread: 0.2,
    range: 200,
  },
  {
    id: 'smg',
    name: '衝鋒槍',
    description: '傷害一般，射速極快',
    icon: 'lightning-bolt',    // 備用圖標
    image: require('../../assets/images/weapons/smg.png'),
    damage: 10,
    attackSpeed: 100,
    bulletCount: 1,
    range: 350,
  },
];

export default function CharacterCustomScreen({ initialCharacter, onComplete, onBack }) {
  const [character, setCharacter] = useState(
    initialCharacter || {
      outfitColor: '#3498db',
      name: '冒險者',
      avatar: null,
      weapon: 'pistol',
    }
  );

  const colors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
  ];

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要權限', '請允許存取相簿以選擇頭像');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setCharacter(prev => ({ ...prev, avatar: result.assets[0].uri }));
    }
  };

  const clearAvatar = () => {
    setCharacter(prev => ({ ...prev, avatar: null }));
  };

  const handleComplete = () => {
    onComplete?.(character);
  };

  // 渲染武器圖標：優先使用圖片，若圖片載入失敗則顯示備用 MaterialCommunityIcons
  const renderWeaponIcon = (weapon, isSelected) => {
    const iconColor = isSelected ? '#f4c7ab' : '#5c4033';
    
    // 嘗試使用本地圖片
    if (weapon.image) {
      return (
        <Image
          source={weapon.image}
          style={[
            styles.weaponImage,
            { tintColor: iconColor } // 可選：著色
          ]}
          resizeMode="contain"
          onError={() => {
            // 圖片載入失敗時，切換到備用圖標（此處僅作示意，實際需用狀態管理）
            console.warn(`圖片載入失敗: ${weapon.id}`);
          }}
        />
      );
    }
    
    // 備用：使用 MaterialCommunityIcons
    return (
      <MaterialCommunityIcons
        name={weapon.icon}
        size={32}
        color={iconColor}
      />
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#5c4033" />
        </TouchableOpacity>
        <Text style={styles.title}>角色自定義</Text>
        <Text style={styles.subtitle}>創造屬於你的MBTI冒險者</Text>
      </View>

      {/* 角色預覽與頭像選擇 */}
      <View style={styles.previewContainer}>
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarPicker}>
          {character.avatar ? (
            <>
              <Image source={{ uri: character.avatar }} style={styles.avatarImage} />
              <TouchableOpacity style={styles.clearAvatarButton} onPress={clearAvatar}>
                <MaterialCommunityIcons name="close-circle" size={24} color="#e74c3c" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.characterPreview, { backgroundColor: character.outfitColor }]}>
              <MaterialCommunityIcons name="account" size={80} color="#fff" />
            </View>
          )}
          <View style={styles.editBadge}>
            <MaterialCommunityIcons name="camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <View style={styles.nameInputContainer}>
          <MaterialCommunityIcons name="pencil" size={20} color="#8b5e3c" />
          <TextInput
            style={styles.nameInput}
            value={character.name}
            onChangeText={(text) => setCharacter(prev => ({ ...prev, name: text }))}
            placeholder="輸入角色名稱"
            placeholderTextColor="#8b5e3c"
            maxLength={20}
          />
        </View>
      </View>

      {/* 武器選擇 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>選擇武器</Text>
        <View style={styles.weaponGrid}>
          {WEAPONS.map(weapon => {
            const isSelected = character.weapon === weapon.id;
            return (
              <TouchableOpacity
                key={weapon.id}
                style={[
                  styles.weaponOption,
                  isSelected && styles.selectedWeapon
                ]}
                onPress={() => setCharacter(prev => ({ ...prev, weapon: weapon.id }))}
              >
                <View style={styles.weaponIconContainer}>
                  {renderWeaponIcon(weapon, isSelected)}
                </View>
                <Text style={[
                  styles.weaponName,
                  isSelected && styles.selectedWeaponText
                ]}>
                  {weapon.name}
                </Text>
                <Text style={styles.weaponDesc}>{weapon.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 如果沒有頭像，顯示顏色選擇 */}
      {!character.avatar && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>服裝顏色</Text>
          <View style={styles.colorGrid}>
            {colors.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  character.outfitColor === color && styles.selectedColor
                ]}
                onPress={() => setCharacter(prev => ({ ...prev, outfitColor: color }))}
              >
                {character.outfitColor === color && (
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 如果使用頭像，提示可清除 */}
      {character.avatar && (
        <View style={styles.avatarHint}>
          <MaterialCommunityIcons name="information" size={20} color="#8b5e3c" />
          <Text style={styles.hintText}>
            目前使用自訂頭像，點擊頭像上的清除按鈕可恢復自定義模式
          </Text>
        </View>
      )}

      {/* 完成按鈕 */}
      <TouchableOpacity 
        style={styles.completeButton}
        onPress={handleComplete}
      >
        <MaterialCommunityIcons name="check-circle" size={28} color="#fff" />
        <Text style={styles.completeButtonText}>完成創建，開始冒險！</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf5',
    padding: 20
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative'
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 10
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#5c4033',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#8b5e3c',
    fontStyle: 'italic'
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  avatarPicker: {
    position: 'relative',
    marginBottom: 16
  },
  avatarImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#f4c7ab'
  },
  clearAvatarButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  characterPreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative'
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f4c7ab',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    width: '80%',
    borderWidth: 1,
    borderColor: '#f4c7ab'
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#5c4033',
    marginLeft: 8,
    padding: 0
  },
  section: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 16
  },
  weaponGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weaponOption: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedWeapon: {
    borderColor: '#f4c7ab',
    backgroundColor: 'rgba(244, 199, 171, 0.1)',
  },
  weaponIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  weaponImage: {
    width: 48,
    height: 48,
  },
  weaponName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 4,
  },
  selectedWeaponText: {
    color: '#f4c7ab',
  },
  weaponDesc: {
    fontSize: 12,
    color: '#8b5e3c',
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  colorOption: {
    width: (SCREEN_WIDTH - 80) / 4,
    height: (SCREEN_WIDTH - 80) / 4,
    borderRadius: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedColor: {
    borderColor: '#5c4033',
    borderWidth: 3,
    transform: [{ scale: 1.1 }]
  },
  avatarHint: {
    flexDirection: 'row',
    backgroundColor: 'rgba(244, 199, 171, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: '#8b5e3c',
    marginLeft: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4c7ab',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#8b5e3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#5c4033',
    marginLeft: 12
  }
});