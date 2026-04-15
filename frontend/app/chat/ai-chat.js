//app/chat/ai-chat.js
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import api from '../../utils/api';

export default function AiChat() {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Modal 狀態
    const [modalVisible, setModalVisible] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalButtons, setModalButtons] = useState([]);

    const flatListRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await api.get('/api/ai-chat/history');
            if (response.data.success) {
                const history = response.data.history.map(item => ({
                    id: item.id.toString(),
                    role: item.role,
                    content: item.content,
                    created_at: item.created_at,
                }));
                setMessages(history);
            }
        } catch (error) {
            console.error('❌ 載入歷史失敗:', error);
        } finally {
            setLoadingHistory(false);
            setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
        }
    };

    // 顯示自訂 Modal
    const showModal = (title, message, buttons) => {
        setModalTitle(title);
        setModalMessage(message);
        setModalButtons(buttons);
        setModalVisible(true);
    };

    const sendMessage = async () => {
        if (!inputText.trim() || loading) return;

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText.trim(),
            created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        const sentContent = inputText.trim();
        setInputText('');
        setLoading(true);

        try {
            const response = await api.post('/api/ai-chat/message', {
                message: sentContent
            });

            if (response.data.success) {
                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.data.response,
                    created_at: new Date().toISOString(),
                };
                setMessages(prev => [...prev, aiMessage]);
            }
        } catch (error) {
            const statusCode = error.response?.status;

            if (statusCode === 400) {
                const errorMsg = error.response?.data?.error || '您的訊息含有不當內容，請重新輸入';
                
                showModal(
                    '訊息被拒絕',
                    errorMsg,
                    [
                        { 
                            text: '重新輸入', 
                            onPress: () => setInputText(sentContent) 
                        }
                    ]
                );

                // 移除失敗的用戶訊息
                setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
            } else {
                console.error('❌ 發送失敗:', error);
                let errorMessage = '發送失敗，請稍後再試';
                if (statusCode === 500) errorMessage = '伺服器錯誤，請稍後再試';
                else if (statusCode === 503) errorMessage = 'AI 服務暫時不可用，請稍後再試';

                showModal(
                    '錯誤',
                    errorMessage,
                    [{ text: '確定' }]
                );

                setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
            }
        } finally {
            setLoading(false);
        }
    };

    const renderMessage = ({ item }) => (
        <View style={[
            styles.messageRow,
            item.role === 'user' ? styles.userRow : styles.aiRow
        ]}>
            {item.role === 'assistant' && (
                <View style={styles.aiAvatar}>
                    <MaterialCommunityIcons name="robot-happy" size={20} color="#fff" />
                </View>
            )}

            <View style={[
                styles.messageBubble,
                item.role === 'user' ? styles.userBubble : styles.aiBubble
            ]}>
                <Text style={[
                    styles.messageText,
                    item.role === 'user' && styles.userMessageText,
                    { flexShrink: 1, flexWrap: 'wrap' }
                ]}>
                    {item.content}
                </Text>
                <Text style={styles.messageTime}>
                    {new Date(item.created_at).toLocaleTimeString('zh-HK', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </Text>
            </View>

            {item.role === 'user' && (
                <View style={styles.userAvatar}>
                    <MaterialCommunityIcons name="account" size={20} color="#8b5e3c" />
                </View>
            )}
        </View>
    );

    return (
        <LinearGradient colors={['#fffaf5', '#fff5ed']} style={styles.gradient}>
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#5c4033" />
                    </TouchableOpacity>
                    <View style={styles.headerTitle}>
                        <MaterialCommunityIcons name="robot-happy" size={28} color="#8e44ad" />
                        <Text style={styles.headerText}>AI 聊天助手</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {loadingHistory ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#8e44ad" />
                        <Text style={styles.loadingText}>載入對話記錄...</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.messagesList}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="robot-happy" size={80} color="#f4c7ab" />
                                <Text style={styles.emptyTitle}>AI 聊天助手</Text>
                                <Text style={styles.emptyText}>
                                    開始與 AI 對話吧！{'\n'}
                                    隨便問我乜嘢都得
                                </Text>
                            </View>
                        }
                    />
                )}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="輸入訊息..."
                            placeholderTextColor="#c4a29e"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                            editable={!loading}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                (!inputText.trim() || loading) && styles.sendButtonDisabled
                            ]}
                            onPress={sendMessage}
                            disabled={!inputText.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <MaterialCommunityIcons name="send" size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

{/* 自訂 Modal */}
<Modal
    animationType="fade"
    transparent={true}
    visible={modalVisible}
    onRequestClose={() => setModalVisible(false)}
>
    <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setModalVisible(false)}
    >
        <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {}}
        >
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <View style={styles.modalButtonContainer}>
                {modalButtons.map((button, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.modalButton,
                            index === modalButtons.length - 1 && styles.modalButtonPrimary
                        ]}
                        onPress={() => {
                            setModalVisible(false);
                            button.onPress?.();
                        }}
                    >
                        <Text style={[
                            styles.modalButtonText,
                            index === modalButtons.length - 1 && styles.modalButtonPrimaryText
                        ]}>
                            {button.text}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </TouchableOpacity>
    </TouchableOpacity>
</Modal>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 199, 171, 0.3)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#5c4033',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#8b5e3c',
    },
    messagesList: {
        padding: 16,
        paddingBottom: 20,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
    },
    userRow: {
        justifyContent: 'flex-end',
    },
    aiRow: {
        justifyContent: 'flex-start',
    },
    aiAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#8e44ad',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f4c7ab',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    messageBubble: {
        maxWidth: '85%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    userBubble: {
        backgroundColor: '#f4c7ab',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f0d9cc',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        color: '#5c4033',
        lineHeight: 22,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    userMessageText: {
        color: '#fff',
    },
    messageTime: {
        fontSize: 11,
        color: '#8b5e3c',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#5c4033',
        marginTop: 20,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        color: '#8b5e3c',
        textAlign: 'center',
        lineHeight: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: 'rgba(244, 199, 171, 0.3)',
    },
    input: {
        flex: 1,
        backgroundColor: '#fff5f0',
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 12,
        maxHeight: 100,
        fontSize: 16,
        color: '#5c4033',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#f4c7ab',
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#8e44ad',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#d4b5a0',
    },

    // ==================== Modal 樣式 ====================
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#5c4033',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 16,
        color: '#8b5e3c',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 28,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f4c7ab',
        alignItems: 'center',
    },
    modalButtonPrimary: {
        backgroundColor: '#8e44ad',
        borderColor: '#8e44ad',
    },
    modalButtonText: {
        fontSize: 16,
        color: '#8e44ad',
        fontWeight: '600',
    },
    modalButtonPrimaryText: {
        color: '#fff',
    },
});