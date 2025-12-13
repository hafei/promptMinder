-- =====================================================
-- 创建 Supabase 所需的数据库用户
-- =====================================================

-- 使用硬编码密码，因为环境变量在初始化时可能不可用
-- 这些用户会被 Supabase 的各种服务使用

-- 1. authenticator - 用于 PostgREST 匿名访问
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'promptminder';
    END IF;
END
$$;

-- 2. pgbouncer - 用于连接池
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pgbouncer') THEN
        CREATE ROLE pgbouncer NOINHERIT LOGIN PASSWORD 'promptminder';
    END IF;
END
$$;

-- 3. supabase_auth_admin - 用于 GoTrue 认证服务
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD 'promptminder';
    END IF;
END
$$;

-- 4. supabase_functions_admin - 用于 Edge Functions
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_functions_admin') THEN
        CREATE ROLE supabase_functions_admin NOINHERIT LOGIN PASSWORD 'promptminder';
    END IF;
END
$$;

-- 5. supabase_storage_admin - 用于 Storage API
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE ROLE supabase_storage_admin NOINHERIT LOGIN PASSWORD 'promptminder';
    END IF;
END
$$;

-- 6. supabase_admin - Supabase 管理员用户
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin NOINHERIT LOGIN PASSWORD 'promptminder';
    END IF;
END
$$;

-- 7. postgres - 标准 postgres 用户（如果不存在）
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
        CREATE ROLE postgres NOINHERIT LOGIN PASSWORD 'promptminder' SUPERUSER;
    END IF;
END
$$;

-- 授予权限
GRANT ALL PRIVILEGES ON ALL DATABASES IN SCHEMA public TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL DATABASES IN SCHEMA public TO postgres;