import { createSupabaseServerClient as createClient } from '@/lib/supabaseServer';
import { validateAPIKeyFormat, hasPermission } from '@/lib/api-key-generator';
import bcrypt from 'bcryptjs';

/**
 * API认证中间件
 * 用于验证API Key并提取团队信息
 */

/**
 * 从请求头中提取API Key
 * @param {Request} req - Next.js请求对象
 * @returns {string|null} API Key或null
 */
function extractAPIKey(req) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // 支持 "Bearer <token>" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 直接传递API Key（为了兼容性）
  return authHeader;
}

/**
 * 通过API Key查找对应的记录
 * @param {string} apiKey - API Key
 * @returns {Object|null} API Key记录或null
 */
async function findAPIKey(apiKey) {
  const supabase = createClient();

  // 由于API Key是哈希存储的，我们需要通过其他方式查找
  // 这里我们使用前缀来缩小搜索范围
  const keyPrefix = apiKey.substring(0, 20) + '%';

  // 查找所有可能匹配的API Key记录
  const { data: possibleKeys, error } = await supabase
    .from('api_keys')
    .select('*')
    .like('key_prefix', `${apiKey.substring(0, 20)}%`)
    .eq('is_active', true);

  if (error || !possibleKeys || possibleKeys.length === 0) {
    return null;
  }

  // 逐个验证找到正确的key
  for (const keyRecord of possibleKeys) {
    const isValid = await bcrypt.compare(apiKey, keyRecord.key_hash);
    if (isValid) {
      return keyRecord;
    }
  }

  return null;
}

/**
 * 记录API使用日志
 * @param {string} apiKeyId - API Key ID
 * @param {string} endpoint - 端点路径
 * @param {string} method - HTTP方法
 * @param {number} statusCode - 响应状态码
 * @param {number} [responseTimeMs] - 响应时间（毫秒）
 */
async function logAPIUsage(apiKeyId, endpoint, method, statusCode, responseTimeMs) {
  const supabase = createClient();

  try {
    await supabase
      .from('api_usage_logs')
      .insert({
        api_key_id: apiKeyId,
        endpoint,
        method,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        ip_address: '', // 可以从req中获取
        user_agent: '', // 可以从req中获取
        request_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log API usage:', error);
    // 不抛出错误，避免影响主要业务逻辑
  }
}

/**
 * 验证API Key权限
 * @param {Object} keyData - API Key数据
 * @param {string} requiredPermission - 需要的权限
 * @returns {boolean} 是否有权限
 */
function checkPermissions(keyData, requiredPermission) {
  // 如果没有指定权限要求，默认允许
  if (!requiredPermission) {
    return true;
  }

  return hasPermission(keyData.permissions, requiredPermission);
}

/**
 * API认证中间件
 * @param {Request} req - Next.js请求对象
 * @param {string} [requiredPermission] - 需要的权限
 * @returns {Promise<Object>} 认证结果
 */
export async function authenticateAPIKey(req, requiredPermission = null) {
  const startTime = Date.now();

  // 1. 提取API Key
  const apiKey = extractAPIKey(req);
  if (!apiKey) {
    return {
      error: 'Missing API key. Please provide an API key in the Authorization header.',
      error_code: 'MISSING_API_KEY',
      status: 401
    };
  }

  // 2. 验证API Key格式
  if (!validateAPIKeyFormat(apiKey)) {
    return {
      error: 'Invalid API key format.',
      error_code: 'INVALID_API_KEY_FORMAT',
      status: 401
    };
  }

  // 3. 查找API Key记录
  const keyData = await findAPIKey(apiKey);
  if (!keyData) {
    await logAPIUsage(null, req.url || '', req.method || 'GET', 401);
    return {
      error: 'Invalid or inactive API key.',
      error_code: 'INVALID_API_KEY',
      status: 401
    };
  }

  // 4. 检查API Key是否过期
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    await logAPIUsage(keyData.id, req.url || '', req.method || 'GET', 401);
    return {
      error: 'API key has expired.',
      error_code: 'API_KEY_EXPIRED',
      status: 401
    };
  }

  // 5. 检查权限
  if (!checkPermissions(keyData, requiredPermission)) {
    await logAPIUsage(keyData.id, req.url || '', req.method || 'GET', 403);
    return {
      error: 'Insufficient permissions.',
      error_code: 'INSUFFICIENT_PERMISSIONS',
      status: 403
    };
  }

  // 6. 更新API Key使用统计
  const supabase = createClient();
  try {
    await supabase
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: keyData.usage_count + 1
      })
      .eq('id', keyData.id);
  } catch (error) {
    console.error('Failed to update API key usage stats:', error);
  }

  // 记录成功的认证日志
  const responseTime = Date.now() - startTime;
  logAPIUsage(keyData.id, req.url || '', req.method || 'GET', 200, responseTime);

  // 返回认证成功信息
  return {
    authenticated: true,
    teamId: keyData.team_id,
    apiKeyId: keyData.id,
    keyName: keyData.name,
    permissions: keyData.permissions,
    rateLimit: {
      // 可以根据团队设置不同的速率限制
      requestsPerMinute: 60,
      requestsPerHour: 1000
    }
  };
}

/**
 * 创建API认证包装器
 * @param {Function} handler - API处理函数
 * @param {string} [requiredPermission] - 需要的权限
 * @returns {Function} 包装后的处理函数
 */
export function withAPIAuth(handler, requiredPermission = null) {
  return async (req, res) => {
    // 认证API Key
    const auth = await authenticateAPIKey(req, requiredPermission);

    if (auth.error) {
      // 设置适当的响应头
      res.setHeader('Content-Type', 'application/json');

      // 返回错误响应
      return res.status(auth.status).json({
        success: false,
        error: auth.error,
        error_code: auth.error_code,
        timestamp: new Date().toISOString()
      });
    }

    // 将认证信息添加到请求对象
    req.auth = auth;

    // 调用原始处理函数
    return handler(req, res);
  };
}

/**
 * API错误响应工具
 */
export const APIErrors = {
  missingKey: (message = 'API key is required') => ({
    success: false,
    error: message,
    error_code: 'MISSING_API_KEY'
  }),

  invalidKey: (message = 'Invalid API key') => ({
    success: false,
    error: message,
    error_code: 'INVALID_API_KEY'
  }),

  expiredKey: (message = 'API key has expired') => ({
    success: false,
    error: message,
    error_code: 'API_KEY_EXPIRED'
  }),

  insufficientPermissions: (message = 'Insufficient permissions') => ({
    success: false,
    error: message,
    error_code: 'INSUFFICIENT_PERMISSIONS'
  }),

  rateLimitExceeded: (message = 'Rate limit exceeded') => ({
    success: false,
    error: message,
    error_code: 'RATE_LIMIT_EXCEEDED'
  })
};

/**
 * 成功响应工具
 * @param {Object} data - 响应数据
 * @param {Object} [meta] - 元数据（如分页信息）
 * @returns {Object} 格式化的成功响应
 */
export function successResponse(data, meta = null) {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
}

/**
 * 分页信息生成器
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {number} total - 总记录数
 * @returns {Object} 分页信息
 */
export function createPaginationInfo(page, limit, total) {
  return {
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    }
  };
}