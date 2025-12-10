import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProjectHeader from '@/components/ProjectHeader';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { githubService } from '@/lib/github';
import { supabase } from '@/lib/supabase';
import { GitHubComment, GitHubIssue } from '@/types/github';

export default function IssueDetailScreen() {
    const { owner, repo, issueNumber } = useLocalSearchParams<{
        owner: string;
        repo: string;
        issueNumber: string;
    }>();
    const [issue, setIssue] = useState<GitHubIssue | null>(null);
    const [comments, setComments] = useState<GitHubComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const successColor = useThemeColor({}, 'success');
    const buttonDanger = useThemeColor({}, 'buttonDanger');
    const buttonPrimary = useThemeColor({}, 'buttonPrimary');
    const surfaceColor = useThemeColor({}, 'surface');

    const loadIssue = useCallback(async () => {
        if (!owner || !repo || !issueNumber) return;

        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                Alert.alert('Error', 'You must be logged in to view issue details');
                router.back();
                return;
            }

            const connection = await githubService.getConnection(session.user.id);

            if (!connection) {
                Alert.alert('Error', 'GitHub account not connected');
                router.back();
                return;
            }

            const issueData = await githubService.getIssue(
                connection.access_token,
                owner,
                repo,
                parseInt(issueNumber)
            );

            setIssue(issueData);

            if (issueData.comments > 0) {
                setLoadingComments(true);
                try {
                    const commentsData = await githubService.getIssueComments(
                        connection.access_token,
                        owner,
                        repo,
                        parseInt(issueNumber)
                    );
                    setComments(commentsData);
                } catch (error) {
                    console.error('Error loading comments:', error);
                } finally {
                    setLoadingComments(false);
                }
            }
        } catch (error) {
            console.error('Error loading issue:', error);
            Alert.alert('Error', 'Failed to load issue details');
            router.back();
        } finally {
            setLoading(false);
        }
    }, [owner, repo, issueNumber]);

    useEffect(() => {
        loadIssue();
    }, [loadIssue]);

    const getStateColor = (state: string) => {
        return state === 'open' ? successColor : buttonDanger;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleOpenInGitHub = () => {
        if (issue?.html_url) {
            Linking.openURL(issue.html_url);
        }
    };

    const handleAIFix = () => {
        Alert.alert('AI Fix', 'This feature will be implemented soon!');
    };

    const renderMarkdownContent = (body: string | null) => {
        if (!body) {
            return (
                <ThemedText style={[styles.noDescription, { color: textSecondary }]}>
                    No description provided
                </ThemedText>
            );
        }

        const mediaRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const parts: { type: 'text' | 'media'; content: string; alt?: string }[] = [];
        let lastIndex = 0;
        let match;

        while ((match = mediaRegex.exec(body)) !== null) {
            if (match.index > lastIndex) {
                const textContent = body.substring(lastIndex, match.index);
                if (textContent.trim()) {
                    parts.push({ type: 'text', content: textContent });
                }
            }

            parts.push({
                type: 'media',
                content: match[2],
                alt: match[1],
            });

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < body.length) {
            const textContent = body.substring(lastIndex);
            if (textContent.trim()) {
                parts.push({ type: 'text', content: textContent });
            }
        }

        if (parts.length === 0) {
            parts.push({ type: 'text', content: body });
        }

        return (
            <View style={styles.markdownContent}>
                {parts.map((part, index) => {
                    if (part.type === 'media') {
                        const isVideo = /\.(mov|mp4|webm|gif)$/i.test(part.content);

                        return (
                            <View key={index} style={styles.imageContainer}>
                                <Image
                                    source={{ uri: part.content }}
                                    style={styles.markdownImage}
                                    resizeMode="contain"
                                />
                            </View>
                        );
                    } else {
                        // Remove markdown syntax for simple rendering
                        const cleanText = part.content
                            .replace(/#{1,6}\s/g, '') // Headers
                            .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
                            .replace(/\*([^*]+)\*/g, '$1') // Italic
                            .replace(/`([^`]+)`/g, '$1') // Inline code
                            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
                            .trim();

                        return (
                            <ThemedText key={index} style={[styles.bodyText, { color: textColor }]}>
                                {cleanText}
                            </ThemedText>
                        );
                    }
                })}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={tintColor} />
                    <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
                        Loading issue...
                    </ThemedText>
                </View>
            </SafeAreaView>
        );
    }

    if (!issue) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.emptyContainer}>
                    <IconSymbol name="exclamationmark.triangle" size={64} color={textSecondary} />
                    <ThemedText type="title" style={[styles.emptyTitle, { color: textColor }]}>
                        Issue Not Found
                    </ThemedText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ProjectHeader
                    showBack
                    title={`Issue #${issue.number}`}
                    subtitle={`${owner}/${repo}`}
                    iconName={issue.state === 'open' ? 'exclamationmark.circle' : 'checkmark.circle'}
                    url={issue.html_url}
                />

                <TouchableOpacity
                    style={[styles.aiButton, { backgroundColor: buttonPrimary }]}
                    onPress={handleAIFix}
                    activeOpacity={0.8}
                >
                    <IconSymbol name="wand.and.stars" size={20} color="#FFFFFF" />
                    <ThemedText style={styles.aiButtonText}>AI Fix Issue</ThemedText>
                </TouchableOpacity>

                <View style={[styles.issueHeader, { backgroundColor: cardColor, borderColor }]}>
                    <View style={styles.issueHeaderTop}>
                        <View style={[styles.stateBadge, { backgroundColor: getStateColor(issue.state) + '20' }]}>
                            <IconSymbol
                                name={issue.state === 'open' ? 'exclamationmark.circle.fill' : 'checkmark.circle.fill'}
                                size={16}
                                color={getStateColor(issue.state)}
                            />
                            <ThemedText style={[styles.stateText, { color: getStateColor(issue.state) }]}>
                                {issue.state}
                            </ThemedText>
                        </View>
                    </View>

                    <ThemedText type="title" style={[styles.issueTitle, { color: textColor }]}>
                        {issue.title}
                    </ThemedText>

                    <View style={styles.issueMeta}>
                        <View style={styles.authorInfo}>
                            <Image
                                source={{ uri: issue.user.avatar_url }}
                                style={styles.avatar}
                            />
                            <View>
                                <ThemedText style={[styles.authorName, { color: textColor }]}>
                                    {issue.user.login}
                                </ThemedText>
                                <ThemedText style={[styles.dateText, { color: textSecondary }]}>
                                    opened on {formatDate(issue.created_at)}
                                </ThemedText>
                            </View>
                        </View>
                    </View>

                    {issue.labels.length > 0 && (
                        <View style={styles.labelsContainer}>
                            {issue.labels.map((label) => (
                                <View
                                    key={label.id}
                                    style={[
                                        styles.label,
                                        {
                                            backgroundColor: `#${label.color}20`,
                                            borderColor: `#${label.color}`,
                                        },
                                    ]}
                                >
                                    <ThemedText style={[styles.labelText, { color: `#${label.color}` }]}>
                                        {label.name}
                                    </ThemedText>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={[styles.bodyCard, { backgroundColor: cardColor, borderColor }]}>
                    <ThemedText type="defaultSemiBold" style={[styles.bodyTitle, { color: textColor }]}>
                        Description
                    </ThemedText>
                    {renderMarkdownContent(issue.body)}
                </View>

                {issue.assignees.length > 0 && (
                    <View style={[styles.assigneesCard, { backgroundColor: cardColor, borderColor }]}>
                        <ThemedText type="defaultSemiBold" style={[styles.assigneesTitle, { color: textColor }]}>
                            Assignees
                        </ThemedText>
                        <View style={styles.assigneesList}>
                            {issue.assignees.map((assignee) => (
                                <View key={assignee.id} style={styles.assigneeItem}>
                                    <Image
                                        source={{ uri: assignee.avatar_url }}
                                        style={styles.assigneeAvatar}
                                    />
                                    <ThemedText style={[styles.assigneeName, { color: textColor }]}>
                                        {assignee.login}
                                    </ThemedText>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {issue.comments > 0 && (
                    <View style={[styles.commentsCard, { backgroundColor: cardColor, borderColor }]}>
                        <View style={styles.commentsHeader}>
                            <ThemedText type="defaultSemiBold" style={[styles.commentsTitle, { color: textColor }]}>
                                Comments
                            </ThemedText>
                            <View style={[styles.commentsCountBadge, { backgroundColor: tintColor + '20' }]}>
                                <ThemedText style={[styles.commentsCountText, { color: tintColor }]}>
                                    {issue.comments}
                                </ThemedText>
                            </View>
                        </View>

                        {loadingComments ? (
                            <View style={styles.commentsLoading}>
                                <ActivityIndicator size="small" color={tintColor} />
                                <ThemedText style={[styles.commentsLoadingText, { color: textSecondary }]}>
                                    Loading comments...
                                </ThemedText>
                            </View>
                        ) : comments.length > 0 ? (
                            <View style={styles.commentsList}>
                                {comments.map((comment, index) => (
                                    <View
                                        key={comment.id}
                                        style={[
                                            styles.commentItem,
                                            { borderColor },
                                            index === comments.length - 1 && styles.commentItemLast,
                                        ]}
                                    >
                                        <View style={styles.commentHeader}>
                                            <Image
                                                source={{ uri: comment.user.avatar_url }}
                                                style={styles.commentAvatar}
                                            />
                                            <View style={styles.commentHeaderInfo}>
                                                <ThemedText style={[styles.commentAuthor, { color: textColor }]}>
                                                    {comment.user.login}
                                                </ThemedText>
                                                <ThemedText style={[styles.commentDate, { color: textSecondary }]}>
                                                    {formatDate(comment.created_at)}
                                                </ThemedText>
                                            </View>
                                            {comment.author_association !== 'NONE' && (
                                                <View
                                                    style={[
                                                        styles.authorBadge,
                                                        { backgroundColor: tintColor + '20' },
                                                    ]}
                                                >
                                                    <ThemedText
                                                        style={[styles.authorBadgeText, { color: tintColor }]}
                                                    >
                                                        {comment.author_association}
                                                    </ThemedText>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.commentBodyContainer}>
                                            {renderMarkdownContent(comment.body)}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <ThemedText style={[styles.noCommentsText, { color: textSecondary }]}>
                                No comments to display
                            </ThemedText>
                        )}
                    </View>
                )}

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 40,
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 2,
    },
    repoName: {
        fontSize: 13,
        fontWeight: '500',
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
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 16,
        gap: 10,
    },
    aiButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    issueHeader: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
    },
    issueHeaderTop: {
        marginBottom: 12,
    },
    stateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    stateText: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    issueTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 16,
        lineHeight: 32,
    },
    issueMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    authorName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    dateText: {
        fontSize: 13,
    },
    labelsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    label: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    labelText: {
        fontSize: 12,
        fontWeight: '600',
    },
    bodyCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
    },
    bodyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    markdownContent: {
        gap: 12,
    },
    bodyText: {
        fontSize: 15,
        lineHeight: 24,
    },
    noDescription: {
        fontSize: 15,
        fontStyle: 'italic',
    },
    imageContainer: {
        marginVertical: 12,
    },
    markdownImage: {
        width: '100%',
        height: 300,
        borderRadius: 12,
    },
    assigneesCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
    },
    assigneesTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    assigneesList: {
        gap: 12,
    },
    assigneeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    assigneeAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    assigneeName: {
        fontSize: 15,
        fontWeight: '500',
    },
    commentsCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
    },
    commentsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    commentsCountBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    commentsCountText: {
        fontSize: 14,
        fontWeight: '700',
    },
    commentsLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        gap: 12,
    },
    commentsLoadingText: {
        fontSize: 14,
    },
    noCommentsText: {
        fontSize: 15,
        textAlign: 'center',
        paddingVertical: 20,
        fontStyle: 'italic',
    },
    commentsList: {
        marginBottom: 16,
    },
    commentItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    commentItemLast: {
        borderBottomWidth: 0,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    commentHeaderInfo: {
        flex: 1,
    },
    commentAuthor: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    commentDate: {
        fontSize: 13,
    },
    authorBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    authorBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    commentBodyContainer: {
        marginTop: 4,
    },
    commentBody: {
        fontSize: 15,
        lineHeight: 22,
    },
    bottomSpacer: {
        height: 32,
    },
});
