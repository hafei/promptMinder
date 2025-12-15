# Team Prompts API 实现方案

## 概述

本文档描述了如何实现一个API系统，允许外部应用通过API key访问team创建的prompts。

## 技术栈

- **API框架**: Next.js API Routes
- **文档生成**: next-swagger-doc + swagger-ui-react
- **认证**: API Key-based authentication
- **数据库**: Supabase (PostgreSQL)

## 1. 数据库设计

### 1.1 API Keys 表结构

```sql
-- 创建 api_keys 表
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- 存储API key的哈希值
  key_prefix TEXT NOT NULL, -- API key的前缀（用于识别）
  description TEXT,
  permissions JSONB DEFAULT '["read:prompts"]'::jsonb, -- 权限列表
  expires_at TIMESTAMPTZ, -- 过期时间，NULL表示永不过期
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_api_keys_team_id ON api_keys(team_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active, expires_at);
```

### 1.2 API Usage Logs 表结构（可选，用于追踪使用情况）

```sql
-- 创建 api_usage_logs 表
CREATE TABLE api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_at TIMESTAMPTZ DEFAULT now()
);

-- 创建分区表（按月分区，提高查询性能）
CREATE INDEX idx_api_usage_logs_api_key_id_month ON api_usage_logs(api_key_id, date_trunc('month', request_at));
```

### 1.3 RLS 策略

```sql
-- 启用 RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- API Keys 策略：只有团队成员可以查看和管理自己团队的 API keys
CREATE POLICY "Team members can view their team's API keys" ON api_keys
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Team admins can create API keys" ON api_keys
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team admins can update API keys" ON api_keys
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team admins can delete API keys" ON api_keys
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );
```

## 2. API Key 生成与管理

### 2.1 API Key 格式

```
格式: pmk_<team_id>_<random_string>
示例: pmk_550e8400-e29b-41d4-a716-446655440000_a1b2c3d4e5f6g7h8
```

### 2.2 API Key 生成流程

```javascript
// lib/api-key-generator.js
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateAPIKey() {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  return `pmk_${randomBytes}`;
}

export async function hashAPIKey(apiKey) {
  const saltRounds = 12;
  return await bcrypt.hash(apiKey, saltRounds);
}

export async function verifyAPIKey(apiKey, hashedKey) {
  return await bcrypt.compare(apiKey, hashedKey);
}
```

## 3. API 端点设计

### 3.1 API 版本控制

所有API端点使用版本前缀 `/api/v1/`

### 3.2 端点列表

#### 3.2.1 Prompts API

```
GET    /api/v1/prompts
  - 获取team的所有prompts
  - 支持分页、排序、过滤
  - Query参数:
    - page: 页码（默认1）
    - limit: 每页数量（默认20，最大100）
    - search: 搜索关键词
    - tags: 标签过滤（逗号分隔）
    - project_id: 项目ID过滤
    - sort: 排序字段（created_at, updated_at, title）
    - order: 排序方向（asc, desc）

GET    /api/v1/prompts/:id
  - 获取单个prompt的详细信息

GET    /api/v1/prompts/:id/versions
  - 获取prompt的所有版本

GET    /api/v1/projects
  - 获取team的所有项目列表

GET    /api/v1/tags
  - 获取team的所有标签
```

#### 3.2.2 API Key 管理 API（内部使用）

```
POST   /api/teams/:teamId/api-keys
  - 创建新的API key
  - Body: {
      name: string,
      description?: string,
      expiresAt?: string, // ISO 8601日期，null表示永不过期
      permissions?: string[] // 默认 ["read:prompts"]
    }

GET    /api/teams/:teamId/api-keys
  - 获取team的所有API keys列表

PUT    /api/teams/:teamId/api-keys/:keyId
  - 更新API key（名称、描述、过期时间）
  - 注意：不能更新key值本身

DELETE /api/teams/:teamId/api-keys/:keyId
  - 删除API key

POST   /api/teams/:teamId/api-keys/:keyId/rotate
  - 轮换API key（生成新key，使旧key失效）
```

### 3.3 认证方式

使用 `Authorization` 请求头：

```
Authorization: Bearer pmk_550e8400-e29b-41d4-a716-446655440000_a1b2c3d4e5f6g7h8
```

## 4. 实现步骤

### 4.1 创建数据库迁移

1. 创建 `supabase/migrations/20240101_create_api_keys.sql`
2. 创建 `supabase/migrations/20240101_create_api_usage_logs.sql`

### 4.2 创建 API 认证中间件

创建 `lib/middleware/api-auth.js`：

```javascript
import { verifyAPIKey } from '@/lib/api-key-generator';
import { createClient } from '@/lib/supabaseServer';

export async function authenticateAPIKey(req) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const apiKey = authHeader.substring(7);
  const supabase = createClient();

  // 查找API key
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', await hashAPIKey(apiKey)) // 注意：这里需要优化性能
    .eq('is_active', true)
    .single();

  if (error || !keyData) {
    return { error: 'Invalid API key', status: 401 };
  }

  // 检查过期时间
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { error: 'API key expired', status: 401 };
  }

  // 更新使用统计
  await supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: keyData.usage_count + 1
    })
    .eq('id', keyData.id);

  return {
    authenticated: true,
    teamId: keyData.team_id,
    apiKeyId: keyData.id,
    permissions: keyData.permissions
  };
}
```

### 4.3 创建 API 路由

#### 4.3.1 创建 `/api/v1/prompts` 端点

```javascript
// pages/api/v1/prompts/index.js
import { authenticateAPIKey } from '@/lib/middleware/api-auth';
import { createClient } from '@/lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 认证
  const auth = await authenticateAPIKey(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { teamId } = auth;
  const supabase = createClient();

  // 获取查询参数
  const {
    page = 1,
    limit = 20,
    search,
    tags,
    project_id,
    sort = 'created_at',
    order = 'desc'
  } = req.query;

  // 构建查询
  let query = supabase
    .from('prompts')
    .select('*, projects(name)', { count: 'exact' })
    .eq('team_id', teamId);

  // 应用过滤器
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (tags) {
    const tagList = tags.split(',');
    query = query.contains('tags', tagList);
  }

  if (project_id) {
    query = query.eq('project_id', project_id);
  }

  // 应用排序
  query = query.order(sort, { ascending: order === 'asc' });

  // 应用分页
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  // 执行查询
  const { data: prompts, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // 返回响应
  return res.status(200).json({
    prompts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
}
```

### 4.4 集成 Swagger 文档

#### 4.4.1 安装依赖

```bash
npm install next-swagger-doc swagger-ui-react swagger-ui-dist
```

#### 4.4.2 配置 next-swagger-doc

创建 `next-swagger-doc.js`：

```javascript
const { createSwaggerSpec } = require('next-swagger-doc');

const apiSpec = createSwaggerSpec({
  apiFolder: 'pages/api/v1', // API路由文件夹
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PromptMinder API',
      version: '1.0.0',
      description: 'API for accessing team prompts programmatically',
      contact: {
        name: 'API Support',
        url: 'https://promptminder.com/support',
        email: 'api@promptminder.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://promptminder.com/api/v1',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'pmk_your_api_key_here'
        }
      },
      schemas: {
        Prompt: {
          type: 'object',
          required: ['id', 'title', 'content', 'team_id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the prompt'
            },
            title: {
              type: 'string',
              description: 'Title of the prompt'
            },
            content: {
              type: 'string',
              description: 'The actual prompt content'
            },
            description: {
              type: 'string',
              description: 'Optional description of the prompt'
            },
            team_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID of the team that owns this prompt'
            },
            project_id: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID of the project this prompt belongs to'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Tags associated with the prompt'
            },
            is_public: {
              type: 'boolean',
              description: 'Whether the prompt is publicly visible'
            },
            version: {
              type: 'integer',
              description: 'Version number of the prompt'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the prompt was created'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the prompt was last updated'
            }
          }
        },
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page'
            },
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  }
});

module.exports = apiSpec;
```

#### 4.4.3 添加 Swagger 注释

在每个API路由文件中添加Swagger注释：

```javascript
// pages/api/v1/prompts/index.js
/**
 * @swagger
 * /prompts:
 *   get:
 *     summary: Get all prompts for the authenticated team
 *     tags:
 *       - Prompts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of prompts per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter prompts by title or description
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter prompts by project ID
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, title]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Successfully retrieved prompts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prompts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Prompt'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
```

#### 4.4.4 创建 Swagger UI 页面

创建 `pages/api-docs.jsx`：

```jsx
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-dist/swagger-ui.css';
import apiSpec from '../next-swagger-doc';

export default function ApiDocs() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <SwaggerUI spec={apiSpec} />
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {}
  };
}
```

### 4.5 前端集成 - API Key 管理界面

在团队管理页面添加 API Key 管理功能：

#### 4.5.1 创建 API Key 管理组件

```jsx
// components/team-api-keys.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { generateAPIKey } from '@/lib/api-key-generator';

export default function TeamApiKeys({ teamId }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchApiKeys();
  }, [teamId]);

  async function fetchApiKeys() {
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    setApiKeys(data || []);
  }

  async function handleCreateKey(formData) {
    setLoading(true);

    // 生成新的API key
    const apiKey = generateAPIKey();
    const keyHash = await hashAPIKey(apiKey);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        team_id: teamId,
        name: formData.get('name'),
        description: formData.get('description'),
        expires_at: formData.get('expiresAt') || null,
        key_hash: keyHash,
        key_prefix: apiKey.substring(0, 20) + '...'
      })
      .select()
      .single();

    if (!error) {
      setNewKey(apiKey); // 只在创建时显示完整密钥
      setShowCreateForm(false);
      fetchApiKeys();
    }

    setLoading(false);
  }

  async function handleDeleteKey(keyId) {
    if (!confirm('确定要删除这个API Key吗？')) return;

    await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    fetchApiKeys();
  }

  return (
    <div className="api-keys-manager">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">API Keys</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
        >
          创建新的 API Key
        </button>
      </div>

      {/* 新创建的密钥提示 */}
      {newKey && (
        <div className="alert alert-warning mb-6">
          <h4>请保存您的API Key</h4>
          <p className="font-mono text-sm bg-gray-100 p-2 rounded my-2">{newKey}</p>
          <p className="text-sm text-gray-600">
            这是唯一一次显示完整的API Key，请立即复制并安全保存。
          </p>
          <button
            onClick={() => setNewKey(null)}
            className="btn btn-sm mt-2"
          >
            我已保存
          </button>
        </div>
      )}

      {/* API Keys 列表 */}
      <div className="space-y-4">
        {apiKeys.map(key => (
          <div key={key.id} className="card border">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-semibold">{key.name}</h5>
                  {key.description && (
                    <p className="text-gray-600 text-sm mt-1">{key.description}</p>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    <span>前缀: {key.key_prefix}</span>
                    {key.expires_at && (
                      <span className="ml-4">
                        过期时间: {new Date(key.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="ml-4">
                      使用次数: {key.usage_count}
                    </span>
                    {key.last_used_at && (
                      <span className="ml-4">
                        最后使用: {new Date(key.last_used_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="btn btn-sm btn-danger"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 创建表单模态框 */}
      {showCreateForm && (
        <div className="modal">
          <div className="modal-content">
            <h4>创建新的 API Key</h4>
            <form onSubmit={handleCreateKey}>
              <div className="form-group">
                <label>名称 *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="例如：生产环境API"
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  name="description"
                  placeholder="这个API Key的用途..."
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>过期时间</label>
                <select name="expiresAt">
                  <option value="">永不过期</option>
                  <option value={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}>
                    1年后
                  </option>
                  <option value={new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()}>
                    6个月后
                  </option>
                  <option value={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}>
                    3个月后
                  </option>
                  <option value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}>
                    1个月后
                  </option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 5. 使用示例

### 5.1 cURL 示例

```bash
# 获取所有 prompts
curl -X GET "https://promptminder.com/api/v1/prompts?page=1&limit=10" \
  -H "Authorization: Bearer pmk_your_api_key_here" \
  -H "Content-Type: application/json"

# 搜索 prompts
curl -X GET "https://promptminder.com/api/v1/prompts?search=marketing&tags=email,social" \
  -H "Authorization: Bearer pmk_your_api_key_here"

# 获取特定 prompt
curl -X GET "https://promptminder.com/api/v1/prompts/prompt-id-here" \
  -H "Authorization: Bearer pmk_your_api_key_here"
```

### 5.2 JavaScript 示例

```javascript
const API_BASE = 'https://promptminder.com/api/v1';
const API_KEY = 'pmk_your_api_key_here';

class PromptMinderAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  async getPrompts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/prompts${query ? `?${query}` : ''}`;
    return this.request(endpoint);
  }

  async getPrompt(id) {
    return this.request(`/prompts/${id}`);
  }

  async getProjects() {
    return this.request('/projects');
  }

  async getTags() {
    return this.request('/tags');
  }
}

// 使用示例
const api = new PromptMinderAPI(API_KEY);

// 获取所有 prompts
const prompts = await api.getPrompts({
  page: 1,
  limit: 20,
  search: 'marketing',
  sort: 'updated_at',
  order: 'desc'
});

// 获取单个 prompt
const prompt = await api.getPrompt('prompt-id-here');
```

### 5.3 Python 示例

```python
import requests

class PromptMinderAPI:
    def __init__(self, api_key, base_url='https://promptminder.com/api/v1'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    def request(self, endpoint, params=None):
        url = f'{self.base_url}{endpoint}'
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_prompts(self, **params):
        return self.request('/prompts', params)

    def get_prompt(self, prompt_id):
        return self.request(f'/prompts/{prompt_id}')

# 使用示例
api = PromptMinderAPI('pmk_your_api_key_here')

# 获取所有 prompts
prompts = api.get_prompts(
    page=1,
    limit=20,
    search='marketing',
    tags='email,social',
    sort='updated_at',
    order='desc'
)

# 获取单个 prompt
prompt = api.get_prompt('prompt-id-here')
```

## 6. 安全考虑

1. **API Key 安全**
   - API Key 在数据库中以哈希形式存储
   - 使用 bcrypt 进行哈希处理（成本因子12）
   - 创建时只显示一次完整密钥

2. **权限控制**
   - 每个 API Key 只能访问其所属团队的资源
   - 支持细粒度的权限控制（读/写等）
   - 使用 RLS 策略确保数据隔离

3. **速率限制**
   - 可以基于 team 或 API key 实现速率限制
   - 记录 API 使用日志用于监控

4. **过期管理**
   - 支持设置 API Key 的过期时间
   - 支持禁用但保留 API Key

5. **HTTPS 强制**
   - 所有 API 请求必须通过 HTTPS
   - 在生产环境中重定向 HTTP 到 HTTPS

## 7. 监控和日志

1. **使用统计**
   - 记录每个 API Key 的使用次数
   - 记录最后使用时间
   - 生成使用报告

2. **错误监控**
   - 记录 API 错误和异常
   - 监控错误率
   - 设置告警机制

3. **性能监控**
   - 记录响应时间
   - 监控慢查询
   - 优化数据库性能

## 8. 后续扩展

1. **更多 API 端点**
   - 创建/更新 prompts
   - 管理项目和标签
   - 团队成员管理

2. **高级功能**
   - Webhook 支持
   - 批量操作
   - 数据导出

3. **集成支持**
   - SDK 开发
   - 第三方集成
   - API 版本管理

这个实现方案提供了一个完整、安全、可扩展的 API 系统，允许外部应用安全地访问团队的 prompts。