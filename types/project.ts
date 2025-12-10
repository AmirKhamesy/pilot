export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  github_repo_id: number;
  github_repo_name: string;
  github_repo_full_name: string;
  github_repo_url: string;
  github_repo_private: boolean;
  github_repo_language?: string;
  github_repo_description?: string;
  github_repo_stars: number;
  github_repo_forks: number;
  github_repo_updated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  github_repo_id: number;
  github_repo_name: string;
  github_repo_full_name: string;
  github_repo_url: string;
  github_repo_private: boolean;
  github_repo_language?: string;
  github_repo_description?: string;
  github_repo_stars: number;
  github_repo_forks: number;
  github_repo_updated_at?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
}
