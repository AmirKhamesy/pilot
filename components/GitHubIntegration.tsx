import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';
import { githubService } from '@/lib/github';
import { GitHubConnection, GitHubRepository } from '@/types/github';

interface GitHubIntegrationProps {
  session: Session;
}

export default function GitHubIntegration({ session }: GitHubIntegrationProps) {
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [showRepoModal, setShowRepoModal] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const cardBackground = useThemeColor(
    { light: '#f8f9fa', dark: '#1f2937' },
    'background'
  );

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

  const loadRepositories = useCallback(async () => {
    if (!connection) return;

    try {
      setLoadingRepos(true);
      const repos = await githubService.getRepositoriesWithCache(connection);
      setRepositories(repos);
    } catch (error) {
      console.error('Error loading repositories:', error);
      Alert.alert(
        'Error',
        'Failed to load repositories. Your GitHub connection may have expired.',
        [
          { text: 'Reconnect', onPress: () => connectToGitHub() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoadingRepos(false);
    }
  }, [connection]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  useEffect(() => {
    if (connection) {
      loadRepositories();
    }
  }, [connection, loadRepositories]);

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
          [{ text: 'OK', onPress: () => {} }]
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
              setRepositories([]);
              setSelectedRepo(null);
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

  const selectRepository = (repo: GitHubRepository) => {
    setSelectedRepo(repo);
    setShowRepoModal(false);
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={tintColor} />
        <ThemedText style={styles.loadingText}>Loading GitHub connection...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { backgroundColor: cardBackground }]}>
        <View style={styles.headerContent}>
          <IconSymbol name="globe" size={24} color={iconColor} />
          <ThemedText type="subtitle" style={styles.headerTitle}>GitHub Integration</ThemedText>
        </View>
      </ThemedView>

      {!connection ? (
        <ThemedView style={styles.connectSection}>
          <ThemedText style={[styles.description, { color: iconColor }]}>
            Connect your GitHub account to access your repositories and collaborate on your projects.
          </ThemedText>
          
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: tintColor }]}
            onPress={connectToGitHub}
            disabled={connecting}
          >
            {connecting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#fff" style={styles.buttonLoader} />
                <ThemedText style={styles.connectButtonText}>Connecting...</ThemedText>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <IconSymbol name="link" size={20} color="#fff" style={styles.buttonIcon} />
                <ThemedText style={styles.connectButtonText}>Connect to GitHub</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <ThemedView style={styles.connectedSection}>
          <View style={[styles.connectionCard, { backgroundColor: cardBackground }]}>
            <View style={styles.connectionHeader}>
              <View style={styles.connectionInfo}>
                <View style={styles.avatarContainer}>
                  {/* In a real app, you'd use an Image component with connection.github_avatar_url */}
                  <IconSymbol name="person.fill" size={20} color={iconColor} />
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">@{connection.github_username}</ThemedText>
                  <ThemedText style={[styles.connectionDate, { color: iconColor }]}>
                    Connected {new Date(connection.connected_at).toLocaleDateString()}
                  </ThemedText>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={disconnectFromGitHub}
              >
                <IconSymbol name="xmark" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.repositorySection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Repositories
            </ThemedText>
            
            {loadingRepos ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={tintColor} />
                <ThemedText style={styles.loadingText}>Loading repositories...</ThemedText>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.repositorySelector, { backgroundColor: cardBackground, borderColor: iconColor + '40' }]}
                  onPress={() => setShowRepoModal(true)}
                >
                  <View style={styles.repositorySelectorContent}>
                    <IconSymbol name="folder" size={20} color={iconColor} />
                    <ThemedText style={styles.repositorySelectorText}>
                      {selectedRepo ? selectedRepo.full_name : 'Select a repository'}
                    </ThemedText>
                  </View>
                  <IconSymbol name="chevron.down" size={16} color={iconColor} />
                </TouchableOpacity>

                {selectedRepo && (
                  <View style={[styles.selectedRepoCard, { backgroundColor: cardBackground }]}>
                    <View style={styles.selectedRepoHeader}>
                      <ThemedText type="defaultSemiBold">{selectedRepo.name}</ThemedText>
                      <View style={styles.repoStats}>
                        <View style={styles.repoStat}>
                          <IconSymbol name="star" size={14} color={iconColor} />
                          <ThemedText style={styles.repoStatText}>{selectedRepo.stargazers_count}</ThemedText>
                        </View>
                        <View style={styles.repoStat}>
                          <IconSymbol name="arrow.branch" size={14} color={iconColor} />
                          <ThemedText style={styles.repoStatText}>{selectedRepo.forks_count}</ThemedText>
                        </View>
                      </View>
                    </View>
                    {selectedRepo.description && (
                      <ThemedText style={[styles.repoDescription, { color: iconColor }]}>
                        {selectedRepo.description}
                      </ThemedText>
                    )}
                    <View style={styles.repoMeta}>
                      {selectedRepo.language && (
                        <View style={styles.languageTag}>
                          <ThemedText style={styles.languageText}>{selectedRepo.language}</ThemedText>
                        </View>
                      )}
                      <ThemedText style={[styles.repoDate, { color: iconColor }]}>
                        Updated {new Date(selectedRepo.updated_at || '').toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </ThemedView>
      )}

      <Modal
        visible={showRepoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRepoModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Select Repository</ThemedText>
            <TouchableOpacity onPress={() => setShowRepoModal(false)}>
              <IconSymbol name="xmark" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.repositoryList}>
            {repositories.map((repo) => (
              <TouchableOpacity
                key={repo.id}
                style={[
                  styles.repositoryItem,
                  { backgroundColor: cardBackground },
                  selectedRepo?.id === repo.id && { borderColor: tintColor, borderWidth: 2 }
                ]}
                onPress={() => selectRepository(repo)}
              >
                <View style={styles.repositoryItemHeader}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {repo.name}
                  </ThemedText>
                  <View style={styles.repositoryItemStats}>
                    <View style={styles.repoStat}>
                      <IconSymbol name="star" size={12} color={iconColor} />
                      <ThemedText style={styles.smallStatText}>{repo.stargazers_count}</ThemedText>
                    </View>
                  </View>
                </View>
                {repo.description && (
                  <ThemedText 
                    style={[styles.repositoryItemDescription, { color: iconColor }]}
                    numberOfLines={2}
                  >
                    {repo.description}
                  </ThemedText>
                )}
                <View style={styles.repositoryItemMeta}>
                  {repo.language && (
                    <ThemedText style={[styles.repositoryItemLanguage, { color: tintColor }]}>
                      {repo.language}
                    </ThemedText>
                  )}
                  <ThemedText style={[styles.repositoryItemDate, { color: iconColor }]}>
                    {new Date(repo.updated_at || '').toLocaleDateString()}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  header: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: 12,
  },
  connectSection: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  connectButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonLoader: {
    marginRight: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  connectedSection: {
    gap: 16,
  },
  connectionCard: {
    padding: 16,
    borderRadius: 12,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  connectionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  disconnectButton: {
    padding: 8,
  },
  repositorySection: {
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  repositorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  repositorySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  repositorySelectorText: {
    marginLeft: 12,
    flex: 1,
  },
  selectedRepoCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  selectedRepoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  repoStats: {
    flexDirection: 'row',
    gap: 12,
  },
  repoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repoStatText: {
    fontSize: 12,
  },
  smallStatText: {
    fontSize: 10,
  },
  repoDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  languageText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  repoDate: {
    fontSize: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  repositoryList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  repositoryItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  repositoryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  repositoryItemStats: {
    flexDirection: 'row',
    gap: 8,
  },
  repositoryItemDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  repositoryItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repositoryItemLanguage: {
    fontSize: 12,
    fontWeight: '500',
  },
  repositoryItemDate: {
    fontSize: 12,
  },
});