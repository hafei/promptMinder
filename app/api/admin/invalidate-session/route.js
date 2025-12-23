import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUserFromJWT } from '@/lib/auth-jwt';
import { ApiError } from '@/lib/api-error';

// 超级管理员用户名列表
const ADMIN_USERNAMES = process.env.ADMIN_USERNAMES?.split(',').map(u => u.trim().toLowerCase()) || [];

export async function POST(request) {
  try {
    // 获取当前用户（必须是超级管理员）
    const currentUser = await getCurrentUserFromJWT();

    if (!currentUser) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 检查是否是超级管理员
    const isSuperAdmin = currentUser.email && ADMIN_USERNAMES.some(
      adminUsername => {
        const adminEmail = adminUsername.includes('@') ? adminUsername : `${adminUsername}@`;
        return adminEmail === currentUser.email.toLowerCase() ||
               currentUser.email.toLowerCase().startsWith(adminEmail);
      }
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: '只有超级管理员才能执行此操作' },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // 获取用户的所有 sessions 并使其失效
    const { error } = await supabase.auth.admin.signOut(userId, {
      scope: 'global' // 使所有 sessions 失效
    });

    if (error) {
      console.error('Failed to invalidate sessions:', error);
      return NextResponse.json(
        { error: '操作失败，请重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '用户会话已失效，需要重新登录'
    });
  } catch (error) {
    console.error('Invalidate session error:', error);
    return NextResponse.json(
      { error: '操作失败' },
      { status: 500 }
    );
  }
}