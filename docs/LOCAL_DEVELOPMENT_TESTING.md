# 本地开发环境测试指南

## 使用 npm run dev 测试邀请注册系统

### 1. 本地数据库设置

由于你使用 Docker 部署数据库，而前端使用 `npm run dev`，有两种方案：

#### 方案一：直接连接 Docker 中的数据库（推荐）

1. 确保 Docker 中的数据库服务正在运行：
```bash
# 只启动数据库服务
docker-compose up -d db

# 或者启动所有后端服务（如果需要）
docker-compose up -d db kong postgrest auth storage-api
```

2. 修改本地开发环境变量，连接到 Docker 数据库：

创建 `.env.local` 文件：
```bash
# 连接到 Docker 中的数据库
POSTGRES_USER=promptminder
POSTGRES_PASSWORD=promptminder
POSTGRES_DB=promptminder
POSTGRES_URL=postgresql://promptminder:promptminder@localhost:5432/promptminder

# 暴露数据库端口到本地（在 docker-compose.yml 中取消注释）
# ports:
#   - '5432:5432'

# Supabase 配置
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.CHANGE_THIS
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.CHANGE_THIS

# 邮件配置（开发模式可以不配置）
# RESEND_API_KEY=
# FROM_EMAIL=

# 认证配置
AUTH_SECRET=your-auth-secret-key-min-32-chars-here
JWT_SECRET=super-secret-jwt-key-with-at-least-32-characters-1234

# 应用配置
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ADMIN_USERNAMES=admin
```

#### 方案二：使用本地 PostgreSQL

如果你更喜欢完全本地开发：

1. 安装本地 PostgreSQL
2. 运行初始化脚本：
```bash
psql -U postgres -c "CREATE DATABASE promptminder;"
psql -U postgres -d promptminder -f sql/users.sql
psql -U postgres -d promptminder -f sql/invitations.sql
```

### 2. 创建管理员账户

由于你已经禁用了公开注册，需要手动创建第一个管理员：

```bash
# 方法一：使用脚本
node scripts/create-admin.js your-admin-password

# 方法二：直接 SQL 插入
psql -U promptminder -d promptminder
INSERT INTO users (username, email, password_hash, display_name, is_admin)
VALUES ('admin', 'admin@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'Administrator', true);
```

### 3. 测试邮件服务

开发环境下，你可以不配置邮件服务，系统会使用模拟模式：

1. **不配置邮件服务**：
   - 邀请链接会在控制台输出
   - 可以手动复制链接测试

2. **配置真实邮件服务**（可选）：
   ```bash
   # 在 .env.local 中添加
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   ```

### 4. 完整测试流程

#### 步骤 1：启动开发环境
```bash
# 确保数据库运行（如果使用 Docker）
docker-compose up -d db

# 启动前端开发服务器
npm run dev
```

#### 步骤 2：登录管理员账户
1. 访问 http://localhost:3000/sign-in
2. 使用管理员账户登录

#### 步骤 3：发送邀请
1. 点击右上角头像，选择"邀请管理"
2. 输入测试邮箱地址
3. 点击"发送邀请"

#### 步骤 4：接受邀请
1. 查看控制台输出的邀请链接（开发模式）
2. 复制链接到浏览器
3. 填写用户名和密码完成注册

#### 步骤 5：验证功能
1. 新用户可以正常登录
2. 管理员可以看到邀请状态更新

### 5. 调试技巧

#### 查看日志
```bash
# 前端日志（npm run dev 控制台）
# 后端 API 日志（浏览器控制台）

# 数据库日志（如果使用 Docker）
docker-compose logs -f db
```

#### 直接测试 API
```bash
# 测试发送邀请
curl -X POST http://localhost:3000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=your-session-token" \
  -d '{"email":"test@example.com"}'

# 测试验证邀请
curl http://localhost:3000/api/invitations/verify/your-token-here
```

#### 检查数据库
```bash
# 查看用户表
psql -U promptminder -d promptminder -c "SELECT * FROM users;"

# 查看邀请表
psql -U promptminder -d promptminder -c "SELECT * FROM user_invitations;"
```

### 6. 常见问题解决

#### 问题：连接数据库失败
- 确保 Docker 数据库正在运行
- 检查端口是否暴露（docker-compose.yml 中取消注释）
- 验证数据库连接字符串

#### 问题：邮件发送失败
- 开发模式下不需要真实邮件配置
- 检查控制台是否输出了邀请链接

#### 问题：注册失败
- 检查邀请令牌是否有效
- 确认用户名格式正确
- 查看浏览器控制台的错误信息

### 7. 测试完成后的部署

开发测试通过后，使用完整 Docker 部署：

```bash
# 构建生产镜像
docker build -t promptminder:v1.0.0 .

# 启动完整服务
docker-compose up -d
```

这种混合开发模式（本地前端 + Docker 后端）既保持了开发的灵活性，又能测试完整的邀请注册功能。