// components/ScenarioAlert.js
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ScenarioAlert({
    visible,
    title,
    message,
    buttons = [],
    onClose,
    iconName = "alert-circle",
    iconColor = "#f39c12"
}) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.alertBox}>
                    <MaterialCommunityIcons 
                        name={iconName} 
                        size={48} 
                        color={iconColor} 
                        style={styles.icon}
                    />
                    
                    {title && <Text style={styles.title}>{title}</Text>}
                    {message && <Text style={styles.message}>{message}</Text>}

                    <View style={styles.buttonContainer}>
                        {buttons.map((btn, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    btn.style === 'cancel' && styles.cancelButton,
                                    btn.style === 'destructive' && styles.destructiveButton,
                                ]}
                                onPress={() => {
                                    btn.onPress?.();
                                    onClose();
                                }}
                            >
                                <Text style={[
                                    styles.buttonText,
                                    btn.style === 'cancel' && styles.cancelText,
                                ]}>
                                    {btn.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertBox: {
        backgroundColor: '#fffaf5',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        alignItems: 'center',
        shadowColor: '#8b5e3c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    icon: {
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#5c4033',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 16,
        color: '#8b5e3c',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        backgroundColor: '#f4c7ab',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    destructiveButton: {
        backgroundColor: '#e74c3c',
    },
    buttonText: {
        color: '#5c4033',
        fontWeight: '600',
        fontSize: 16,
    },
    cancelText: {
        color: '#5c4033',
    },
});