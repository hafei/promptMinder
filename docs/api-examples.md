# PromptMinder API 使用示例

本文档提供了使用 PromptMinder API 的详细示例代码。

## 目录

1. [快速开始](#快速开始)
2. [认证方式](#认证方式)
3. [JavaScript/Node.js 示例](#javascriptnode-js-示例)
4. [Python 示例](#python-示例)
5. [cURL 示例](#curl-示例)
6. [Postman Collection](#postman-collection)
7. [错误处理](#错误处理)
8. [最佳实践](#最佳实践)

## 快速开始

1. 获取 API Key
   - 登录 PromptMinder
   - 进入团队设置页面
   - 创建新的 API Key

2. 使用 API Key 认证
   - 将 API Key 添加到请求头中
   - 格式: `Authorization: Bearer pmk_your_api_key_here`

3. 调用 API 端点
   - 基础URL: `https://promptminder.com/api/v1`
   - 使用您的 API Key 访问团队资源

## 认证方式

所有 API 请求都需要在 HTTP Header 中包含您的 API Key：

```
Authorization: Bearer pmk_your_api_key_here
```

## JavaScript/Node.js 示例

### 基础示例

```javascript
// 创建 API 客户端类
class PromptMinderAPI {
  constructor(apiKey, baseUrl = 'https://promptminder.com/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // 获取所有 prompts
  async getPrompts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/prompts${query ? `?${query}` : ''}`;
    return this.request(endpoint);
  }

  // 获取单个 prompt
  async getPrompt(id) {
    return this.request(`/prompts/${id}`);
  }

  // 搜索 prompts
  async searchPrompts(query, filters = {}) {
    return this.getPrompts({ search: query, ...filters });
  }

  // 获取项目列表
  async getProjects() {
    return this.request('/projects');
  }

  // 获取标签列表
  async getTags() {
    return this.request('/tags');
  }
}

// 使用示例
const api = new PromptMinderAPI('pmk_your_api_key_here');

// 获取所有 prompts
async function fetchAllPrompts() {
  try {
    const response = await api.getPrompts({
      page: 1,
      limit: 20,
      sort: 'updated_at',
      order: 'desc'
    });

    console.log('Prompts:', response.data);
    console.log('Pagination:', response.meta.pagination);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// 搜索特定标签的 prompts
async function searchPromptsByTag() {
  try {
    const response = await api.searchPrompts('marketing', {
      tags: 'email,social',
      limit: 10
    });

    console.log('Found prompts:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### 高级示例 - 带重试机制的 API 客户端

```javascript
class PromptMinderAPIWithRetry extends PromptMinderAPI {
  constructor(apiKey, baseUrl, options = {}) {
    super(apiKey, baseUrl);
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  async request(endpoint, options = {}) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await super.request(endpoint, options);
      } catch (error) {
        lastError = error;

        // 如果是认证错误或客户端错误，不重试
        if (error.response?.status < 500) {
          throw error;
        }

        // 等待后重试
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }
}

// 使用带重试的客户端
const apiWithRetry = new PromptMinderAPIWithRetry('pmk_your_api_key_here');
```

## Python 示例

### 基础示例

```python
import requests
import time
from typing import Dict, List, Optional, Any

class PromptMinderAPI:
    def __init__(self, api_key: str, base_url: str = "https://promptminder.com/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def request(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """发送 API 请求"""
        url = f"{self.base_url}{endpoint}"

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                error_data = e.response.json()
                raise Exception(f"API Error: {error_data.get('error', 'Unknown error')}")
            raise

    def get_prompts(self, **params) -> Dict[str, Any]:
        """获取所有 prompts"""
        return self.request('/prompts', params)

    def get_prompt(self, prompt_id: str) -> Dict[str, Any]:
        """获取单个 prompt"""
        return self.request(f'/prompts/{prompt_id}')

    def search_prompts(self, query: str, **filters) -> Dict[str, Any]:
        """搜索 prompts"""
        params = {'search': query, **filters}
        return self.get_prompts(**params)

    def get_projects(self) -> Dict[str, Any]:
        """获取项目列表"""
        return self.request('/projects')

    def get_tags(self, **params) -> Dict[str, Any]:
        """获取标签列表"""
        return self.request('/tags', params)

    def paginate_all(self, endpoint: str, **params) -> List[Dict[str, Any]]:
        """获取所有分页数据"""
        all_items = []
        page = 1
        limit = 100  # 每页最大数量

        while True:
            params['page'] = page
            params['limit'] = limit

            response = self.request(endpoint, params)
            items = response['data']

            if not items:
                break

            all_items.extend(items)

            # 检查是否还有更多数据
            pagination = response.get('meta', {}).get('pagination', {})
            if pagination.get('page', 0) >= pagination.get('totalPages', 1):
                break

            page += 1

        return all_items

# 使用示例
if __name__ == "__main__":
    # 初始化 API 客户端
    api = PromptMinderAPI('pmk_your_api_key_here')

    try:
        # 获取所有 prompts
        prompts = api.get_prompts(page=1, limit=20)
        print(f"Found {len(prompts['data'])} prompts")

        # 搜索 prompts
        search_results = api.search_prompts(
            query='marketing',
            tags='email',
            sort='updated_at',
            order='desc'
        )
        print(f"Search results: {len(search_results['data'])} prompts")

        # 获取所有分页的 prompts
        all_prompts = api.paginate_all('/prompts')
        print(f"Total prompts: {len(all_prompts)}")

    except Exception as e:
        print(f"Error: {e}")
```

### 异步示例 (使用 aiohttp)

```python
import aiohttp
import asyncio
from typing import Dict, List, Optional, Any

class AsyncPromptMinderAPI:
    def __init__(self, api_key: str, base_url: str = "https://promptminder.com/api/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    async def request(self, session: aiohttp.ClientSession, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """发送异步 API 请求"""
        url = f"{self.base_url}{endpoint}"

        async with session.get(url, params=params) as response:
            if not response.ok:
                error_data = await response.json()
                raise Exception(f"API Error: {error_data.get('error', 'Unknown error')}")
            return await response.json()

    async def get_prompts(self, **params) -> Dict[str, Any]:
        """获取所有 prompts"""
        async with aiohttp.ClientSession(headers=self.headers) as session:
            return await self.request(session, '/prompts', params)

    async def batch_get_prompts(self, prompt_ids: List[str]) -> List[Dict[str, Any]]:
        """批量获取 prompts"""
        async with aiohttp.ClientSession(headers=self.headers) as session:
            tasks = [
                self.request(session, f'/prompts/{prompt_id}')
                for prompt_id in prompt_ids
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            return [r for r in results if not isinstance(r, Exception)]

# 使用示例
async def main():
    api = AsyncPromptMinderAPI('pmk_your_api_key_here')

    # 获取 prompts
    prompts = await api.get_prompts(page=1, limit=20)
    print(f"Found {len(prompts['data'])} prompts")

    # 批量获取
    if prompts['data']:
        prompt_ids = [p['id'] for p in prompts['data'][:5]]
        batch_results = await api.batch_get_prompts(prompt_ids)
        print(f"Batch retrieved {len(batch_results)} prompts")

# 运行异步示例
# asyncio.run(main())
```

## cURL 示例

### 基础请求

```bash
# 设置 API Key (避免每次都输入)
export API_KEY="pmk_your_api_key_here"
export BASE_URL="https://promptminder.com/api/v1"

# 获取所有 prompts
curl -X GET "$BASE_URL/prompts" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"

# 带参数的请求
curl -X GET "$BASE_URL/prompts?page=1&limit=10&sort=updated_at&order=desc" \
  -H "Authorization: Bearer $API_KEY"

# 获取单个 prompt
curl -X GET "$BASE_URL/prompts/prompt-id-here" \
  -H "Authorization: Bearer $API_KEY"

# 搜索 prompts
curl -X GET "$BASE_URL/prompts?search=marketing&tags=email,social" \
  -H "Authorization: Bearer $API_KEY"

# 获取项目列表
curl -X GET "$BASE_URL/projects" \
  -H "Authorization: Bearer $API_KEY"

# 获取标签列表
curl -X GET "$BASE_URL/tags" \
  -H "Authorization: Bearer $API_KEY"
```

### 格式化输出

```bash
# 使用 jq 美化 JSON 输出
curl -s -X GET "$BASE_URL/prompts" \
  -H "Authorization: Bearer $API_KEY" | jq '.data[] | {id, title, tags}'

# 获取并导出 prompts 到文件
curl -s -X GET "$BASE_URL/prompts" \
  -H "Authorization: Bearer $API_KEY" | jq > prompts.json
```

## Postman Collection

导入以下 JSON 到 Postman：

```json
{
  "info": {
    "name": "PromptMinder API",
    "description": "PromptMinder API Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://promptminder.com/api/v1"
    },
    {
      "key": "apiKey",
      "type": "string",
      "description": "Your API key here"
    }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{apiKey}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Prompts",
      "item": [
        {
          "name": "Get All Prompts",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/prompts?page=1&limit=20&sort=created_at&order=desc",
              "host": ["{{baseUrl}}"],
              "path": ["prompts"],
              "query": [
                {
                  "key": "page",
                  "value": "1",
                  "description": "Page number"
                },
                {
                  "key": "limit",
                  "value": "20",
                  "description": "Items per page"
                },
                {
                  "key": "sort",
                  "value": "created_at",
                  "description": "Sort field"
                },
                {
                  "key": "order",
                  "value": "desc",
                  "description": "Sort order"
                }
              ]
            }
          }
        },
        {
          "name": "Get Single Prompt",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/prompts/{{promptId}}",
              "host": ["{{baseUrl}}"],
              "path": ["prompts", "{{promptId}}"]
            }
          }
        },
        {
          "name": "Search Prompts",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/prompts?search=marketing&tags=email",
              "host": ["{{baseUrl}}"],
              "path": ["prompts"],
              "query": [
                {
                  "key": "search",
                  "value": "marketing",
                  "description": "Search query"
                },
                {
                  "key": "tags",
                  "value": "email",
                  "description": "Filter by tags"
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "Projects",
      "item": [
        {
          "name": "Get All Projects",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/projects",
              "host": ["{{baseUrl}}"],
              "path": ["projects"]
            }
          }
        }
      ]
    },
    {
      "name": "Tags",
      "item": [
        {
          "name": "Get All Tags",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/tags",
              "host": ["{{baseUrl}}"],
              "path": ["tags"]
            }
          }
        }
      ]
    }
  ]
}
```

## 错误处理

所有 API 错误都返回统一的格式：

```json
{
  "success": false,
  "error": "Error message",
  "error_code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 常见错误码

- `MISSING_API_KEY` (401): 缺少 API Key
- `INVALID_API_KEY` (401): 无效的 API Key
- `API_KEY_EXPIRED` (401): API Key 已过期
- `INSUFFICIENT_PERMISSIONS` (403): 权限不足
- `RATE_LIMIT_EXCEEDED` (429): 请求频率超限
- `PROMPT_NOT_FOUND` (404): Prompt 不存在

### 错误处理示例

```javascript
try {
  const response = await api.getPrompts();
  console.log(response.data);
} catch (error) {
  if (error.message.includes('401')) {
    console.error('认证失败，请检查 API Key');
  } else if (error.message.includes('403')) {
    console.error('权限不足，请检查 API Key 权限');
  } else if (error.message.includes('429')) {
    console.error('请求过于频繁，请稍后重试');
  } else {
    console.error('未知错误:', error.message);
  }
}
```

## 最佳实践

1. **API Key 安全**
   - 不要在代码仓库中硬编码 API Key
   - 使用环境变量或安全的密钥管理服务
   - 定期轮换 API Key
   - 为不同环境使用不同的 API Key

2. **错误处理**
   - 始终检查响应状态
   - 实现重试机制（对于 5xx 错误）
   - 记录错误日志用于调试

3. **性能优化**
   - 使用适当的分页参数
   - 缓存不经常变化的数据
   - 使用字段过滤减少数据传输

4. **请求限制**
   - 注意速率限制（通常为 60 次/分钟）
   - 使用批量操作减少请求次数
   - 实现请求队列和延迟机制

5. **监控和日志**
   - 记录 API 使用情况
   - 监控错误率和响应时间
   - 设置告警机制

## SDK 列表

我们提供以下语言的官方 SDK：

- [JavaScript/TypeScript](https://github.com/promptminder/js-sdk)
- [Python](https://github.com/promptminder/python-sdk)
- [Go](https://github.com/promptminder/go-sdk)

## 更多资源

- [API 文档](/api-docs) - 完整的 API 参考文档
- [社区论坛](https://community.promptminder.com) - 获取帮助和分享经验
- [开发者博客](https://blog.promptminder.com) - 最新功能和最佳实践

如有任何问题，请联系 [api@promptminder.com](mailto:api@promptminder.com)