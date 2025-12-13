import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'

export async function POST(request) {
    try {
        const { access_token, refresh_token, new_password } = await request.json()

        if (!access_token || !new_password) {
            return NextResponse.json(
                { error: '缺少必要参数' },
                { status: 400 }
            )
        }

        if (new_password.length < 6) {
            return NextResponse.json(
                { error: '密码长度至少 6 个字符' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServerClient()

        // 设置 session
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || ''
        })

        if (sessionError) {
            console.error('设置 session 失败:', sessionError)
            return NextResponse.json(
                { error: '重置链接无效或已过期' },
                { status: 401 }
            )
        }

        // 获取当前用户的 metadata 以便保留
        const currentMetadata = sessionData?.user?.user_metadata || {}

        // 更新密码，同时保留原有的 user_metadata
        const { error: updateError } = await supabase.auth.updateUser({
            password: new_password,
            data: currentMetadata  // 显式保留原有 metadata
        })

        if (updateError) {
            console.error('更新密码失败:', updateError)
            return NextResponse.json(
                { error: updateError.message || '密码更新失败' },
                { status: 400 }
            )
        }

        // 登出当前 session（密码已更改，需要重新登录）
        await supabase.auth.signOut()

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('更新密码错误:', error)
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        )
    }
}
