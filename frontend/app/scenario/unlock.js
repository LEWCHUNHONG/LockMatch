import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../utils/api';

export default function UnlockScenario() {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const res = await api.get('/api/friends');
            setFriends(res.data.friends);
        } catch (error) {
            Alert.alert('錯誤', '無法載入好友');
        }
    };

    const sendInvite = async (targetUserId) => {
        setLoading(true);
        try {
            const res = await api.post('/api/scenario/invite', { targetUserId });
            if (res.data.success) {
                Alert.alert(
                    '邀請已發送',
                    '等待對方接受邀請',
                    [{ text: '確定', onPress: () => router.back() }]
                );
            }
        } catch (error) {
            Alert.alert('錯誤', error.response?.data?.error || '發送失敗');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 18, marginBottom: 10 }}>選擇一位好友發送劇本邀請</Text>
            {loading && <ActivityIndicator size="large" color="#f4c7ab" />}
            <FlatList
                data={friends}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={{ padding: 15, backgroundColor: '#fff', marginBottom: 10, borderRadius: 10 }}
                        onPress={() => sendInvite(item.id)}
                        disabled={loading}
                    >
                        <Text>{item.username}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}