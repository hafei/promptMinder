'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, CheckCircle, Wand2 } from 'lucide-react'

export function LoginForm({ redirectUrl = '/prompts', onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showMagicLink, setShowMagicLink] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sentType, setSentType] = useState('') // 'reset' or 'magic'
  const { login, refreshSession } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        variant: 'destructive',
        description: '请输入邮箱和密码'
      })
      return
    }

    setIsLoading(true)

    try {
      await login(email, password)
      toast({ description: '登录成功' })

      try {
        await refreshSession()
      } catch (err) {
        // ignore refresh errors
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(redirectUrl)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error.message || '登录失败'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()

    if (!email) {
      toast({
        variant: 'destructive',
        description: '请输入邮箱地址'
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setEmailSent(true)
      setSentType('reset')
      toast({ description: '密码重置邮件已发送' })
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error.message || '发送失败'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()

    if (!email) {
      toast({
        variant: 'destructive',
        description: '请输入邮箱地址'
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      setEmailSent(true)
      setSentType('magic')
      toast({ description: '登录链接已发送到您的邮箱' })
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error.message || '发送失败'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 邮件发送成功状态
  if (emailSent) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
            <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            {sentType === 'reset' ? '密码重置邮件已发送' : '登录链接已发送'}
          </h3>
          <p className="text-sm text-muted-foreground">
            我们已向 <span className="font-medium">{email}</span> 发送了
            {sentType === 'reset' ? '密码重置链接' : '登录链接'}。
          </p>
          <p className="text-sm text-muted-foreground">
            请检查您的邮箱（包括垃圾邮件）。
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setEmailSent(false)
            setShowForgotPassword(false)
            setShowMagicLink(false)
          }}
          className="mt-4"
        >
          返回登录
        </Button>
      </div>
    )
  }

  // 忘记密码表单
  if (showForgotPassword) {
    return (
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            输入您的邮箱地址，我们将发送密码重置链接。
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-email">邮箱</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="请输入邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              发送中...
            </>
          ) : (
            '发送重置链接'
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setShowForgotPassword(false)}
        >
          返回登录
        </Button>
      </form>
    )
  }

  // Magic Link 表单
  if (showMagicLink) {
    return (
      <form onSubmit={handleMagicLink} className="space-y-4">
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <Wand2 className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            无需密码，我们将发送一个登录链接到您的邮箱。
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="magic-email">邮箱</Label>
          <Input
            id="magic-email"
            type="email"
            placeholder="请输入邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              发送中...
            </>
          ) : (
            '发送登录链接'
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setShowMagicLink(false)}
        >
          使用密码登录
        </Button>
      </form>
    )
  }

  // 默认登录表单
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          type="email"
          placeholder="请输入邮箱地址"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">密码</Label>
          <Button
            type="button"
            variant="link"
            className="px-0 h-auto text-xs"
            onClick={() => setShowForgotPassword(true)}
          >
            忘记密码？
          </Button>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            登录中...
          </>
        ) : (
          '登录'
        )}
      </Button>

      {/* <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">或</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setShowMagicLink(true)}
      >
        <Wand2 className="mr-2 h-4 w-4" />
        使用 Magic Link 登录
      </Button> */}
    </form>
  )
}

export function RegisterForm({ redirectUrl = '/prompts', onSuccess }) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { register, refreshSession } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        variant: 'destructive',
        description: '请填写所有必填字段'
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        variant: 'destructive',
        description: '请输入有效的邮箱地址'
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        description: '两次输入的密码不一致'
      })
      return
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        description: '密码长度至少 6 个字符'
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await register(email, password, displayName || email.split('@')[0])

      if (result.needsEmailConfirmation) {
        setEmailSent(true)
        toast({
          description: '注册成功！请检查您的邮箱并点击确认链接。'
        })
      } else {
        toast({ description: '注册成功' })

        try {
          await refreshSession()
        } catch (err) {
          // ignore
        }

        if (onSuccess) {
          onSuccess()
        } else {
          router.push(redirectUrl)
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error.message || '注册失败'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
            <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium">请查收确认邮件</h3>
          <p className="text-sm text-muted-foreground">
            我们已向 <span className="font-medium">{email}</span> 发送了确认链接。
          </p>
          <p className="text-sm text-muted-foreground">
            请点击邮件中的链接完成注册。
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setEmailSent(false)}
          className="mt-4"
        >
          使用其他邮箱
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-email">邮箱 *</Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="请输入邮箱地址"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="display-name">显示名称</Label>
        <Input
          id="display-name"
          type="text"
          placeholder="可选，默认使用邮箱前缀"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password">密码 *</Label>
        <Input
          id="reg-password"
          type="password"
          placeholder="至少 6 个字符"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">确认密码 *</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="再次输入密码"
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
            注册中...
          </>
        ) : (
          '注册'
        )}
      </Button>
    </form>
  )
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>{tab === 'login' ? '登录' : '注册'}</CardTitle>
          <CardDescription>
            {tab === 'login'
              ? '登录您的账户以继续'
              : '创建新账户'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tab === 'login' ? (
            <LoginForm onSuccess={onClose} />
          ) : (
            <RegisterForm onSuccess={onClose} />
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="link"
            onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
          >
            {tab === 'login' ? '没有账户？立即注册' : '已有账户？立即登录'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
