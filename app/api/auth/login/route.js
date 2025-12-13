import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // 使用 Supabase Auth 登录
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    })

    if (error) {
      console.error('Supabase Auth 登录错误:', error)

      // 处理常见错误
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: '邮箱或密码错误' },
          { status: 401 }
        )
      }

      if (error.message.includes('Email not confirmed')) {
        return NextResponse.json(
          { error: '请先确认您的邮箱地址' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: error.message || '登录失败' },
        { status: 401 }
      )
    }

    if (!data.session) {
      return NextResponse.json(
        { error: '登录失败，无法获取会话' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        display_name: data.user.user_metadata?.display_name || data.user.email.split('@')[0],
        avatar_url: data.user.user_metadata?.avatar_url
      }
    })

    // 设置 auth token cookies
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

  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
