import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api, { socketAPI } from '../../utils/api';

export default function TempChatRoom() {
    const { id: roomId, otherUserId } = useLocalSearchParams();
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [otherUser, setOtherUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socketReady, setSocketReady] = useState(false);
    const flatListRef = useRef();

    // 獲取對方資料
    useEffect(() => {
        const fetchOtherUser = async () => {
            try {
                const res = await api.get(`/api/user/${otherUserId}`);
                if (res.data.success) {
                    setOtherUser(res.data.user);
                }
            } catch (error) {
                console.error('獲取用戶資料失敗:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOtherUser();
    }, [otherUserId]);

    // 確保 socket 已連接
    useEffect(() => {
        const checkSocket = async () => {
            let socket = socketAPI.getSocket();
            if (!socket || !socket.connected) {
                console.log('🔄 Socket 未連接，嘗試初始化...');
                socket = await socketAPI.initSocket();
            }
            if (socket && socket.connected) {
                setSocketReady(true);
                console.log('✅ Socket 已連接，準備加入房間');
            } else {
                console.log('❌ Socket 仍然未連接');
            }
        };
        checkSocket();
    }, []);

    // Socket 監聽
    useEffect(() => {
        if (!socketReady) return;

        const socket = socketAPI.getSocket();
        if (!socket) return;

        // 加入房間
        socket.emit('join-room', roomId);
        console.log(`📡 已發送 join-room: ${roomId}`);

        const handleNewMessage = (message) => {
            console.log('📥 收到新消息:', message);
            setMessages(prev => [...prev, message]);
        };

        const handleChatEnded = () => {
            Alert.alert('聊天已結束', '已達10句對話上限，將返回主頁', [
                { text: '確定', onPress: () => router.replace('/dashboard') }
            ]);
        };

        socket.on('temp-chat-message', handleNewMessage);
        socket.on('temp-chat-ended', handleChatEnded);

        return () => {
            socket.off('temp-chat-message', handleNewMessage);
            socket.off('temp-chat-ended', handleChatEnded);
            socket.emit('leave-room', roomId);
        };
    }, [socketReady, roomId]);

    // 發送消息
    const sendMessage = () => {
        if (!inputText.trim()) return;

        const socket = socketAPI.getSocket();
        if (!socket || !socket.connected) {
            Alert.alert('錯誤', 'Socket 未連接，請稍後再試');
            return;
        }

        console.log('📤 發送消息:', { roomId, content: inputText.trim() });

        // 立即顯示自己的消息
        const tempMessage = {
            id: Date.now(),
            roomId,
            senderId: socket.userId,
            senderUsername: '我',
            content: inputText.trim(),
            createdAt: new Date(),
            message_type: 'text',
        };
        setMessages(prev => [...prev, tempMessage]);
        setInputText('');

        socket.emit('temp-chat-message', { roomId, content: tempMessage.content });
    };

    const renderMessage = ({ item }) => {
        const isMine = item.senderId === socketAPI.getSocket()?.userId;
        return (
            <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.otherMessageRow]}>
                <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.otherBubble]}>
                    <Text style={styles.messageText}>{item.content}</Text>
                </View>
            </View>
        );
    };

    if (loading || !socketReady) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#f4c7ab" />
                <Text style={styles.loadingText}>
                    {!socketReady ? '連接中...' : '載入中...'}
                </Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* 頂部標題列 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('對方資料', `MBTI: ${otherUser?.mbti || '未知'}`)}>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{otherUser?.username}</Text>
                        {otherUser?.mbti && (
                            <Text style={styles.userMbti}>{otherUser.mbti}</Text>
                        )}
                    </View>
                </TouchableOpacity>
                <View style={{ width: 28 }} />
            </View>

            {/* 消息列表 */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            {/* 輸入區 */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={80}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="輸入訊息..."
                        multiline
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                        <MaterialCommunityIcons name="send" size={24} color="#f4c7ab" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fffaf5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 16, color: '#8b5e3c' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244,199,171,0.3)',
    },
    backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(244,199,171,0.25)' },
    userInfo: { alignItems: 'center' },
    userName: { fontSize: 18, fontWeight: '700', color: '#5c4033' },
    userMbti: { fontSize: 14, color: '#8b5e3c', marginTop: 2 },
    messagesList: { padding: 20 },
    messageRow: { marginBottom: 12, flexDirection: 'row' },
    myMessageRow: { justifyContent: 'flex-end' },
    otherMessageRow: { justifyContent: 'flex-start' },
    messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 20 },
    myBubble: { backgroundColor: '#f4c7ab' },
    otherBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f4c7ab' },
    messageText: { fontSize: 16, color: '#5c4033' },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: 'rgba(244,199,171,0.3)',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f4c7ab',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        fontSize: 16,
    },
    sendButton: { padding: 8 },
});