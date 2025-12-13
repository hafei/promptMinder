-- =====================================================
-- 在主数据库中初始化扩展和函数相关的 schema
-- 执行上下文：promptminder 数据库
-- =====================================================

-- 创建标准的 Supabase 角色（如果不存在）
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOINHERIT SUPERUSER;
    END IF;
END
$$;

-- 创建 extensions schema 用于存储 SQL 扩展
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 在 extensions schema 中创建 pg_net 扩展
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 创建 supabase_functions schema 用于 Edge Functions 和 webhooks
CREATE SCHEMA IF NOT EXISTS supabase_functions AUTHORIZATION supabase_admin;
GRANT USAGE ON SCHEMA supabase_functions TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA supabase_functions GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- supabase_functions.migrations 表
CREATE TABLE IF NOT EXISTS supabase_functions.migrations (
  version text PRIMARY KEY,
  inserted_at timestamptz NOT NULL DEFAULT NOW()
);

-- supabase_functions.hooks 表
CREATE TABLE IF NOT EXISTS supabase_functions.hooks (
  id bigserial PRIMARY KEY,
  hook_table_id integer NOT NULL,
  hook_name text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  request_id text
);

-- 初始化 migration
INSERT INTO supabase_functions.migrations (version) VALUES ('initial')
ON CONFLICT (version) DO NOTHING;

-- 授予权限
GRANT ALL ON supabase_functions.migrations TO postgres, anon, authenticated, service_role;
GRANT ALL ON supabase_functions.hooks TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON SCHEMA public TO authenticator;
