import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../utils/api';

export default function ScenarioList() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingInviteCount, setPendingInviteCount] = useState(0);
    const [activeScenario, setActiveScenario] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();


    useEffect(() => {
        loadTemplates();
        loadInviteCount();
        loadActiveScenario();
        const interval = setInterval(loadInviteCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadTemplates = async () => {
        try {
            const res = await api.get('/api/scenario/templates');
            if (res.data.success && Array.isArray(res.data.templates)) {
                setTemplates(res.data.templates);
            } else {
                console.error('API 返回的 templates 不是陣列:', res.data);
                setTemplates([]);
            }
        } catch (error) {
            console.error('載入劇本失敗', error);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    const loadActiveScenario = async () => {
        try {
            const res = await api.get('/api/scenario/active-scenario');
            if (res.data.success && res.data.hasActive) {
                setActiveScenario(res.data.scenario);
            } else {
                setActiveScenario(null);
            }
        } catch (error) {
            console.error('載入進行中劇本失敗', error);
        }
    };

    const loadInviteCount = async () => {
        try {
            const res = await api.get('/api/scenario/invites/pending');
            if (res.data.success) {
                setPendingInviteCount(res.data.invites.length);
            }
        } catch (error) {
            console.error('載入邀請數量失敗', error);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.scenarioCard}
            onPress={() => router.push(`/scenario/template/${item.id}`)}
        >
            <Text style={styles.scenarioTitle}>{item.title}</Text>
            <Text style={styles.scenarioDesc}>{item.description}</Text>
            {item.location_name && (
                <Text style={styles.locationText}>📍 {item.location_name}</Text>
            )}
        </TouchableOpacity>
    );

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                loadTemplates(),
                loadInviteCount(),
                loadActiveScenario()
            ]);
        } catch (error) {
            console.error('刷新失敗', error);
        } finally {
            setRefreshing(false);
        }
    };


    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <ActivityIndicator size="large" color="#f4c7ab" />
            </SafeAreaView>
        );
    }

    return (

        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>劇本大廳</Text>
                <TouchableOpacity onPress={() => router.push('/scenario/invites')} style={styles.bellButton}>
                    <MaterialCommunityIcons name="bell" size={28} color="#5c4033" />
                    {pendingInviteCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingInviteCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {activeScenario && (
                <TouchableOpacity style={styles.activeScenarioCard} onPress={() => router.push(`/scenario/${activeScenario.id}`)}>
                    <MaterialCommunityIcons name="play-circle" size={24} color="#5c4033" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.activeTitle}>進行中的劇本</Text>
                        <Text style={styles.activeDesc}>{activeScenario.title}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#5c4033" />
                </TouchableOpacity>
            )}

            {templates.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="drama-masks" size={60} color="#f4c7ab" />
                    <Text style={styles.emptyText}>暫無劇本</Text>
                    <Text style={styles.emptySubText}>請檢查網絡或稍後再試</Text>
                </View>
            ) : (
                <FlatList
                    data={templates}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#f4c7ab']}
                            tintColor="#f4c7ab"
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fffaf5' },
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
    backButton: { padding: 8 },
    bellButton: { padding: 8, position: 'relative' },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#e74c3c',
        borderRadius: 12,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033' },
    list: { padding: 16 },
    scenarioCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    scenarioTitle: { fontSize: 18, fontWeight: '700', color: '#5c4033', marginBottom: 4 },
    scenarioDesc: { fontSize: 14, color: '#8b5e3c', marginBottom: 6, lineHeight: 20 },
    locationText: { fontSize: 12, color: '#f4c7ab', marginBottom: 12 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { fontSize: 18, fontWeight: '700', color: '#5c4033', marginTop: 16 },
    emptySubText: { fontSize: 14, color: '#8b5e3c', marginTop: 8 },


    activeScenarioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    activeTitle: {
        fontSize: 14,
        color: '#8b5e3c',
        marginBottom: 2,
    },
    activeDesc: {
        fontSize: 16,
        fontWeight: '600',
        color: '#5c4033',
    },

});