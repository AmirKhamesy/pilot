import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  GitHubComment,
  GitHubConnection,
  GitHubIssue,
  GitHubOAuthTokens,
  GitHubRepository,
  GitHubUser,
} from "../types/github";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.EXPO_PUBLIC_GITHUB_CLIENT_SECRET;

const discovery = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  revocationEndpoint:
    "https://github.com/settings/connections/applications/" + GITHUB_CLIENT_ID,
};

export class GitHubService {
  private static instance: GitHubService;
  private request: AuthSession.AuthRequest | null = null;

  private constructor() {}

  public static getInstance(): GitHubService {
    if (!GitHubService.instance) {
      GitHubService.instance = new GitHubService();
    }
    return GitHubService.instance;
  }

  public async initializeOAuth(): Promise<AuthSession.AuthRequest> {
    if (!GITHUB_CLIENT_ID) {
      throw new Error(
        "GitHub Client ID is not configured. Please set EXPO_PUBLIC_GITHUB_CLIENT_ID in your environment variables."
      );
    }

    this.request = new AuthSession.AuthRequest({
      clientId: GITHUB_CLIENT_ID,
      scopes: ["user:email", "repo"],
      redirectUri: "pilot://auth/github/callback",
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false, // handling token exchange manually
    });

    await this.request.makeAuthUrlAsync(discovery);
    return this.request;
  }

  public async startOAuthFlow(): Promise<AuthSession.AuthSessionResult> {
    if (!this.request) {
      await this.initializeOAuth();
    }

    if (!this.request) {
      throw new Error("Failed to initialize OAuth request");
    }

    const result = await this.request.promptAsync(discovery);

    return result;
  }

  public async exchangeCodeForToken(code: string): Promise<GitHubOAuthTokens> {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      throw new Error("GitHub OAuth credentials are not configured");
    }

    try {
      const response = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
          }),
        }
      );

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(
          `Failed to exchange code for token: ${response.status} ${response.statusText}. Response: ${responseText}`
        );
      }

      let tokens;
      try {
        tokens = JSON.parse(responseText);
      } catch {
        throw new Error(`Failed to parse GitHub response: ${responseText}`);
      }

      if (tokens.error) {
        throw new Error(
          `GitHub OAuth error: ${tokens.error_description || tokens.error}`
        );
      }

      if (!tokens.access_token) {
        throw new Error(
          `No access token received. Response: ${JSON.stringify(tokens)}`
        );
      }

      return tokens;
    } catch (error) {
      console.error("Token exchange error:", error);
      throw error;
    }
  }

  public async getUser(accessToken: string): Promise<GitHubUser> {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Pilot-App",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }

    return response.json();
  }

  public async getUserRepositories(
    accessToken: string,
    page: number = 1,
    perPage: number = 30
  ): Promise<GitHubRepository[]> {
    const response = await fetch(
      `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Pilot-App",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.statusText}`);
    }

    return response.json();
  }

  public async saveConnection(
    userId: string,
    tokens: GitHubOAuthTokens,
    githubUser: GitHubUser
  ): Promise<GitHubConnection> {
    const connectionData = {
      user_id: userId,
      github_user_id: githubUser.id,
      github_username: githubUser.login,
      github_avatar_url: githubUser.avatar_url,
      access_token: tokens.access_token,
      token_type: tokens.token_type,
      scope: tokens.scope,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("github_connections")
      .upsert(connectionData, {
        onConflict: "user_id",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save GitHub connection: ${error.message}`);
    }

    return data;
  }

  public async getConnection(userId: string): Promise<GitHubConnection | null> {
    const { data, error } = await supabase
      .from("github_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to fetch GitHub connection: ${error.message}`);
    }

    return data;
  }

  public async removeConnection(userId: string): Promise<void> {
    const { error } = await supabase
      .from("github_connections")
      .delete()
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to remove GitHub connection: ${error.message}`);
    }
  }

  public async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Pilot-App",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  public async getRepositoriesWithCache(
    connection: GitHubConnection
  ): Promise<GitHubRepository[]> {
    const isValid = await this.validateToken(connection.access_token);

    if (!isValid) {
      throw new Error(
        "GitHub access token has expired. Please reconnect your account."
      );
    }

    return this.getUserRepositories(connection.access_token);
  }

  public async getRepositoryIssues(
    accessToken: string,
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "all",
    page: number = 1,
    perPage: number = 30
  ): Promise<GitHubIssue[]> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Pilot-App",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.statusText}`);
    }

    const issues: GitHubIssue[] = await response.json();
    return issues.filter((issue) => !issue.pull_request);
  }

  public async getIssue(
    accessToken: string,
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<GitHubIssue> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Pilot-App",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch issue: ${response.statusText}`);
    }

    return response.json();
  }

  public async getIssueComments(
    accessToken: string,
    owner: string,
    repo: string,
    issueNumber: number,
    page: number = 1,
    perPage: number = 30
  ): Promise<GitHubComment[]> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Pilot-App",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }

    return response.json();
  }
}

export const githubService = GitHubService.getInstance();
