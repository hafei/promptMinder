import { createSupabaseServerClient as createClient } from '@/lib/supabaseServer';
import { generateAPIKey, getAPIKeyPrefix, PERMISSION_PRESETS } from '@/lib/api-key-generator';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * /teams/{teamId}/api-keys:
 *   get:
 *     summary: 获取团队的所有API Keys
 *     tags:
 *       - API Keys Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 团队ID
 *     responses:
 *       200:
 *         description: 成功获取API Keys列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       key_prefix:
 *                         type: string
 *                         description: API Key的前缀部分
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: string
 *                       expires_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       last_used_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       usage_count:
 *                         type: integer
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *   post:
 *     summary: 创建新的API Key
 *     tags:
 *       - API Keys Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 团队ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: API Key的名称
 *                 example: "Production API Key"
 *               description:
 *                 type: string
 *                 description: API Key的描述
 *                 example: "用于生产环境的API访问"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: 过期时间，null表示永不过期
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 权限列表
 *                 example: ["read:prompts", "read:projects"]
 *               preset:
 *                 type: string
 *                 enum: [read-only, developer, full-access]
 *                 description: 使用预定义的权限模板
 *     responses:
 *       201:
 *         description: 成功创建API Key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     api_key:
 *                       type: string
 *                       description: 完整的API Key（仅在创建时返回）
 *                     key_prefix:
 *                       type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 */
export default async function handler(req, res) {
  const { teamId } = req.query;
  const supabase = createClient();

  // 从 cookies 获取 tokens 设置 session
  const accessToken = req.cookies['sb-access-token'];
  const refreshToken = req.cookies['sb-refresh-token'];

  if (!accessToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  // 设置 session (仅用于认证)
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || ''
  });

  if (sessionError || !sessionData.session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  // 检查用户权限（必须是团队成员且是管理员或所有者）
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  // 创建一个新的 service-role 客户端用于数据查询（绕过 RLS）
  const dataClient = createClient();

  // 检查用户是否是团队成员且是 owner 或 admin
  const { data: member, error: memberError } = await dataClient
    .from('team_members')
    .select('role, status')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single();

  console.log('API Keys Auth Debug:', {
    userId: user.id,
    teamId,
    member,
    memberError: memberError?.message
  });

  // 检查是否是活跃成员
  if (memberError || !member || member.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'Access denied - not an active team member'
    });
  }

  // 只有 admin 和 owner 可以管理 API Keys
  if (!['admin', 'owner'].includes(member.role)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions - requires admin or owner role'
    });
  }

  // GET - 获取API Keys列表
  if (req.method === 'GET') {
    try {
      const { data: apiKeys, error } = await dataClient
        .from('api_keys')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // 不返回key_hash
      const safeKeys = apiKeys.map(key => {
        const { key_hash, ...safeKey } = key;
        return safeKey;
      });

      return res.status(200).json({
        success: true,
        data: safeKeys
      });

    } catch (error) {
      console.error('Error fetching API keys:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch API keys'
      });
    }
  }

  // POST - 创建新的API Key
  if (req.method === 'POST') {
    try {
      const { name, description, expiresAt, permissions, preset } = req.body;

      // 验证必填字段
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required'
        });
      }

      // 生成新的API Key
      const apiKey = generateAPIKey();
      const keyHash = await bcrypt.hash(apiKey, 12);

      // 确定权限
      let finalPermissions = permissions;
      if (preset && PERMISSION_PRESETS[preset.toUpperCase()]) {
        finalPermissions = PERMISSION_PRESETS[preset.toUpperCase()];
      } else if (!permissions || permissions.length === 0) {
        // 默认只读权限
        finalPermissions = PERMISSION_PRESETS.READ_ONLY;
      }

      // 创建API Key记录
      const { data: newKey, error } = await dataClient
        .from('api_keys')
        .insert({
          team_id: teamId,
          name,
          description: description || null,
          key_hash: keyHash,
          key_prefix: getAPIKeyPrefix(apiKey),
          permissions: finalPermissions,
          expires_at: expiresAt || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 返回创建的API Key（包含完整的key，仅此一次）
      return res.status(201).json({
        success: true,
        data: {
          ...newKey,
          api_key: apiKey // 仅在创建时返回完整key
        }
      });

    } catch (error) {
      console.error('Error creating API key:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create API key'
      });
    }
  }

  // 其他方法不允许
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}