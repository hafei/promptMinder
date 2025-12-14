import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// 管理员用户名列表（从环境变量读取）
const ADMIN_USERNAMES = process.env.ADMIN_USERNAMES?.split(',').map(u => u.trim().toLowerCase()) || [];

export async function GET(request) {
  try {
    // 获取当前登录用户
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 检查当前用户是否是管理员
    const isAdmin = currentUser.user_metadata?.is_admin ||
                   currentUser.email && ADMIN_USERNAMES.some(
                     adminUsername => {
                       const adminEmail = adminUsername.includes('@') ? adminUsername : `${adminUsername}@`;
                       return adminEmail === currentUser.email.toLowerCase() ||
                              currentUser.email.toLowerCase().startsWith(adminEmail);
                     }
                   );

    if (!isAdmin) {
      return NextResponse.json(
        { error: '您没有访问用户列表的权限' },
        { status: 403 }
      );
    }

    // 从数据库获取用户列表
    const supabase = createSupabaseServerClient();

    // 查询 users 表
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, display_name, is_admin, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch users:', error);
      // 如果 users 表不存在，尝试从 auth.users 获取
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        throw authError;
      }

      // 转换数据格式
      const formattedUsers = authUsers.users.map(user => ({
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        is_admin: user.user_metadata?.is_admin || false,
        created_at: user.created_at
      }));

      return NextResponse.json({
        success: true,
        users: formattedUsers
      });
    }

    return NextResponse.json({
      success: true,
      users: users || []
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: '获取用户列表失败，请重试' },
      { status: 500 }
    );
  }
}