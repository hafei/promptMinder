import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'
import { ApiError } from './api-error.js'

// 从 Supabase Auth 获取当前用户 ID
export async function getCurrentUserId() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  if (!accessToken) {
    return null
  }

  const supabase = createSupabaseServerClient()

  try {
    // 设置 session
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    })

    if (sessionError || !sessionData.session) {
      return null
    }

    // 获取用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return null
    }

    return user.id
  } catch (error) {
    console.error('获取用户 ID 错误:', error)
    return null
  }
}

// 获取当前用户信息
export async function getCurrentUser() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  if (!accessToken) {
    return null
  }

  const supabase = createSupabaseServerClient()

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    })

    if (sessionError || !sessionData.session) {
      return null
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      is_admin: user.user_metadata?.is_admin || false
    }
  } catch (error) {
    console.error('获取用户信息错误:', error)
    return null
  }
}

// 需要认证的 API 使用此函数
export async function requireUserId() {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new ApiError(401, 'Authentication required')
  }
  return userId
}

// 兼容旧代码的 auth 函数
export async function auth() {
  const userId = await getCurrentUserId()
  return { userId }
}

// 检查是否是管理员
export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.is_admin || false
}
