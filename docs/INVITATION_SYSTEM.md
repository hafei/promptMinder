# PromptMinder 邀请注册系统

本系统已从公开注册重构为基于邀请的注册机制，确保只有受邀请的用户才能加入 PromptMinder。

## 系统架构

### 核心组件

1. **邀请机制**
   - 使用安全的随机令牌（32字节十六进制字符串）
   - 邀请链接有效期：7天
   - 邀请状态：pending（待处理）、accepted（已接受）、expired（已过期）

2. **数据库结构**
   - `users` 表：添加了 `email` 字段
   - `user_invitations` 表：记录所有邀请
   - 关联视图：`invitation_stats` 和 `user_invitation_summary`

3. **邮件服务**
   - 使用 Resend 服务发送邀请邮件
   - 开发环境下支持模拟邮件模式
   - 可配置的发件人邮箱和模板

## 部署指南

### 1. 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# 邮件服务配置（生产环境必需）
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# 应用基础URL（用于生成邀请链接）
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### 2. 数据库初始化

首次部署时，需要创建一个管理员账户：

```bash
# 使用脚本生成管理员密码和哈希
node scripts/create-admin.js [自定义密码]

# 复制输出的 SQL 语句到数据库执行
```

或者手动执行 `sql/create-admin.sql` 文件（请先替换密码哈希）。

### 3. 依赖安装

```bash
npm install resend
```

## 使用流程

### 1. 管理员发送邀请

1. 使用管理员账户登录
2. 访问 `/admin/invitations` 页面
3. 输入目标邮箱地址
4. 点击"发送邀请"

### 2. 用户接受邀请

1. 用户收到邀请邮件
2. 点击邮件中的邀请链接
3. 跳转到 `/invite/[token]` 页面
4. 填写用户名、密码等信息完成注册
5. 自动登录并跳转到主页面

### 3. 邀请管理

- 查看所有邀请状态
- 撤销待处理的邀请
- 查看邀请统计数据

## 开发环境配置

### 模拟邮件模式

如果不配置 `RESEND_API_KEY`，系统将自动进入开发模式：

- 邀请链接将在控制台输出
- 邮件不会实际发送
- 管理界面会显示"复制链接"按钮

### 邮件服务测试

管理员可以测试邮件配置：

```javascript
// 发送测试邮件
POST /api/admin/email-test
{
  "email": "test@example.com"
}

// 获取邮件配置状态
GET /api/admin/email-test
```

## API 端点

### 邀请管理

- `POST /api/invitations` - 发送邀请
- `GET /api/invitations` - 获取邀请列表
- `DELETE /api/invitations/[id]` - 撤销邀请
- `GET /api/invitations/verify/[token]` - 验证邀请令牌

### 用户注册

- `POST /api/auth/register-by-invite` - 通过邀请注册
- `POST /api/auth/register` - 已禁用，返回错误

### 管理功能

- `POST /api/admin/email-test` - 发送测试邮件
- `GET /api/admin/email-test` - 获取邮件配置状态

## 安全措施

### 1. 邀请令牌安全

- 32字节随机生成令牌
- 一次性使用，接受后立即失效
- 7天有效期，过期自动清理

### 2. 防止滥用

- 每个邮箱只能有一个待处理的邀请
- 检查邮箱是否已注册
- 邀请人权限验证

### 3. 数据保护

- 邀请链接包含 HTTPS 保护
- 密码使用 bcrypt 加密
- 会话使用安全的随机令牌

## 故障排除

### 常见问题

1. **邮件发送失败**
   - 检查 RESEND_API_KEY 配置
   - 确认 FROM_EMAIL 已在 Resend 中验证
   - 查看控制台错误日志

2. **邀请链接无效**
   - 确认链接完整且未过期
   - 检查链接是否已被使用
   - 验证 NEXT_PUBLIC_BASE_URL 配置

3. **无法注册**
   - 确认邀请状态为 pending
   - 检查用户名是否已被使用
   - 验证密码长度和格式

### 日志检查

查看应用日志中的关键信息：

- 邮件发送状态
- 邀请创建和接受记录
- 错误详情和堆栈跟踪

## 扩展功能

### 可能的改进方向

1. **批量邀请**
   - CSV 导入邮箱列表
   - 批量发送和管理

2. **邀请配额**
   - 限制每个用户的邀请数量
   - 基于角色的邀请权限

3. **邀请统计**
   - 邀请转化率分析
   - 用户增长趋势图

4. **自定义模板**
   - 可配置的邮件模板
   - 多语言支持

## 维护任务

### 定期维护

1. **清理过期邀请**
   - 可以通过 API 调用 `cleanupExpiredInvitations`
   - 或设置数据库定时任务

2. **监控邮件发送**
   - 跟踪邮件发送成功率
   - 处理退回的邮件

3. **审查邀请使用情况**
   - 检查异常邀请模式
   - 防止垃圾邮件发送

这个邀请注册系统提供了一个安全、可扩展的方式来管理用户注册，确保只有受信任的用户能够加入 PromptMinder 平台。