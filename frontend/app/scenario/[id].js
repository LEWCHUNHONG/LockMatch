import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api, { socketAPI } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function ScenarioDetail() {
    const { id } = useLocalSearchParams();
    const [scenario, setScenario] = useState(null);
    const [keywords, setKeywords] = useState([]);
    const [myId, setMyId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(null);
    const [timer, setTimer] = useState(null);
    const router = useRouter();
    const [allCompleted, setAllCompleted] = useState(false);

    useEffect(() => {
        if (keywords.length > 0) {
            const all = keywords.every(k => k.completed);
            setAllCompleted(all);
        }
    }, [keywords]);

    useEffect(() => {
        const init = async () => {
            const userId = await getCurrentUser();
            if (!userId) {
                Alert.alert('錯誤', '無法獲取用戶信息，請重新登入');
                router.replace('/login');
                return;
            }
            setMyId(userId);
            await loadScenario(userId);
            // 加入房間（只執行一次）
            const socket = socketAPI.getSocket();
            if (socket) {
                socket.emit('join-room', `scenario_${id}`);
                console.log(`✅ 已加入房間 scenario_${id}`);
            }
        };
        init();
        return () => {
            const socket = socketAPI.getSocket();
            if (socket) {
                socket.emit('leave-room', `scenario_${id}`);
                socket.off('keyword-completed');
                socket.off('scenario-completed');
                socket.off('scenario-aborted');
            }
            if (timer) clearInterval(timer);
        };
    }, [id]);



    useEffect(() => {
        if (myId !== null) {
            setupSocket();
        }
        return () => {
            const socket = socketAPI.getSocket();
            if (socket) {
                socket.off('keyword-completed');
                socket.off('scenario-completed');
                socket.off('scenario-aborted');
            }
        };
    }, [myId, id]);





    const getCurrentUser = async () => {
        try {
            const res = await api.get('/api/me');
            if (res.data && res.data.id) {
                const id = Number(res.data.id);
                console.log('✅ 從 API 獲取用戶ID:', id);
                return id;
            }
        } catch (error) {
            console.error('❌ API獲取用戶失敗:', error);
        }
        try {
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user.id) {
                    const id = Number(user.id);
                    console.log('✅ 從本地存儲獲取用戶ID:', id);
                    return id;
                }
            }
        } catch (e) {
            console.error('❌ 讀取本地用戶失敗:', e);
        }
        return null;
    };



    const loadScenario = async (currentUserId) => {
        try {
            const res = await api.get(`/api/scenario/${id}`);
            if (res.data.success) {
                setScenario(res.data.scenario);
                setKeywords(res.data.scenario.keywords || []);
                console.log('✅ 當前用戶ID:', currentUserId);
                console.log('✅ keywords 內容:', res.data.scenario.keywords);
                const startTime = new Date(res.data.created_at).getTime();
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const remaining = 600 - elapsed;
                if (remaining > 0) {
                    setTimeLeft(remaining);
                    startTimer(remaining);
                } else {
                    completeScenario();
                }
            } else {
                Alert.alert('錯誤', '無法載入劇本');
                router.back();
            }
        } catch (error) {
            Alert.alert('錯誤', '載入失敗');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const startTimer = (initialSeconds) => {
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setTimer(null);
                    completeScenario();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        setTimer(interval);
    };

    const completeScenario = async () => {
        try {
            await api.post('/api/scenario/complete', { scenarioId: id });
        } catch (error) {
            console.error('完成劇本失敗', error);
            Alert.alert('提示', '劇本時間已結束，將返回大廳', [
                { text: '確定', onPress: () => router.replace('/scenario') }
            ]);
        }
    };

    const endScenario = () => {
        Alert.alert(
            '結束劇本',
            '確定要提前結束劇本嗎？將根據已完成的關鍵字計算積分，雙方都會退出。',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '確定',
                    onPress: async () => {
                        try {
                            await api.post('/api/scenario/end', { scenarioId: id });
                        } catch (error) {
                            Alert.alert('錯誤', error.response?.data?.error || '結束失敗');
                        }
                    }
                }
            ]
        );
    };

    const leaveScenario = () => {
        Alert.alert(
            '離開劇本',
            '確定要離開嗎？對方也會同時離開。',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '確定',
                    onPress: async () => {
                        try {
                            await api.post('/api/scenario/leave', { scenarioId: id });
                            router.replace('/scenario');
                        } catch (error) {
                            Alert.alert('錯誤', '離開失敗');
                        }
                    }
                }
            ]
        );
    };



    const setupSocket = () => {
        const socket = socketAPI.getSocket();
        if (!socket) return;

        socket.on('keyword-completed', (data) => {
            if (String(data.scenarioId) === String(id)) {
                setKeywords(prev => {
                    const newKeywords = [...prev];
                    if (newKeywords[data.keywordIndex]) {
                        newKeywords[data.keywordIndex].completed = true;
                    }
                    return newKeywords;
                });
            }
        });

        socket.on('scenario-completed', (data) => {
            console.log('🔔 前端收到 scenario-completed 事件，完整數據:', data);
            console.log('當前 myId:', myId, typeof myId);
            console.log('scores 對象:', data.scores);
            if (String(data.scenarioId) === String(id)) {
                const myPoints = data.scores[Number(myId)];
                console.log('對應的分數:', myPoints);
                Alert.alert('劇本完成', `你的得分: ${myPoints} 分`, [
                    { text: '確定', onPress: () => router.replace('/scenario') }
                ]);
            }
        });

        socket.on('scenario-aborted', (data) => {
            if (data.scenarioId === id) {
                Alert.alert('提示', '對方已離開劇本', [
                    { text: '確定', onPress: () => router.replace('/scenario') }
                ]);
            }
        });
    };


    const markKeyword = async (index) => {
        try {
            await api.post('/api/scenario/complete-keyword', {
                scenarioId: id,
                keywordIndex: index
            });
            // 樂觀更新
            setKeywords(prev => {
                const newKeywords = [...prev];
                newKeywords[index].completed = true;
                return newKeywords;
            });
        } catch (error) {
            Alert.alert('錯誤', error.response?.data?.error || '標記失敗');
        }
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

    const myKeywords = keywords.filter(k => String(k.listener) === String(myId));
    const opponentKeywords = keywords.filter(k => String(k.listener) !== String(myId));
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{scenario.title}</Text>
                    <TouchableOpacity onPress={leaveScenario} style={styles.leaveButton}>
                        <MaterialCommunityIcons name="exit-run" size={28} color="#e74c3c" />
                    </TouchableOpacity>
                </View>

                <View style={styles.timerContainer}>
                    <MaterialCommunityIcons name="timer-outline" size={24} color="#5c4033" />
                    <Text style={styles.timerText}>剩餘時間: {timeLeft !== null ? formatTime(timeLeft) : '--:--'}</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.backstory}>{scenario.backstory}</Text>
                    <View style={styles.roles}>
                        <Text style={styles.roleLabel}>你的角色：</Text>
                        <Text style={styles.roleText}>{scenario.roles?.A}</Text>
                        <Text style={styles.roleLabel}>對方角色：</Text>
                        <Text style={styles.roleText}>{scenario.roles?.B}</Text>
                    </View>

                    <Text style={styles.sectionTitle}>關鍵字清單</Text>
                    <Text style={styles.sectionSubtitle}>請留意對方說出以下關鍵字並標記</Text>
                    {myKeywords.map((kw, idx) => {
                        const originalIndex = keywords.findIndex(k => k.word === kw.word);
                        return (
                            <View key={originalIndex} style={styles.keywordCard}>
                                <Text style={styles.keywordText}>{kw.word}</Text>
                                {!kw.completed ? (
                                    <TouchableOpacity style={styles.markButton} onPress={() => markKeyword(originalIndex)}>
                                        <Text style={styles.markButtonText}>標記完成</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.completedBadge}>
                                        <MaterialCommunityIcons name="check-circle" size={20} color="#2ecc71" />
                                        <Text style={styles.completedText}>已完成</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}

                    {opponentKeywords.length > 0 && (
                        <>
                            <Text style={styles.sectionSubtitle}>對方需要監聽的關鍵字</Text>
                            <View style={styles.opponentList}>
                                {opponentKeywords.map((kw, idx) => (
                                    <Text key={idx} style={styles.opponentKeyword}>
                                        {kw.word} {kw.completed ? '✓' : '○'}
                                    </Text>
                                ))}
                            </View>
                        </>
                    )}
                </View>

                {allCompleted && (
                    <TouchableOpacity style={styles.submitButton} onPress={() => completeScenario()}>
                        <Text style={styles.submitButtonText}>提交結果</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.earlySubmitButton} onPress={endScenario}>
                    <Text style={styles.earlySubmitButtonText}>提前提交</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fffaf5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },

    safeArea: {
        flex: 1,
        backgroundColor: '#fffaf5',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },

    earlySubmitButton: {
        backgroundColor: '#f39c12',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    earlySubmitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: { padding: 8 },
    leaveButton: { padding: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#5c4033', flex: 1, textAlign: 'center' },
    timerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 12, padding: 8, backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 20 },
    timerText: { fontSize: 18, fontWeight: '600', color: '#5c4033', marginLeft: 8 },
    content: { padding: 20 },
    backstory: { fontSize: 16, lineHeight: 24, color: '#5c4033', marginBottom: 20 },
    roles: { marginBottom: 20 },
    roleLabel: { fontSize: 16, fontWeight: '600', color: '#8b5e3c', marginTop: 8 },
    roleText: { fontSize: 16, color: '#5c4033', marginBottom: 4 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033', marginBottom: 8, marginTop: 16 },
    sectionSubtitle: { fontSize: 14, color: '#8b5e3c', marginBottom: 12 },
    keywordCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#f4c7ab',
    },
    keywordText: { fontSize: 18, fontWeight: '600', color: '#5c4033' },
    markButton: { backgroundColor: '#f4c7ab', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    markButtonText: { color: '#5c4033', fontWeight: '600', fontSize: 14 },
    completedBadge: { flexDirection: 'row', alignItems: 'center' },
    completedText: { color: '#2ecc71', marginLeft: 4, fontSize: 14 },
    opponentList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    opponentKeyword: { backgroundColor: '#fff', padding: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, fontSize: 14, color: '#5c4033', borderWidth: 1, borderColor: '#f4c7ab' },
    submitButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },

});