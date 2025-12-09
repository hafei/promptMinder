import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/local-auth/session.js'
import { sendTestEmail, validateEmailConfig } from '@/lib/email-service.js'

export async function POST(request) {
  try {
    // 验证邮件配置
    const emailConfig = validateEmailConfig()
    
    if (!emailConfig.valid) {
      return NextResponse.json(
        { 
          error: '邮件服务配置无效', 
          details: emailConfig.errors,
          isDevMode: emailConfig.isDevMode
        },
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
    
    // 检查是否为管理员
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      )
    }
    
    // 获取请求体中的邮箱
    const { email } = await request.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: '请提供有效的邮箱地址' },
        { status: 400 }
      )
    }
    
    // 发送测试邮件
    const result = await sendTestEmail(email)
    
    return NextResponse.json({
      success: true,
      message: emailConfig.isDevMode ? '开发模式：模拟邮件发送成功' : '测试邮件已发送',
      isDevMode: emailConfig.isDevMode || false,
      messageId: result.messageId
    })
    
  } catch (error) {
    console.error('发送测试邮件失败:', error)
    return NextResponse.json(
      { error: error.message || '发送测试邮件失败' },
      { status: 500 }
    )
  }
}

// 获取邮件配置状态
export async function GET() {
  try {
    // 获取当前用户
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }
    
    // 检查是否为管理员
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      )
    }
    
    // 验证邮件配置
    const emailConfig = validateEmailConfig()
    
    return NextResponse.json({
      emailConfigured: emailConfig.valid,
      isDevMode: emailConfig.isDevMode || false,
      errors: emailConfig.errors || null,
      fromEmail: process.env.FROM_EMAIL || null
    })
    
  } catch (error) {
    console.error('获取邮件配置失败:', error)
    return NextResponse.json(
      { error: '获取邮件配置失败' },
      { status: 500 }
    )
  }
}