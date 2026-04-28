//app/scenario/template/[id].js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../../utils/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TemplateDetail() {
    const { id } = useLocalSearchParams();
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadTemplate();
    }, [id]);

    const loadTemplate = async () => {
        try {
            const res = await api.get(`/api/scenario/template/${id}`);
            if (res.data.success) {
                setTemplate(res.data.template);
            } else {
                Alert.alert('錯誤', '無法載入劇本');
            }
        } catch (error) {
            console.error('載入劇本模板失敗', error);
            Alert.alert('錯誤', '載入失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = () => {

        router.push(`/scenario/select-friend?templateId=${id}`);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#f4c7ab" />
            </View>
        );
    }

    if (!template) {
        return (
            <View style={styles.center}>
                <Text>劇本不存在</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                </TouchableOpacity>
                <Text style={styles.title}>{template.title}</Text>
                <TouchableOpacity onPress={handleInvite} style={styles.inviteButton}>
                    <MaterialCommunityIcons name="account-plus" size={28} color="#5c4033" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.description}>{template.description}</Text>
                {template.location_name && (
                    <Text style={styles.location}>📍 地點: {template.location_name}</Text>
                )}

                <Text style={styles.sectionTitle}>任務清單</Text>
                {template.tasks && template.tasks.length > 0 ? (
                    template.tasks.map((task, index) => (
                        <View key={index} style={styles.taskCard}>
                            <Text style={styles.taskIndex}>任務 {index + 1}</Text>
                            <Text style={styles.taskDesc}>{task.desc}</Text>
                            {task.type === 'code' && (
                                <View style={styles.codeBadge}>
                                    <MaterialCommunityIcons name="lock" size={16} color="#5c4033" />
                                    <Text style={styles.codeText}>暗號任務</Text>
                                </View>
                            )}
                            {task.type === 'gps' && (
                                <View style={styles.gpsBadge}>
                                    <MaterialCommunityIcons name="map-marker" size={16} color="#5c4033" />
                                    <Text style={styles.gpsText}>地點打卡</Text>
                                </View>
                            )}
                        </View>
                    ))
                ) : (
                    <Text style={styles.noTasks}>暫無任務</Text>
                )}
            </View>
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
    inviteButton: { padding: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#5c4033', flex: 1, textAlign: 'center' },
    content: { padding: 20 },
    description: { fontSize: 16, lineHeight: 24, color: '#5c4033', marginBottom: 12 },
    location: { fontSize: 14, color: '#f4c7ab', marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#5c4033', marginBottom: 16 },
    taskCard: {
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
    taskIndex: { fontSize: 14, fontWeight: '600', color: '#f4c7ab', marginBottom: 4 },
    taskDesc: { fontSize: 16, color: '#5c4033', marginBottom: 8, lineHeight: 22 },
    codeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    codeText: { fontSize: 12, color: '#5c4033', marginLeft: 4 },
    gpsBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    gpsText: { fontSize: 12, color: '#5c4033', marginLeft: 4 },
    noTasks: { textAlign: 'center', color: '#8b5e3c', marginTop: 20 },
});