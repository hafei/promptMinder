import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: '没有有效的刷新令牌' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClient();

    // 使用刷新令牌获取新的 session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      console.error('Failed to refresh session:', error);
      return NextResponse.json(
        { error: '刷新会话失败' },
        { status: 400 }
      );
    }

    // 设置新的 cookies
    if (data.session?.access_token) {
      cookieStore.set('sb-access-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });
    }

    if (data.session?.refresh_token) {
      cookieStore.set('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });
    }

    return NextResponse.json({
      success: true,
      message: '会话已刷新，包含最新的用户权限'
    });
  } catch (error) {
    console.error('Refresh session error:', error);
    return NextResponse.json(
      { error: '刷新失败' },
      { status: 500 }
    );
  }
}