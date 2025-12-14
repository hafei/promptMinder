import { NextResponse } from 'next/server';
import { getCurrentUserFromJWT } from '@/lib/auth-jwt';

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

    // 返回完整的用户信息用于调试
    return NextResponse.json({
      user: user,
      message: "用户信息获取成功"
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}