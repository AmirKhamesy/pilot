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
        'Failed to load repositories. Your GitHub connection may have expired.'
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
            <ThemedText style={[styles.cardTitle, { color: textColor }]}>GitHub Integration</ThemedText>
            <ThemedText style={[styles.cardSubtitle, { color: textSecondary }]}>
              {connection ? 'Connected' : 'Not connected'}
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
            Connect your GitHub account to access repositories, manage projects, and collaborate with your team.
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

          <View style={styles.repositorySection}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Repository Access
            </ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: textSecondary }]}>
              Select a repository to work with
            </ThemedText>
            
            {loadingRepos ? (
              <View style={styles.repoLoadingContainer}>
                <ActivityIndicator size="small" color={tintColor} />
                <ThemedText style={[styles.loadingText, { color: textSecondary }]}>Loading repositories...</ThemedText>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.repositorySelector, { 
                    backgroundColor: surfaceColor, 
                    borderColor: borderColor 
                  }]}
                  onPress={() => setShowRepoModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.repositorySelectorContent}>
                    <View style={[styles.repoIconContainer, { backgroundColor: buttonPrimary + '20' }]}>
                      <IconSymbol name="folder" size={16} color={buttonPrimary} />
                    </View>
                    <ThemedText style={[styles.repositorySelectorText, { color: textColor }]}>
                      {selectedRepo ? selectedRepo.full_name : 'Select a repository'}
                    </ThemedText>
                  </View>
                  <IconSymbol name="chevron.down" size={16} color={iconColor} />
                </TouchableOpacity>

                {selectedRepo && (
                  <View style={[styles.selectedRepoCard, { 
                    backgroundColor: surfaceColor, 
                    borderColor: borderColor 
                  }]}>
                    <View style={styles.selectedRepoHeader}>
                      <View>
                        <ThemedText style={[styles.repoName, { color: textColor }]}>
                          {selectedRepo.name}
                        </ThemedText>
                        <ThemedText style={[styles.repoFullName, { color: textSecondary }]}>
                          {selectedRepo.full_name}
                        </ThemedText>
                      </View>
                      <View style={styles.repoStats}>
                        <View style={[styles.repoStat, { backgroundColor: cardColor }]}>
                          <IconSymbol name="star" size={12} color={iconColor} />
                          <ThemedText style={[styles.repoStatText, { color: textSecondary }]}>
                            {selectedRepo.stargazers_count}
                          </ThemedText>
                        </View>
                        <View style={[styles.repoStat, { backgroundColor: cardColor }]}>
                          <IconSymbol name="arrow.branch" size={12} color={iconColor} />
                          <ThemedText style={[styles.repoStatText, { color: textSecondary }]}>
                            {selectedRepo.forks_count}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                    {selectedRepo.description && (
                      <ThemedText style={[styles.repoDescription, { color: textSecondary }]}>
                        {selectedRepo.description}
                      </ThemedText>
                    )}
                    <View style={styles.repoMeta}>
                      <View style={styles.repoMetaLeft}>
                        {selectedRepo.language && (
                          <View style={[styles.languageTag, { backgroundColor: buttonPrimary + '20' }]}>
                            <ThemedText style={[styles.languageText, { color: buttonPrimary }]}>
                              {selectedRepo.language}
                            </ThemedText>
                          </View>
                        )}
                        <View style={[styles.visibilityTag, { 
                          backgroundColor: selectedRepo.private ? buttonDanger + '20' : successColor + '20' 
                        }]}>
                          <IconSymbol 
                            name={selectedRepo.private ? "lock" : "globe"} 
                            size={10} 
                            color={selectedRepo.private ? buttonDanger : successColor} 
                          />
                          <ThemedText style={[styles.visibilityText, { 
                            color: selectedRepo.private ? buttonDanger : successColor 
                          }]}>
                            {selectedRepo.private ? 'Private' : 'Public'}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText style={[styles.repoDate, { color: textSecondary }]}>
                        Updated {new Date(selectedRepo.updated_at || '').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      )}

      <Modal
        visible={showRepoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRepoModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="title" style={{ color: textColor }}>Select Repository</ThemedText>
            <TouchableOpacity 
              onPress={() => setShowRepoModal(false)}
              style={[styles.modalCloseButton, { backgroundColor: cardColor }]}
            >
              <IconSymbol name="xmark" size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.repositoryList} showsVerticalScrollIndicator={false}>
            {repositories.map((repo) => (
              <TouchableOpacity
                key={repo.id}
                style={[
                  styles.repositoryItem,
                  { backgroundColor: cardColor, borderColor: borderColor },
                  selectedRepo?.id === repo.id && { 
                    borderColor: buttonPrimary, 
                    borderWidth: 2,
                    backgroundColor: buttonPrimary + '10'
                  }
                ]}
                onPress={() => selectRepository(repo)}
                activeOpacity={0.7}
              >
                <View style={styles.repositoryItemHeader}>
                  <ThemedText 
                    style={[styles.repositoryItemName, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {repo.name}
                  </ThemedText>
                  <View style={styles.repositoryItemStats}>
                    <View style={[styles.repoStat, { backgroundColor: surfaceColor }]}>
                      <IconSymbol name="star" size={12} color={iconColor} />
                      <ThemedText style={[styles.repoStatText, { color: textSecondary }]}>
                        {repo.stargazers_count}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <ThemedText style={[styles.repositoryItemFullName, { color: textSecondary }]}>
                  {repo.full_name}
                </ThemedText>
                {repo.description && (
                  <ThemedText 
                    style={[styles.repositoryItemDescription, { color: textSecondary }]}
                    numberOfLines={2}
                  >
                    {repo.description}
                  </ThemedText>
                )}
                <View style={styles.repositoryItemMeta}>
                  <View style={styles.repoMetaLeft}>
                    {repo.language && (
                      <View style={[styles.languageTag, { backgroundColor: buttonPrimary + '20' }]}>
                        <ThemedText style={[styles.languageText, { color: buttonPrimary }]}>
                          {repo.language}
                        </ThemedText>
                      </View>
                    )}
                    <View style={[styles.visibilityTag, { 
                      backgroundColor: repo.private ? buttonDanger + '20' : successColor + '20' 
                    }]}>
                      <IconSymbol 
                        name={repo.private ? "lock" : "globe"} 
                        size={10} 
                        color={repo.private ? buttonDanger : successColor} 
                      />
                      <ThemedText style={[styles.visibilityText, { 
                        color: repo.private ? buttonDanger : successColor 
                      }]}>
                        {repo.private ? 'Private' : 'Public'}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={[styles.repositoryItemDate, { color: textSecondary }]}>
                    {new Date(repo.updated_at || '').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
      </Modal>
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
  repositorySection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: -8,
  },
  repoLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  repositorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  repositorySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  repoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  repositorySelectorText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  selectedRepoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  selectedRepoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  repoName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  repoFullName: {
    fontSize: 13,
    fontWeight: '500',
  },
  repoStats: {
    flexDirection: 'row',
    gap: 8,
  },
  repoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  repoStatText: {
    fontSize: 12,
    fontWeight: '600',
  },
  repoDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repoMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  languageText: {
    fontSize: 11,
    fontWeight: '700',
  },
  visibilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  repoDate: {
    fontSize: 12,
    fontWeight: '500',
  },
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
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 8,
  },
  repositoryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repositoryItemName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  repositoryItemFullName: {
    fontSize: 13,
    fontWeight: '500',
  },
  repositoryItemStats: {
    flexDirection: 'row',
    gap: 8,
  },
  repositoryItemDescription: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  repositoryItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repositoryItemDate: {
    fontSize: 12,
    fontWeight: '500',
  },
});
