import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/local-auth/session.js'
import { revokeInvitation } from '@/lib/local-auth/invitation-service.js'

export async function DELETE(
  request,
  { params }
) {
  try {
    const invitationId = params.id
    
    if (!invitationId) {
      return NextResponse.json(
        { error: '缺少邀请 ID' },
        { status: 400 }
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
    
    // 撤销邀请
    await revokeInvitation(invitationId, currentUser.id)
    
    return NextResponse.json({
      success: true,
      message: '邀请已撤销'
    })
    
  } catch (error) {
    console.error('撤销邀请失败:', error)
    return NextResponse.json(
      { error: error.message || '撤销邀请失败' },
      { status: 500 }
    )
  }
}