# PromptMinder + Supabase 部署指南

本文档说明了集成了官方 Supabase 服务后的 PromptMinder 项目部署流程。

## 项目结构

```
PromptMinder/
├── docker-compose.yml              # 主配置文件（已集成官方 Supabase 服务）
├── .env                           # 环境变量配置
├── .env.example                   # 环境变量模板
├── volumes/
│   └── db/
│       ├── migrate.sh             # 修改后的官方初始化脚本
│       ├── init-scripts/
│       │   └── 00-complete-init.sql # 完整的数据库初始化脚本
│       ├── realtime.sql           # Realtime 初始化
│       ├── webhooks.sql           # Webhooks 初始化
│       ├── roles.sql              # 角色权限配置
│       ├── jwt.sql                # JWT 配置
│       ├── logs.sql               # 日志表
│       └── pooler.sql             # 连接池配置
└── docker/
    └── init-db/
        └── init.sql               # 原有项目初始化脚本
```

## 主要修改说明

### 1. Docker Compose 配置 (docker-compose.yml)

#### 关键改动：
- **数据库镜像**: 从 `postgres:15` 改为 `supabase/postgres:15.8.1.085`
- **POSTGRES_USER**: 改为 `supabase_admin`（官方镜像默认要求）
- **健康检查**: 使用 `supabase_admin` 用户
- **新增服务**: 添加了所有官方 Supabase 服务
  - studio (可视化界面)
  - auth (认证服务)
  - realtime (实时功能)
  - meta (元数据)
  - functions (边缘函数)
  - analytics (分析)
  - vector (向量搜索)
  - imgproxy (图片代理)
  - supavisor (连接池)

#### 数据库卷配置：
```yaml
volumes:
  - db-data:/var/lib/postgresql/data
  # 完整的初始化脚本（由 migrate.sh 调用）
  - ./volumes/db/init-scripts/00-complete-init.sql:/docker-entrypoint-initdb.d/init-scripts/00-complete-init.sql
  # 其他初始化脚本...
```

### 2. 初始化脚本修改

#### migrate.sh
修改了官方的 migrate.sh 脚本：
- 使用 TCP 连接避免 peer 认证问题
- 添加 supabase_admin 用户创建逻辑
- 使用 `${POSTGRES_USER:-promptminder}` 作为默认用户

#### 00-complete-init.sql
新建的完整初始化脚本，包含：
- 创建 `_supabase` 数据库
- 创建所有必要的 schema（_analytics, auth, extensions, storage, _realtime）
- 设置正确的权限

### 3. 环境变量配置

#### 新增的 Supabase 变量：
```bash
# Supabase 配置
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=postgres
POSTGRES_USER=supabase_admin

# JWT 密钥
JWT_SECRET=your-super-secret-jwt-token
JWT_EXPIRY=3600

# API 密钥
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 部署步骤

### 1. 首次部署

```bash
# 1.1 克隆或更新代码
git pull origin main

# 1.2 复制环境变量模板
cp .env.example .env

# 1.3 编辑环境变量
nano .env
# 修改必要的密码和密钥

# 1.4 创建必要的目录
mkdir -p volumes/db/{init-scripts,migrations}

# 1.5 确保脚本有执行权限
chmod +x volumes/db/migrate.sh
chmod 644 volumes/db/init-scripts/*.sql
chmod 644 volumes/db/*.sql

# 1.6 启动服务
docker-compose up -d

# 1.7 检查服务状态
docker-compose ps
```

### 2. 重置部署（如果需要）

```bash
# 2.1 停止所有服务
docker-compose down

# 2.2 清理所有卷和数据（警告：会删除所有数据）
docker system prune -f -a --volumes
docker volume rm promptminder_db-data promptminder_db-config promptminder_storage-data || true

# 2.3 重新启动
docker-compose up -d
```

### 3. 验证部署

访问以下地址验证服务：

- **PromptMinder 主应用**: http://localhost:3000
- **Supabase Studio**: http://localhost:8083
  - 默认用户: `supabase_admin`
  - 密码: 您在 .env 中设置的密码

## 服务健康检查

使用以下命令检查服务状态：

```bash
# 查看所有服务状态
docker-compose ps

# 查看特定服务日志
docker-compose logs -f db
docker-compose logs -f studio
docker-compose logs -f auth
```

## 常见问题

### 1. 数据库初始化失败

如果看到以下错误：
```
PostgreSQL Database directory appears to contain a database; Skipping initialization
```

解决方案：
```bash
# 完全清理数据
docker-compose down
docker system prune -f -a --volumes
docker volume ls | grep promptminder
docker volume rm promptminder_db-data
```

### 2. 权限问题

如果脚本无法执行：
```bash
# 检查权限
ls -la volumes/db/*.sql
ls -la volumes/db/init-scripts/*.sql

# 修复权限
chmod 644 volumes/db/*.sql
chmod 644 volumes/db/init-scripts/*.sql
```

### 3. 服务连接失败

如果服务无法连接数据库：
- 检查环境变量是否正确
- 确保 `POSTGRES_PASSWORD` 在所有地方都一致
- 查看服务日志：`docker-compose logs -f [service_name]`

## 开发建议

1. **数据备份**：定期备份 `volumes/db-data` 目录
2. **密钥管理**：生产环境请使用强密码并定期更换
3. **监控**：使用 `docker-compose logs` 监控服务状态
4. **更新**：更新前备份数据，然后 `docker-compose pull && docker-compose up -d`

## 架构说明

集成后的架构：

```
┌─────────────────┐    ┌─────────────────┐
│   PromptMinder  │    │  Supabase Studio│
│   (web:3000)    │    │  (studio:8083) │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌─────────────────┐
         │  Kong API       │
         │  Gateway (8000) │
         └─────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐    ┌──────▼──────┐    ┌───▼───┐
│ Auth  │    │  PostgREST   │    │Storage│
│(9999) │    │   (3000)     │    │(5000) │
└───────┘    └─────────────┘    └───────┘
    │                │                │
    └────────────────┼────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │         PostgreSQL DB           │
    │      (db:5432/supabase_admin)   │
    └─────────────────────────────────┘
```

## 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase Docker 部署](https://supabase.com/docs/guides/self-hosting/docker)
- [PromptMinder 项目文档](./README.md)