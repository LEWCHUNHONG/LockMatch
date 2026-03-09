// app/native-test.js
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function NativeTest() {
    const router = useRouter();

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('需要位置權限', '請允許存取位置');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            Alert.alert('位置成功', `緯度: ${loc.coords.latitude}\n經度: ${loc.coords.longitude}`);
        } catch (error) {
            Alert.alert('錯誤', error.message);
        }
    };

    const getPushToken = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('需要推播權限', '請允許接收通知');
                return;
            }
            const token = (await Notifications.getExpoPushTokenAsync()).data;
            Alert.alert('推播 Token', token);
        } catch (error) {
            Alert.alert('錯誤', error.message);
        }
    };

    return (
        <LinearGradient colors={['#fffaf5', '#fff5ed', '#ffefe2', '#ffe8d6']} style={styles.gradient}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>原生模組測試</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.card}>
                        <Text style={styles.title}>Expo 原生模組終極測試</Text>

                        <TouchableOpacity style={styles.button} onPress={getLocation}>
                            <MaterialCommunityIcons name="map-marker" size={24} color="#5c4033" />
                            <Text style={styles.buttonText}>📡 獲取位置</Text>
                        </TouchableOpacity>

                        <View style={{ height: 20 }} />

                        <TouchableOpacity style={styles.button} onPress={getPushToken}>
                            <MaterialCommunityIcons name="bell" size={24} color="#5c4033" />
                            <Text style={styles.buttonText}>🔔 獲取推播 Token</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#5c4033',
    },
    content: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 32,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(244, 199, 171, 0.4)',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#5c4033',
        marginBottom: 30,
        textAlign: 'center',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f4c7ab',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 28,
        width: '100%',
        gap: 10,
        shadowColor: '#c47c5e',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    buttonText: {
        color: '#5c4033',
        fontSize: 18,
        fontWeight: '700',
    },
});