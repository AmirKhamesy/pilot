import React, { useState } from 'react';
import { Alert, AppState, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { supabase } from '../lib/supabase';

AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) Alert.alert(error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) Alert.alert(error.message);
        if (!session) Alert.alert('Please check your inbox for email verification!');
        setLoading(false);
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <Text style={[styles.title, isDark && styles.titleDark]}>Welcome</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    onChangeText={(text) => setEmail(text)}
                    value={email}
                    placeholder="email@address.com"
                    placeholderTextColor={isDark ? '#888' : '#999'}
                    autoCapitalize={'none'}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    importantForAutofill="yes"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputContainer}>
                <TextInput
                    style={[styles.input, isDark && styles.inputDark]}
                    onChangeText={(text) => setPassword(text)}
                    value={password}
                    secureTextEntry={true}
                    placeholder="Password"
                    placeholderTextColor={isDark ? '#888' : '#999'}
                    autoCapitalize={'none'}
                    textContentType="password"
                    autoComplete="current-password"
                    importantForAutofill="yes"
                    returnKeyType="done"
                />
            </View>
            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                disabled={loading}
                onPress={() => signInWithEmail()}
            >
                <Text style={styles.buttonText}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.buttonOutline, loading && styles.buttonDisabled]}
                disabled={loading}
                onPress={() => signUpWithEmail()}
            >
                <Text style={[styles.buttonText, styles.buttonOutlineText]}>Sign up</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    containerDark: {
        backgroundColor: '#000',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
        color: '#000',
    },
    titleDark: {
        color: '#fff',
    },
    inputContainer: {
        marginBottom: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        borderRadius: 8,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#000',
    },
    inputDark: {
        borderColor: '#444',
        backgroundColor: '#222',
        color: '#fff',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    buttonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonOutlineText: {
        color: '#007AFF',
    },
});