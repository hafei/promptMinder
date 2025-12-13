'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function AuthCallbackPage() {
    const [status, setStatus] = useState('loading')
    const [message, setMessage] = useState('')
    const router = useRouter()
    const { refreshSession } = useAuth()

    useEffect(() => {
        const handleCallback = async () => {
            const hash = window.location.hash

            // 如果没有 hash，可能是 AuthHashHandler 已经处理了
            // 等待一下然后检查登录状态
            if (!hash) {
                // 短暂延迟后检查是否已登录
                await new Promise(resolve => setTimeout(resolve, 500))
                await refreshSession()

                // 检查 session
                const res = await fetch('/api/auth/session', { credentials: 'include' })
                const data = await res.json()

                if (data.isSignedIn) {
                    setStatus('success')
                    setMessage('登录成功！正在跳转...')
                    setTimeout(() => router.push('/prompts'), 1000)
                } else {
                    setStatus('error')
                    setMessage('认证链接无效或已过期')
                }
                return
            }

            const params = new URLSearchParams(hash.substring(1))
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            const type = params.get('type')
            const expiresIn = params.get('expires_in')
            const errorParam = params.get('error')
            const errorDescription = params.get('error_description')

            if (errorParam) {
                setStatus('error')
                setMessage(errorDescription || '认证失败')
                return
            }

            if (!accessToken) {
                setStatus('error')
                setMessage('无效的认证链接')
                return
            }

            // 密码恢复 - 重定向到重置密码页面
            if (type === 'recovery') {
                router.replace(`/reset-password${hash}`)
                return
            }

            // Magic link - 通过 API 设置 session
            try {
                const res = await fetch('/api/auth/set-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                        expires_in: parseInt(expiresIn) || 3600
                    })
                })

                if (res.ok) {
                    // 清除 URL hash
                    window.history.replaceState(null, '', '/auth/callback')

                    // 刷新 auth context
                    await refreshSession()

                    setStatus('success')
                    setMessage('登录成功！正在跳转...')
                    setTimeout(() => router.push('/prompts'), 1000)
                } else {
                    setStatus('error')
                    setMessage('登录失败')
                }
            } catch (err) {
                setStatus('error')
                setMessage('登录过程中出错')
            }
        }

        handleCallback()
    }, [router, refreshSession])

    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    {status === 'loading' && (
                        <>
                            <div className="flex justify-center mb-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                            <CardTitle className="text-2xl">验证中</CardTitle>
                            <CardDescription>正在处理您的登录请求...</CardDescription>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <div className="flex justify-center mb-4">
                                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl">登录成功</CardTitle>
                            <CardDescription>{message}</CardDescription>
                        </>
                    )}
                    {status === 'error' && (
                        <>
                            <div className="flex justify-center mb-4">
                                <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
                                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl text-red-600">认证失败</CardTitle>
                            <CardDescription>{message}</CardDescription>
                        </>
                    )}
                </CardHeader>
                {status === 'error' && (
                    <CardContent className="text-center">
                        <Button onClick={() => router.push('/sign-in')}>返回登录</Button>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
