'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle } from 'lucide-react'

export default function ResetPasswordContent() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState('')
    const [tokens, setTokens] = useState(null)
    const router = useRouter()
    const { toast } = useToast()

    useEffect(() => {
        // 解析 URL hash 中的 token
        const hash = window.location.hash
        if (!hash) {
            setError('缺少认证信息，请从邮件中的链接访问')
            return
        }

        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')
        const errorParam = params.get('error')
        const errorDescription = params.get('error_description')

        if (errorParam) {
            setError(errorDescription || '链接无效或已过期')
            return
        }

        if (!accessToken || type !== 'recovery') {
            setError('无效的重置链接')
            return
        }

        setTokens({ accessToken, refreshToken })
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!password) {
            toast({ variant: 'destructive', description: '请输入新密码' })
            return
        }

        if (password.length < 6) {
            toast({ variant: 'destructive', description: '密码长度至少 6 个字符' })
            return
        }

        if (password !== confirmPassword) {
            toast({ variant: 'destructive', description: '两次输入的密码不一致' })
            return
        }

        setIsLoading(true)

        try {
            const res = await fetch('/api/auth/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    new_password: password
                })
            })

            const data = await res.json()

            if (!res.ok) {
                toast({ variant: 'destructive', description: data.error || '密码重置失败' })
                setIsLoading(false)
                return
            }

            setIsSuccess(true)
            toast({ description: '密码重置成功！' })
            setTimeout(() => router.push('/sign-in'), 3000)
        } catch {
            toast({ variant: 'destructive', description: '密码重置失败，请重试' })
            setIsLoading(false)
        }
    }

    // 错误状态
    if (error) {
        return (
            <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl text-red-600">链接无效</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button onClick={() => router.push('/sign-in')}>返回登录</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 等待 token 解析
    if (!tokens && !error) {
        return (
            <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
                <Card className="w-full max-w-md">
                    <CardContent className="flex items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2">验证链接中...</span>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 成功状态
    if (isSuccess) {
        return (
            <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">密码重置成功</CardTitle>
                        <CardDescription>即将跳转到登录页面...</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    // 输入新密码表单
    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">重置密码</CardTitle>
                    <CardDescription>请输入您的新密码</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">新密码</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="至少 6 个字符"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">确认新密码</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="再次输入新密码"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    重置中...
                                </>
                            ) : (
                                '重置密码'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
