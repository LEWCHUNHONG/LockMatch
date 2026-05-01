// app/chat/friend-requests.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chatAPI, fixImageUrl, API_URL } from '../../utils/api';

export default function FriendRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const router = useRouter();

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 10000); // 每 10 秒刷新
        return () => clearInterval(interval);
    }, []);


    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await chatAPI.getPendingRequests();
            if (res.data.success) {
                setRequests(res.data.requests);
            }
        } catch (error) {
            console.error('獲取請求失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (requestId, fromUserId) => {
        setProcessingId(requestId);
        try {
            const res = await chatAPI.acceptFriendRequest(requestId);
            console.log('接受請求回應:', res.data); // 檢查 roomId
            if (res.data.success && res.data.roomId) {
                router.push(`/chat/${res.data.roomId}`);
            } else {
                alert('接受失敗：' + (res.data.error || '未知錯誤'));
            }
        } catch (error) {
            console.error('接受錯誤:', error);
            alert('接受失敗，請稍後再試');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = async (requestId) => {
        setProcessingId(requestId);
        try {
            await chatAPI.declineFriendRequest(requestId);
            // 重新載入列表
            fetchRequests();
        } catch (error) {
            console.error(error);
            alert('拒絕失敗');
        } finally {
            setProcessingId(null);
        }
    };

const renderRequestItem = (item) => {

    let fixedAvatar = item.avatar || item.from_user?.avatar;

    if (fixedAvatar) {

        if (fixedAvatar.startsWith('/')) {
            fixedAvatar = `${API_URL}${fixedAvatar}`;
        }

        if (fixedAvatar.includes('localhost:3000')) {
            fixedAvatar = fixedAvatar.replace(/http:\/\/localhost:3000/g, API_URL);
        }

        if (fixedAvatar.includes('?')) {
            fixedAvatar = fixedAvatar.split('?')[0] + `?cb=${Date.now()}`;
        } else {
            fixedAvatar += `?cb=${Date.now()}`;
        }
    }

    return (
        <View key={item.id} style={styles.requestItem}>
            <View style={styles.avatarContainer}>
                {fixedAvatar ? (
                    <Image
                        source={{ uri: fixedAvatar }}
                        style={styles.avatar}
                        resizeMode="cover"
                        onError={(e) => console.log('頭像載入失敗:', fixedAvatar, e.nativeEvent)}
                    />
                ) : (
                    <View style={styles.defaultAvatar}>
                        <Text style={styles.avatarText}>
                            {item.username?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.username}>{item.username}</Text>
                {item.mbti && <Text style={styles.mbti}>{item.mbti}</Text>}
                <Text style={styles.time}>
                    {new Date(item.createdAt).toLocaleDateString('zh-TW')}
                </Text>
            </View>

            <View style={styles.buttonGroup}>
                <TouchableOpacity
                    style={[styles.acceptButton, processingId === item.id && styles.disabled]}
                    onPress={() => handleAccept(item.id, item.fromUserId)}
                    disabled={processingId === item.id}
                >
                    {processingId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.acceptText}>接受</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.declineButton, processingId === item.id && styles.disabled]}
                    onPress={() => handleDecline(item.id)}
                    disabled={processingId === item.id}
                >
                    <Text style={styles.declineText}>拒絕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

    return (
        <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.gradient}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                    </TouchableOpacity>
                    <Text style={styles.title}>好友請求</Text>
                    <View style={{ width: 40 }} />
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#f4c7ab" />
                    </View>
                ) : requests.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="bell-off-outline" size={80} color="#f4c7ab" />
                        <Text style={styles.emptyText}>目前沒有待處理的好友請求</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {requests.map(item => renderRequestItem(item))}
                    </ScrollView>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 10,
        backgroundColor: 'rgba(255, 250, 245, 0.6)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 199, 171, 0.3)',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(244, 199, 171, 0.25)',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#5c4033',
    },
    scrollContent: {
        padding: 20,
    },
    requestItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    avatarContainer: { marginRight: 16 },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#f4c7ab',
    },
    defaultAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f4c7ab',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#5c4033',
    },
    infoContainer: { flex: 1, justifyContent: 'center' },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: '#5c4033',
        marginBottom: 2,
    },
    mbti: {
        fontSize: 14,
        color: '#8b5e3c',
        marginBottom: 2,
    },
    time: {
        fontSize: 12,
        color: '#a0785e',
    },
    buttonGroup: {
        justifyContent: 'center',
        gap: 8,
    },
    acceptButton: {
        backgroundColor: '#2ecc71',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        alignItems: 'center',
        minWidth: 70,
    },
    declineButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        alignItems: 'center',
        minWidth: 70,
    },
    disabled: { opacity: 0.5 },
    acceptText: { color: '#fff', fontWeight: '600' },
    declineText: { color: '#fff', fontWeight: '600' },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#8b5e3c',
        textAlign: 'center',
        marginTop: 16,
    },
});