import { withAPIAuth, successResponse, PERMISSIONS } from '@/lib/middleware/api-auth';
import { createSupabaseServerClient as createClient } from '@/lib/supabaseServer';

/*
 * Projects API - 暂时隐藏在 API 文档中
 * 
 * @swagger-disabled
 * /projects:
 *   get:
 *     summary: 获取认证团队的所有项目
 *     tags:
 *       - Projects
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_prompt_count
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含每个项目的prompt数量
 *     responses:
 *       200:
 *         description: 成功获取项目列表
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
 *                         description:
 *                           type: string
 *                         team_id:
 *                           type: string
 *                           format: uuid
 *                         created_by:
 *                           type: string
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *                         prompt_count:
 *                           type: integer
 *                           description: 项目中的prompt数量（仅在include_prompt_count=true时返回）
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
  const { include_prompt_count = false } = req.query;
  const supabase = createClient();

  try {
    let query = supabase
      .from('projects')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    const { data: projects, error } = await query;

    if (error) {
      throw error;
    }

    // 如果需要包含prompt数量
    if (include_prompt_count === 'true' || include_prompt_count === true) {
      // 获取每个项目的prompt数量
      const projectIds = projects.map(p => p.id);
      const { data: promptCounts, error: countError } = await supabase
        .from('prompts')
        .select('project_id')
        .eq('team_id', teamId)
        .in('project_id', projectIds);

      if (!countError && promptCounts) {
        // 计算每个项目的prompt数量
        const counts = {};
        promptCounts.forEach(p => {
          counts[p.project_id] = (counts[p.project_id] || 0) + 1;
        });

        // 将数量添加到项目数据中
        projects.forEach(project => {
          project.prompt_count = counts[project.id] || 0;
        });
      }
    }

    // 返回成功响应
    return res.status(200).json(successResponse(projects || []));

  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      error_code: 'DATABASE_ERROR',
      details: error.message
    });
  }
}

// 使用API认证中间件包装处理器
export default withAPIAuth(handler, PERMISSIONS.READ_PROJECTS);