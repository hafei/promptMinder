import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// 超级管理员用户名列表（从环境变量读取）
// 只有这些用户可以设置其他用户的管理员权限
const ADMIN_USERNAMES = process.env.ADMIN_USERNAMES?.split(',').map(u => u.trim().toLowerCase()) || [];

export async function POST(request) {
  try {
    // 获取当前登录用户
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 检查当前用户是否是超级管理员（在 ADMIN_USERNAMES 列表中）
    const isSuperAdmin = currentUser.email && ADMIN_USERNAMES.some(
      adminUsername => {
        const adminEmail = adminUsername.includes('@') ? adminUsername : `${adminUsername}@`;
        return adminEmail === currentUser.email.toLowerCase() ||
               currentUser.email.toLowerCase().startsWith(adminEmail);
      }
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: '只有超级管理员（在 ADMIN_USERNAMES 中配置）才能设置管理员权限' },
        { status: 403 }
      );
    }

    const { userId, isAdmin } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 更新用户的元数据
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        is_admin: !!isAdmin
      }
    });

    if (error) {
      console.error('Failed to update user admin status:', error);
      return NextResponse.json(
        { error: '更新失败，请重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isAdmin ? '已设置为管理员' : '已取消管理员权限'
    });
  } catch (error) {
    console.error('Set admin error:', error);
    return NextResponse.json(
      { error: '操作失败，请重试' },
      { status: 500 }
    );
  }
}