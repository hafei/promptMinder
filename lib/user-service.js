import { createSupabaseServerClient } from '@/lib/supabaseServer.js'

// 从 Supabase Auth 获取单个用户信息
export async function getUser(userId) {
    const supabase = createSupabaseServerClient()

    // 使用服务角色密钥查询 auth.users
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !user) {
        console.warn('获取用户失败:', error?.message || 'User not found')
        return null
    }

    return {
        id: user.id,
        email: user.email,
        username: user.email?.split('@')[0],
        fullName: user.user_metadata?.display_name,
        displayName: user.user_metadata?.display_name || user.email?.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url,
        isAdmin: user.user_metadata?.is_admin || false
    }
}

// 批量获取用户信息
export async function getUserList(userIds) {
    if (!userIds || userIds.length === 0) {
        return []
    }

    const supabase = createSupabaseServerClient()
    const users = []

    // Supabase admin API 不支持批量获取，需要逐个查询
    // 使用 Promise.allSettled 并行查询
    const results = await Promise.allSettled(
        userIds.map(id => supabase.auth.admin.getUserById(id))
    )

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.data?.user) {
            const user = result.value.data.user
            users.push({
                id: user.id,
                email: user.email,
                username: user.email?.split('@')[0],
                fullName: user.user_metadata?.display_name,
                displayName: user.user_metadata?.display_name || user.email?.split('@')[0],
                avatarUrl: user.user_metadata?.avatar_url,
                isAdmin: user.user_metadata?.is_admin || false
            })
        }
    }

    return users
}

// 模拟 Clerk 的用户客户端接口
export const userClient = {
    users: {
        getUser: async (userId) => getUser(userId),
        getUserList: async ({ userId: userIds, limit }) => {
            const users = await getUserList(userIds)
            return { data: users }
        }
    }
}
