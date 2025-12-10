import { GitHubRepository } from "@/types/github";
import { CreateProjectData, Project, UpdateProjectData } from "@/types/project";
import { supabase } from "./supabase";

export class ProjectService {
  async getUserProjects(userId: string): Promise<Project[]> {
    console.log("DEBUG: getUserProjects called with userId:", userId);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DEBUG: Error fetching projects:", error);
      throw new Error("Failed to fetch projects");
    }

    console.log("DEBUG: getUserProjects result:", data);
    return data || [];
  }

  async getProject(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching project:", error);
      throw new Error("Failed to fetch project");
    }

    return data;
  }

  async createProject(
    userId: string,
    projectData: CreateProjectData
  ): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          user_id: userId,
          ...projectData,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      if (error.code === "23505") {
        throw new Error("A project already exists for this repository");
      }
      throw new Error("Failed to create project");
    }

    return data;
  }

  async updateProject(
    projectId: string,
    updates: UpdateProjectData
  ): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      console.error("Error updating project:", error);
      throw new Error("Failed to update project");
    }

    return data;
  }

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      console.error("Error deleting project:", error);
      throw new Error("Failed to delete project");
    }
  }

  async hasProjectForRepo(userId: string, repoId: number): Promise<boolean> {
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .eq("github_repo_id", repoId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking project existence:", error);
      return false;
    }

    return !!data;
  }

  createProjectDataFromRepo(
    repo: GitHubRepository,
    name?: string,
    description?: string
  ): CreateProjectData {
    return {
      name: name || repo.name,
      description: description || repo.description || undefined,
      github_repo_id: repo.id,
      github_repo_name: repo.name,
      github_repo_full_name: repo.full_name,
      github_repo_url: repo.html_url,
      github_repo_private: repo.private,
      github_repo_language: repo.language || undefined,
      github_repo_description: repo.description || undefined,
      github_repo_stars: repo.stargazers_count,
      github_repo_forks: repo.forks_count,
      github_repo_updated_at: repo.updated_at || undefined,
    };
  }
}

export const projectService = new ProjectService();
