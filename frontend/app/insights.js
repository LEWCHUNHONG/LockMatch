import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';  // ✅ 加入 router hook
import api from '../utils/api';

export default function InsightsScreen() {
    const router = useRouter();  // ✅ 定義 router
    const [activeTab, setActiveTab] = useState('diary'); // 'diary' or 'report'
    const [diaryContent, setDiaryContent] = useState('');
    const [diaryMood, setDiaryMood] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [report, setReport] = useState('');
    const [loading, setLoading] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);

    // 提交日記
    const submitDiary = async () => {
        if (!diaryContent.trim()) {
            Alert.alert('提示', '請輸入日記內容');
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('/api/insights/diary', {
                content: diaryContent,
                mood: diaryMood
            });
            if (response.data.success) {
                setAnalysis(response.data.analysis || '日記已儲存，稍後可查看分析。');
                setDiaryContent('');
                setDiaryMood('');
                setReport(''); // 🔥 清空報告，下次查看時會重新生成
            } else {
                Alert.alert('錯誤', response.data.error || '提交失敗');
            }
        } catch (error) {
            Alert.alert('錯誤', '網絡錯誤，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    // 生成報告
    const generateReport = async () => {
        setReportLoading(true);
        try {
            const response = await api.get('/api/insights/report');
            if (response.data.success) {
                setReport(response.data.report);
            } else {
                Alert.alert('錯誤', response.data.error || '生成失敗');
            }
        } catch (error) {
            Alert.alert('錯誤', '網絡錯誤，請稍後再試');
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'report' && !report) {
            generateReport();
        }
    }, [activeTab]);

    return (
        <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2']} style={styles.gradient}>
            <SafeAreaView style={styles.container}>
                {/* 頂部返回按鈕 */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>性格分析</Text>
                    <View style={{ width: 28 }} />
                </View>

                {/* Tab 切換 */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'diary' && styles.activeTab]}
                        onPress={() => setActiveTab('diary')}
                    >
                        <Text style={[styles.tabText, activeTab === 'diary' && styles.activeTabText]}>性格日記</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'report' && styles.activeTab]}
                        onPress={() => setActiveTab('report')}
                    >
                        <Text style={[styles.tabText, activeTab === 'report' && styles.activeTabText]}>交友報告</Text>
                        <TouchableOpacity onPress={generateReport} disabled={reportLoading}>
                            <MaterialCommunityIcons name="refresh" size={24} color="#8b5e3c" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {activeTab === 'diary' ? (
                        <View>
                            <Text style={styles.label}>今日心情（可選）</Text>
                            <TextInput
                                style={styles.moodInput}
                                placeholder="例如：開心、平靜、煩躁"
                                value={diaryMood}
                                onChangeText={setDiaryMood}
                            />

                            <Text style={styles.label}>日記內容</Text>
                            <TextInput
                                style={styles.diaryInput}
                                placeholder="寫低你今日嘅感受、經歷..."
                                multiline
                                numberOfLines={8}
                                textAlignVertical="top"
                                value={diaryContent}
                                onChangeText={setDiaryContent}
                            />

                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={submitDiary}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>提交並獲取AI分析</Text>
                                )}
                            </TouchableOpacity>

                            {analysis ? (
                                <View style={styles.analysisCard}>
                                    <Text style={styles.analysisTitle}>✨ AI 分析</Text>
                                    <Text style={styles.analysisText}>{analysis}</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : (
                        <View>
                            {reportLoading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#f4c7ab" />
                                    <Text style={styles.loadingText}>生成報告中，請稍候...</Text>
                                </View>
                            ) : report ? (
                                <View style={styles.reportCard}>
                                    <Text style={styles.reportText}>{report}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}
                </ScrollView>
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
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#5c4033',
    },
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 30,
        backgroundColor: 'rgba(244,199,171,0.3)',
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 26,
    },
    activeTab: {
        backgroundColor: '#f4c7ab',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8b5e3c',
    },
    activeTabText: {
        color: '#5c4033',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#5c4033',
        marginBottom: 8,
        marginTop: 16,
    },
    moodInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(244,199,171,0.5)',
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    reportTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#5c4033',
    },
    diaryInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(244,199,171,0.5)',
        minHeight: 150,
    },
    submitButton: {
        backgroundColor: '#f4c7ab',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#5c4033',
    },
    analysisCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginTop: 30,
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    analysisTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#5c4033',
        marginBottom: 12,
    },
    analysisText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#5c4033',
    },
    reportCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
    },
    reportText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#5c4033',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#8b5e3c',
    },
});