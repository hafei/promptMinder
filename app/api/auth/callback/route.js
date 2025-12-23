import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'

export async function GET(request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') || '/prompts'
    const type = requestUrl.searchParams.get('type') // signup, recovery, invite, etc.

    // 获取基础 URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    if (code) {
        const supabase = createSupabaseServerClient()

        try {
            // 交换 code 获取 session
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
                console.error('邮箱确认错误:', error)
                return NextResponse.redirect(
                    new URL(`/sign-in?error=${encodeURIComponent('确认链接无效或已过期')}`, baseUrl)
                )
            }

            if (data.session) {
                // 创建重定向响应并设置 cookies
                const response = NextResponse.redirect(new URL(next, baseUrl))

                const isHttps = baseUrl.startsWith('https://')
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
        } catch (error) {
            console.error('Callback 处理错误:', error)
            return NextResponse.redirect(
                new URL(`/sign-in?error=${encodeURIComponent('处理确认链接时出错')}`, baseUrl)
            )
        }
    }

    // 没有 code 参数，重定向到登录页
    return NextResponse.redirect(new URL('/sign-in', baseUrl))
}
