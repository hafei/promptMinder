-- =====================================================
-- Supabase 初始化主脚本
-- 必须首先执行，在所有其他脚本之前
-- 执行上下文：postgres (默认)
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS dblink;
CREATE EXTENSION IF NOT EXISTS http;

-- =====================================================
-- 1. 创建 Supabase 所需的数据库用户
-- =====================================================

-- 创建 supabase_admin 用户（管理员）
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE USER supabase_admin WITH SUPERUSER NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created supabase_admin user';
    END IF;
END
$$;

-- 创建 authenticator - 用于 PostgREST 匿名访问
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created authenticator role';
    END IF;
END
$$;

-- 创建 pgbouncer - 用于连接池
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pgbouncer') THEN
        CREATE ROLE pgbouncer NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created pgbouncer role';
    END IF;
END
$$;

-- 创建 supabase_auth_admin - 用于 GoTrue 认证服务
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created supabase_auth_admin role';
    END IF;
END
$$;

-- 创建 supabase_functions_admin - 用于 Edge Functions
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_functions_admin') THEN
        CREATE ROLE supabase_functions_admin NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created supabase_functions_admin role';
    END IF;
END
$$;

-- 创建 supabase_storage_admin - 用于 Storage API
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE ROLE supabase_storage_admin NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created supabase_storage_admin role';
    END IF;
END
$$;

-- 创建 postgres - 标准 postgres 用户（如果不存在）
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
        CREATE ROLE postgres NOINHERIT LOGIN PASSWORD 'promptminder' SUPERUSER;
        RAISE NOTICE 'Created postgres role';
    END IF;
END
$$;

-- =====================================================
-- 2. 创建 _supabase 数据库
-- =====================================================

SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '_supabase'
  AND pid <> pg_backend_pid();

CREATE DATABASE _supabase OWNER supabase_admin;

-- =====================================================
-- 3. 在 _supabase 数据库中创建必要的 schemas
-- =====================================================

\c _supabase;

CREATE SCHEMA IF NOT EXISTS _analytics AUTHORIZATION supabase_admin;
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION supabase_functions_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;
CREATE SCHEMA IF NOT EXISTS _realtime AUTHORIZATION supabase_admin;

-- 授权权限
GRANT ALL ON SCHEMA _analytics TO supabase_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA extensions TO supabase_functions_admin;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- 回到 postgres 数据库
\c postgres;
