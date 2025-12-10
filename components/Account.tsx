import { useThemeColor } from '@/hooks/use-theme-color';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../lib/supabase';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

interface ProfileData {
    username?: string;
    avatar_url?: string;
}

export default function Account({ session }: { session: Session }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');

    useEffect(() => {
        if (session) getProfile();
    }, [session]);

    async function getProfile() {
        try {
            setLoading(true);
            if (!session?.user) throw new Error('No user on the session!');

            const { data, error, status } = await supabase
                .from('profiles')
                .select(`username, avatar_url`)
                .eq('id', session?.user.id)
                .single();

            if (error && status !== 406) {
                throw error;
            }

            if (data) {
                setUsername(data.username || '');
                setAvatarUrl(data.avatar_url || '');
            }
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert('Error', error.message);
            }
        } finally {
            setLoading(false);
        }
    }

    async function updateProfile() {
        try {
            setSaving(true);
            if (!session?.user) throw new Error('No user on the session!');

            const updates = {
                id: session?.user.id,
                username: username.trim(),
                avatar_url: avatarUrl,
                updated_at: new Date(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);

            if (error) {
                throw error;
            }

            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert('Error', error.message);
            }
        } finally {
            setSaving(false);
        }
    }

    async function signOut() {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => supabase.auth.signOut()
                }
            ]
        );
    }

    if (loading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={tintColor} />
                <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
            </ThemedView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { borderColor: tintColor }]}>
                            <IconSymbol name="person.fill" size={40} color={iconColor} />
                        </View>
                    </View>
                    <ThemedText type="title" style={styles.title}>Profile</ThemedText>
                    <ThemedText style={styles.subtitle}>Manage your account information</ThemedText>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.fieldContainer}>
                        <ThemedText style={styles.label}>Email Address</ThemedText>
                        <View style={[styles.inputWrapper, styles.disabledInput, { borderColor: iconColor + '30' }]}>
                            <IconSymbol name="envelope" size={20} color={iconColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: iconColor }]}
                                value={session?.user?.email || ''}
                                editable={false}
                                placeholder="Email address"
                                placeholderTextColor={iconColor}
                            />
                        </View>
                    </View>

                    <View style={styles.fieldContainer}>
                        <ThemedText style={styles.label}>Username</ThemedText>
                        <View style={[styles.inputWrapper, { borderColor: iconColor + '40' }]}>
                            <IconSymbol name="person" size={20} color={iconColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: textColor }]}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Enter username"
                                placeholderTextColor={iconColor}
                                autoCapitalize="none"
                                maxLength={50}
                            />
                        </View>
                    </View>


                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={updateProfile}
                        disabled={saving}
                    >
                        {saving ? (
                            <View style={styles.buttonContent}>
                                <ActivityIndicator size="small" color="#fff" style={styles.buttonLoader} />
                                <ThemedText style={[styles.buttonText, styles.primaryButtonText]}>Updating...</ThemedText>
                            </View>
                        ) : (
                            <ThemedText style={[styles.buttonText, styles.primaryButtonText]}>Update Profile</ThemedText>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.dangerButton]}
                        onPress={signOut}
                    >
                        <IconSymbol name="arrow.right.square" size={20} color="#fff" style={styles.buttonIcon} />
                        <ThemedText style={[styles.buttonText, styles.dangerButtonText]}>Sign Out</ThemedText>
                    </TouchableOpacity>
                </View>

                <View style={styles.accountInfo}>
                    <ThemedText style={styles.accountInfoText}>
                        Account created: {new Date(session?.user?.created_at || '').toLocaleDateString()}
                    </ThemedText>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 30,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    title: {
        marginBottom: 8,
    },
    subtitle: {
        opacity: 0.7,
        textAlign: 'center',
    },
    formContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    fieldContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    },
    disabledInput: {
        opacity: 0.6,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    actionsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 12,
    },
    primaryButton: {
        backgroundColor: '#007AFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    dangerButton: {
        backgroundColor: '#FF3B30',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonLoader: {
        marginRight: 8,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    primaryButtonText: {
        color: '#fff',
    },
    dangerButtonText: {
        color: '#fff',
    },
    accountInfo: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        alignItems: 'center',
    },
    accountInfoText: {
        fontSize: 12,
        opacity: 0.6,
        marginBottom: 4,
    },
});