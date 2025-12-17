import { createSupabaseServerClient as createClient } from '@/lib/supabaseServer';
import { generateAPIKey, getAPIKeyPrefix } from '@/lib/api-key-generator';
import bcrypt from 'bcryptjs';

/*
 * API Keys Management - 暂时隐藏在 API 文档中
 * 
 * @swagger-disabled
 * /teams/{teamId}/api-keys/{keyId}:
 *   put:
 *     summary: 更新API Key信息
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
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API Key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: API Key的新名称
 *               description:
 *                 type: string
 *                 description: API Key的新描述
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: 新的过期时间
 *               is_active:
 *                 type: boolean
 *                 description: 是否激活此API Key
 *     responses:
 *       200:
 *         description: 成功更新API Key
 *   delete:
 *     summary: 删除API Key
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
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API Key ID
 *     responses:
 *       200:
 *         description: 成功删除API Key
 *   post:
 *     summary: 轮换API Key（生成新key，使旧key失效）
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
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API Key ID
 *     responses:
 *       200:
 *         description: 成功轮换API Key
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
 *                     api_key:
 *                       type: string
 *                       description: 新的API Key（仅返回一次）
 */
export default async function handler(req, res) {
  const { teamId, keyId } = req.query;
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

  // 设置 session
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

  // 检查用户权限
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  // 检查用户是否是团队成员
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('role, status')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !member || member.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  if (!['admin', 'owner'].includes(member.role)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions'
    });
  }

  // 检查API Key是否存在且属于该团队
  const { data: apiKey, error: keyError } = await supabase
    .from('api_keys')
    .select('*')
    .eq('id', keyId)
    .eq('team_id', teamId)
    .single();

  if (keyError || !apiKey) {
    return res.status(404).json({
      success: false,
      error: 'API Key not found'
    });
  }

  // PUT - 更新API Key
  if (req.method === 'PUT') {
    try {
      const { name, description, expires_at, is_active } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (expires_at !== undefined) updateData.expires_at = expires_at;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data: updatedKey, error } = await supabase
        .from('api_keys')
        .update(updateData)
        .eq('id', keyId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 不返回key_hash
      const { key_hash, ...safeKey } = updatedKey;

      return res.status(200).json({
        success: true,
        data: safeKey
      });

    } catch (error) {
      console.error('Error updating API key:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update API key'
      });
    }
  }

  // DELETE - 删除API Key
  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'API Key deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting API key:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete API key'
      });
    }
  }

  // POST - 轮换API Key
  if (req.method === 'POST') {
    try {
      // 生成新的API Key
      const newApiKey = generateAPIKey();
      const newKeyHash = await bcrypt.hash(newApiKey, 12);

      // 更新API Key的哈希值
      const { data: rotatedKey, error } = await supabase
        .from('api_keys')
        .update({
          key_hash: newKeyHash,
          key_prefix: getAPIKeyPrefix(newApiKey),
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 返回新的API Key（仅此一次）
      return res.status(200).json({
        success: true,
        data: {
          id: rotatedKey.id,
          api_key: newApiKey // 仅在轮换时返回新key
        }
      });

    } catch (error) {
      console.error('Error rotating API key:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to rotate API key'
      });
    }
  }

  // 其他方法不允许
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}