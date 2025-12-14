import { NextResponse } from 'next/server';
import { getCurrentUserFromJWT } from '@/lib/auth-jwt';

// 超级管理员用户名列表（从环境变量读取）
// 这些用户自动拥有管理员权限
const ADMIN_USERNAMES = process.env.ADMIN_USERNAMES?.split(',').map(u => u.trim().toLowerCase()) || [];

export async function GET(request) {
  try {
    // 获取当前登录用户
    const user = await getCurrentUserFromJWT();

    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 检查是否是管理员
    const isAdmin = user.is_admin ||  // 从 JWT 解析的 is_admin 字段
                   user.email && ADMIN_USERNAMES.some(
                     adminUsername => {
                       const adminEmail = adminUsername.includes('@') ? adminUsername : `${adminUsername}@`;
                       return adminEmail === user.email.toLowerCase() ||
                              user.email.toLowerCase().startsWith(adminEmail);
                     }
                   );

    if (isAdmin) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name
        }
      });
    }

    return NextResponse.json(
      { error: '您没有访问管理后台的权限' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      { error: '验证失败，请重试' },
      { status: 500 }
    );
  }
}