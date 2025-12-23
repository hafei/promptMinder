import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'

export async function POST(request) {
  try {
    const supabase = createSupabaseServerClient()

    // 从 cookie 获取 access token 来设置 session
    const cookies = request.cookies
    const accessToken = cookies.get('sb-access-token')?.value
    const refreshToken = cookies.get('sb-refresh-token')?.value

    if (accessToken && refreshToken) {
      // 设置 session 以便正确登出
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
    }

    // 使用 Supabase Auth 登出
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Supabase Auth 登出错误:', error)
      // 即使登出失败，也清除本地 cookies
    }

    const response = NextResponse.json({ success: true })

    // 清除 auth cookies
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')

    return response

  } catch (error) {
    console.error('登出错误:', error)

    // 即使出错也返回成功，确保清除本地状态
    const response = NextResponse.json({ success: true })
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')

    return response
  }
}
