import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../utils/api';
import { Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function TempChatInvites() {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const router = useRouter();

    const loadInvites = async () => {
        try {
            const res = await api.get('/api/temp-chat/pending');
            console.log('📥 邀請列表:', res.data);
            setInvites(res.data.invites || []);
        } catch (error) {
            console.error('❌ 載入邀請失敗:', error);
            Alert.alert('錯誤', '無法載入邀請');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadInvites();
        }, [])
    );

    const acceptInvite = async (inviteId) => {
        if (processingId === inviteId) return;
        setProcessingId(inviteId);
        try {
            console.log('📤 接受邀請，ID:', inviteId);
            const res = await api.post('/api/temp-chat/accept', { inviteId });
            console.log('📥 接受成功:', res.data);
            if (res.data.success) {
                Alert.alert('成功', '已接受邀請');
                // 跳轉到臨時聊天室（必須用 /temp-chat/ 路徑）
                router.push(`/temp-chat/${res.data.roomId}?otherUserId=${res.data.otherUserId}`);
                loadInvites();
            }
        } catch (error) {
            console.error('❌ 接受邀請錯誤:', error);
            if (error.response?.status === 404) {
                Alert.alert('邀請已失效', '此邀請可能已被接受或過期');
                loadInvites();
            } else {
                Alert.alert('錯誤', error.response?.data?.error || '接受失敗');
            }
        } finally {
            setProcessingId(null);
        }
    };

    const rejectInvite = async (inviteId) => {
        if (processingId === inviteId) return;
        setProcessingId(inviteId);
        try {
            await api.post('/api/temp-chat/reject', { inviteId });
            loadInvites();
        } catch (error) {
            Alert.alert('錯誤', '拒絕失敗');
        } finally {
            setProcessingId(null);
        }
    };

    // ... 其餘程式碼保持不變 ...
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
                <Text style={styles.headerTitle}>臨時聊天邀請</Text>
                <View style={{ width: 28 }} />
            </View>

            {invites.length === 0 ? (
                <View style={styles.empty}>
                    <MaterialCommunityIcons name="bell-off-outline" size={60} color="#f4c7ab" />
                    <Text style={styles.emptyText}>暫無待處理邀請</Text>
                </View>
            ) : (
                <FlatList
                    data={invites}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.inviteItem}>
                            <View style={styles.avatarContainer}>
                                {item.from_avatar ? (
                                    <Image source={{ uri: item.from_avatar }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.defaultAvatar}>
                                        <Text style={styles.avatarText}>{item.from_username.charAt(0)}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.info}>
                                <Text style={styles.username}>{item.from_username}</Text>
                                <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[styles.acceptButton, processingId === item.id && styles.disabledButton]}
                                    onPress={() => acceptInvite(item.id)}
                                    disabled={processingId === item.id}
                                >
                                    {processingId === item.id ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>接受</Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.rejectButton, processingId === item.id && styles.disabledButton]}
                                    onPress={() => rejectInvite(item.id)}
                                    disabled={processingId === item.id}
                                >
                                    <Text style={styles.buttonText}>拒絕</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadInvites} colors={['#f4c7ab']} />}
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
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244,199,171,0.3)',
    },
    backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(244,199,171,0.25)' },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#5c4033' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 16, color: '#8b5e3c', marginTop: 12 },
    inviteItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(244,199,171,0.3)',
    },
    avatarContainer: { marginRight: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    defaultAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f4c7ab',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { fontSize: 20, fontWeight: '800', color: '#5c4033' },
    info: { flex: 1 },
    username: { fontSize: 16, fontWeight: '600', color: '#5c4033' },
    time: { fontSize: 12, color: '#8b5e3c', marginTop: 4 },
    actions: { flexDirection: 'row', gap: 8 },
    acceptButton: { backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
    rejectButton: { backgroundColor: '#e74c3c', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
    buttonText: { color: '#fff', fontWeight: '600' },
    disabledButton: { opacity: 0.5 },
});