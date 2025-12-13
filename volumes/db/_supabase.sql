-- =====================================================
-- Supabase 初始化脚本
-- 创建用户和数据库
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS dblink;

-- =====================================================
-- 创建 Supabase 所需的数据库用户
-- =====================================================

-- 使用硬编码密码，因为环境变量在初始化时可能不可用

-- 1. 创建 supabase_admin 用户（管理员）
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE USER supabase_admin WITH SUPERUSER NOINHERIT LOGIN PASSWORD 'promptminder';
        RAISE NOTICE 'Created supabase_admin user';
    END IF;
END
$$;

-- 2. authenticator - 用于 PostgREST 匿名访问
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

-- =====================================================
-- 创建数据库
-- =====================================================

\set pguser `echo "$POSTGRES_USER"`

-- 创建 _supabase 数据库
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '_supabase') THEN
        CREATE DATABASE _supabase OWNER supabase_admin;
        RAISE NOTICE 'Created _supabase database';
    END IF;
END
$$;

-- 如果不存在，则用默认用户创建
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '_supabase') THEN
        CREATE DATABASE _supabase WITH OWNER :pguser;
        RAISE NOTICE 'Created _supabase database with default owner';
    END IF;
END
$$;

-- =====================================================
-- 在 _supabase 数据库中创建必要的 schema
-- =====================================================

-- 连接到 _supabase 数据库
\c _supabase;

-- 创建所有必要的 schema
DO
$$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = '_analytics') THEN
        CREATE SCHEMA _analytics;
        RAISE NOTICE 'Created _analytics schema';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        CREATE SCHEMA auth;
        RAISE NOTICE 'Created auth schema';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'extensions') THEN
        CREATE SCHEMA extensions;
        RAISE NOTICE 'Created extensions schema';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        CREATE SCHEMA storage;
        RAISE NOTICE 'Created storage schema';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = '_realtime') THEN
        CREATE SCHEMA _realtime;
        RAISE NOTICE 'Created _realtime schema';
    END IF;
END
$$;

-- 授权
GRANT ALL ON SCHEMA _analytics TO supabase_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA extensions TO supabase_functions_admin;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- 返回默认数据库
\c postgres;