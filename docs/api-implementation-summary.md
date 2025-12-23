# PromptMinder API 实现总结

## 概述

本文档总结了 PromptMinder API 系统的完整实现，该系统允许外部应用通过 API Key 安全地访问团队的 prompts。

## 实现内容

### 1. 数据库设计

#### 新增表结构

**api_keys 表** - 存储 API 密钥信息
- `id` - UUID 主键
- `team_id` - 关联的团队ID
- `name` - API Key 名称
- `key_hash` - 哈希后的密钥（bcrypt）
- `key_prefix` - 密钥前缀（用于显示）
- `description` - 描述信息
- `permissions` - 权限列表（JSON数组）
- `expires_at` - 过期时间
- `last_used_at` - 最后使用时间
- `usage_count` - 使用次数
- `is_active` - 是否激活
- `created_by` - 创建者
- `created_at/updated_at` - 时间戳

**api_usage_logs 表** - 记录API使用日志
- `id` - UUID 主键
- `api_key_id` - 关联的API Key ID
- `endpoint` - 请求端点
- `method` - HTTP方法
- `status_code` - 响应状态码
- `response_time_ms` - 响应时间
- `ip_address` - IP地址
- `user_agent` - User Agent
- `request_at` - 请求时间

### 2. 核心组件

#### API Key 生成器 (`lib/api-key-generator.js`)
- 生成安全的随机API Key (格式: pmk_<hex_string>)
- API Key格式验证
- 权限管理工具
- 使用统计计算
- API文档生成

#### API认证中间件 (`lib/middleware/api-auth.js`)
- Bearer Token认证
- API Key验证和哈希比对
- 权限检查
- 使用日志记录
- 错误响应格式化
- 请求装饰器 `withAPIAuth`

### 3. API 端点实现

#### 公共API端点 (/api/v1/)
- `GET /api/v1/prompts` - 获取prompts列表（支持分页、搜索、过滤）
- `GET /api/v1/prompts/:id` - 获取单个prompt详情
- `GET /api/v1/projects` - 获取项目列表
- `GET /api/v1/tags` - 获取标签列表

#### 管理端点 (/api/teams/[teamId]/api-keys/)
- `GET /api/teams/:teamId/api-keys` - 获取API Keys列表
- `POST /api/teams/:teamId/api-keys` - 创建新API Key
- `PUT /api/teams/:teamId/api-keys/:keyId` - 更新API Key
- `DELETE /api/teams/:teamId/api-keys/:keyId` - 删除API Key
- `POST /api/teams/:teamId/api-keys/:keyId` - 轮换API Key

### 4. API 文档

#### Swagger 集成
- `next-swagger-doc.js` - OpenAPI规范配置
- `pages/api-docs.jsx` - Swagger UI界面
- 所有端点包含完整的Swagger注释

#### 示例和文档
- `docs/api-examples.md` - 详细的使用示例（JavaScript、Python、cURL）
- Postman Collection - 可导入的API集合
- `test-api.js` - Node.js测试脚本

### 5. 前端组件

#### API Key管理界面 (`components/team-api-keys.jsx`)
- API Keys列表显示
- 创建新API Key表单
- 删除和轮换功能
- 使用统计展示
- 安全提示和文档下载

## 安全特性

1. **API Key安全**
   - 使用bcrypt进行哈希存储（成本因子12）
   - 只在创建时显示完整密钥
   - 支持密钥过期时间设置

2. **权限控制**
   - 基于团队的数据隔离
   - 细粒度权限管理
   - Row Level Security (RLS) 策略

3. **认证机制**
   - Bearer Token认证
   - 密钥格式验证
   - 活跃状态检查

4. **使用追踪**
   - 详细的API使用日志
   - 使用次数统计
   - 最后使用时间记录

## 部署步骤

1. **数据库迁移**
   ```sql
   -- 执行以下SQL文件
   \i sql/api_keys.sql
   \i sql/api_keys_rls.sql
   ```

2. **安装依赖**
   ```bash
   pnpm install next-swagger-doc swagger-ui-react swagger-ui-dist bcryptjs
   ```

3. **集成到团队管理页面**
   - 在团队设置页面导入并使用 `TeamApiKeys` 组件

4. **测试API**
   ```bash
   # 设置环境变量
   export API_KEY="pmk_your_api_key_here"
   export API_BASE_URL="http://localhost:3000/api/v1"

   # 运行测试
   node test-api.js
   ```

## 使用流程

1. **创建API Key**
   - 登录PromptMinder
   - 进入团队管理页面
   - 点击"创建新的API Key"
   - 设置名称、权限和过期时间
   - 保存生成的API Key

2. **使用API**
   ```javascript
   const api = new PromptMinderAPI('pmk_your_api_key_here');
   const prompts = await api.getPrompts();
   ```

3. **监控使用情况**
   - 在团队管理页面查看API Key使用统计
   - 监控异常使用情况
   - 定期轮换API Key

## API响应格式

所有API响应都遵循统一格式：

**成功响应**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": { ... }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**错误响应**
```json
{
  "success": false,
  "error": "Error message",
  "error_code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 扩展建议

1. **速率限制**
   - 实现基于team或API key的速率限制
   - 使用Redis进行计数

2. **Webhook支持**
   - 创建、更新prompt时触发webhook
   - 支持自定义事件订阅

3. **更多API端点**
   - 创建/更新prompts
   - 管理项目
   - 团队成员管理

4. **SDK开发**
   - 官方JavaScript SDK
   - Python SDK
   - Go SDK

5. **增强的监控**
   - 实时使用仪表板
   - 错误率监控
   - 性能指标

## 文件清单

### 核心实现文件
- `lib/api-key-generator.js` - API Key生成和管理工具
- `lib/middleware/api-auth.js` - API认证中间件
- `pages/api/v1/prompts/index.js` - Prompts列表API
- `pages/api/v1/prompts/[id].js` - 单个Prompt API
- `pages/api/v1/projects/index.js` - Projects API
- `pages/api/v1/tags/index.js` - Tags API
- `pages/api/teams/[teamId]/api-keys/index.js` - API Keys管理
- `pages/api/teams/[teamId]/api-keys/[keyId].js` - 单个API Key操作
- `components/team-api-keys.jsx` - 前端管理组件

### 文档文件
- `docs/api-implementation-plan.md` - 详细实现方案
- `docs/api-examples.md` - API使用示例
- `docs/api-implementation-summary.md` - 本总结文档

### 配置文件
- `next-swagger-doc.js` - Swagger配置
- `pages/api-docs.jsx` - API文档页面

### 数据库文件
- `sql/api_keys.sql` - API相关表结构
- `sql/api_keys_rls.sql` - RLS安全策略

### 工具文件
- `test-api.js` - API测试脚本

## 总结

PromptMinder API系统提供了完整、安全、可扩展的API访问能力，包括：

- ✅ 安全的API Key认证系统
- ✅ 完整的API端点实现
- ✅ 自动化的API文档生成
- ✅ 友好的管理界面
- ✅ 详细的使用示例
- ✅ 安全的最佳实践

系统设计考虑了安全性、可扩展性和易用性，为用户提供了便捷的API访问方式，同时确保了数据和访问的安全性。