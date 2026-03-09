// app/chat/invites.js
import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { chatAPI, fixImageUrl } from '../../utils/api';

export default function Invites() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('friend'); // 'friend' 或 'group'
    const [friendRequests, setFriendRequests] = useState([]);
    const [groupInvites, setGroupInvites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'friend') {
                const res = await chatAPI.getPendingRequests();
                setFriendRequests(res.data.requests || []);
            } else {
                const res = await chatAPI.getPendingGroupInvites();
                console.log('群組邀請原始數據:', res.data);
                setGroupInvites(res.data.invites || []);
            }
        } catch (error) {
            console.error(`載入${activeTab === 'friend' ? '好友請求' : '群組邀請'}失敗:`, error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptFriend = async (requestId) => {
        setProcessingId(requestId);
        try {
            const res = await chatAPI.acceptFriendRequest(requestId);
            if (res.data.success) {
                if (res.data.roomId) {
                    router.push(`/chat/${res.data.roomId}`);
                } else {
                    loadData();
                }
            }
        } catch (error) {
            alert('接受失敗');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectFriend = async (requestId) => {
        setProcessingId(requestId);
        try {
            await chatAPI.declineFriendRequest(requestId);
            loadData();
        } catch (error) {
            alert('拒絕失敗');
        } finally {
            setProcessingId(null);
        }
    };

    const handleAcceptGroup = async (inviteId) => {
        setProcessingId(inviteId);
        try {
            const res = await chatAPI.acceptGroupInvite(inviteId);
            if (res.data.success) {
                router.push(`/chat/${res.data.groupId}`);
            }
        } catch (error) {
            alert('接受失敗');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectGroup = async (inviteId) => {
        setProcessingId(inviteId);
        try {
            await chatAPI.rejectGroupInvite(inviteId);
            loadData();
        } catch (error) {
            alert('拒絕失敗');
        } finally {
            setProcessingId(null);
        }
    };

    const renderFriendItem = ({ item }) => (
        <View style={styles.item}>
            <Image source={{ uri: fixImageUrl(item.avatar) }} style={styles.avatar} />
            <View style={styles.info}>
                <Text style={styles.name}>{item.username}</Text>
                <Text style={styles.mbti}>{item.mbti}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.acceptButton, processingId === item.id && styles.disabled]}
                    onPress={() => handleAcceptFriend(item.id)}
                    disabled={processingId === item.id}
                >
                    {processingId === item.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>接受</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.rejectButton, processingId === item.id && styles.disabled]}
                    onPress={() => handleRejectFriend(item.id)}
                    disabled={processingId === item.id}
                >
                    <Text style={styles.rejectText}>拒絕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderGroupItem = ({ item }) => (
        <View style={styles.item}>
            <View style={styles.groupIcon}>
                <MaterialCommunityIcons name="account-group" size={40} color="#5c4033" />
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.groupName}</Text>
                <Text style={styles.mbti}>邀請人: {item.fromUsername}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.acceptButton, processingId === item.id && styles.disabled]}
                    onPress={() => handleAcceptGroup(item.id)}
                    disabled={processingId === item.id}
                >
                    {processingId === item.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>接受</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.rejectButton, processingId === item.id && styles.disabled]}
                    onPress={() => handleRejectGroup(item.id)}
                    disabled={processingId === item.id}
                >
                    <Text style={styles.rejectText}>拒絕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color="#5c4033" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>邀請與請求</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'friend' && styles.activeTab]}
                        onPress={() => setActiveTab('friend')}
                    >
                        <Text style={[styles.tabText, activeTab === 'friend' && styles.activeTabText]}>好友請求</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'group' && styles.activeTab]}
                        onPress={() => setActiveTab('group')}
                    >
                        <Text style={[styles.tabText, activeTab === 'group' && styles.activeTabText]}>群組邀請</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#f4c7ab" />
                    </View>
                ) : (
                    <FlatList
                        data={activeTab === 'friend' ? friendRequests : groupInvites}
                        renderItem={activeTab === 'friend' ? renderFriendItem : renderGroupItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <MaterialCommunityIcons name="bell-off-outline" size={60} color="#f4c7ab" />
                                <Text style={styles.emptyText}>暫無待處理</Text>
                            </View>
                        }
                    />
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
        paddingBottom: 12,
        backgroundColor: 'rgba(255, 250, 245, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 199, 171, 0.3)',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(244, 199, 171, 0.25)',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033' },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginVertical: 16,
        gap: 12,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(244, 199, 171, 0.2)',
    },
    activeTab: { backgroundColor: '#f4c7ab' },
    tabText: { fontSize: 16, fontWeight: '600', color: '#8b5e3c' },
    activeTabText: { color: '#5c4033' },
    list: { paddingHorizontal: 20, paddingBottom: 20 },
    item: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(244, 199, 171, 0.3)',
    },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
    groupIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(244, 199, 171, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#5c4033' },
    mbti: { fontSize: 14, color: '#8b5e3c', marginTop: 2 },
    actions: { flexDirection: 'row', gap: 8 },
    acceptButton: {
        backgroundColor: '#2ecc71',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    rejectButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    buttonText: { color: '#fff', fontWeight: '600' },
    rejectText: { color: '#fff', fontWeight: '600' },
    disabled: { opacity: 0.5 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: '#8b5e3c', marginTop: 12 },
});