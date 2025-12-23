import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { access_token, refresh_token, expires_in } = await request.json()

        if (!access_token) {
            return NextResponse.json(
                { error: '缺少 access_token' },
                { status: 400 }
            )
        }

        const response = NextResponse.json({ success: true })

        // 设置 auth token cookies
        const isHttps = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https://')

        response.cookies.set('sb-access-token', access_token, {
            httpOnly: true,
            secure: isHttps,
            sameSite: 'lax',
            path: '/',
            maxAge: expires_in || 3600
        })

        if (refresh_token) {
            response.cookies.set('sb-refresh-token', refresh_token, {
                httpOnly: true,
                secure: isHttps,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            })
        }

        return response

    } catch (error) {
        console.error('设置 session 错误:', error)
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        )
    }
}
