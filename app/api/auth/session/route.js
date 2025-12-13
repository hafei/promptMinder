import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'

export async function GET(request) {
  try {
    const supabase = createSupabaseServerClient()

    // 从 cookie 获取 tokens
    const cookies = request.cookies
    const accessToken = cookies.get('sb-access-token')?.value
    const refreshToken = cookies.get('sb-refresh-token')?.value

    if (!accessToken) {
      return NextResponse.json({
        isSignedIn: false,
        user: null
      })
    }

    // 设置 session
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    })

    if (sessionError || !sessionData.session) {
      // Token 无效或过期
      const response = NextResponse.json({
        isSignedIn: false,
        user: null
      })
      // 清除无效的 cookies
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      return response
    }

    // 获取用户信息
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        isSignedIn: false,
        user: null
      })
    }

    const response = NextResponse.json({
      isSignedIn: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url
      }
    })

    // 如果 token 被刷新，更新 cookies
    if (sessionData.session.access_token !== accessToken) {
      const isHttps = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https://')
      response.cookies.set('sb-access-token', sessionData.session.access_token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: sessionData.session.expires_in
      })
      if (sessionData.session.refresh_token) {
        response.cookies.set('sb-refresh-token', sessionData.session.refresh_token, {
          httpOnly: true,
          secure: isHttps,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7
        })
      }
    }

    return response

  } catch (error) {
    console.error('获取会话错误:', error)
    return NextResponse.json({
      isSignedIn: false,
      user: null
    })
  }
}
