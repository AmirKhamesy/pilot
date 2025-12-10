-- Create projects table
-- This table stores user projects, each linked to a GitHub repository

CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    github_repo_id BIGINT NOT NULL, -- GitHub repository ID
    github_repo_name TEXT NOT NULL, -- Repository name (e.g., "my-repo")
    github_repo_full_name TEXT NOT NULL, -- Full repository name (e.g., "username/my-repo")
    github_repo_url TEXT NOT NULL, -- Repository URL
    github_repo_private BOOLEAN DEFAULT FALSE, -- Whether the repository is private
    github_repo_language TEXT, -- Primary language of the repository
    github_repo_description TEXT, -- Repository description from GitHub
    github_repo_stars INTEGER DEFAULT 0, -- Number of stars
    github_repo_forks INTEGER DEFAULT 0, -- Number of forks
    github_repo_updated_at TIMESTAMP WITH TIME ZONE, -- Last updated on GitHub
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);

-- Create index on github_repo_id to prevent duplicate projects for same repo
CREATE INDEX IF NOT EXISTS projects_github_repo_id_idx ON projects(github_repo_id);

-- Create unique constraint to prevent duplicate projects for same user/repo combination
CREATE UNIQUE INDEX IF NOT EXISTS projects_user_repo_unique_idx ON projects(user_id, github_repo_id);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own projects
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own projects
CREATE POLICY "Users can insert own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own projects
CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own projects
CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();