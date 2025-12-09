import { NextResponse } from 'next/server'
import { getInvitationByToken, updateInvitationStatus } from '@/lib/local-auth/invitation-service.js'

export async function GET(request, { params }) {
  try {
    const token = params.token
    
    if (!token) {
      return NextResponse.json(
        { error: '缺少邀请令牌' },
        { status: 400 }
      )
    }
    
    // 获取邀请信息
    const invitation = await getInvitationByToken(token)
    
    if (!invitation) {
      return NextResponse.json(
        { error: '邀请链接无效或已过期' },
        { status: 404 }
      )
    }
    
    if (invitation.status !== 'pending') {
      let statusMessage = '此邀请已被'
      if (invitation.status === 'accepted') {
        statusMessage += '接受'
      } else if (invitation.status === 'expired') {
        statusMessage += '过期'
      }
      
      return NextResponse.json(
        { error: `${statusMessage}，无法使用此链接` },
        { status: 410 }
      )
    }
    
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        inviter: invitation.users,
        invited_at: invitation.invited_at,
        expires_at: invitation.expires_at
      }
    })
    
  } catch (error) {
    console.error('验证邀请令牌失败:', error)
    return NextResponse.json(
      { error: '验证邀请失败' },
      { status: 500 }
    )
  }
}