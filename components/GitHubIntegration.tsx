import { useThemeColor } from '@/hooks/use-theme-color';
import { githubService } from '@/lib/github';
import { GitHubConnection } from '@/types/github';
import { Session } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

interface GitHubIntegrationProps {
    session: Session;
}

export default function GitHubIntegration({ session }: GitHubIntegrationProps) {
    const [connection, setConnection] = useState<GitHubConnection | null>(null);
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);

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
    const successColor = useThemeColor({}, 'success');

    const loadConnection = useCallback(async () => {
        if (!session?.user?.id) return;

        try {
            setLoading(true);
            const existingConnection = await githubService.getConnection(session.user.id);
            setConnection(existingConnection);
        } catch (error) {
            console.error('Error loading GitHub connection:', error);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id]);

    useEffect(() => {
        loadConnection();
    }, [loadConnection]);

    const connectToGitHub = async () => {
        if (!session?.user?.id) return;

        try {
            setConnecting(true);

            const result = await githubService.startOAuthFlow();

            if (result.type === 'success' && result.params?.code) {
                console.log('OAuth success, received code:', result.params.code);

                const tokens = await githubService.exchangeCodeForToken(result.params.code);
                console.log('Successfully received tokens');

                const githubUser = await githubService.getUser(tokens.access_token);
                console.log('Successfully fetched GitHub user:', githubUser.login);

                const savedConnection = await githubService.saveConnection(
                    session.user.id,
                    tokens,
                    githubUser
                );

                setConnection(savedConnection);

                Alert.alert(
                    'Success!',
                    `Successfully connected to GitHub as ${githubUser.login}`,
                    [{ text: 'OK', onPress: () => { } }]
                );
            } else if (result.type === 'cancel') {
                console.log('GitHub OAuth cancelled by user');
            } else {
                console.log('OAuth result:', result);
                throw new Error(`OAuth flow failed: ${result.type}`);
            }
        } catch (error) {
            console.error('Error connecting to GitHub:', error);
            Alert.alert(
                'Connection Failed',
                error instanceof Error ? error.message : 'Failed to connect to GitHub. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setConnecting(false);
        }
    };

    const disconnectFromGitHub = async () => {
        if (!session?.user?.id) return;

        Alert.alert(
            'Disconnect GitHub',
            'Are you sure you want to disconnect your GitHub account? This will remove access to your repositories.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await githubService.removeConnection(session.user.id);
                            setConnection(null);
                        } catch (error) {
                            console.error('Error disconnecting GitHub:', error);
                            Alert.alert('Error', 'Failed to disconnect GitHub account');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };



    if (loading) {
        return (
            <View style={[styles.card, { backgroundColor: cardColor }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={tintColor} />
                    <ThemedText style={[styles.loadingText, { color: textSecondary }]}>Loading GitHub connection...</ThemedText>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
                <View style={styles.headerContent}>
                    <View style={[styles.iconContainer, { backgroundColor: buttonPrimary }]}>
                        <IconSymbol name="globe" size={20} color="#FFFFFF" />
                    </View>
                    <View>
                        <ThemedText style={[styles.cardTitle, { color: textColor }]}>Connections</ThemedText>
                        <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
                            {connection ? 'GitHub connected' : 'No connections'}
                        </ThemedText>
                    </View>
                </View>
                {connection && (
                    <View style={[styles.statusBadge, { backgroundColor: successColor }]}>
                        <IconSymbol name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                )}
            </View>

            {!connection ? (
                <View style={styles.connectSection}>
                    <ThemedText style={[styles.description, { color: textSecondary }]}>
                        Link your GitHub account to seamlessly import and manage your repositories as projects.
                    </ThemedText>

                    <TouchableOpacity
                        style={[styles.connectButton, { backgroundColor: buttonPrimary }]}
                        onPress={connectToGitHub}
                        disabled={connecting}
                        activeOpacity={0.8}
                    >
                        {connecting ? (
                            <View style={styles.buttonContent}>
                                <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonLoader} />
                                <ThemedText style={styles.connectButtonText}>Connecting...</ThemedText>
                            </View>
                        ) : (
                            <View style={styles.buttonContent}>
                                <IconSymbol name="link" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                                <ThemedText style={styles.connectButtonText}>Connect to GitHub</ThemedText>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.connectedSection}>
                    <View style={[styles.connectionCard, { backgroundColor: surfaceColor, borderColor: borderColor }]}>
                        <View style={styles.connectionHeader}>
                            <View style={styles.connectionInfo}>
                                <View style={[styles.avatarContainer, { backgroundColor: buttonPrimary }]}>
                                    <IconSymbol name="person.fill" size={16} color="#FFFFFF" />
                                </View>
                                <View style={styles.connectionDetails}>
                                    <ThemedText style={[styles.githubUsername, { color: textColor }]}>
                                        @{connection.github_username}
                                    </ThemedText>
                                    <ThemedText style={[styles.connectionDate, { color: textSecondary }]}>
                                        Connected {new Date(connection.connected_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </ThemedText>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.disconnectButton, { backgroundColor: buttonDanger + '20' }]}
                                onPress={disconnectFromGitHub}
                                activeOpacity={0.7}
                            >
                                <IconSymbol name="xmark" size={14} color={buttonDanger} />
                            </TouchableOpacity>
                        </View>
                    </View>


                </View>
            )}


        </View>
    );
}

const styles = StyleSheet.create({
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
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    statusBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '500',
    },
    connectSection: {
        gap: 20,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
    },
    connectButton: {
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
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
    connectButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    connectedSection: {
        gap: 20,
    },
    connectionCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    connectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    connectionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    connectionDetails: {
        flex: 1,
    },
    githubUsername: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    connectionDate: {
        fontSize: 13,
        fontWeight: '500',
    },
    disconnectButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },

});
