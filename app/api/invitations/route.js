import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'
import { getCurrentUser, isAdmin } from '@/lib/local-auth/session.js'
import { createInvitation, isEmailInvited, getInvitationsByUser } from '@/lib/local-auth/invitation-service.js'
import { sendInvitationEmail, validateEmailConfig } from '@/lib/email-service.js'

export async function POST(request) {
  try {
    // 验证邮件配置
    const emailConfig = validateEmailConfig()
    if (!emailConfig.valid) {
      return NextResponse.json(
        { error: '邮件服务配置无效', details: emailConfig.errors },
        { status: 500 }
      )
    }
    
    // 获取当前用户
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }
    
    // 获取请求数据
    const { email } = await request.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: '请提供有效的邮箱地址' },
        { status: 400 }
      )
    }
    
    const emailLower = email.toLowerCase()
    
    // 检查邮箱是否已被注册
    const supabase = createSupabaseServerClient()
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', emailLower)
      .single()
    
    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已注册，请直接登录' },
        { status: 409 }
      )
    }
    
    // 检查是否已被邀请
    const alreadyInvited = await isEmailInvited(emailLower)
    if (alreadyInvited) {
      return NextResponse.json(
        { error: '该邮箱已被邀请，请勿重复邀请' },
        { status: 409 }
      )
    }
    
    // 创建邀请
    const invitation = await createInvitation(emailLower, currentUser.id)
    
    // 发送邮件
    const inviterName = currentUser.display_name || currentUser.username
    const emailResult = await sendInvitationEmail(
      emailLower,
      invitation.token,
      inviterName
    )
    
    // 返回结果
    const response = {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        invited_at: invitation.invited_at,
        expires_at: invitation.expires_at
      },
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
      isDevMode: emailResult.isDevMode || false
    }
    
    // 开发模式下返回预览链接
    if (emailResult.previewUrl) {
      response.previewUrl = emailResult.previewUrl
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('发送邀请失败:', error)
    return NextResponse.json(
      { error: error.message || '发送邀请失败，请稍后重试' },
      { status: 500 }
    )
  }
}

// 获取邀请列表
export async function GET(request) {
  try {
    // 获取当前用户
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }
    
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // 获取邀请列表
    const invitations = await getInvitationsByUser(currentUser.id, {
      status,
      limit
    })
    
    return NextResponse.json({
      success: true,
      invitations
    })
    
  } catch (error) {
    console.error('获取邀请列表失败:', error)
    return NextResponse.json(
      { error: error.message || '获取邀请列表失败' },
      { status: 500 }
    )
  }
}