import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
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
import { GitHubIssue } from '@/types/github';

type FilterType = 'all' | 'open' | 'closed';

export default function IssuesListScreen() {
    const { owner, repo, projectId } = useLocalSearchParams<{ owner: string; repo: string; projectId: string }>();
    const [issues, setIssues] = useState<GitHubIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const tintColor = useThemeColor({}, 'tint');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const successColor = useThemeColor({}, 'success');
    const buttonDanger = useThemeColor({}, 'buttonDanger');

    const loadIssues = useCallback(async () => {
        if (!owner || !repo) return;

        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                Alert.alert('Error', 'You must be logged in to view issues');
                router.back();
                return;
            }

            const connection = await githubService.getConnection(session.user.id);

            if (!connection) {
                Alert.alert('Error', 'GitHub account not connected');
                router.back();
                return;
            }

            const issuesData = await githubService.getRepositoryIssues(
                connection.access_token,
                owner,
                repo,
                'all'
            );

            setIssues(issuesData);
        } catch (error) {
            console.error('Error loading issues:', error);
            Alert.alert('Error', 'Failed to load issues');
        } finally {
            setLoading(false);
        }
    }, [owner, repo]);

    useEffect(() => {
        loadIssues();
    }, [loadIssues]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadIssues();
        setRefreshing(false);
    };

    const availableLabels = useMemo(() => {
        const labelMap = new Map<string, { name: string; color: string; count: number }>();

        issues.forEach(issue => {
            issue.labels.forEach(label => {
                const existing = labelMap.get(label.name);
                if (existing) {
                    existing.count++;
                } else {
                    labelMap.set(label.name, {
                        name: label.name,
                        color: label.color,
                        count: 1,
                    });
                }
            });
        });

        return Array.from(labelMap.values()).sort((a, b) => b.count - a.count);
    }, [issues]);

    const filteredIssues = useMemo(() => {
        let filtered = issues;

        if (filter === 'open') {
            filtered = filtered.filter(issue => issue.state === 'open');
        } else if (filter === 'closed') {
            filtered = filtered.filter(issue => issue.state === 'closed');
        }

        if (selectedLabels.size > 0) {
            filtered = filtered.filter(issue =>
                issue.labels.some(label => selectedLabels.has(label.name))
            );
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(issue =>
                issue.title.toLowerCase().includes(query) ||
                issue.body?.toLowerCase().includes(query) ||
                issue.user.login.toLowerCase().includes(query) ||
                issue.labels.some(label => label.name.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [issues, filter, selectedLabels, searchQuery]);

    const handleIssuePress = (issue: GitHubIssue) => {
        router.push({
            pathname: '/project/issue-detail',
            params: {
                owner,
                repo,
                issueNumber: issue.number.toString(),
                projectId,
            },
        });
    };

    const toggleLabel = (labelName: string) => {
        setSelectedLabels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(labelName)) {
                newSet.delete(labelName);
            } else {
                newSet.add(labelName);
            }
            return newSet;
        });
    };

    const clearFilters = () => {
        setSelectedLabels(new Set());
        setSearchQuery('');
        setFilter('all');
    };

    const getStateColor = (state: string) => {
        return state === 'open' ? successColor : buttonDanger;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    const renderIssueItem = ({ item }: { item: GitHubIssue }) => (
        <TouchableOpacity
            style={[styles.issueCard, { backgroundColor: cardColor, borderColor }]}
            onPress={() => handleIssuePress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.issueHeader}>
                <View style={styles.issueHeaderLeft}>
                    <IconSymbol
                        name={item.state === 'open' ? 'exclamationmark.circle' : 'checkmark.circle'}
                        size={20}
                        color={getStateColor(item.state)}
                    />
                    <View style={[styles.stateBadge, { backgroundColor: getStateColor(item.state) + '20' }]}>
                        <ThemedText style={[styles.stateText, { color: getStateColor(item.state) }]}>
                            {item.state}
                        </ThemedText>
                    </View>
                </View>
                <ThemedText style={[styles.issueNumber, { color: textSecondary }]}>
                    #{item.number}
                </ThemedText>
            </View>

            <ThemedText type="defaultSemiBold" style={[styles.issueTitle, { color: textColor }]}>
                {item.title}
            </ThemedText>

            {item.labels.length > 0 && (
                <View style={styles.labelsContainer}>
                    {item.labels.slice(0, 3).map((label) => (
                        <View
                            key={label.id}
                            style={[styles.label, { backgroundColor: `#${label.color}20`, borderColor: `#${label.color}` }]}
                        >
                            <ThemedText style={[styles.labelText, { color: `#${label.color}` }]}>
                                {label.name}
                            </ThemedText>
                        </View>
                    ))}
                    {item.labels.length > 3 && (
                        <ThemedText style={[styles.moreLabels, { color: textSecondary }]}>
                            +{item.labels.length - 3}
                        </ThemedText>
                    )}
                </View>
            )}

            <View style={styles.issueFooter}>
                <View style={styles.issueFooterLeft}>
                    <View style={styles.footerItem}>
                        <IconSymbol name="bubble.left" size={14} color={textSecondary} />
                        <ThemedText style={[styles.footerText, { color: textSecondary }]}>
                            {item.comments}
                        </ThemedText>
                    </View>
                    <ThemedText style={[styles.footerText, { color: textSecondary }]}>
                        opened {formatDate(item.created_at)} by {item.user.login}
                    </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={16} color={textSecondary} />
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <IconSymbol name="checkmark.circle" size={64} color={textSecondary} />
            <ThemedText type="title" style={[styles.emptyTitle, { color: textColor }]}>
                No Issues Found
            </ThemedText>
            <ThemedText style={[styles.emptyDescription, { color: textSecondary }]}>
                {searchQuery || selectedLabels.size > 0
                    ? 'Try adjusting your filters'
                    : "This repository doesn't have any issues yet"}
            </ThemedText>
            {(searchQuery || selectedLabels.size > 0 || filter !== 'all') && (
                <TouchableOpacity
                    style={[styles.clearButton, { backgroundColor: tintColor }]}
                    onPress={clearFilters}
                    activeOpacity={0.8}
                >
                    <ThemedText style={styles.clearButtonText}>Clear Filters</ThemedText>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={tintColor} />
                    <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
                        Loading issues...
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
                title="Issues"
                subtitle={`${owner}/${repo}`}
                iconName="exclamationmark.circle"
                url={`https://github.com/${owner}/${repo}/issues`}
            />

            <View style={styles.searchRow}>
                <View style={[styles.searchContainer, { backgroundColor: cardColor, borderColor }]}>
                    <IconSymbol name="magnifyingglass" size={18} color={textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search issues..."
                        placeholderTextColor={textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                            <IconSymbol name="xmark.circle.fill" size={18} color={textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.filterIconButton, { backgroundColor: cardColor, borderColor }]}
                    onPress={() => setFilterModalVisible(true)}
                    activeOpacity={0.7}
                >
                    <IconSymbol name="line.3.horizontal.decrease.circle" size={24} color={tintColor} />
                    {(filter !== 'all' || selectedLabels.size > 0) && (
                        <View style={[styles.filterBadge, { backgroundColor: tintColor }]}>
                            <ThemedText style={styles.filterBadgeText}>
                                {(filter !== 'all' ? 1 : 0) + selectedLabels.size}
                            </ThemedText>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.resultsHeader}>
                <ThemedText style={[styles.resultsText, { color: textSecondary }]}>
                    {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
                </ThemedText>
            </View>

            <FlatList
                data={filteredIssues}
                renderItem={renderIssueItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                refreshing={refreshing}
                onRefresh={handleRefresh}
            />

            <Modal
                visible={filterModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
                    <View style={[styles.modalHeader, { borderColor }]}>
                        <TouchableOpacity
                            onPress={() => setFilterModalVisible(false)}
                            style={styles.modalCloseButton}
                            activeOpacity={0.7}
                        >
                            <IconSymbol name="xmark" size={24} color={textColor} />
                        </TouchableOpacity>
                        <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>
                            Filters
                        </ThemedText>
                        {(filter !== 'all' || selectedLabels.size > 0) && (
                            <TouchableOpacity
                                onPress={() => {
                                    setFilter('all');
                                    setSelectedLabels(new Set());
                                }}
                                activeOpacity={0.7}
                            >
                                <ThemedText style={[styles.modalClearText, { color: tintColor }]}>
                                    Clear All
                                </ThemedText>
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView
                        style={styles.modalContent}
                        contentContainerStyle={styles.modalContentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.filterSection}>
                            <ThemedText style={[styles.filterSectionTitle, { color: textSecondary }]}>
                                STATUS
                            </ThemedText>
                            <View style={styles.stateFilterOptions}>
                                <TouchableOpacity
                                    style={[
                                        styles.stateOptionChip,
                                        { backgroundColor: filter === 'all' ? tintColor : cardColor, borderColor },
                                    ]}
                                    onPress={() => setFilter('all')}
                                    activeOpacity={0.7}
                                >
                                    <ThemedText
                                        style={[
                                            styles.stateOptionText,
                                            { color: filter === 'all' ? '#FFFFFF' : textColor },
                                        ]}
                                    >
                                        All ({issues.length})
                                    </ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.stateOptionChip,
                                        { backgroundColor: filter === 'open' ? successColor : cardColor, borderColor },
                                    ]}
                                    onPress={() => setFilter('open')}
                                    activeOpacity={0.7}
                                >
                                    <IconSymbol
                                        name="exclamationmark.circle"
                                        size={16}
                                        color={filter === 'open' ? '#FFFFFF' : successColor}
                                    />
                                    <ThemedText
                                        style={[
                                            styles.stateOptionText,
                                            { color: filter === 'open' ? '#FFFFFF' : textColor },
                                        ]}
                                    >
                                        Open ({issues.filter(i => i.state === 'open').length})
                                    </ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.stateOptionChip,
                                        { backgroundColor: filter === 'closed' ? buttonDanger : cardColor, borderColor },
                                    ]}
                                    onPress={() => setFilter('closed')}
                                    activeOpacity={0.7}
                                >
                                    <IconSymbol
                                        name="checkmark.circle"
                                        size={16}
                                        color={filter === 'closed' ? '#FFFFFF' : buttonDanger}
                                    />
                                    <ThemedText
                                        style={[
                                            styles.stateOptionText,
                                            { color: filter === 'closed' ? '#FFFFFF' : textColor },
                                        ]}
                                    >
                                        Closed ({issues.filter(i => i.state === 'closed').length})
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {availableLabels.length > 0 && (
                            <View style={styles.filterSection}>
                                <ThemedText style={[styles.filterSectionTitle, { color: textSecondary }]}>
                                    LABELS
                                </ThemedText>
                                {availableLabels.map((label) => (
                                    <TouchableOpacity
                                        key={label.name}
                                        style={[
                                            styles.modalLabelItem,
                                            {
                                                backgroundColor: selectedLabels.has(label.name)
                                                    ? `#${label.color}20`
                                                    : cardColor,
                                                borderColor: selectedLabels.has(label.name)
                                                    ? `#${label.color}`
                                                    : borderColor,
                                            },
                                        ]}
                                        onPress={() => toggleLabel(label.name)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.modalLabelLeft}>
                                            <View
                                                style={[
                                                    styles.modalLabelDot,
                                                    { backgroundColor: `#${label.color}` },
                                                ]}
                                            />
                                            <ThemedText style={[styles.modalLabelName, { color: textColor }]}>
                                                {label.name}
                                            </ThemedText>
                                        </View>
                                        <View style={styles.modalLabelRight}>
                                            <View
                                                style={[
                                                    styles.modalLabelCount,
                                                    { backgroundColor: `#${label.color}30` },
                                                ]}
                                            >
                                                <ThemedText
                                                    style={[
                                                        styles.modalLabelCountText,
                                                        { color: `#${label.color}` },
                                                    ]}
                                                >
                                                    {label.count}
                                                </ThemedText>
                                            </View>
                                            {selectedLabels.has(label.name) && (
                                                <IconSymbol
                                                    name="checkmark.circle.fill"
                                                    size={24}
                                                    color={`#${label.color}`}
                                                />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    <View style={[styles.modalFooter, { borderColor }]}>
                        <TouchableOpacity
                            style={[styles.modalApplyButton, { backgroundColor: tintColor }]}
                            onPress={() => setFilterModalVisible(false)}
                            activeOpacity={0.8}
                        >
                            <ThemedText style={styles.modalApplyButtonText}>
                                Show {filteredIssues.length} {filteredIssues.length === 1 ? 'Issue' : 'Issues'}
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
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
        paddingTop: 8,
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
    searchRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    filterIconButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    filterBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    filterSection: {
        marginBottom: 32,
    },
    filterSectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    stateFilterOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    stateOptionChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    stateOptionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
    },
    modalClearText: {
        fontSize: 15,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
    },
    modalContentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    noLabelsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    noLabelsText: {
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
    },
    modalLabelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        marginBottom: 12,
    },
    modalLabelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    modalLabelDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    modalLabelName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    modalLabelRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalLabelCount: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 32,
        alignItems: 'center',
    },
    modalLabelCountText: {
        fontSize: 13,
        fontWeight: '700',
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
    },
    modalApplyButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalApplyButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    resultsHeader: {
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    resultsText: {
        fontSize: 13,
        fontWeight: '600',
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
        minHeight: 300,
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
        marginBottom: 20,
    },
    clearButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    clearButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    listContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    issueCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    issueHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    issueHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stateBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    stateText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    issueNumber: {
        fontSize: 14,
        fontWeight: '600',
    },
    issueTitle: {
        fontSize: 16,
        marginBottom: 12,
        lineHeight: 22,
    },
    labelsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    label: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
    },
    labelText: {
        fontSize: 12,
        fontWeight: '600',
    },
    moreLabels: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    issueFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    issueFooterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 13,
        flex: 1,
    },
});
