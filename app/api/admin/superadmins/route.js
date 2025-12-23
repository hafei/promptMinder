import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// 超级管理员用户名列表（从环境变量读取）
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
        { error: '您没有访问此信息的权限' },
        { status: 403 }
      );
    }

    // 返回超级管理员模式，用于前端匹配
    return NextResponse.json({
      success: true,
      adminPatterns: ADMIN_USERNAMES,
      message: "超级管理员匹配模式，前端可用此来判断用户是否是超级管理员"
    });
  } catch (error) {
    console.error('Failed to get super admin patterns:', error);
    return NextResponse.json(
      { error: '获取信息失败' },
      { status: 500 }
    );
  }
}