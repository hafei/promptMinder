import { withAPIAuth, successResponse, PERMISSIONS } from '@/lib/middleware/api-auth';
import { createSupabaseServerClient as createClient } from '@/lib/supabaseServer';

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: 获取认证团队的所有标签
 *     tags:
 *       - Tags
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_prompt_count
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含使用每个标签的prompt数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索标签名称
 *     responses:
 *       200:
 *         description: 成功获取标签列表
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
 *                       team_id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                       created_by:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       prompt_count:
 *                         type: integer
 *                         description: 使用此标签的prompt数量（仅在include_prompt_count=true时返回）
 *                 timestamp:
 *                   type: string
 *                   format: date-time
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
  const { include_prompt_count = false, search } = req.query;
  const supabase = createClient();

  try {
    // 构建查询
    let query = supabase
      .from('tags')
      .select('*')
      .eq('team_id', teamId)
      .order('name', { ascending: true });

    // 应用搜索过滤
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: tags, error } = await query;

    if (error) {
      throw error;
    }

    // 如果需要包含每个标签的prompt数量
    if (include_prompt_count === 'true' || include_prompt_count === true) {
      // 获取所有prompts的tags字段
      const { data: prompts, error: promptsError } = await supabase
        .from('prompts')
        .select('tags')
        .eq('team_id', teamId)
        .not('tags', 'is', null);

      if (!promptsError && prompts) {
        // 统计每个标签的使用次数
        const tagCounts = {};
        prompts.forEach(prompt => {
          if (prompt.tags) {
            let tagList = [];
            if (typeof prompt.tags === 'string') {
              try {
                tagList = JSON.parse(prompt.tags);
              } catch (e) {
                tagList = prompt.tags.split(',').map(t => t.trim());
              }
            } else if (Array.isArray(prompt.tags)) {
              tagList = prompt.tags;
            }

            tagList.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        });

        // 将使用次数添加到标签数据中
        tags.forEach(tag => {
          tag.prompt_count = tagCounts[tag.name] || 0;
        });
      }
    }

    // 返回成功响应
    return res.status(200).json(successResponse(tags || []));

  } catch (error) {
    console.error('Error fetching tags:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tags',
      error_code: 'DATABASE_ERROR',
      details: error.message
    });
  }
}

// 使用API认证中间件包装处理器
export default withAPIAuth(handler, PERMISSIONS.READ_PROMPTS);