import { NextResponse } from 'next/server'

export async function POST(request) {
  return NextResponse.json(
    { error: '公开注册已禁用，请通过邀请链接注册' },
    { status: 403 }
  )
}

export async function GET() {
  return NextResponse.json(
    { error: '公开注册已禁用，请通过邀请链接注册' },
    { status: 403 }
  )
}
