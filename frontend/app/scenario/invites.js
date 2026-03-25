import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../utils/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InvitesScreen() {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadInvites();
        const interval = setInterval(loadInvites, 15000);
        return () => clearInterval(interval);
    }, []);

    const loadInvites = async () => {
        try {
            const res = await api.get('/api/scenario/invites/pending');
            setInvites(res.data.invites);
        } catch (error) {
            Alert.alert('錯誤', '無法載入邀請');
        } finally {
            setLoading(false);
        }
    };

    const acceptInvite = async (inviteId) => {
        try {
            const res = await api.post('/api/scenario/invite/accept', { inviteId });
            if (res.data.success) {
                Alert.alert('成功', '已接受邀請');
                router.push(`/scenario/${res.data.scenarioId}`);
            }
        } catch (error) {
            Alert.alert('錯誤', error.response?.data?.error || '接受失敗');
        }
    };

    const rejectInvite = async (inviteId) => {
        try {
            await api.post('/api/scenario/invite/reject', { inviteId });
            loadInvites();
        } catch (error) {
            Alert.alert('錯誤', '拒絕失敗');
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#f4c7ab" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>劇本邀請</Text>
                <View style={{ width: 28 }} />
            </View>

            {invites.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="bell-off" size={60} color="#f4c7ab" />
                    <Text style={styles.emptyText}>暫無邀請</Text>
                </View>
            ) : (
                <FlatList
                    data={invites}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.inviteCard}>
                            <Text style={styles.inviteTitle}>來自 {item.from_username}</Text>
                            <Text style={styles.inviteDesc}>劇本：{item.scenario_data.title}</Text>
                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={styles.acceptButton} onPress={() => acceptInvite(item.id)}>
                                    <Text style={styles.buttonText}>接受</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.rejectButton} onPress={() => rejectInvite(item.id)}>
                                    <Text style={styles.buttonText}>拒絕</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={styles.list}
                />
            )}
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
    backButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033' },
    list: { padding: 16 },
    inviteCard: {
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
    inviteTitle: { fontSize: 18, fontWeight: '700', color: '#5c4033', marginBottom: 4 },
    inviteDesc: { fontSize: 14, color: '#8b5e3c', marginBottom: 12 },
    buttonRow: { flexDirection: 'row', justifyContent: 'flex-end' },
    acceptButton: { backgroundColor: '#2ecc71', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, marginRight: 10 },
    rejectButton: { backgroundColor: '#e74c3c', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 16, color: '#8b5e3c', marginTop: 10 },
});