-- =====================================================
-- 提示词表 (prompts) - 支持版本管理
-- =====================================================
-- 生成8位 prompt_id 的函数（类似 Git commit hash）
CREATE OR REPLACE FUNCTION generate_prompt_id() RETURNS TEXT AS $$
BEGIN
    RETURN lower(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id TEXT NOT NULL DEFAULT generate_prompt_id(),  -- 8位稳定标识，同一prompt所有版本共享
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    user_id TEXT,
    version TEXT,
    tags TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    cover_img TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_prompt_title_not_empty CHECK (char_length(trim(title)) > 0),
    CONSTRAINT chk_prompt_id_format CHECK (char_length(prompt_id) = 8),
    UNIQUE(team_id, prompt_id, version)  -- 同一团队下 prompt_id + version 唯一
);

CREATE INDEX IF NOT EXISTS idx_prompts_team_id ON prompts(team_id);
CREATE INDEX IF NOT EXISTS idx_prompts_created_by ON prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_prompts_project_id ON prompts(project_id);
CREATE INDEX IF NOT EXISTS idx_prompts_prompt_id ON prompts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompts_team_prompt ON prompts(team_id, prompt_id);
