import { withAPIAuth, successResponse, PERMISSIONS } from '@/lib/middleware/api-auth';
import { createSupabaseServerClient as createClient } from '@/lib/supabaseServer';

/**
 * @swagger
 * /prompts/{prompt_id}:
 *   get:
 *     summary: 获取单个prompt的详细信息
 *     tags:
 *       - Prompts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: prompt_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Prompt的8位ID（如 a1b2c3d4）
 *       - in: query
 *         name: include_versions
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含所有版本历史
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *         description: 指定版本（如 "1.0.0"），不指定则返回最新版本
 *     responses:
 *       200:
 *         description: 成功获取prompt详情
 *       404:
 *         description: Prompt不存在
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      error_code: 'METHOD_NOT_ALLOWED'
    });
  }

  const { teamId } = req.auth;
  const { id: promptIdentifier } = req.query;
  const { include_versions = false, version } = req.query;
  const supabase = createClient();

  if (!promptIdentifier || typeof promptIdentifier !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid prompt identifier',
      error_code: 'INVALID_PROMPT_ID'
    });
  }

  try {
    // 判断是 UUID 还是 8位 prompt_id
    const isUUID = promptIdentifier.length === 36 && promptIdentifier.includes('-');

    let query = supabase
      .from('prompts')
      .select(`*, projects(name)`)
      .eq('team_id', teamId);

    if (isUUID) {
      // 通过 UUID 查询单条记录
      query = query.eq('id', promptIdentifier);
    } else {
      // 通过 8位 prompt_id 查询所有版本
      query = query.eq('prompt_id', promptIdentifier);
    }

    const { data: prompts, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!prompts || prompts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Prompt not found',
        error_code: 'PROMPT_NOT_FOUND'
      });
    }

    // 按 created_at 排序（降序），最新的在前
    const versions = prompts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const latestVersion = versions[0];

    // 如果指定了特定版本
    let selectedPrompt = latestVersion;
    if (version) {
      selectedPrompt = versions.find(v => v.version === version);
      if (!selectedPrompt) {
        return res.status(404).json({
          success: false,
          error: `Version "${version}" not found`,
          error_code: 'VERSION_NOT_FOUND'
        });
      }
    }

    // 处理标签
    let parsedTags = [];
    if (typeof selectedPrompt.tags === 'string') {
      try {
        parsedTags = JSON.parse(selectedPrompt.tags);
      } catch (e) {
        parsedTags = selectedPrompt.tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    // 构建响应
    const responseData = {
      ...selectedPrompt,
      tags: parsedTags,
      version_count: versions.length
    };

    // 如果需要包含版本历史
    if (include_versions === 'true' || include_versions === true) {
      responseData.versions = versions.map(v => ({
        id: v.id,
        version: v.version,
        title: v.title,
        content: v.content,
        created_by: v.created_by,
        created_at: v.created_at
      }));
    }

    return res.status(200).json(successResponse(responseData));

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

export default withAPIAuth(handler, PERMISSIONS.READ_PROMPTS);
