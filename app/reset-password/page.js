'use client'

import { Suspense } from 'react'
import ResetPasswordContent from './reset-password-content'

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-zinc-900 dark:via-black dark:to-zinc-900">
                <div className="animate-pulse">加载中...</div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}
