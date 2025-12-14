import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabaseServer.js'

// 简化版的 getCurrentUser 函数
export async function getCurrentUserSimple() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  if (!accessToken) {
    return null
  }

  const supabase = createSupabaseServerClient()

  try {
    // 直接使用 getUser 方法
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      console.error('Auth error:', error)
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