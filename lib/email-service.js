import { Resend } from 'resend'

// 初始化 Resend 客户端（如果配置了 API 密钥）
let resendClient = null
if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY)
}

/**
 * 发送邀请邮件
 */
export async function sendInvitationEmail(email, invitationToken, inviterName) {
  // 开发环境下如果没有配置邮件服务，返回模拟结果
  if (!resendClient) {
    console.log(`[模拟邮件] 发送邀请邮件到 ${email}`)
    console.log(`[模拟邮件] 邀请令牌: ${invitationToken}`)
    console.log(`[模拟邮件] 邀请人: ${inviterName}`)
    console.log(`[模拟邮件] 注册链接: ${process.env.NEXT_PUBLIC_BASE_URL}/invite/${invitationToken}`)
    
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
      previewUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${invitationToken}`
    }
  }
  
  try {
    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${invitationToken}`
    
    const { data, error } = await resendClient.emails.send({
      from: process.env.FROM_EMAIL || `noreply@${process.env.NEXT_PUBLIC_BASE_URL?.replace('https://', '').replace('http://', '') || 'localhost'}`,
      to: [email],
      subject: `${inviterName} 邀请您加入 PromptMinder`,
      html: generateInvitationEmailTemplate(inviterName, inviteUrl)
    })
    
    if (error) {
      console.error('发送邀请邮件失败:', error)
      throw new Error(`邮件发送失败: ${error.message}`)
    }
    
    return {
      success: true,
      messageId: data.id
    }
  } catch (error) {
    console.error('发送邀请邮件异常:', error)
    throw new Error('邮件发送失败')
  }
}

/**
 * 生成邀请邮件模板
 */
function generateInvitationEmailTemplate(inviterName, inviteUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>加入 PromptMinder</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .content {
          padding: 30px 0;
        }
        .button {
          display: inline-block;
          background: #3B82F6;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          padding: 20px 0;
          border-top: 1px solid #eee;
          font-size: 14px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 您收到了邀请</h1>
      </div>
      
      <div class="content">
        <p>您好，</p>
        
        <p><strong>${inviterName}</strong> 邀请您加入 <strong>PromptMinder</strong> - 一个强大的 AI 提示词管理和协作平台。</p>
        
        <p>在 PromptMinder，您可以：</p>
        <ul>
          <li>📝 创建和管理专业的 AI 提示词</li>
          <li>👥 与团队成员协作分享提示词</li>
          <li>🚀 优化您的 AI 对话效果</li>
          <li>📊 追踪提示词的使用情况</li>
        </ul>
        
        <p>点击下面的按钮接受邀请并完成注册：</p>
        
        <div style="text-align: center;">
          <a href="${inviteUrl}" class="button">接受邀请</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          如果按钮无法点击，请复制以下链接到浏览器：<br>
          <a href="${inviteUrl}">${inviteUrl}</a>
        </p>
        
        <p style="color: #999; font-size: 12px;">
          此邀请链接将在 7 天后过期。如果您不想接受此邀请，请忽略此邮件。
        </p>
      </div>
      
      <div class="footer">
        <p>此邮件由 PromptMinder 系统自动发送，请勿回复。</p>
      </div>
    </body>
    </html>
  `
}

/**
 * 验证邮件配置
 */
export function validateEmailConfig() {
  const errors = []
  
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    errors.push('NEXT_PUBLIC_BASE_URL 未配置')
  }
  
  if (!process.env.RESEND_API_KEY) {
    console.warn('邮件服务未配置（RESEND_API_KEY），将在开发模式下使用模拟邮件')
    return { valid: true, isDevMode: true }
  }
  
  if (!process.env.FROM_EMAIL) {
    errors.push('FROM_EMAIL 未配置')
  }
  
  if (errors.length > 0) {
    return {
      valid: false,
      errors
    }
  }
  
  return {
    valid: true,
    isDevMode: false
  }
}

/**
 * 发送测试邮件（用于验证配置）
 */
export async function sendTestEmail(toEmail) {
  const config = validateEmailConfig()
  
  if (!config.valid) {
    throw new Error(`邮件配置无效: ${config.errors.join(', ')}`)
  }
  
  if (config.isDevMode) {
    console.log(`[模拟邮件] 测试邮件将发送到 ${toEmail}`)
    return {
      success: true,
      messageId: `test-${Date.now()}`,
      isDevMode: true
    }
  }
  
  try {
    const { data, error } = await resendClient.emails.send({
      from: process.env.FROM_EMAIL,
      to: [toEmail],
      subject: 'PromptMinder 邮件服务测试',
      html: `
        <h2>邮件服务测试</h2>
        <p>如果您收到此邮件，说明 PromptMinder 的邮件服务配置正常。</p>
        <p>发送时间: ${new Date().toLocaleString()}</p>
      `
    })
    
    if (error) {
      throw error
    }
    
    return {
      success: true,
      messageId: data.id
    }
  } catch (error) {
    console.error('发送测试邮件失败:', error)
    throw new Error('测试邮件发送失败')
  }
}