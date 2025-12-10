import { Session } from '@supabase/supabase-js';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { projectService } from '@/lib/project';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/project';
import ProjectHeader from '@/components/ProjectHeader';

export default function ProjectDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [session, setSession] = useState<Session | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    const iconColor = useThemeColor({}, 'icon');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const surfaceColor = useThemeColor({}, 'surface');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const buttonPrimary = useThemeColor({}, 'buttonPrimary');
    const successColor = useThemeColor({}, 'success');
    const buttonDanger = useThemeColor({}, 'buttonDanger');

    const loadProject = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            const projectData = await projectService.getProject(id);

            if (!projectData) {
                Alert.alert('Error', 'Project not found', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
                return;
            }

            setProject(projectData);
        } catch (error) {
            console.error('Error loading project:', error);
            Alert.alert('Error', 'Failed to load project', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session && id) {
                loadProject();
            } else {
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session && id) {
                loadProject();
            } else {
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [id, loadProject]);

    const handleOpenRepository = useCallback(() => {
        if (project?.github_repo_url) {
            Linking.openURL(project.github_repo_url);
        }
    }, [project]);

    const handleViewIssues = useCallback(() => {
        if (project?.github_repo_full_name) {
            const [owner, repo] = project.github_repo_full_name.split('/');
            router.push({
                pathname: '/project/issues',
                params: {
                    owner,
                    repo,
                    projectId: id,
                },
            });
        }
    }, [project, id]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={tintColor} />
                    <ThemedText style={[styles.loadingText, { color: textSecondary }]}>Loading project...</ThemedText>
                </View>
            </SafeAreaView>
        );
    }

    if (!session) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.emptyContainer}>
                    <IconSymbol name="person.fill.xmark" size={64} color={textSecondary} />
                    <ThemedText type="title" style={[styles.emptyTitle, { color: textColor }]}>
                        Sign In Required
                    </ThemedText>
                    <ThemedText style={[styles.emptyDescription, { color: textSecondary }]}>
                        Please sign in to view project details
                    </ThemedText>
                </View>
            </SafeAreaView>
        );
    }

    if (!project) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.emptyContainer}>
                    <IconSymbol name="folder.fill.badge.questionmark" size={64} color={textSecondary} />
                    <ThemedText type="title" style={[styles.emptyTitle, { color: textColor }]}>
                        Project Not Found
                    </ThemedText>
                    <ThemedText style={[styles.emptyDescription, { color: textSecondary }]}>
                        The project you&apos;re looking for doesn&apos;t exist
                    </ThemedText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <ProjectHeader
                showBack
                title={project.name}
                iconName="folder.fill"
                url={project.github_repo_url}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {project.description && (
                    <View style={[styles.descriptionCard, { backgroundColor: cardColor, borderColor }]}>
                        <ThemedText style={[styles.descriptionText, { color: textColor }]}>
                            {project.description}
                        </ThemedText>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.actionsCard, { backgroundColor: tintColor, borderColor: tintColor }]}
                    onPress={handleViewIssues}
                    activeOpacity={0.8}
                >
                    <View style={styles.actionContent}>
                        <IconSymbol name="exclamationmark.circle" size={24} color="#FFFFFF" />
                        <ThemedText style={styles.actionButtonText}>
                            View Issues
                        </ThemedText>
                        <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>

                <View style={[styles.infoCard, { backgroundColor: cardColor, borderColor }]}>
                    <View style={styles.infoHeader}>
                        <ThemedText type="defaultSemiBold" style={[styles.infoTitle, { color: textColor }]}>
                            Repository Information
                        </ThemedText>
                    </View>

                    <View style={styles.infoContent}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <IconSymbol name="link" size={16} color={iconColor} />
                                <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Repository</ThemedText>
                            </View>
                            <ThemedText style={[styles.infoValue, { color: textColor }]}>
                                {project.github_repo_full_name}
                            </ThemedText>
                        </View>

                        {project.github_repo_language && (
                            <View style={styles.infoRow}>
                                <View style={styles.infoItem}>
                                    <IconSymbol name="circle.fill" size={16} color={tintColor} />
                                    <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Language</ThemedText>
                                </View>
                                <ThemedText style={[styles.infoValue, { color: textColor }]}>
                                    {project.github_repo_language}
                                </ThemedText>
                            </View>
                        )}

                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <IconSymbol
                                    name={project.github_repo_private ? "lock.fill" : "globe"}
                                    size={16}
                                    color={project.github_repo_private ? buttonDanger : successColor}
                                />
                                <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Visibility</ThemedText>
                            </View>
                            <View style={[styles.visibilityBadge, {
                                backgroundColor: project.github_repo_private ? buttonDanger + '20' : successColor + '20'
                            }]}>
                                <ThemedText style={[styles.visibilityText, {
                                    color: project.github_repo_private ? buttonDanger : successColor
                                }]}>
                                    {project.github_repo_private ? 'Private' : 'Public'}
                                </ThemedText>
                            </View>
                        </View>

                        {project.github_repo_updated_at && (
                            <View style={styles.infoRow}>
                                <View style={styles.infoItem}>
                                    <IconSymbol name="arrow.clockwise" size={16} color={iconColor} />
                                    <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Last Updated</ThemedText>
                                </View>
                                <ThemedText style={[styles.infoValue, { color: textColor }]}>
                                    {formatDate(project.github_repo_updated_at)}
                                </ThemedText>
                            </View>
                        )}

                        {project.github_repo_description && (
                            <View style={styles.infoRow}>
                                <View style={styles.infoItem}>
                                    <IconSymbol name="text.alignleft" size={16} color={iconColor} />
                                    <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>Description</ThemedText>
                                </View>
                            </View>
                        )}
                        {project.github_repo_description && (
                            <ThemedText style={[styles.repoDescription, { color: textColor }]}>
                                {project.github_repo_description}
                            </ThemedText>
                        )}
                    </View>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '600',
        marginTop: 24,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
    },
    projectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
    },
    projectIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    projectTitleSection: {
        flex: 1,
    },
    projectTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    projectRepo: {
        fontSize: 15,
    },
    descriptionCard: {
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
    },
    descriptionText: {
        fontSize: 16,
        lineHeight: 24,
    },
    infoCard: {
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    openRepoButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    visibilityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    visibilityText: {
        fontSize: 14,
        fontWeight: '600',
    },
    repoDescription: {
        fontSize: 15,
        lineHeight: 22,
        marginTop: 8,
    },
    actionsCard: {
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    bottomSpacer: {
        height: 32,
    },
});