import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

// 从 JWT token 解析用户信息
export async function getCurrentUserFromJWT() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value

  if (!accessToken) {
    return null
  }

  try {
    // 解码 JWT token（不验证签名，因为这是 Supabase 的 token）
    const decoded = jwt.decode(accessToken)

    if (!decoded || !decoded.email) {
      return null
    }

    return {
      id: decoded.sub,
      email: decoded.email,
      display_name: decoded.user_metadata?.display_name || decoded.email?.split('@')[0],
      avatar_url: decoded.user_metadata?.avatar_url,
      is_admin: decoded.user_metadata?.is_admin || false
    }
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}