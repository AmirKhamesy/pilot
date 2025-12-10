import { useThemeColor } from '@/hooks/use-theme-color';
import { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import GitHubIntegration from './GitHubIntegration';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

export default function Account({ session }: { session: Session }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const surfaceColor = useThemeColor({}, 'surface');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const buttonPrimary = useThemeColor({}, 'buttonPrimary');
    const buttonDanger = useThemeColor({}, 'buttonDanger');

    const getProfile = useCallback(async () => {
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
    }, [session?.user]);

    useEffect(() => {
        if (session) getProfile();
    }, [session, getProfile]);

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
            <ThemedView style={[styles.loadingContainer, { backgroundColor }]}>
                <View style={[styles.loadingCard, { backgroundColor: cardColor }]}>
                    <ActivityIndicator size="large" color={tintColor} />
                    <ThemedText style={[styles.loadingText, { color: textSecondary }]}>Loading profile...</ThemedText>
                </View>
            </ThemedView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View style={styles.header}>
                    <View style={[styles.avatarContainer, { backgroundColor: cardColor }]}>
                        <View style={[styles.avatar, { backgroundColor: tintColor }]}>
                            <IconSymbol name="person.fill" size={32} color="#FFFFFF" />
                        </View>
                    </View>
                    <ThemedText type="title" style={[styles.title, { color: textColor }]}>
                        Profile
                    </ThemedText>
                    <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
                        Manage your account settings
                    </ThemedText>
                </View>

                <View style={[styles.card, { backgroundColor: cardColor }]}>
                    <ThemedText style={[styles.cardTitle, { color: textColor }]}>Account Information</ThemedText>

                    <View style={styles.formSection}>
                        <View style={styles.fieldContainer}>
                            <ThemedText style={[styles.label, { color: textColor }]}>Email Address</ThemedText>
                            <View style={[styles.inputWrapper, styles.disabledInput, {
                                backgroundColor: surfaceColor,
                                borderColor: borderColor
                            }]}>
                                <IconSymbol name="envelope" size={20} color={textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: textSecondary }]}
                                    value={session?.user?.email || ''}
                                    editable={false}
                                    placeholder="Email address"
                                    placeholderTextColor={textSecondary}
                                />
                                <IconSymbol name="lock" size={16} color={textSecondary} />
                            </View>
                            <ThemedText style={[styles.fieldHint, { color: textSecondary }]}>
                                Your email cannot be changed
                            </ThemedText>
                        </View>

                        <View style={styles.fieldContainer}>
                            <ThemedText style={[styles.label, { color: textColor }]}>Username</ThemedText>
                            <View style={[styles.inputWrapper, {
                                backgroundColor: surfaceColor,
                                borderColor: borderColor
                            }]}>
                                <IconSymbol name="person" size={20} color={iconColor} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: textColor }]}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Enter username"
                                    placeholderTextColor={textSecondary}
                                    autoCapitalize="none"
                                    maxLength={50}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <GitHubIntegration session={session} />

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton, { backgroundColor: buttonPrimary }]}
                        onPress={updateProfile}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <View style={styles.buttonContent}>
                                <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonLoader} />
                                <ThemedText style={styles.primaryButtonText}>Updating...</ThemedText>
                            </View>
                        ) : (
                            <ThemedText style={styles.primaryButtonText}>Update Profile</ThemedText>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.dangerButton, { backgroundColor: buttonDanger }]}
                        onPress={signOut}
                        activeOpacity={0.8}
                    >
                        <ThemedText style={styles.dangerButtonText}>Sign Out</ThemedText>
                    </TouchableOpacity>
                </View>

                <View style={[styles.accountInfoCard, { backgroundColor: cardColor }]}>
                    <View style={styles.accountInfoRow}>
                        <IconSymbol name="calendar" size={16} color={textSecondary} />
                        <ThemedText style={[styles.accountInfoText, { color: textSecondary }]}>
                            Member since {new Date(session?.user?.created_at || '').toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </ThemedText>
                    </View>
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
    loadingCard: {
        padding: 32,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 32,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    title: {
        marginBottom: 8,
        fontSize: 32,
        fontWeight: '700',
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '500',
    },
    card: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 20,
    },
    formSection: {
        gap: 20,
    },
    fieldContainer: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 16 : 14,
        minHeight: 52,
    },
    disabledInput: {
        opacity: 0.7,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        padding: 0,
    },
    fieldHint: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 4,
    },
    actionsContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
        gap: 12,
    },
    button: {
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
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
        justifyContent: 'center',
    },
    buttonLoader: {
        marginRight: 8,
    },
    buttonIcon: {
        marginRight: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    dangerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    accountInfoCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    accountInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    accountInfoText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    bottomSpacing: {
        height: 40,
    },
});