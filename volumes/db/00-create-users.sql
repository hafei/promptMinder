-- =====================================================
-- 创建 Supabase 所需的其他数据库用户
-- 注意：supabase_admin 用户由 Supabase 镜像自动创建
-- =====================================================

-- 1. authenticator - 用于 PostgREST 匿名访问
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created authenticator role';
    END IF;
END
$$;

-- 3. pgbouncer - 用于连接池
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pgbouncer') THEN
        CREATE ROLE pgbouncer NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created pgbouncer role';
    END IF;
END
$$;

-- 4. supabase_auth_admin - 用于 GoTrue 认证服务
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created supabase_auth_admin role';
    END IF;
END
$$;

-- 5. supabase_functions_admin - 用于 Edge Functions
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_functions_admin') THEN
        CREATE ROLE supabase_functions_admin NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created supabase_functions_admin role';
    END IF;
END
$$;

-- 6. supabase_storage_admin - 用于 Storage API
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE ROLE supabase_storage_admin NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created supabase_storage_admin role';
    END IF;
END
$$;

-- 7. postgres - 标准 postgres 用户（如果不存在）
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres') THEN
        CREATE ROLE postgres NOINHERIT LOGIN PASSWORD 'promptminder' SUPERUSER;
        RAISE NOTICE 'Created postgres role';
    END IF;
END
$$;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE promptminder TO supabase_admin;
GRANT CONNECT ON DATABASE promptminder TO supabase_auth_admin;
GRANT CONNECT ON DATABASE promptminder TO supabase_functions_admin;
GRANT CONNECT ON DATABASE promptminder TO supabase_storage_admin;
GRANT CONNECT ON DATABASE promptminder TO authenticator;
GRANT ALL PRIVILEGES ON DATABASE postgres TO postgres;