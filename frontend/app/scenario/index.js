import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../utils/api';

export default function ScenarioList() {
    const [scenarios, setScenarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [pendingInviteCount, setPendingInviteCount] = useState(0);

    const loadPendingCount = async () => {
        try {
            const res = await api.get('/api/scenario/invites/pending');
            setPendingInviteCount(res.data.invites.length);
        } catch (error) {
            console.log('拎邀請數量失敗', error);
        }
    };

    useEffect(() => {
        loadScenarios();
        loadPendingCount();
    }, []);

    const loadScenarios = async () => {
        try {
            const res = await api.get('/api/scenario/list');
            if (res.data.success) {
                setScenarios(res.data.scenarios);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        const isActive = item.status === 'active';
        return (
            <TouchableOpacity
                style={[styles.scenarioCard, !isActive && styles.completedCard]}
                onPress={() => router.push(`/scenario/${item.id}`)}
            >
                <Text style={styles.scenarioTitle}>{item.scenario_data.title}</Text>
                <Text style={styles.scenarioStatus}>
                    狀態：{item.status === 'active' ? '進行中' : '已完成'}
                </Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#f4c7ab" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>劇本大廳</Text>
                <View style={{ width: 28 }} />
            </View>

            <TouchableOpacity style={styles.unlockButton} onPress={() => router.push('/scenario/unlock')}>
                <Text style={styles.unlockText}>+ 解鎖新劇本</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.inviteButton} onPress={() => router.push('/scenario/invites')}>
                <MaterialCommunityIcons name="bell" size={24} color="#5c4033" />
                {pendingInviteCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pendingInviteCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            {scenarios.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="drama-masks" size={60} color="#f4c7ab" />
                    <Text style={styles.emptyText}>暫無劇本</Text>
                    <Text style={styles.emptySubText}>去解鎖第一個劇本吧！</Text>
                </View>
            ) : (
                <FlatList
                    data={scenarios}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
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
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033' },
    unlockButton: {
        backgroundColor: '#f4c7ab',
        margin: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    unlockText: { color: '#5c4033', fontSize: 16, fontWeight: '600' },
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
    completedCard: { opacity: 0.7 },
    scenarioTitle: { fontSize: 18, fontWeight: '700', color: '#5c4033', marginBottom: 4 },
    scenarioStatus: { fontSize: 14, color: '#8b5e3c' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { fontSize: 18, fontWeight: '700', color: '#5c4033', marginTop: 16 },
    emptySubText: { fontSize: 14, color: '#8b5e3c', marginTop: 8 },
});