# AMD64 Docker 构建指南

本指南详细说明如何使用 `Dockerfile.amd64` 构建针对 AMD64 架构优化的 Docker 镜像。

## 文件说明

- `Dockerfile.amd64`: 专门针对 AMD64 架构优化的多阶段 Dockerfile
- 使用 Debian Bookworm 基础镜像，在 AMD64 架构上有更好的兼容性和性能
- 包含安全优化（非 root 用户运行）

## 构建指令

### 基本构建

```bash
# 构建镜像
docker build -f Dockerfile.amd64 -t promptminder:amd64 .

# 运行容器
docker run -p 3000:3000 promptminder:amd64
```

### 带环境变量的构建

```bash
# 构建时传递 Supabase 环境变量
docker build \
  -f Dockerfile.amd64 \
  --build-arg SUPABASE_URL=your_supabase_url \
  --build-arg SUPABASE_ANON_KEY=your_supabase_anon_key \
  -t promptminder:amd64 .

# 运行时传递环境变量
docker run \
  -p 3000:3000 \
  -e SUPABASE_URL=your_supabase_url \
  -e SUPABASE_ANON_KEY=your_supabase_anon_key \
  promptminder:amd64
```

### 生产环境构建

```bash
# 使用 .env 文件构建
docker build \
  -f Dockerfile.amd64 \
  --env-file .env \
  -t promptminder:amd64-latest .

# 标记版本
docker tag promptminder:amd64-latest your-registry/promptminder:amd64-v1.0.0

# 推送到镜像仓库
docker push your-registry/promptminder:amd64-v1.0.0
```

### Docker Compose 使用

创建 `docker-compose.amd64.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.amd64
      args:
        SUPABASE_URL: ${SUPABASE_URL}
        SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    restart: unless-stopped
```

使用 Docker Compose 构建：

```bash
# 构建并启动
docker-compose -f docker-compose.amd64.yml up --build

# 后台运行
docker-compose -f docker-compose.amd64.yml up -d --build
```

## 优化说明

### 架构特定优化

1. **平台指定**: 使用 `--platform=linux/amd64` 确保在 AMD64 架构上构建
2. **基础镜像选择**: 
   - 构建阶段: `node:20-bookworm` (完整的 Debian 环境)
   - 运行阶段: `node:20-bookworm-slim` (精简版 Debian)

3. **包管理**: 使用 `apt-get` 替代 `apk` (Alpine 包管理器)

### 安全优化

1. **非 root 用户**: 创建并使用 `nextjs` 用户运行应用
2. **最小权限**: 只给予必要的文件权限

### 性能优化

1. **多阶段构建**: 分离构建和运行环境
2. **依赖缓存**: 使用 pnpm 的缓存机制
3. **精简运行时**: 使用 slim 版本减少镜像大小

## 故障排除

### 常见问题

1. **架构不匹配**:
   ```bash
   # 确保在 AMD64 系统上构建
   docker build --platform=linux/amd64 -f Dockerfile.amd64 -t promptminder:amd64 .

   docker build --platform=linux/amd64 -f Dockerfile.amd64 -t promptminder:v0.1.0 .
   ```

2. **依赖安装失败**:
   ```bash
   # 清理 Docker 缓存后重试
   docker builder prune -f
   docker build --no-cache -f Dockerfile.amd64 -t promptminder:amd64 .
   ```

3. **权限问题**:
   ```bash
   # 检查文件权限
   ls -la
   # 确保 Docker 有权限访问所有文件
   ```

### 调试命令

```bash
# 进入构建阶段容器调试
docker run --rm -it --platform=linux/amd64 node:20-bookworm bash

# 检查镜像架构
docker inspect promptminder:amd64 | grep Architecture

# 查看镜像历史
docker history promptminder:amd64
```

## 镜像大小对比

- **Alpine 版本**: ~500MB
- **AMD64 Debian 版本**: ~800MB
- **优势**: 更好的兼容性和性能，特别是在 AMD64 硬件上

## 生产部署建议

1. **使用镜像仓库**: 将构建好的镜像推送到私有或公共镜像仓库
2. **版本管理**: 使用语义化版本标记镜像
3. **健康检查**: 在 Dockerfile 中添加健康检查指令
4. **日志管理**: 配置适当的日志驱动和轮转策略

## 相关文件

- `Dockerfile`: 原始多架构版本
- `Dockerfile.amd64`: AMD64 专用版本
- `.dockerignore`: Docker 构建忽略文件