import { withAPIAuth, successResponse, APIErrors, PERMISSIONS } from '@/lib/middleware/api-auth';
import { createSupabaseServerClient as createClient } from '@/lib/supabaseServer';

/**
 * @swagger
 * /prompts/{id}:
 *   get:
 *     summary: 获取单个prompt的详细信息
 *     tags:
 *       - Prompts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Prompt的UUID
 *       - in: query
 *         name: include_versions
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含版本历史
 *     responses:
 *       200:
 *         description: 成功获取prompt详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Prompt'
 *                     - type: object
 *                       properties:
 *                         project:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                         creator:
 *                           type: object
 *                           properties:
 *                             email:
 *                               type: string
 *                             role:
 *                               type: string
 *                         versions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               version:
 *                                 type: integer
 *                               created_at:
 *                                 type: string
 *                                 format: date-time
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Prompt不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
async function handler(req, res) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      error_code: 'METHOD_NOT_ALLOWED'
    });
  }

  const { teamId } = req.auth;
  const { id: promptId } = req.query;
  const { include_versions = false } = req.query;
  const supabase = createClient();

  // 验证promptId格式
  if (!promptId || typeof promptId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid prompt ID',
      error_code: 'INVALID_PROMPT_ID'
    });
  }

  try {
    // 获取prompt详情
    const { data: prompt, error } = await supabase
      .from('prompts')
      .select(`
        *,
        projects(name),
        team_members(email, role)
      `)
      .eq('id', promptId)
      .eq('team_id', teamId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 记录不存在
        return res.status(404).json({
          success: false,
          error: 'Prompt not found',
          error_code: 'PROMPT_NOT_FOUND'
        });
      }
      throw error;
    }

    // 处理标签字段
    if (typeof prompt.tags === 'string') {
      try {
        prompt.tags = JSON.parse(prompt.tags);
      } catch (e) {
        prompt.tags = [];
      }
    }

    // 如果需要包含版本历史
    if (include_versions === 'true' || include_versions === true) {
      const { data: versions, error: versionError } = await supabase
        .from('prompts')
        .select('id, version, title, content, created_at, updated_at')
        .eq('team_id', teamId)
        // 假设有字段可以关联到原始prompt
        .eq('original_prompt_id', promptId) // 需要根据实际表结构调整
        .order('version', { ascending: false });

      if (!versionError && versions) {
        prompt.versions = versions;
      } else {
        prompt.versions = [];
      }
    }

    // 返回成功响应
    return res.status(200).json(successResponse(prompt));

  } catch (error) {
    console.error('Error fetching prompt:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch prompt',
      error_code: 'DATABASE_ERROR',
      details: error.message
    });
  }
}

// 使用API认证中间件包装处理器
export default withAPIAuth(handler, PERMISSIONS.READ_PROMPTS);