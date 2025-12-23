import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'

export async function POST(request) {
    try {
        const { email } = await request.json()

        // 验证输入
        if (!email) {
            return NextResponse.json(
                { error: '请输入邮箱地址' },
                { status: 400 }
            )
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: '请输入有效的邮箱地址' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServerClient()

        // 发送密码重置邮件
        const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
            redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password`
        })

        if (error) {
            console.error('发送密码重置邮件错误:', error)
            // 不泄露邮箱是否存在
            // 即使出错也返回成功信息
        }

        // 为了安全，无论邮箱是否存在都返回相同的成功消息
        return NextResponse.json({
            success: true,
            message: '如果该邮箱已注册，您将收到密码重置邮件。'
        })

    } catch (error) {
        console.error('密码重置错误:', error)
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        )
    }
}
