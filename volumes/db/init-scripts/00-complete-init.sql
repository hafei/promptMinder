-- =====================================================
-- Supabase 完整初始化脚本
-- 创建用户、数据库和所有必要的 schema
-- =====================================================

-- 这个脚本将在数据库初始化后由 migrate.sh 调用
-- 注意：此时 supabase_admin 用户已经由 Supabase 镜像创建

-- 授予必要的权限
GRANT ALL PRIVILEGES ON DATABASE promptminder TO supabase_admin;

-- 创建 _supabase 数据库（如果不存在）
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '_supabase') THEN
        CREATE DATABASE _supabase OWNER supabase_admin;
        RAISE NOTICE 'Created _supabase database';
    END IF;
END
$$;

-- 连接到 _supabase 数据库
\c _supabase;

-- 创建所有必要的 schema
DO
$$
BEGIN
    -- _analytics schema（用于日志分析）
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = '_analytics') THEN
        CREATE SCHEMA _analytics;
        RAISE NOTICE 'Created _analytics schema';
    END IF;

    -- auth schema（用于认证相关的表）
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        CREATE SCHEMA auth;
        RAISE NOTICE 'Created auth schema';
    END IF;

    -- extensions schema（用于函数扩展）
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'extensions') THEN
        CREATE SCHEMA extensions;
        RAISE NOTICE 'Created extensions schema';
    END IF;

    -- storage schema（用于文件存储）
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        CREATE SCHEMA storage;
        RAISE NOTICE 'Created storage schema';
    END IF;

    -- _realtime schema（用于实时功能）
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = '_realtime') THEN
        CREATE SCHEMA _realtime;
        RAISE NOTICE 'Created _realtime schema';
    END IF;
END
$$;

-- 授权 schema 权限
GRANT ALL ON SCHEMA _analytics TO supabase_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA extensions TO supabase_functions_admin;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- 设置必要的权限
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON SCHEMA public TO authenticator;

-- 返回默认数据库
\c postgres;