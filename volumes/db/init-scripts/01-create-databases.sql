-- =====================================================
-- 创建 Supabase 所需的数据库和 schemas
-- =====================================================

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

-- 连接到 _supabase 数据库并创建 schemas
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