-- =====================================================
-- Supabase Storage API 初始化脚本
-- 此脚本创建 Storage API 所需的表和结构
-- =====================================================

-- 创建 storage schema
CREATE SCHEMA IF NOT EXISTS storage;

-- 创建存储桶表
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner text,
    public boolean DEFAULT false NOT NULL,
    avif_autodetection boolean DEFAULT false NOT NULL,
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT buckets_name_check CHECK ((char_length(name) > 0)),
    CONSTRAINT buckets_pkey PRIMARY KEY (id),
    CONSTRAINT buckets_name_key UNIQUE (name)
);

-- 创建对象表
CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text NOT NULL,
    name text NOT NULL,
    owner text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    last_accessed_at timestamptz DEFAULT now() NOT NULL,
    file_size bigint,
    etag text,
    metadata jsonb DEFAULT '{}'::jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    CONSTRAINT objects_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets (id) ON DELETE CASCADE,
    CONSTRAINT objects_name_check CHECK ((char_length(name) > 0)),
    CONSTRAINT objects_pkey PRIMARY KEY (bucket_id, name)
);

-- 创建迁移表
CREATE TABLE IF NOT EXISTS storage.migrations (
    id bigint NOT NULL,
    name text NOT NULL,
    hash text NOT NULL,
    executed_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT migrations_pkey PRIMARY KEY (id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS objects_bucket_id_idx ON storage.objects USING btree (bucket_id);
CREATE INDEX IF NOT EXISTS objects_name_idx ON storage.objects USING btree (name);
CREATE INDEX IF NOT EXISTS objects_owner_idx ON storage.objects USING btree (owner);
CREATE INDEX IF NOT EXISTS objects_bucket_id_name_idx ON storage.objects USING btree (bucket_id, name);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION storage.updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER on_buckets_update BEFORE UPDATE ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.updated_at();
CREATE TRIGGER on_objects_update BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.updated_at();

-- 启用 RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view their own buckets" ON storage.buckets FOR SELECT USING (auth.role() = 'authenticated' AND bucket_id = ANY(current_setting('app.buckets', true)::text[]));
CREATE POLICY "Users can insert their own buckets" ON storage.buckets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own buckets" ON storage.buckets FOR UPDATE USING (auth.role() = 'authenticated' AND bucket_id = ANY(current_setting('app.buckets', true)::text[]));
CREATE POLICY "Users can view public buckets" ON storage.buckets FOR SELECT USING (auth.role() = 'authenticated' AND public = true);

CREATE POLICY "Users can view their own objects" ON storage.objects FOR SELECT USING (auth.role() = 'authenticated' AND bucket_id = ANY(current_setting('app.buckets', true)::text[]));
CREATE POLICY "Users can insert their own objects" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own objects" ON storage.objects FOR UPDATE USING (auth.role() = 'authenticated' AND bucket_id = ANY(current_setting('app.buckets', true)::text[]));
CREATE POLICY "Users can delete their own objects" ON storage.objects FOR DELETE USING (auth.role() = 'authenticated' AND bucket_id = ANY(current_setting('app.buckets', true)::text[]));

-- 授予权限
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO anon;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT SELECT ON TABLES TO anon;

-- 创建默认存储桶
INSERT INTO storage.buckets (id, name, public, owner)
VALUES ('supabase', 'supabase', true, 'service_role')
ON CONFLICT (id) DO NOTHING;

-- 创建 auth 扩展（如果不存在）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建 auth 函数（如果不存在）
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')::text;
$$;

-- 创建 auth.uid 函数（如果不存在）
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.sub', true), '00000000-0000-0000-0000-000000000000')::uuid;
$$;

-- 创建 auth.email 函数（如果不存在）
CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.email', true), '')::text;
$$;

-- 初始化完成
DO $$
BEGIN
    RAISE NOTICE 'Supabase Storage API 数据库结构初始化完成！';
END
$$;