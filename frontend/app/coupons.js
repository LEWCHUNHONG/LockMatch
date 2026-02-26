import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../utils/api';

export default function MyCouponsScreen() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadCoupons();
    }, []);

    const loadCoupons = async () => {
        try {
            const res = await api.get('/api/user-coupons');
            if (res.data.success) {
                setCoupons(res.data.coupons);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderCoupon = ({ item }) => (
        <TouchableOpacity style={styles.couponCard} onPress={() => router.push(`/coupon/${item.id}`)}>
            <Image source={{ uri: `${api.defaults.baseURL}${item.image_url}` }} style={styles.couponImage} />
            <View style={styles.couponInfo}>
                <Text style={styles.couponName}>{item.name}</Text>
                <Text style={styles.couponDesc} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.couponCode}>優惠碼: {item.coupon_code}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#5c4033" />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#f4c7ab" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                </TouchableOpacity>
                <Text style={styles.title}>我的優惠券</Text>
                <View style={{ width: 28 }} />
            </View>

            {coupons.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="ticket-outline" size={60} color="#f4c7ab" />
                    <Text style={styles.emptyText}>暫無優惠券</Text>
                    <Text style={styles.emptySubText}>去積分商店兌換吧！</Text>
                    <TouchableOpacity style={styles.goShopButton} onPress={() => router.push('/rewards')}>
                        <Text style={styles.goShopText}>前往商店</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList data={coupons} keyExtractor={(item) => item.id.toString()} renderItem={renderCoupon} contentContainerStyle={styles.list} />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fffaf5' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 10,
    },
    title: { fontSize: 22, fontWeight: '700', color: '#5c4033' },
    list: { padding: 16 },
    couponCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    couponImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
    couponInfo: { flex: 1 },
    couponName: { fontSize: 16, fontWeight: '700', color: '#5c4033', marginBottom: 4 },
    couponDesc: { fontSize: 13, color: '#8b5e3c', marginBottom: 6 },
    couponCode: { fontSize: 12, color: '#f4c7ab', fontWeight: '600' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { fontSize: 18, fontWeight: '700', color: '#5c4033', marginTop: 16 },
    emptySubText: { fontSize: 14, color: '#8b5e3c', marginTop: 8, marginBottom: 20 },
    goShopButton: { backgroundColor: '#f4c7ab', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20 },
    goShopText: { color: '#5c4033', fontWeight: '600' },
});