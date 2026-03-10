import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../utils/api';

export default function InvitesScreen() {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadInvites();
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#f4c7ab" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 18, marginBottom: 10 }}>待處理邀請</Text>
            {invites.length === 0 ? (
                <Text>暫無邀請</Text>
            ) : (
                <FlatList
                    data={invites}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={{ padding: 15, backgroundColor: '#fff', marginBottom: 10, borderRadius: 10 }}>
                            <Text style={{ fontWeight: 'bold' }}>{item.from_username}</Text>
                            <Text>劇本：{item.scenario_data.title}</Text>
                            <View style={{ flexDirection: 'row', marginTop: 10 }}>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#2ecc71', padding: 10, borderRadius: 5, marginRight: 10 }}
                                    onPress={() => acceptInvite(item.id)}
                                >
                                    <Text style={{ color: '#fff' }}>接受</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#e74c3c', padding: 10, borderRadius: 5 }}
                                    onPress={() => rejectInvite(item.id)}
                                >
                                    <Text style={{ color: '#fff' }}>拒絕</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}