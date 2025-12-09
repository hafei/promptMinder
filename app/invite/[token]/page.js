'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle, XCircle, Clock, User } from 'lucide-react'

export default function InvitePage() {
  const params = useParams()
  const token = params.token
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  })

  // 验证邀请令牌
  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        const res = await fetch(`/api/invitations/verify/${token}`)
        const data = await res.json()
        
        if (res.ok) {
          setInvitation(data.invitation)
        } else {
          setError(data.error || '邀请验证失败')
        }
      } catch (err) {
        setError('网络错误，请稍后重试')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (token) {
      verifyInvitation()
    } else {
      setError('缺少邀请令牌')
      setIsLoading(false)
    }
  }, [token])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 表单验证
    if (!formData.username || !formData.password) {
      toast({
        variant: 'destructive',
        description: '请填写所有必填字段'
      })
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: 'destructive',
        description: '两次输入的密码不一致'
      })
      return
    }
    
    if (formData.password.length < 6) {
      toast({
        variant: 'destructive',
        description: '密码长度至少 6 个字符'
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/auth/register-by-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username: formData.username,
          password: formData.password,
          displayName: formData.displayName
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({
          description: '注册成功！欢迎加入 PromptMinder'
        })
        router.push('/prompts')
      } else {
        toast({
          variant: 'destructive',
          description: data.error || '注册失败'
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        description: '网络错误，请稍后重试'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 加载中状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">验证邀请中...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle>邀请无效</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild variant="outline">
              <Link href="/sign-in">返回登录</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // 邀请验证成功，显示注册表单
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <CardTitle>接受邀请</CardTitle>
          <CardDescription>
            您已被邀请加入 PromptMinder
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* 邀请信息 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <User className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">邀请人</span>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              {invitation.inviter?.display_name || invitation.inviter?.username}
            </p>
            
            <div className="flex items-center mb-2">
              <Clock className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">邀请邮箱</span>
            </div>
            <p className="text-sm text-blue-700">
              {invitation.email}
            </p>
          </div>
          
          {/* 注册表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名 *</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="字母、数字、下划线"
                value={formData.username}
                onChange={handleInputChange}
                disabled={isSubmitting}
                autoComplete="username"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">显示名称</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="可选，默认使用用户名"
                value={formData.displayName}
                onChange={handleInputChange}
                disabled={isSubmitting}
                autoComplete="name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码 *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="至少 6 个字符"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isSubmitting}
                autoComplete="new-password"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码 *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isSubmitting}
                autoComplete="new-password"
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '完成注册'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="justify-center text-sm text-gray-500">
          已有账户？
          <Button variant="link" className="p-0 h-auto ml-1" asChild>
            <Link href="/sign-in">立即登录</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}