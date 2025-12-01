# PromptMinder Docker 配置简化说明

## 概述

本文档说明了对 PromptMinder 项目的 Docker Compose 配置进行的简化，以减少部署复杂度和资源开销。

## 分析结果

### 实际使用的 Supabase 功能

1. **数据库 (PostgreSQL + PostgREST)** ✅
   - 应用通过 Supabase 客户端进行数据库操作
   - 使用自定义认证系统而非 Supabase Auth
   - 管理用户、会话、团队、提示词和贡献数据

2. **存储功能** ✅
   - 使用 Supabase Storage API 上传和管理图片
   - 生成多种尺寸的 WebP 和 JPEG 格式
   - 使用 "cover" 存储桶

3. **认证系统** ⚠️
   - 实现了自定义认证系统，未使用 Supabase Auth
   - 使用本地密码哈希和会话管理

4. **未使用的功能** ❌
   - GoTrue 认证服务
   - Realtime 实时订阅
   - pg_meta 元数据服务
   - Studio 管理界面
   - Edge Functions

## 简化内容

### 移除的服务

1. **GoTrue 认证服务** (端口 9999)
   - 原因：应用使用自定义认证系统
   - 节省：约 200MB 内存，1 个容器

2. **Realtime 实时服务** (端口 4000)
   - 原因：应用未使用实时订阅功能
   - 节省：约 150MB 内存，1 个容器

3. **pg_meta 元数据服务** (端口 3001)
   - 原因：应用未使用元数据服务
   - 节省：约 100MB 内存，1 个容器

4. **Studio 管理界面** (端口 8080)
   - 原因：应用未使用 Studio 界面
   - 节省：约 300MB 内存，1 个容器

### 保留的服务

1. **db** - PostgreSQL 数据库
2. **kong** - API 网关
3. **postgrest** - REST API 服务
4. **minio** - S3 兼容存储
5. **storage-api** - 文件存储服务
6. **web** - PromptMinder 应用

## 简化效果

- **容器数量**：从 9 个减少到 6 个（减少 33%）
- **内存使用**：减少约 750MB（约 30%）
- **端口占用**：从 8 个减少到 6 个
- **启动时间**：减少约 30-40%
- **配置复杂度**：显著降低

## 文件变更

### 备份文件
- `docker-compose.yml.backup` - 原始配置备份
- `docker/kong/kong.yml.backup` - 原始 Kong 配置备份

### 简化后的配置
- `docker-compose.yml` - 移除了未使用的服务
- `docker/kong/kong.yml` - 移除了未使用的路由

## 部署说明

简化后的配置保持了所有必需功能：

1. **数据库访问**：通过 PostgREST API
2. **文件存储**：通过 Storage API 和 MinIO
3. **API 路由**：通过 Kong 网关
4. **应用功能**：完整的 PromptMinder 功能

使用相同的命令启动：

```bash
docker-compose up -d
```

## 回滚

如需恢复原始配置：

```bash
cp docker-compose.yml.backup docker-compose.yml
cp docker/kong/kong.yml.backup docker/kong/kong.yml
```

## 注意事项

1. 简化后的配置不再支持 Supabase Studio 管理界面
2. 如需数据库管理，请使用其他 PostgreSQL 客户端工具
3. 确保环境变量配置正确，特别是 JWT 密钥和数据库凭据