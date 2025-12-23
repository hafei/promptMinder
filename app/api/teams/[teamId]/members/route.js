import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'
import { TeamService, TEAM_STATUSES } from '@/lib/team-service.js'
import { handleApiError } from '@/lib/handle-api-error.js'
import { requireUserId } from '@/lib/auth.js'
import { isEmailDomainAllowed, getDomainRestrictionMessage } from '@/lib/email-domain-validator.js'

async function getTeamId(paramsPromise) {
  const { teamId } = await paramsPromise
  if (!teamId) {
    throw new Error('Team id missing in route params')
  }
  return teamId
}

export async function GET(_request, { params }) {
  try {
    const teamId = await getTeamId(params)
    const userId = await requireUserId()

    const supabase = createSupabaseServerClient()
    const teamService = new TeamService(supabase)
    await teamService.requireMembership(teamId, userId)

    const { data, error } = await supabase
      .from('team_members')
      .select('user_id, email, role, status, invited_by, invited_at, joined_at, left_at, created_at, updated_at')
      .eq('team_id', teamId)
      .in('status', [TEAM_STATUSES.ACTIVE, TEAM_STATUSES.PENDING])
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ members: data || [] })
  } catch (error) {
    return handleApiError(error, 'Unable to list team members')
  }
}

export async function POST(request, { params }) {
  try {
    const teamId = await getTeamId(params)
    const actorUserId = await requireUserId()
    const { email, role } = await request.json()

    if (!email || !email.trim()) {
      return NextResponse.json({ error: '邮箱是必填项' }, { status: 400 })
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const normalizedEmail = email.trim().toLowerCase()
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 })
    }

    // Validate email domain
    if (!isEmailDomainAllowed(normalizedEmail)) {
      return NextResponse.json({ error: getDomainRestrictionMessage() }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const teamService = new TeamService(supabase)

    // 获取团队信息（用于邀请邮件）
    const team = await teamService.getTeam(teamId)

    // 通过 email 查找 Supabase Auth 用户
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('查询用户列表失败:', listError)
      return NextResponse.json({ error: '无法验证邮箱' }, { status: 500 })
    }

    // 查找匹配邮箱的用户
    const existingUser = usersData.users.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (existingUser) {
      // 用户已存在 -> 直接添加 pending 成员记录
      const membership = await teamService.inviteMember(teamId, actorUserId, {
        userId: existingUser.id,
        email: normalizedEmail,
        role: role || 'member'
      })

      return NextResponse.json({
        membership,
        message: '已向用户发送团队邀请',
        userExists: true
      }, { status: 201 })
    } else {
      // 用户不存在 -> 使用 Supabase Auth 发送邀请邮件
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/teams/invites`,
          data: {
            invited_to_team: team.name,
            invited_to_team_id: teamId
          }
        }
      )

      if (inviteError) {
        console.error('发送邀请邮件失败:', inviteError)
        return NextResponse.json({
          error: inviteError.message || '发送邀请邮件失败'
        }, { status: 500 })
      }

      // 创建 pending 成员记录
      const membership = await teamService.inviteMember(teamId, actorUserId, {
        userId: inviteData.user.id,
        email: normalizedEmail,
        role: role || 'member'
      })

      return NextResponse.json({
        membership,
        message: '已向该邮箱发送注册邀请',
        userExists: false
      }, { status: 201 })
    }
  } catch (error) {
    return handleApiError(error, 'Unable to invite member')
  }
}
