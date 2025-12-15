-- api_keys 和 api_usage_logs 表的行级安全(RLS)策略

-- 启用 api_keys 表的 RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 启用 api_usage_logs 表的 RLS
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- 如果策略存在则先删除（保证幂等性）
DROP POLICY IF EXISTS "团队成员可以查看其团队的API Keys" ON api_keys;
DROP POLICY IF EXISTS "团队管理员可以创建API Keys" ON api_keys;
DROP POLICY IF EXISTS "团队管理员可以更新API Keys" ON api_keys;
DROP POLICY IF EXISTS "团队管理员可以删除API Keys" ON api_keys;

-- 删除使用日志策略（如果存在）
DROP POLICY IF EXISTS "团队成员可以查看其团队的API使用日志" ON api_usage_logs;
DROP POLICY IF EXISTS "系统可以插入API使用日志" ON api_usage_logs;

-- 策略：团队成员可以查看其团队的API Keys
CREATE POLICY "团队成员可以查看其团队的API Keys" ON api_keys
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()::text AND status = 'active'
    )
  );

-- 策略：团队管理员可以创建API Keys
CREATE POLICY "团队管理员可以创建API Keys" ON api_keys
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()::text AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

-- 策略：团队管理员可以更新API Keys
CREATE POLICY "团队管理员可以更新API Keys" ON api_keys
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()::text AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

-- 策略：团队管理员可以删除API Keys
CREATE POLICY "团队管理员可以删除API Keys" ON api_keys
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()::text AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

-- 策略：团队成员可以查看其团队的API使用日志
CREATE POLICY "团队成员可以查看其团队的API使用日志" ON api_usage_logs
  FOR SELECT USING (
    api_key_id IN (
      SELECT id FROM api_keys
      WHERE team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid()::text AND status = 'active'
      )
    )
  );

-- 策略：系统（服务角色）可以插入API使用日志
-- 这允许API中间件在无需用户认证的情况下记录使用情况
CREATE POLICY "系统可以插入API使用日志" ON api_usage_logs
  FOR INSERT WITH CHECK (
    -- 此策略绕过RLS的服务角色
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- 创建检查用户是否在团队中拥有特定角色的函数
CREATE OR REPLACE FUNCTION user_has_team_role(p_user_id TEXT, p_team_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = p_user_id
    AND team_id = p_team_id
    AND status = 'active'
    AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予必要的权限
GRANT SELECT, INSERT ON api_usage_logs TO authenticated;
GRANT SELECT ON api_usage_logs TO anon; -- 用于潜在的公开统计

-- 授予API Keys的必要权限
GRANT ALL ON api_keys TO authenticated;