import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'

export async function POST(request) {
  try {
    const { email, password, displayName } = await request.json()

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
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

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少 6 个字符' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // 使用 Supabase Auth 注册
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0]
        }
      }
    })

    if (error) {
      console.error('Supabase Auth 注册错误:', error)

      // 处理常见错误
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: '该邮箱已被注册' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: error.message || '注册失败' },
        { status: 400 }
      )
    }

    // 检查是否需要邮箱确认
    if (data.user && !data.session) {
      // 需要邮箱确认
      return NextResponse.json({
        success: true,
        needsEmailConfirmation: true,
        message: '注册成功！请检查您的邮箱并点击确认链接。',
        user: {
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.user_metadata?.display_name
        }
      })
    }

    // 注册成功且自动确认（无需邮箱验证）
    if (data.session) {
      const response = NextResponse.json({
        success: true,
        needsEmailConfirmation: false,
        user: {
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.user_metadata?.display_name
        }
      })

      // 设置 auth token cookie
      const isHttps = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https://')
      response.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: data.session.expires_in
      })
      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })

      return response
    }

    return NextResponse.json({
      success: true,
      needsEmailConfirmation: true,
      message: '注册成功！'
    })

  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
