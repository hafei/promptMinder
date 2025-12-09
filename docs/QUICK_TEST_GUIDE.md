# 快速测试指南

## 🚀 最简单的测试方法

### 1. 启动后端服务
```bash
# 使用开发配置启动所有服务
docker-compose -f docker-compose.dev.yml up -d

# 等待服务启动
sleep 10
```

### 2. 创建管理员账户
```bash
# 运行创建管理员脚本
chmod +x scripts/create-admin-docker.sh
./scripts/create-admin-docker.sh
```

### 3. 启动前端开发服务器
```bash
# 在另一个终端运行
npm run dev
```

### 4. 测试流程
1. 访问 http://localhost:3000/sign-in
2. 使用创建的管理员账户登录
3. 点击右上角头像 → "邀请管理"
4. 输入测试邮箱地址发送邀请
5. 查看控制台输出的邀请链接（开发模式）
6. 复制链接到浏览器，完成注册

## 🎯 快速验证清单

- [ ] 管理员可以登录
- [ ] 可以发送邀请
- [ ] 控制台显示邀请链接（开发模式）
- [ ] 邀请链接可以打开注册页面
- [ ] 可以完成注册并自动登录
- [ ] 管理员可以看到邀请状态更新

## 🔧 常用命令

```bash
# 查看服务状态
docker-compose -f docker-compose.dev.yml ps

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f web

# 重启服务
docker-compose -f docker-compose.dev.yml restart

# 停止服务
docker-compose -f docker-compose.dev.yml down

# 清理数据（谨慎使用）
docker-compose -f docker-compose.dev.yml down -v
```

## 💡 开发技巧

1. **修改代码后**：前端自动热重载，后端需重启服务
2. **数据库查询**：可以直接连接 localhost:5432
3. **API 测试**：使用浏览器控制台或 Postman
4. **邮件测试**：开发模式下查看控制台输出

## 🐛 故障排除

| 问题 | 解决方案 |
|------|----------|
| 数据库连接失败 | 检查 docker-compose -f docker-compose.dev.yml ps |
| 端口冲突 | 修改 docker-compose.dev.yml 中的端口映射 |
| 邀请链接无效 | 检查控制台错误信息，重启服务重试 |
| 无法登录 | 确认管理员账户已创建，检查密码是否正确 |

这种混合模式让你既能享受本地开发的快速迭代，又能测试完整的 Supabase 后端功能。