import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../utils/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';



export default function SelectFriend() {
    const { templateId } = useLocalSearchParams();
    const [friends, setFriends] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
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
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await api.get(`/api/search-users?query=${encodeURIComponent(query)}`);
            setSearchResults(res.data.users || []);
        } catch (error) {
            console.error('搜尋用戶失敗', error);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        searchUsers(text);
    };

    const sendInvite = async (targetUserId) => {
        setSending(true);
        try {
            const res = await api.post('/api/scenario/invite', { targetUserId, templateId });
            if (res.data.success) {
                Alert.alert('邀請已發送', '等待對方接受邀請', [
                    { text: '確定', onPress: () => router.back() }
                ]);
            }
        } catch (error) {
            Alert.alert('錯誤', error.response?.data?.error || '發送失敗');
        } finally {
            setSending(false);
        }
    };

    const renderUserItem = ({ item }) => (
        <TouchableOpacity style={styles.userItem} onPress={() => sendInvite(item.id)} disabled={sending}>
            <MaterialCommunityIcons name="account-circle" size={40} color="#5c4033" />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.username}</Text>
                {item.mbti && <Text style={styles.userMbti}>{item.mbti}</Text>}
            </View>
        </TouchableOpacity>
    );

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
                <Text style={styles.headerTitle}>選擇朋友</Text>
                <View style={{ width: 28 }} />
            </View>

            <TextInput
                style={styles.searchInput}
                placeholder="搜尋用戶名稱或電郵..."
                value={searchQuery}
                onChangeText={handleSearch}
                clearButtonMode="while-editing"
            />

            <Text style={styles.sectionTitle}>我的好友</Text>
            {friends.length === 0 ? (
                <Text style={styles.emptyText}>暫無好友，可使用搜尋添加</Text>
            ) : (
                <FlatList
                    data={friends}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.list}
                />
            )}

            {searchResults.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>搜尋結果</Text>
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderUserItem}
                        contentContainerStyle={styles.list}
                    />
                </>
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
    searchInput: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 12,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#f4c7ab',
        fontSize: 16,
    },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#5c4033', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
    list: { paddingHorizontal: 16 },
    userItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    userInfo: { marginLeft: 12 },
    userName: { fontSize: 16, fontWeight: '600', color: '#5c4033' },
    userMbti: { fontSize: 12, color: '#8b5e3c', marginTop: 2 },
    emptyText: { textAlign: 'center', color: '#8b5e3c', marginTop: 20 },
});