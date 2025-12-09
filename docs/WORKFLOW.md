# PromptMinder 开发部署工作流

## 🎯 工作流概述

1. **开发阶段**：Docker 后端 + `npm run dev` 前端
2. **构建阶段**：打包前端为 Docker 镜像
3. **部署阶段**：完整 Docker Compose 部署

## 🚀 开发阶段（日常开发）

### 1. 启动后端服务
```bash
# 启动所有后端服务（数据库、认证、存储等）
npm run dev:backend
```

### 2. 创建管理员账户（首次）
```bash
npm run dev:admin
```

### 3. 启动前端开发服务器
```bash
npm run dev
```

### 4. 开发调试
- 前端：http://localhost:3000（热重载）
- 数据库：localhost:5432（直接连接）
- Supabase Studio：http://localhost:3333
- 后端日志：`npm run dev:backend:logs`

## 📦 构建阶段（准备部署）

### 1. 构建前端
```bash
npm run build
```

### 2. 构建 Docker 镜像
```bash
# 带时间戳的标签
npm run build:docker:tag

# 或 latest 标签
npm run build:docker
```

### 3. 测试镜像
```bash
# 启动完整环境测试
docker-compose -f docker-compose.prod.yml up -d

# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f web
```

## 🚀 部署阶段（生产部署）

### 1. 完整构建和部署
```bash
npm run prod:build
```

### 2. 管理部署
```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
npm run prod:logs

# 停止服务
npm run prod:down

# 重启服务
docker-compose -f docker-compose.prod.yml restart web
```

## 📁 文件结构

```
PromptMinder/
├── docker-compose.backend.yml    # 开发环境 - 仅后端
├── docker-compose.prod.yml       # 生产环境 - 完整部署
├── docker-compose.yml             # 原始配置
├── docker/kong/
│   ├── kong.yml                  # 开发环境配置
│   └── kong.prod.yml             # 生产环境配置
├── scripts/
│   ├── create-admin-docker.sh    # 创建管理员脚本
│   └── quick-test.sh             # 快速测试脚本
└── docs/
    ├── LOCAL_DEVELOPMENT_TESTING.md
    └── QUICK_TEST_GUIDE.md
```

## 🛠️ 环境变量配置

### 开发环境 (.env.local)
```bash
# 数据库连接
POSTGRES_URL=postgresql://promptminder:promptminder@localhost:5432/promptminder

# Supabase 配置
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# 认证配置
AUTH_SECRET=your-auth-secret-key
JWT_SECRET=your-jwt-secret

# 应用配置
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# 邮件配置（可选，开发模式下可跳过）
# RESEND_API_KEY=your-resend-key
# FROM_EMAIL=noreply@yourdomain.com
```

### 生产环境 (.env)
```bash
# 数据库配置
POSTGRES_USER=promptminder
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=promptminder

# Supabase 配置
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
JWT_SECRET=your-jwt-secret-32-chars

# 认证配置
AUTH_SECRET=your-auth-secret-key-32-chars

# 应用配置
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
APP_PORT=3000

# 邮件配置
RESEND_API_KEY=your-resend-key
FROM_EMAIL=noreply@yourdomain.com

# AI 服务配置
CUSTOM_API_KEY=your-ai-api-key
```

## 🧪 测试检查清单

### 开发阶段测试
- [ ] 后端服务启动正常
- [ ] 管理员账户创建成功
- [ ] 前端热重载正常
- [ ] 邀请注册功能完整
- [ ] 数据库连接正常

### 构建阶段测试
- [ ] 前端构建成功
- [ ] Docker 镜像构建成功
- [ ] 镜像运行正常

### 生产阶段测试
- [ ] 所有服务启动正常
- [ ] 网络访问正常
- [ ] 数据持久化正常
- [ ] 负载均衡正常

## 🔧 故障排除

### 常见问题及解决方案

#### 1. Auth 服务启动失败
```bash
# 错误：required key GOTRUE_SITE_URL missing value
# 解决：确保环境变量中包含 GOTRUE_SITE_URL
```

#### 2. 数据库连接失败
```bash
# 检查数据库容器状态
docker-compose -f docker-compose.backend.yml ps db

# 查看数据库日志
docker-compose -f docker-compose.backend.yml logs db
```

#### 3. 前端无法连接后端
```bash
# 检查 Kong 状态
curl http://localhost:8000/

# 查看服务映射
docker-compose -f docker-compose.backend.yml ps
```

#### 4. 邮件发送失败
```bash
# 开发模式下邮件是模拟的，检查控制台输出
# 生产环境检查 RESEND_API_KEY 和 FROM_EMAIL 配置
```

## 📈 性能优化建议

### 开发环境
- 使用 SSD 提升数据库性能
- 适当增加 Docker 内存限制
- 开启数据库连接池

### 生产环境
- 使用负载均衡器
- 配置 CDN 加速静态资源
- 启用 Redis 缓存（可选）
- 配置监控和日志收集

## 🔄 CI/CD 集成

### GitHub Actions 示例
```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Build application
        run: npm run build
      - name: Build Docker image
        run: npm run build:docker
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.prod.yml up -d
```

这个工作流让你可以在开发环境中享受快速迭代，在生产环境中获得稳定可靠的部署。