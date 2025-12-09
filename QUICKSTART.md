# PromptMinder 快速开始

## 🚀 一键启动

### 首次使用
```bash
# 1. 检查并创建环境变量
npm run check

# 2. 启动开发环境
npm run start:dev
```

### 日常使用
```bash
# 开发环境
npm run start:dev

# 生产环境
npm run start:prod
```

## 📝 基本命令

### 开发阶段
```bash
# 启动后端服务
npm run dev:backend

# 创建管理员账户
npm run admin

# 启动前端开发服务器
npm run dev

# 查看后端日志
npm run dev:backend:logs

# 停止后端服务
npm run dev:backend:stop

# 重置数据库（删除所有数据）
npm run reset
```

### 部署阶段
```bash
# 构建 Docker 镜像
npm run build:docker

# 启动生产环境
npm run prod:up

# 查看生产日志
npm run prod:logs

# 停止生产环境
npm run prod:down
```

## 🔗 访问地址

### 开发环境
- **前端**: http://localhost:3000
- **Supabase Studio**: http://localhost:3333
- **MinIO Console**: http://localhost:9001
- **Kong Admin**: http://localhost:8001
- **数据库**: localhost:5432

### 生产环境
- **应用**: http://localhost:3000
- **管理**: 需要内网访问 Studio

### 端口冲突？
如果 3000 端口被占用：
```bash
# 使用其他端口启动前端
npm run dev -- -p 3001

# 或者修改 package.json
# "dev": "next dev -p 3001"
```

详细端口配置请参考：[端口配置文档](./docs/PORT_CONFIGURATION.md)

## 🎯 首次使用

1. **检查环境变量**
   ```bash
   npm run check
   ```

2. **重置数据库**（确保干净的数据库）
   ```bash
   npm run reset
   ```

3. **启动开发环境**
   ```bash
   npm run start:dev
   ```

4. **初始化 Auth 服务**（重要！）
   ```bash
   npm run init-auth
   ```

5. **创建管理员账户**
   ```bash
   npm run admin
   ```

6. **启动前端**
   ```bash
   npm run dev
   ```

7. **访问应用**
   - 打开 http://localhost:3000
   - 使用管理员账户登录
   - 点击头像 → "邀请管理" 发送邀请

## 🛠️ 故障排除

### 常见问题

**Q: Auth 服务启动失败？**
```bash
# 检查环境变量
cat .env

# 重新初始化 Auth 服务
npm run init-auth

# 查看 Auth 日志
docker-compose -f docker-compose.backend.yml logs auth
```

**Q: Auth schema 不存在错误？**
```bash
# 完全重置数据库
npm run reset

# 重新初始化
npm run dev:backend
npm run init-auth
```

**Q: 无法连接数据库？**
```bash
# 检查数据库状态
docker-compose -f docker-compose.backend.yml ps db

# 查看数据库日志
docker-compose -f docker-compose.backend.yml logs db
```

**Q: 邀请链接无效？**
```bash
# 开发模式下，邀请链接会输出到控制台
# 查看前端开发服务器的控制台输出

# 或者直接查看数据库
docker exec -it $(docker-compose -f docker-compose.backend.yml ps -q db) psql -U promptminder -d promptminder -c "SELECT * FROM user_invitations;"
```

## 📚 完整文档

- [详细开发指南](./docs/LOCAL_DEVELOPMENT_TESTING.md)
- [工作流说明](./docs/WORKFLOW.md)
- [邀请系统文档](./docs/INVITATION_SYSTEM.md)

## 🎨 系统架构

```
开发环境:
┌─────────────┐    ┌──────────────────┐
│   npm dev   │◄──►│  Docker Backend  │
│ (localhost  │    │  - PostgreSQL    │
│  :3000)     │    │  - Supabase Auth │
└─────────────┘    │  - Kong Gateway  │
                   │  - Storage API   │
                   └──────────────────┘

生产环境:
┌─────────────────────────────────────┐
│           Docker Network            │
│  ┌─────────────┐  ┌──────────────┐ │
│  │  Frontend   │  │   Backend    │ │
│  │ (Next.js)   │◄─┤  Services    │ │
│  │             │  │  (Supabase)   │ │
│  └─────────────┘  └──────────────┘ │
└─────────────────────────────────────┘
```

## 🔄 CI/CD 集成

查看 [WORKFLOW.md](./docs/WORKFLOW.md) 了解完整的 CI/CD 集成方案。

---

🎉 **享受开发！** 

有任何问题请查看文档或提交 issue。