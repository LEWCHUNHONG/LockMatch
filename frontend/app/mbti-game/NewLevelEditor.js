// app/mbti-game/NewLevelEditor.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  FlatList,
  Image,
  Switch,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getImageSource = (img) => {
  if (typeof img === 'number') return img;
  if (typeof img === 'string' && img.startsWith('http')) return { uri: img };
  if (typeof img === 'string') return { uri: img };
  return null;
};

const createElement = (type, x, y) => {
  const base = { instanceId: `${type}_${Date.now()}_${Math.random()}`, x, y };
  switch (type) {
    case 'monster':
      return {
        ...base,
        type: 'slime',
        hp: 30,
        attack: 5,
        expReward: 10,
        speed: 2,
        color: '#e74c3c',
        image: null,
      };
    case 'obstacle':
      return {
        ...base,
        width: 40,
        height: 40,
        color: '#95a5a6',
      };
    case 'item':
      return {
        ...base,
        type: 'exp_potion',
        effect: { exp: 20 },
        color: '#f39c12',
      };
    case 'exit':
      return {
        ...base,
        width: 50,
        height: 50,
      };
    case 'spawn':
      return {
        ...base,
        width: 30,
        height: 30,
        color: '#2ecc71',
      };
    default:
      return base;
  }
};

export default function NewLevelEditor({
  initialLevel,
  onSave,
  onClose,
  isPreset = false,
  existingCustomId = null,
}) {
  // 初始化時確保每個樓層都有 spawnPoint
  const [level, setLevel] = useState(() => {
    if (initialLevel) {
      const levelCopy = JSON.parse(JSON.stringify(initialLevel));
      if (levelCopy.floors && Array.isArray(levelCopy.floors)) {
        levelCopy.floors = levelCopy.floors.map(floor => ({
          ...floor,
          spawnPoint: floor.spawnPoint || { x: 100, y: 300 }
        }));
      }
      return levelCopy;
    }
    return {
      id: `custom_${Date.now()}`,
      name: '新關卡',
      bgColor: '#2ecc71',
      backgroundImage: null,
      floors: [
        {
          floorIndex: 0,
          monsters: [],
          obstacles: [],
          items: [],
          exit: null,
          spawnPoint: { x: 100, y: 300 },
        },
      ],
      totalFloors: 1,
      unlockCondition: { type: 'none' },
    };
  });

  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const [elementToPlace, setElementToPlace] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  const currentFloor = level.floors[currentFloorIndex];

  const pickBackgroundImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要權限', '請允許存取相簿以選擇背景圖片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      setLevel(prev => ({ ...prev, backgroundImage: result.assets[0].uri }));
    }
  };

  const pickMonsterImage = async (element) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要權限', '請允許存取相簿以選擇怪物圖片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setEditingElement(prev => ({
        ...prev,
        element: { ...prev.element, image: result.assets[0].uri }
      }));
    }
  };

  const handleCanvasTap = (x, y) => {
    if (elementToPlace) {
      const newElement = createElement(elementToPlace, x, y);
      setLevel(prev => {
        const newFloors = [...prev.floors];
        const floor = { ...newFloors[currentFloorIndex] };
        if (elementToPlace === 'exit') {
          floor.exit = newElement;
        } else if (elementToPlace === 'spawn') {
          floor.spawnPoint = { x: newElement.x, y: newElement.y };
        } else {
          const key = `${elementToPlace}s`;
          floor[key] = [...(floor[key] || []), newElement];
        }
        newFloors[currentFloorIndex] = floor;
        return { ...prev, floors: newFloors };
      });
      setElementToPlace(null);
    }
  };

  const selectElement = (type, indexOrId) => {
    let element;
    if (type === 'exit') {
      element = currentFloor.exit;
    } else if (type === 'spawn') {
      element = currentFloor.spawnPoint ? { ...currentFloor.spawnPoint, instanceId: 'spawn' } : null;
    } else {
      const list = currentFloor[`${type}s`] || [];
      element = list.find((_, i) => i === indexOrId);
    }
    if (element) {
      setEditingElement({ type, element, index: indexOrId });
      setEditModalVisible(true);
    }
  };

  const updateElement = (updated) => {
    setLevel(prev => {
      const newFloors = [...prev.floors];
      const floor = { ...newFloors[currentFloorIndex] };
      if (editingElement.type === 'exit') {
        floor.exit = updated;
      } else if (editingElement.type === 'spawn') {
        floor.spawnPoint = { x: updated.x, y: updated.y };
      } else {
        const key = `${editingElement.type}s`;
        const list = [...(floor[key] || [])];
        list[editingElement.index] = updated;
        floor[key] = list;
      }
      newFloors[currentFloorIndex] = floor;
      return { ...prev, floors: newFloors };
    });
    setEditModalVisible(false);
  };

  const deleteElement = () => {
    setLevel(prev => {
      const newFloors = [...prev.floors];
      const floor = { ...newFloors[currentFloorIndex] };
      if (editingElement.type === 'exit') {
        floor.exit = null;
      } else if (editingElement.type === 'spawn') {
        floor.spawnPoint = null;
      } else {
        const key = `${editingElement.type}s`;
        const list = [...(floor[key] || [])];
        list.splice(editingElement.index, 1);
        floor[key] = list;
      }
      newFloors[currentFloorIndex] = floor;
      return { ...prev, floors: newFloors };
    });
    setEditModalVisible(false);
  };

  const addFloor = () => {
    setLevel(prev => ({
      ...prev,
      floors: [
        ...prev.floors,
        {
          floorIndex: prev.floors.length,
          monsters: [],
          obstacles: [],
          items: [],
          exit: null,
          spawnPoint: { x: 100, y: 300 },
        },
      ],
      totalFloors: prev.floors.length + 1,
    }));
  };

  const handleSavePress = () => {
    if (isPreset) {
      setShowSaveOptions(true);
    } else {
      performSave('saveAsNew');
    }
  };

  const performSave = (action) => {
    const levelToSave = JSON.parse(JSON.stringify(level));

    // 確保每個樓層都有 spawnPoint（防止舊資料缺失）
    levelToSave.floors = levelToSave.floors.map(floor => ({
      floorIndex: floor.floorIndex,
      monsters: Array.isArray(floor.monsters) ? floor.monsters : [],
      obstacles: Array.isArray(floor.obstacles) ? floor.obstacles : [],
      items: Array.isArray(floor.items) ? floor.items : [],
      exit: floor.exit || null,
      spawnPoint: floor.spawnPoint || { x: 100, y: 300 },
    }));

    if (action === 'saveAsNew') {
      delete levelToSave.id;
      if (isPreset && initialLevel?.id) {
        levelToSave.originalId = initialLevel.id;
      }
      onSave(levelToSave, action, null);
    } else if (action === 'updateExisting') {
      delete levelToSave.id;
      onSave(levelToSave, action, existingCustomId);
    } else if (action === 'saveToPreset') {
      // 這個選項已被禁用，但保留以防萬一
      levelToSave.id = initialLevel.id;
      onSave(levelToSave, action, null);
    }
  };

  const DraggableElement = ({ element, type, index }) => {
    const translateX = useSharedValue(element.x);
    const translateY = useSharedValue(element.y);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const pan = Gesture.Pan()
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
      })
      .onUpdate(e => {
        translateX.value = startX.value + e.translationX;
        translateY.value = startY.value + e.translationY;
      })
      .onEnd(() => {
        translateX.value = withSpring(
          Math.max(0, Math.min(SCREEN_WIDTH - 40, translateX.value))
        );
        translateY.value = withSpring(
          Math.max(0, Math.min(SCREEN_HEIGHT - 100, translateY.value))
        );
        runOnJS(updateElementPosition)(type, index, translateX.value, translateY.value);
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    }));

    return (
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.element,
            styles[type],
            animatedStyle,
            {
              left: 0,
              top: 0,
              backgroundColor: element.color || (type === 'monster' ? '#e74c3c' : type === 'spawn' ? '#2ecc71' : '#f39c12'),
              width: type === 'obstacle' ? element.width || 40 : (type === 'spawn' ? 30 : 40),
              height: type === 'obstacle' ? element.height || 40 : (type === 'spawn' ? 30 : 40),
            },
          ]}
          onTouchEnd={() => selectElement(type, index)}
        >
          {element.image ? (
            <Image source={getImageSource(element.image)} style={styles.elementImage} />
          ) : (
            <MaterialCommunityIcons
              name={getIcon(type, element)}
              size={type === 'spawn' ? 20 : 24}
              color="#fff"
            />
          )}
        </Animated.View>
      </GestureDetector>
    );
  };

  const getIcon = (type, element) => {
    if (type === 'monster') return 'bug';
    if (type === 'obstacle') return 'cube';
    if (type === 'item') return 'star';
    if (type === 'exit') return 'door-open';
    if (type === 'spawn') return 'flag';
    return 'help';
  };

  const updateElementPosition = (type, index, x, y) => {
    setLevel(prev => {
      const newFloors = [...prev.floors];
      const floor = { ...newFloors[currentFloorIndex] };
      if (type === 'exit') {
        floor.exit = { ...floor.exit, x, y };
      } else if (type === 'spawn') {
        floor.spawnPoint = { x, y };
      } else {
        const key = `${type}s`;
        const list = [...(floor[key] || [])];
        list[index] = { ...list[index], x, y };
        floor[key] = list;
      }
      newFloors[currentFloorIndex] = floor;
      return { ...prev, floors: newFloors };
    });
  };

  return (
    <View style={styles.container}>
      {/* 頂部工具列 */}
      <View style={styles.toolbar}>
        <TextInput
          style={styles.nameInput}
          value={level.name}
          onChangeText={text => setLevel(prev => ({ ...prev, name: text }))}
          placeholder="關卡名稱"
        />
        <TextInput
          style={styles.colorInput}
          value={level.bgColor}
          onChangeText={text => setLevel(prev => ({ ...prev, bgColor: text }))}
          placeholder="背景色"
        />
        <TouchableOpacity onPress={pickBackgroundImage} style={styles.toolButton}>
          <MaterialCommunityIcons name="image" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={styles.toolButton}>
          <MaterialCommunityIcons name="cog" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSavePress} style={styles.toolButton}>
          <MaterialCommunityIcons name="content-save" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.toolButton}>
          <MaterialCommunityIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 樓層切換 */}
      <View style={styles.floorBar}>
        <FlatList
          horizontal
          data={level.floors}
          keyExtractor={(item, index) => `floor-${index}`}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[styles.floorTab, index === currentFloorIndex && styles.activeFloor]}
              onPress={() => setCurrentFloorIndex(index)}
            >
              <Text style={styles.floorText}>{index + 1}F</Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity onPress={addFloor} style={styles.addFloor}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 畫布 */}
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.canvas, { backgroundColor: level.bgColor }]}
        onPress={e => {
          e.target.measure((x, y, width, height, pageX, pageY) => {
            const touchX = e.nativeEvent.locationX;
            const touchY = e.nativeEvent.locationY;
            handleCanvasTap(touchX, touchY);
          });
        }}
      >
        {level.backgroundImage && (
          <Image
            source={getImageSource(level.backgroundImage)}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        )}

        {/* 出生點渲染 */}
        {currentFloor.spawnPoint && (
          <DraggableElement
            key="spawn"
            element={{ ...currentFloor.spawnPoint, instanceId: 'spawn' }}
            type="spawn"
            index={0}
          />
        )}

        {currentFloor.monsters?.map((m, idx) => (
          <DraggableElement key={m.instanceId || `m-${idx}`} element={m} type="monster" index={idx} />
        ))}
        {currentFloor.obstacles?.map((o, idx) => (
          <DraggableElement key={o.instanceId || `o-${idx}`} element={o} type="obstacle" index={idx} />
        ))}
        {currentFloor.items?.map((i, idx) => (
          <DraggableElement key={i.instanceId || `i-${idx}`} element={i} type="item" index={idx} />
        ))}
        {currentFloor.exit && (
          <DraggableElement key="exit" element={currentFloor.exit} type="exit" index={0} />
        )}
      </TouchableOpacity>

      {/* 底部元素選擇面板 */}
      <View style={styles.panel}>
        <TouchableOpacity style={styles.panelItem} onPress={() => setElementToPlace('monster')}>
          <MaterialCommunityIcons name="bug" size={32} color="#e74c3c" />
          <Text>怪物</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelItem} onPress={() => setElementToPlace('obstacle')}>
          <MaterialCommunityIcons name="cube" size={32} color="#95a5a6" />
          <Text>障礙</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelItem} onPress={() => setElementToPlace('item')}>
          <MaterialCommunityIcons name="star" size={32} color="#f39c12" />
          <Text>道具</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelItem} onPress={() => setElementToPlace('exit')}>
          <MaterialCommunityIcons name="door-open" size={32} color="#2ecc71" />
          <Text>出口</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelItem} onPress={() => setElementToPlace('spawn')}>
          <MaterialCommunityIcons name="flag" size={32} color="#2ecc71" />
          <Text>出生點</Text>
        </TouchableOpacity>
      </View>

      {/* 屬性編輯 Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>編輯 {editingElement?.type}</Text>
            <ScrollView>
              {editingElement && (
                <ObjectEditor
                  object={editingElement.element}
                  onChange={updated => setEditingElement(prev => ({ ...prev, element: updated }))}
                  onPickImage={() => pickMonsterImage(editingElement.element)}
                />
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={() => updateElement(editingElement.element)}>
                <Text style={styles.buttonText}>儲存</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={deleteElement}>
                <Text style={styles.buttonText}>刪除</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 關卡設定 Modal */}
      <Modal visible={settingsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>關卡設定</Text>
            
            <Text style={styles.settingLabel}>解鎖條件</Text>
            <View style={styles.settingRow}>
              <Text>無條件</Text>
              <Switch
                value={level.unlockCondition?.type === 'none'}
                onValueChange={(val) => setLevel(prev => ({ ...prev, unlockCondition: { type: 'none' } }))}
              />
            </View>
            <View style={styles.settingRow}>
              <Text>完成前置關卡</Text>
              <Switch
                value={level.unlockCondition?.type === 'previous'}
                onValueChange={(val) => setLevel(prev => ({ ...prev, unlockCondition: { type: 'previous', previousLevelId: '' } }))}
              />
            </View>
            {level.unlockCondition?.type === 'previous' && (
              <TextInput
                style={styles.input}
                placeholder="前置關卡ID"
                value={level.unlockCondition.previousLevelId}
                onChangeText={(text) => setLevel(prev => ({
                  ...prev,
                  unlockCondition: { ...prev.unlockCondition, previousLevelId: text }
                }))}
              />
            )}
            <View style={styles.settingRow}>
              <Text>需要MBTI結果</Text>
              <Switch
                value={level.unlockCondition?.type === 'mbti'}
                onValueChange={(val) => setLevel(prev => ({ ...prev, unlockCondition: { type: 'mbti', requireMbti: true } }))}
              />
            </View>
            <View style={styles.settingRow}>
              <Text>需要玩家等級</Text>
              <Switch
                value={level.unlockCondition?.type === 'level'}
                onValueChange={(val) => setLevel(prev => ({ ...prev, unlockCondition: { type: 'level', requiredLevel: 1 } }))}
              />
            </View>
            {level.unlockCondition?.type === 'level' && (
              <TextInput
                style={styles.input}
                placeholder="所需等級"
                keyboardType="numeric"
                value={String(level.unlockCondition.requiredLevel || 1)}
                onChangeText={(text) => setLevel(prev => ({
                  ...prev,
                  unlockCondition: { ...prev.unlockCondition, requiredLevel: parseInt(text) || 1 }
                }))}
              />
            )}

            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>當前樓層出生點（也可拖拽旗子）</Text>
              <View style={styles.row}>
                <Text style={styles.label}>X:</Text>
                <TextInput
                  style={styles.coordInput}
                  value={String(currentFloor.spawnPoint?.x ?? '')}
                  onChangeText={(text) => {
                    const x = parseInt(text) || 0;
                    setLevel(prev => {
                      const newFloors = [...prev.floors];
                      newFloors[currentFloorIndex] = {
                        ...newFloors[currentFloorIndex],
                        spawnPoint: { ...(newFloors[currentFloorIndex].spawnPoint || {}), x }
                      };
                      return { ...prev, floors: newFloors };
                    });
                  }}
                  keyboardType="numeric"
                  placeholder="X"
                />
                <Text style={styles.label}>Y:</Text>
                <TextInput
                  style={styles.coordInput}
                  value={String(currentFloor.spawnPoint?.y ?? '')}
                  onChangeText={(text) => {
                    const y = parseInt(text) || 0;
                    setLevel(prev => {
                      const newFloors = [...prev.floors];
                      newFloors[currentFloorIndex] = {
                        ...newFloors[currentFloorIndex],
                        spawnPoint: { ...(newFloors[currentFloorIndex].spawnPoint || {}), y }
                      };
                      return { ...prev, floors: newFloors };
                    });
                  }}
                  keyboardType="numeric"
                  placeholder="Y"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={() => setSettingsModalVisible(false)}>
              <Text style={styles.buttonText}>完成</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ 修改重點：儲存選項對話框，已移除「儲存至原關卡」按鈕 */}
      <Modal visible={showSaveOptions} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.optionModal}>
            <Text style={styles.optionTitle}>儲存選項</Text>
            <Text style={styles.optionDesc}>您正在編輯一個主線關卡，請選擇：</Text>

            {/* 另存為新自定義關卡 */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowSaveOptions(false);
                performSave('saveAsNew');
              }}
            >
              <MaterialCommunityIcons name="content-copy" size={24} color="#5c4033" />
              <Text style={styles.optionButtonText}>另存為新自定義關卡</Text>
            </TouchableOpacity>

            {/* 如果已有對應的自定義關卡，顯示更新選項 */}
            {existingCustomId && (
              <TouchableOpacity
                style={[styles.optionButton, styles.updateButton]}
                onPress={() => {
                  setShowSaveOptions(false);
                  performSave('updateExisting');
                }}
              >
                <MaterialCommunityIcons name="pencil" size={24} color="#fff" />
                <Text style={[styles.optionButtonText, { color: '#fff' }]}>更新現有自定義關卡</Text>
              </TouchableOpacity>
            )}

            {/* ❌「儲存至原關卡（覆蓋預設）」按鈕已移除 */}

            <TouchableOpacity
              style={[styles.optionButton, styles.cancelOption]}
              onPress={() => setShowSaveOptions(false)}
            >
              <Text style={styles.optionButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ObjectEditor = ({ object, onChange, onPickImage }) => {
  if (typeof object !== 'object' || object === null) return null;

  return (
    <View>
      {object.type === 'slime' && (
        <TouchableOpacity style={styles.imagePickButton} onPress={onPickImage}>
          <MaterialCommunityIcons name="image" size={20} color="#fff" />
          <Text style={styles.imagePickText}>選擇怪物圖片</Text>
        </TouchableOpacity>
      )}
      {Object.entries(object).map(([key, value]) => {
        if (key === 'instanceId' || key === 'image') return null;
        if (typeof value === 'object') {
          return (
            <View key={key} style={styles.propertyGroup}>
              <Text style={styles.propertyLabel}>{key}:</Text>
              <ObjectEditor object={value} onChange={v => onChange({ ...object, [key]: v })} />
            </View>
          );
        }
        return (
          <View key={key} style={styles.propertyRow}>
            <Text style={styles.propertyLabel}>{key}:</Text>
            <TextInput
              style={styles.input}
              value={String(value)}
              onChangeText={text => {
                let newValue = text;
                if (typeof value === 'number') newValue = parseFloat(text) || 0;
                onChange({ ...object, [key]: newValue });
              }}
              keyboardType={typeof value === 'number' ? 'numeric' : 'default'}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2c3e50' },
  toolbar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#34495e',
    alignItems: 'center',
  },
  nameInput: { flex: 2, backgroundColor: '#fff', borderRadius: 5, padding: 8, marginRight: 5 },
  colorInput: { flex: 1, backgroundColor: '#fff', borderRadius: 5, padding: 8, marginRight: 5 },
  toolButton: { backgroundColor: '#2c3e50', padding: 8, borderRadius: 5, marginLeft: 5 },
  floorBar: {
    flexDirection: 'row',
    backgroundColor: '#3d566e',
    paddingVertical: 5,
    alignItems: 'center',
  },
  floorTab: { paddingHorizontal: 15, paddingVertical: 8, marginHorizontal: 2, borderRadius: 5 },
  activeFloor: { backgroundColor: '#f4c7ab' },
  floorText: { color: '#fff', fontWeight: 'bold' },
  addFloor: { marginLeft: 10, backgroundColor: '#2ecc71', borderRadius: 15, padding: 5 },
  canvas: { flex: 1, position: 'relative' },
  backgroundImage: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 200,
    top: 0,
    left: 0,
  },
  element: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  elementImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  monster: { borderRadius: 20 },
  obstacle: { borderRadius: 4 },
  item: { borderRadius: 20 },
  exit: { borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  spawn: { borderRadius: 15, borderWidth: 2, borderColor: '#fff' },
  panel: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    padding: 10,
    justifyContent: 'space-around',
  },
  panelItem: { alignItems: 'center', padding: 5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  propertyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  propertyLabel: { width: 100, fontSize: 14, fontWeight: '600' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8 },
  propertyGroup: { marginLeft: 10, marginBottom: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  saveButton: { backgroundColor: '#2ecc71', padding: 10, borderRadius: 5, marginRight: 10 },
  deleteButton: { backgroundColor: '#e74c3c', padding: 10, borderRadius: 5, marginRight: 10 },
  cancelButton: { backgroundColor: '#95a5a6', padding: 10, borderRadius: 5 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  imagePickButton: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickText: { color: '#fff', marginLeft: 8, fontWeight: 'bold' },
  settingLabel: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  settingSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    color: '#5c4033',
  },
  coordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
    marginHorizontal: 8,
  },
  optionModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#5c4033',
    marginBottom: 12,
  },
  optionDesc: {
    fontSize: 16,
    color: '#8b5e3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4c7ab',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    justifyContent: 'center',
  },
  updateButton: {
    backgroundColor: '#9b59b6',
  },
  // 移除 presetSaveButton 相關樣式（可保留但不會用到）
  cancelOption: {
    backgroundColor: '#e74c3c',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5c4033',
    marginLeft: 12,
  },
});