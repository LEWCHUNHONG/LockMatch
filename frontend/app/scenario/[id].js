import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Linking,
    TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 輔助函數：計算兩點距離（米）
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function ScenarioDetail() {
    const { id } = useLocalSearchParams();
    const [scenario, setScenario] = useState(null);
    const [myCode, setMyCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);          // 當前登入使用者 ID
    const [otherUserId, setOtherUserId] = useState(null); // 對方使用者 ID
    const [checkingIn, setCheckingIn] = useState(false);   // GPS 打卡中
    const [verifying, setVerifying] = useState(false);     // 暗號驗證中
    const [inputCode, setInputCode] = useState('');        // 暗號輸入框
    const router = useRouter();

    // 取得目前登入的使用者 ID（假設登入時已儲存）
    const getCurrentUserId = async () => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.id;
            }
        } catch (error) {
            console.error('讀取使用者 ID 失敗', error);
        }
        return null;
    };

    const loadScenario = async () => {
        try {
            const [res, currentUserId] = await Promise.all([
                api.get(`/api/scenario/${id}`),
                getCurrentUserId()
            ]);

            if (res.data.success) {
                setScenario(res.data.scenario);
                setMyCode(res.data.myCode || '');

                const { user_id: initiatorId, target_user_id: targetId } = res.data;
                // 判斷當前使用者是發起人還是接受者
                if (currentUserId === initiatorId) {
                    setUserId(initiatorId);
                    setOtherUserId(targetId);
                } else {
                    setUserId(currentUserId);
                    setOtherUserId(initiatorId);
                }
            }
        } catch (error) {
            Alert.alert('錯誤', '載入劇本失敗');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadScenario();
        // 每30秒輪詢一次，節省資源
        const interval = setInterval(loadScenario, 30000);
        return () => clearInterval(interval);
    }, [id]);

    // GPS 打卡
    const handleGpsCheckin = async (taskIndex) => {
        if (checkingIn) return;
        setCheckingIn(true);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('需要位置權限', '請允許存取位置');
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
                maximumAge: 10000, // 最多接受10秒前嘅緩存
            });

            // 檢測是否為模擬位置（Android）
            if (location.mocked) {
                Alert.alert('檢測到模擬位置', '請關閉開發者選項中的模擬位置功能');
                return;
            }

            const task = scenario.tasks[taskIndex];
            if (!task.location) {
                Alert.alert('錯誤', '此任務唔需要打卡');
                return;
            }

            const distance = haversine(
                task.location.lat,
                task.location.lng,
                location.coords.latitude,
                location.coords.longitude
            );
            const radius = task.location.radius || 100;
            if (distance > radius) {
                Alert.alert('位置不符', `你目前距離目標地點 ${Math.round(distance)} 米`);
                return;
            }

            const response = await api.post('/api/scenario/gps-checkin', {
                scenarioId: id,
                taskIndex,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                clientTime: new Date().toISOString(),
                mocked: location.mocked || false,
            });

            if (response.data.success) {
                Alert.alert('打卡成功');
                loadScenario(); // 刷新
            }
        } catch (error) {
            Alert.alert('打卡失敗', error.response?.data?.error || error.message);
        } finally {
            setCheckingIn(false);
        }
    };

    // 暗號驗證
    const verifyCode = async (taskIndex) => {
        if (!inputCode.trim()) {
            Alert.alert('提示', '請輸入暗號');
            return;
        }

        setVerifying(true);
        try {
            const response = await api.post('/api/scenario/verify-code', {
                scenarioId: id,
                taskIndex,
                code: inputCode.trim(),
            });
            if (response.data.success) {
                Alert.alert('成功', '暗號驗證成功');
                setInputCode('');
                loadScenario();
            }
        } catch (error) {
            Alert.alert('驗證失敗', error.response?.data?.error || '請稍後再試');
        } finally {
            setVerifying(false);
        }
    };

    // 任務確認
    const confirmTask = async (taskIndex) => {
        Alert.alert(
            '確認任務',
            '請確認你已完成此任務嘅所有要求？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '確認完成',
                    onPress: async () => {
                        try {
                            const response = await api.post('/api/scenario/confirm-task', {
                                scenarioId: id,
                                taskIndex,
                            });
                            if (response.data.success) {
                                Alert.alert('成功', '任務已確認');
                                loadScenario();
                            }
                        } catch (error) {
                            Alert.alert('確認失敗', error.response?.data?.error || '請稍後再試');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#f4c7ab" />
            </View>
        );
    }

    if (!scenario) {
        return (
            <View style={styles.center}>
                <Text>劇本不存在</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                </TouchableOpacity>
                <Text style={styles.title}>{scenario.title}</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.backstory}>{scenario.backstory}</Text>
                <View style={styles.roles}>
                    <Text style={styles.roleLabel}>你的角色：</Text>
                    <Text style={styles.roleText}>{scenario.roles?.A}</Text>
                    <Text style={styles.roleLabel}>對方角色：</Text>
                    <Text style={styles.roleText}>{scenario.roles?.B}</Text>
                </View>

                <Text style={styles.sectionTitle}>任務清單</Text>
                {scenario.tasks?.map((task, index) => {
                    const gpsUsers = task.verifications?.gps ?? [];
                    const codeUsers = task.verifications?.code ?? [];

                    return (
                        <View key={index} style={styles.taskCard}>
                            <Text style={styles.taskIndex}>任務 {index + 1}</Text>
                            <Text style={styles.taskDesc}>{task.description}</Text>

                            {/* 狀態圖標 */}
                            <View style={styles.statusRow}>
                                <View style={styles.statusItem}>
                                    <MaterialCommunityIcons
                                        name={gpsUsers.includes(userId) ? 'check-circle' : 'clock-outline'}
                                        size={20}
                                        color={gpsUsers.includes(userId) ? '#2ecc71' : '#f4c7ab'}
                                    />
                                    <Text style={styles.statusText}>我的打卡</Text>
                                </View>
                                <View style={styles.statusItem}>
                                    <MaterialCommunityIcons
                                        name={gpsUsers.includes(otherUserId) ? 'check-circle' : 'clock-outline'}
                                        size={20}
                                        color={gpsUsers.includes(otherUserId) ? '#2ecc71' : '#f4c7ab'}
                                    />
                                    <Text style={styles.statusText}>對方打卡</Text>
                                </View>
                                {task.type === 'code_exchange' && (
                                    <>
                                        <View style={styles.statusItem}>
                                            <MaterialCommunityIcons
                                                name={codeUsers.includes(userId) ? 'check-circle' : 'clock-outline'}
                                                size={20}
                                                color={codeUsers.includes(userId) ? '#2ecc71' : '#f4c7ab'}
                                            />
                                            <Text style={styles.statusText}>我的暗號</Text>
                                        </View>
                                        <View style={styles.statusItem}>
                                            <MaterialCommunityIcons
                                                name={codeUsers.includes(otherUserId) ? 'check-circle' : 'clock-outline'}
                                                size={20}
                                                color={codeUsers.includes(otherUserId) ? '#2ecc71' : '#f4c7ab'}
                                            />
                                            <Text style={styles.statusText}>對方暗號</Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* 暗號顯示 */}
                            {task.type === 'code_exchange' && (
                                <View style={styles.codeBox}>
                                    <Text style={styles.codeLabel}>你的暗號：</Text>
                                    <Text style={styles.codeValue}>{myCode || '尚未取得'}</Text>
                                    <Text style={styles.tip}>請在聊天室發送呢個暗號給對方</Text>

                                    <Text style={styles.codeLabel}>對方暗號：</Text>
                                    <TextInput
                                        style={styles.codeInput}
                                        placeholder="輸入對方俾你嘅暗號"
                                        value={inputCode}
                                        onChangeText={setInputCode}
                                    />
                                    <TouchableOpacity
                                        style={[styles.verifyButton, verifying && styles.disabled]}
                                        onPress={() => verifyCode(index)}
                                        disabled={verifying}
                                    >
                                        {verifying ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.verifyButtonText}>驗證暗號</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* GPS 打卡按鈕 */}
                            {task.requiresGps && (
                                <TouchableOpacity
                                    style={[styles.gpsButton, checkingIn && styles.disabled]}
                                    onPress={() => handleGpsCheckin(index)}
                                    disabled={checkingIn}
                                >
                                    {checkingIn ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="map-marker" size={20} color="#fff" />
                                            <Text style={styles.gpsButtonText}>到達地點打卡</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                            {/* 任務確認按鈕 */}
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={() => confirmTask(index)}
                            >
                                <Text style={styles.confirmButtonText}>我已完成此任務</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fffaf5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 10,
    },
    title: { fontSize: 22, fontWeight: '700', color: '#5c4033', flex: 1, textAlign: 'center' },
    content: { padding: 20 },
    backstory: { fontSize: 16, lineHeight: 24, color: '#5c4033', marginBottom: 20 },
    roles: { marginBottom: 20 },
    roleLabel: { fontSize: 16, fontWeight: '600', color: '#8b5e3c', marginTop: 8 },
    roleText: { fontSize: 16, color: '#5c4033', marginBottom: 4 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033', marginBottom: 16 },
    taskCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    taskIndex: { fontSize: 14, fontWeight: '600', color: '#f4c7ab', marginBottom: 4 },
    taskDesc: { fontSize: 16, color: '#5c4033', marginBottom: 12, lineHeight: 22 },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
    statusItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 },
    statusText: { fontSize: 12, color: '#5c4033', marginLeft: 4 },
    codeBox: {
        backgroundColor: 'rgba(244,199,171,0.2)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    codeLabel: { fontSize: 14, fontWeight: '600', color: '#5c4033', marginTop: 8 },
    codeValue: { fontSize: 24, fontWeight: '800', color: '#e67e22', marginVertical: 4 },
    tip: { fontSize: 12, color: '#8b5e3c', fontStyle: 'italic' },
    codeInput: {
        borderWidth: 1,
        borderColor: '#f4c7ab',
        borderRadius: 8,
        padding: 10,
        marginVertical: 8,
        fontSize: 16,
    },
    verifyButton: {
        backgroundColor: '#3498db',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    verifyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    gpsButton: {
        backgroundColor: '#f4c7ab',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    gpsButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    confirmButton: {
        backgroundColor: '#2ecc71',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    disabled: { opacity: 0.6 },
});