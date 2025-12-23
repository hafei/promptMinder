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

        // 发送 Magic Link 登录邮件
        const { error } = await supabase.auth.signInWithOtp({
            email: email.toLowerCase(),
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`
            }
        })

        if (error) {
            console.error('发送 Magic Link 错误:', error)

            if (error.message.includes('rate limit')) {
                return NextResponse.json(
                    { error: '请求过于频繁，请稍后再试' },
                    { status: 429 }
                )
            }

            // 不泄露邮箱是否存在
        }

        // 为了安全，无论邮箱是否存在都返回相同的成功消息
        return NextResponse.json({
            success: true,
            message: '如果该邮箱已注册，您将收到登录链接邮件。'
        })

    } catch (error) {
        console.error('Magic Link 错误:', error)
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        )
    }
}
