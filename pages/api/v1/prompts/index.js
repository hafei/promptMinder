import { withAPIAuth, successResponse, createPaginationInfo, PERMISSIONS } from '@/lib/middleware/api-auth';
import { createSupabaseServerClient as createClient } from '@/lib/supabaseServer';

/**
 * @swagger
 * /prompts:
 *   get:
 *     summary: 获取认证团队的所有prompts（每个prompt_id只返回最新版本）
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
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 标签过滤，多个标签用逗号分隔
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID过滤
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, title]
 *           default: created_at
 *         description: 排序字段
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序方向
 *       - in: query
 *         name: is_public
 *         schema:
 *           type: boolean
 *         description: 是否只显示公开的prompts
 *     responses:
 *       200:
 *         description: 成功获取prompts列表
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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
  const supabase = createClient();

  const {
    page = 1,
    limit = 20,
    search,
    tags,
    project_id,
    sort = 'created_at',
    order = 'desc',
    is_public
  } = req.query;

  let query = supabase
    .from('prompts')
    .select(`
      *,
      projects(name)
    `, { count: 'exact' })
    .eq('team_id', teamId);

  // 应用过滤器
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,content.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (tags) {
    const tagList = tags.split(',').map(tag => tag.trim());
    query = query.contains('tags', tagList);
  }

  if (project_id) {
    query = query.eq('project_id', project_id);
  }

  if (is_public !== undefined) {
    const isPublicBool = is_public === 'true' || is_public === true;
    query = query.eq('is_public', isPublicBool);
  }

  // 排序
  const validSortFields = ['created_at', 'updated_at', 'title', 'version'];
  const sortField = validSortFields.includes(sort) ? sort : 'created_at';
  const ascending = order === 'asc';
  query = query.order(sortField, { ascending });

  // 分页
  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 100);

  if (pageNum > 1) {
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    query = query.range(from, to);
  } else {
    query = query.limit(limitNum);
  }

  try {
    const { data: prompts, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch prompts',
        error_code: 'DATABASE_ERROR',
        details: error.message
      });
    }

    // 按 prompt_id 分组，只保留最新版本（按 created_at 降序）
    const latestByPromptId = {};
    for (const prompt of (prompts || [])) {
      const pid = prompt.prompt_id;
      if (!latestByPromptId[pid] || new Date(prompt.created_at) > new Date(latestByPromptId[pid].created_at)) {
        latestByPromptId[pid] = prompt;
      }
    }

    // 处理响应数据
    const processedPrompts = Object.values(latestByPromptId).map(prompt => {
      let parsedTags = [];
      if (typeof prompt.tags === 'string') {
        try {
          parsedTags = JSON.parse(prompt.tags);
        } catch (e) {
          parsedTags = prompt.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
      }

      return {
        ...prompt,
        tags: parsedTags
      };
    });

    const pagination = createPaginationInfo(pageNum, limitNum, count || 0);

    return res.status(200).json(
      successResponse(processedPrompts, pagination)
    );

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      error_code: 'INTERNAL_ERROR'
    });
  }
}

export default withAPIAuth(handler, PERMISSIONS.READ_PROMPTS);
