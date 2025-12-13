'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

/**
 * 全局 Auth Hash 处理组件
 * 用于处理 Supabase Auth 通过 URL hash 返回的 tokens (magic link, password recovery 等)
 * 完全通过 API 路由处理，不直接使用 Supabase 客户端
 */
export function AuthHashHandler({ children }) {
    const [isProcessing, setIsProcessing] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { refreshSession } = useAuth()

    useEffect(() => {
        const handleHashTokens = async () => {
            if (typeof window === 'undefined') return

            const hash = window.location.hash
            if (!hash || hash.length < 2) return

            const params = new URLSearchParams(hash.substring(1))
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            const type = params.get('type')
            const expiresIn = params.get('expires_in')

            if (!accessToken) return
            if (isProcessing) return

            setIsProcessing(true)
            console.log('AuthHashHandler: 检测到 hash tokens, type:', type)

            try {
                // 密码恢复 - 重定向到重置密码页面
                if (type === 'recovery') {
                    if (pathname !== '/reset-password') {
                        router.replace(`/reset-password${hash}`)
                    }
                    setIsProcessing(false)
                    return
                }

                // Magic link / signup - 通过 API 设置 session
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
                    window.history.replaceState(null, '', pathname || '/')

                    // 刷新 auth context 以更新用户状态
                    await refreshSession()

                    // 跳转到主页面
                    if (pathname === '/' || pathname === '/sign-in' || pathname === '/sign-up') {
                        router.push('/prompts')
                    }
                } else {
                    console.error('AuthHashHandler: 设置 session 失败')
                }
            } catch (err) {
                console.error('AuthHashHandler: 处理 tokens 出错', err)
            } finally {
                setIsProcessing(false)
            }
        }

        handleHashTokens()
    }, [pathname, router, isProcessing, refreshSession])

    if (isProcessing) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">正在登录...</p>
                </div>
            </div>
        )
    }

    return children
}
