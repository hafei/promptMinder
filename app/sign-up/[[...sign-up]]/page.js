'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button'
import { Mail, Lock } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
              <Lock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">需要邀请才能注册</CardTitle>
          <CardDescription>
            PromptMinder 采用邀请制注册，需要现有用户发送邀请
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4 text-sm text-gray-600">
            <h3 className="font-medium text-gray-900">如何获得邀请：</h3>
            <ol className="space-y-2 list-decimal list-inside">
              <li>联系现有用户发送邀请</li>
              <li>参与社区活动获得邀请资格</li>
              <li>管理员可以直接创建邀请</li>
            </ol>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg mt-6">
            <h3 className="font-medium text-gray-900 mb-2">已有邀请？</h3>
            <p className="text-sm text-gray-600 mb-3">
              请检查您的邮箱，点击邀请链接完成注册
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/sign-in">已有账户？立即登录</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}