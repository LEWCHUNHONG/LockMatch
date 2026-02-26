import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import api from '../../utils/api';

export default function CouponDetail() {
    const { id } = useLocalSearchParams();
    const [coupon, setCoupon] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadCoupon();
    }, []);

    const loadCoupon = async () => {
        try {
            const res = await api.get(`/api/coupon/${id}`);
            if (res.data.success) {
                setCoupon(res.data.coupon);
            }
        } catch (error) {
            Alert.alert('錯誤', '無法載入優惠券');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#f4c7ab" />
            </SafeAreaView>
        );
    }

    if (!coupon) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>優惠券不存在</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#5c4033" />
                </TouchableOpacity>
                <Text style={styles.title}>優惠券詳情</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <Image
                    source={{ uri: `${api.defaults.baseURL}${coupon.image_url}` }}
                    style={styles.couponImage}
                />
                <Text style={styles.couponName}>{coupon.name}</Text>
                <Text style={styles.couponDesc}>{coupon.description}</Text>

                <View style={styles.qrSection}>
                    <Text style={styles.qrLabel}>兌換二維碼</Text>
                    <View style={styles.qrWrapper}>
                        <QRCode
                            value={coupon.qr_code_data || coupon.coupon_code}
                            size={200}
                            color="#5c4033"
                            backgroundColor="#fff"
                        />
                    </View>
                    <Text style={styles.couponCode}>優惠碼: {coupon.coupon_code}</Text>
                    <Text style={styles.tip}>向店員展示此二維碼或輸入優惠碼</Text>
                </View>

                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="information" size={20} color="#f4c7ab" />
                    <Text style={styles.infoText}>此券有效期至 {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : '長期有效'}</Text>
                </View>
            </View>
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
    content: { padding: 20, alignItems: 'center' },
    couponImage: { width: 120, height: 120, borderRadius: 12, marginBottom: 16 },
    couponName: { fontSize: 24, fontWeight: '700', color: '#5c4033', marginBottom: 8 },
    couponDesc: { fontSize: 16, color: '#8b5e3c', textAlign: 'center', marginBottom: 24 },
    qrSection: { alignItems: 'center', marginBottom: 20 },
    qrLabel: { fontSize: 16, fontWeight: '600', color: '#5c4033', marginBottom: 12 },
    qrWrapper: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    couponCode: { fontSize: 14, color: '#f4c7ab', fontWeight: '600', marginTop: 12 },
    tip: { fontSize: 12, color: '#8b5e3c', marginTop: 4 },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(244,199,171,0.2)',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
    },
    infoText: { marginLeft: 8, fontSize: 14, color: '#5c4033', flex: 1 },
});