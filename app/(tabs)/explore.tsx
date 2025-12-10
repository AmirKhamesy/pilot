import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { githubService } from '@/lib/github';
import { projectService } from '@/lib/project';
import { supabase } from '@/lib/supabase';
import { GitHubConnection, GitHubRepository } from '@/types/github';
import { Project } from '@/types/project';

export default function ProjectsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [tempHideCreateModal, setTempHideCreateModal] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadData(session);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadData(session);
      } else {
        setLoading(false);
        setProjects([]);
        setConnection(null);
        setRepositories([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Debug effect to track modal state
  useEffect(() => {
  }, [showRepoModal]);

  useEffect(() => {
  }, [showCreateModal]);

  const loadData = async (currentSession: Session) => {
    if (!currentSession?.user?.id) return;

    try {
      setLoading(true);
      await Promise.all([
        loadProjects(currentSession),
        loadGitHubConnection(currentSession),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async (currentSession: Session) => {
    if (!currentSession?.user?.id) {
      return;
    }

    try {
      const userProjects = await projectService.getUserProjects(currentSession.user.id);
      setProjects(userProjects);
    } catch (error) {
      console.error('DEBUG: Error loading projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    }
  };

  const loadGitHubConnection = async (currentSession: Session) => {
    if (!currentSession?.user?.id) return;

    try {
      const existingConnection = await githubService.getConnection(currentSession.user.id);
      setConnection(existingConnection);

      if (existingConnection) {
        loadRepositories(existingConnection);
      }
    } catch (error) {
      console.error('Error loading GitHub connection:', error);
    }
  };

  const loadRepositories = async (githubConnection: GitHubConnection) => {
    try {
      setLoadingRepos(true);
      const repos = await githubService.getRepositoriesWithCache(githubConnection);
      setRepositories(repos);
    } catch (error) {
      console.error('Error loading repositories:', error);
      Alert.alert('Error', 'Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    await loadData(session);
    setRefreshing(false);
  }, [session]);

  const handleCreateProject = async () => {
    if (!selectedRepo || !projectName.trim() || !session?.user?.id) return;

    try {
      setCreating(true);

      const hasExisting = await projectService.hasProjectForRepo(session.user.id, selectedRepo.id);
      if (hasExisting) {
        Alert.alert('Error', 'A project already exists for this repository');
        return;
      }

      const projectData = projectService.createProjectDataFromRepo(
        selectedRepo,
        projectName.trim(),
        projectDescription.trim() || undefined
      );

      await projectService.createProject(session.user.id, projectData);

      closeCreateModal();

      if (session) {
        await loadProjects(session);
      }

      Alert.alert('Success', 'Project created successfully!');
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = (project: Project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectService.deleteProject(project.id);
              if (session) {
                await loadProjects(session);
              }
              Alert.alert('Success', 'Project deleted successfully');
            } catch (error) {
              console.error('Error deleting project:', error);
              Alert.alert('Error', 'Failed to delete project');
            }
          },
        },
      ]
    );
  };

  const handleProjectPress = (project: Project) => {
    router.push(`/project/${project.id}`);
  };

  const selectRepository = (repo: GitHubRepository) => {
    setSelectedRepo(repo);
    setProjectName(repo.name);
    setProjectDescription(repo.description || '');
    setShowRepoModal(false);
    setTimeout(() => {
      setTempHideCreateModal(false);
    }, 100);
  };

  const openCreateModal = () => {
    if (!connection) {
      Alert.alert('GitHub Required', 'Please connect your GitHub account in the Profile tab first.');
      return;
    }
    setSelectedRepo(null);
    setProjectName('');
    setProjectDescription('');

    if (repositories.length === 0 && connection) {
      loadRepositories(connection);
    } else {
    }

    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setSelectedRepo(null);
    setProjectName('');
    setProjectDescription('');
    setShowCreateModal(false);
  };

  const openRepoModal = () => {

    if (showRepoModal) {
      return;
    }

    setTempHideCreateModal(true);

    setTimeout(() => {
      setShowRepoModal(true);

      if (connection && !loadingRepos) {
        loadRepositories(connection);
      } else {
      }
    }, 300);
  };

  const closeRepoModal = () => {
    setShowRepoModal(false);
    setTimeout(() => {
      setTempHideCreateModal(false);
    }, 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={[styles.loadingText, { color: textSecondary }]}>Loading projects...</ThemedText>
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
            Please sign in to view and manage your projects
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tintColor} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={[styles.title, { color: textColor, fontFamily: Fonts.rounded }]}>
              Projects
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              Manage your GitHub-based projects
            </ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: buttonPrimary }]}
            onPress={openCreateModal}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Projects List */}
        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="folder.badge.plus" size={64} color={textSecondary} />
            <ThemedText type="title" style={[styles.emptyTitle, { color: textColor }]}>
              No Projects Yet
            </ThemedText>
            <ThemedText style={[styles.emptyDescription, { color: textSecondary }]}>
              No projects created yet...
            </ThemedText>
          </View>
        ) : (
          <View style={styles.projectsList}>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[styles.projectCard, { backgroundColor: cardColor, borderColor }]}
                onPress={() => handleProjectPress(project)}
                activeOpacity={0.7}
              >
                <View style={styles.projectHeader}>
                  <View style={[styles.projectIcon, { backgroundColor: buttonPrimary + '20' }]}>
                    <IconSymbol name="folder" size={24} color={buttonPrimary} />
                  </View>
                  <View style={styles.projectInfo}>
                    <ThemedText type="defaultSemiBold" style={[styles.projectName, { color: textColor }]}>
                      {project.name}
                    </ThemedText>
                    <ThemedText style={[styles.projectRepo, { color: textSecondary }]}>
                      {project.github_repo_full_name}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteProject(project)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="trash" size={18} color={buttonDanger} />
                  </TouchableOpacity>
                </View>

                {project.description && (
                  <ThemedText style={[styles.projectDescription, { color: textSecondary }]} numberOfLines={2}>
                    {project.description}
                  </ThemedText>
                )}

                <View style={styles.projectMeta}>
                  {project.github_repo_language && (
                    <View style={styles.metaItem}>
                      <IconSymbol name="circle.fill" size={12} color={tintColor} />
                      <ThemedText style={[styles.metaText, { color: textSecondary }]}>
                        {project.github_repo_language}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <IconSymbol name="star" size={12} color={textSecondary} />
                    <ThemedText style={[styles.metaText, { color: textSecondary }]}>
                      {project.github_repo_stars}
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <IconSymbol name="arrow.branch" size={12} color={textSecondary} />
                    <ThemedText style={[styles.metaText, { color: textSecondary }]}>
                      {project.github_repo_forks}
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal && !tempHideCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCreateModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeCreateModal}>
              <ThemedText style={[styles.modalCancel, { color: buttonDanger }]}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={[styles.modalTitle, { color: textColor }]}>
              New Project
            </ThemedText>
            <TouchableOpacity
              onPress={handleCreateProject}
              disabled={!selectedRepo || !projectName.trim() || creating}
              style={{ opacity: !selectedRepo || !projectName.trim() || creating ? 0.5 : 1 }}
            >
              {creating ? (
                <ActivityIndicator size="small" color={buttonPrimary} />
              ) : (
                <ThemedText style={[styles.modalSave, { color: buttonPrimary }]}>Create</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formSection}>
              <ThemedText style={[styles.label, { color: textColor }]}>Repository</ThemedText>
              <TouchableOpacity
                style={[styles.repositorySelector, {
                  backgroundColor: surfaceColor,
                  borderColor: borderColor
                }]}
                onPress={openRepoModal}
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
            </View>

            <View style={styles.formSection}>
              <ThemedText style={[styles.label, { color: textColor }]}>Project Name</ThemedText>
              <View style={[styles.inputWrapper, { backgroundColor: surfaceColor, borderColor }]}>
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={projectName}
                  onChangeText={setProjectName}
                  placeholder="Enter project name"
                  placeholderTextColor={textSecondary}
                  maxLength={100}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <ThemedText style={[styles.label, { color: textColor }]}>Description (Optional)</ThemedText>
              <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: surfaceColor, borderColor }]}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: textColor }]}
                  value={projectDescription}
                  onChangeText={setProjectDescription}
                  placeholder="Enter project description"
                  placeholderTextColor={textSecondary}
                  multiline
                  maxLength={500}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showRepoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeRepoModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeRepoModal}>
              <ThemedText style={[styles.modalCancel, { color: buttonDanger }]}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText type="defaultSemiBold" style={[styles.modalTitle, { color: textColor }]}>
              Select Repository
            </ThemedText>
            <View style={{ width: 60 }} />
          </View>

          {loadingRepos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText style={[styles.loadingText, { color: textSecondary }]}>Loading repositories...</ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {repositories.map((repo) => (
                <TouchableOpacity
                  key={repo.id}
                  style={[styles.repoItem, { borderBottomColor: borderColor }]}
                  onPress={() => selectRepository(repo)}
                  activeOpacity={0.7}
                >
                  <View style={styles.repoHeader}>
                    <View style={[styles.repoIcon, { backgroundColor: buttonPrimary + '20' }]}>
                      <IconSymbol name="folder" size={16} color={buttonPrimary} />
                    </View>
                    <View style={styles.repoInfo}>
                      <ThemedText type="defaultSemiBold" style={[styles.repoName, { color: textColor }]}>
                        {repo.name}
                      </ThemedText>
                      <ThemedText style={[styles.repoFullName, { color: textSecondary }]}>
                        {repo.full_name}
                      </ThemedText>
                    </View>
                    {repo.private && (
                      <View style={[styles.privateBadge, { backgroundColor: textSecondary + '20' }]}>
                        <ThemedText style={[styles.privateBadgeText, { color: textSecondary }]}>Private</ThemedText>
                      </View>
                    )}
                  </View>

                  {repo.description && (
                    <ThemedText style={[styles.repoDescription, { color: textSecondary }]} numberOfLines={2}>
                      {repo.description}
                    </ThemedText>
                  )}

                  <View style={styles.repoMeta}>
                    {repo.language && (
                      <View style={styles.metaItem}>
                        <IconSymbol name="circle.fill" size={10} color={tintColor} />
                        <ThemedText style={[styles.metaText, { color: textSecondary }]}>
                          {repo.language}
                        </ThemedText>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <IconSymbol name="star" size={10} color={textSecondary} />
                      <ThemedText style={[styles.metaText, { color: textSecondary }]}>
                        {repo.stargazers_count}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
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
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonIcon: {
    marginRight: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  projectsList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  projectCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  projectRepo: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  projectDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textAreaWrapper: {
    paddingVertical: 16,
    minHeight: 100,
  },
  input: {
    fontSize: 16,
    flex: 1,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  repositorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  repositorySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  repositorySelectorText: {
    fontSize: 16,
    marginLeft: 12,
  },
  repoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repoItem: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  repoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  repoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  repoInfo: {
    flex: 1,
  },
  repoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  repoFullName: {
    fontSize: 14,
  },
  privateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  privateBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  repoDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
