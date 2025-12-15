-- API Keys表 - 用于外部访问
-- 此表存储允许外部应用程序访问团队资源的API密钥

-- 创建api_keys表
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '["read:prompts"]'::jsonb,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引以提升性能
CREATE INDEX IF NOT EXISTS idx_api_keys_team_id ON api_keys(team_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at DESC);

-- 创建api_usage_logs表用于追踪API使用情况
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_at TIMESTAMPTZ DEFAULT now()
);

-- 为使用日志查询创建索引
-- 简单索引，避免使用date_trunc函数
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_request_at ON api_usage_logs(request_at DESC);

-- 添加注释说明
COMMENT ON TABLE api_keys IS '存储用于外部访问团队资源的API密钥';
COMMENT ON COLUMN api_keys.key_hash IS '使用bcrypt哈希的API密钥';
COMMENT ON COLUMN api_keys.key_prefix IS 'API密钥的前几个字符，用于识别';
COMMENT ON COLUMN api_keys.permissions IS '此密钥拥有的权限JSON数组';
COMMENT ON COLUMN api_keys.expires_at IS '密钥过期时间，NULL表示永不过期';
COMMENT ON COLUMN api_keys.last_used_at IS '最后一次成功API使用的时间戳';
COMMENT ON COLUMN api_keys.usage_count IS '此密钥被使用的总次数';

COMMENT ON TABLE api_usage_logs IS '所有使用API密钥的API请求日志';
COMMENT ON COLUMN api_usage_logs.response_time_ms IS '处理请求所需的时间（毫秒）';

-- 创建更新updated_at时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为api_keys表创建触发器
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();