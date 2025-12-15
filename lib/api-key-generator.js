import crypto from 'crypto';

/**
 * API Key 管理工具
 * 用于生成、验证和管理API密钥
 */

// API Key 前缀
const API_KEY_PREFIX = 'pmk_';

// 生成随机字符串
function generateRandomString(length) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成新的API Key
 * @returns {string} 格式: pmk_<24字符的hex字符串>
 */
export function generateAPIKey() {
  const randomBytes = generateRandomString(24);
  return `${API_KEY_PREFIX}${randomBytes}`;
}

/**
 * 获取API Key的前缀部分（用于显示）
 * @param {string} apiKey - 完整的API Key
 * @returns {string} API Key的前缀
 */
export function getAPIKeyPrefix(apiKey) {
  return apiKey.substring(0, 20) + '...';
}

/**
 * 验证API Key格式是否正确
 * @param {string} apiKey - 待验证的API Key
 * @returns {boolean} 格式是否有效
 */
export function validateAPIKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // 检查前缀
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return false;
  }

  // 检查长度：pmk_ + 48个字符
  if (apiKey.length !== 52) {
    return false;
  }

  // 检查是否为有效的hex字符
  const keyPart = apiKey.substring(4);
  const hexRegex = /^[0-9a-f]+$/;
  return hexRegex.test(keyPart);
}

/**
 * 验证API Key的权限
 * @param {Array} permissions - API Key的权限列表
 * @param {string} requiredPermission - 需要的权限
 * @returns {boolean} 是否有权限
 */
export function hasPermission(permissions, requiredPermission) {
  if (!permissions || !Array.isArray(permissions)) {
    return false;
  }

  // 如果有通配符权限，允许所有操作
  if (permissions.includes('*')) {
    return true;
  }

  // 检查具体的权限
  return permissions.includes(requiredPermission);
}

/**
 * 生成API Key的选项
 * @typedef {Object} APIKeyOptions
 * @property {string} name - API Key的名称
 * @property {string} [description] - 描述信息
 * @property {string} [expiresAt] - 过期时间（ISO 8601格式）
 * @property {string[]} [permissions] - 权限列表
 */

/**
 * 预定义的权限
 */
export const PERMISSIONS = {
  READ_PROMPTS: 'read:prompts',
  WRITE_PROMPTS: 'write:prompts',
  DELETE_PROMPTS: 'delete:prompts',
  READ_PROJECTS: 'read:projects',
  WRITE_PROJECTS: 'write:projects',
  READ_TEAMS: 'read:teams',
  MANAGE_KEYS: 'manage:keys',
  ALL: '*'
};

/**
 * 预定义的权限组合
 */
export const PERMISSION_PRESETS = {
  // 只读权限：只能查看prompts
  READ_ONLY: [PERMISSIONS.READ_PROMPTS],

  // 完整权限：可以管理所有资源
  FULL_ACCESS: [PERMISSIONS.ALL],

  // 开发者权限：可以读写prompts和projects
  DEVELOPER: [
    PERMISSIONS.READ_PROMPTS,
    PERMISSIONS.WRITE_PROMPTS,
    PERMISSIONS.READ_PROJECTS
  ]
};

/**
 * API Key使用统计
 * @typedef {Object} APIKeyStats
 * @property {number} totalUsage - 总使用次数
 * @property {Date} lastUsed - 最后使用时间
 * @property {number} todayUsage - 今日使用次数
 * @property {number} thisMonthUsage - 本月使用次数
 */

/**
 * 计算API Key的使用统计
 * @param {Array} usageLogs - 使用日志记录
 * @returns {APIKeyStats} 统计信息
 */
export function calculateAPIKeyStats(usageLogs) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    totalUsage: usageLogs.length,
    lastUsed: null,
    todayUsage: 0,
    thisMonthUsage: 0
  };

  if (usageLogs.length > 0) {
    // 最后使用时间
    stats.lastUsed = new Date(Math.max(...usageLogs.map(log => new Date(log.request_at))));

    // 今日使用次数
    stats.todayUsage = usageLogs.filter(log =>
      new Date(log.request_at) >= today
    ).length;

    // 本月使用次数
    stats.thisMonthUsage = usageLogs.filter(log =>
      new Date(log.request_at) >= thisMonth
    ).length;
  }

  return stats;
}

/**
 * 生成API Key文档说明
 * @param {string} apiKey - API Key
 * @param {Object} options - 选项
 * @returns {string} 文档说明
 */
export function generateAPIKeyDocumentation(apiKey, options = {}) {
  const { baseUrl = 'https://promptminder.com/api/v1' } = options;

  return `# API Key 使用说明

## 基本信息
- API Key: \`${apiKey}\`
- 基础URL: ${baseUrl}
- 认证方式: Bearer Token

## 使用方法
在您的HTTP请求中添加Authorization头：

\`\`\`bash
curl -X GET "${baseUrl}/prompts" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"
\`\`\`

## JavaScript示例
\`\`\`javascript
const response = await fetch('${baseUrl}/prompts', {
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
\`\`\`

## Python示例
\`\`\`python
import requests

headers = {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
}
response = requests.get('${baseUrl}/prompts', headers=headers)
data = response.json()
\`\`\`

## 安全提醒
1. 请勿在代码仓库或公开场所暴露此API Key
2. 建议定期轮换API Key
3. 为不同的应用使用不同的API Key
4. 监控API Key的使用情况，发现异常及时处理

## 常见端点
- GET /prompts - 获取prompts列表
- GET /prompts/:id - 获取单个prompt
- GET /projects - 获取项目列表
- GET /tags - 获取标签列表

更多API文档请访问: ${baseUrl}/docs
`;
}