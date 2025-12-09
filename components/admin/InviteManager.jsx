'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Mail, 
  Send, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react'

const statusMap = {
  pending: { label: '待处理', color: 'secondary', icon: Clock },
  accepted: { label: '已接受', color: 'default', icon: CheckCircle },
  expired: { label: '已过期', color: 'outline', icon: XCircle }
}

export function InviteManager({ currentUserId }) {
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [invitations, setInvitations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const { toast } = useToast()

  // 获取邀请列表
  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/invitations')
      const data = await res.json()
      
      if (res.ok) {
        setInvitations(data.invitations || [])
      } else {
        toast({
          variant: 'destructive',
          description: data.error || '获取邀请列表失败'
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        description: '网络错误，请稍后重试'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [])

  // 发送邀请
  const handleSendInvite = async (e) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      toast({
        variant: 'destructive',
        description: '请输入有效的邮箱地址'
      })
      return
    }
    
    setIsSending(true)
    
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({
          description: `邀请已发送到 ${email}`
        })
        setEmail('')
        fetchInvitations()
        
        // 开发模式下显示预览链接
        if (data.isDevMode && data.previewUrl) {
          setTimeout(() => {
            toast({
              title: '开发模式',
              description: '请查看控制台获取邀请链接',
              action: (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(data.previewUrl)
                    toast({
                      description: '邀请链接已复制到剪贴板'
                    })
                  }}
                >
                  复制链接
                </Button>
              )
            })
          }, 1000)
        }
      } else {
        toast({
          variant: 'destructive',
          description: data.error || '发送邀请失败'
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        description: '网络错误，请稍后重试'
      })
    } finally {
      setIsSending(false)
    }
  }

  // 撤销邀请
  const handleRevokeInvite = async (invitationId) => {
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE'
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({
          description: '邀请已撤销'
        })
        fetchInvitations()
      } else {
        toast({
          variant: 'destructive',
          description: data.error || '撤销邀请失败'
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        description: '网络错误，请稍后重试'
      })
    }
  }

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 过滤邀请
  const filteredInvitations = invitations.filter(inv => {
    if (statusFilter === 'all') return true
    return inv.status === statusFilter
  })

  return (
    <div className="space-y-6">
      {/* 发送邀请表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            发送邀请
          </CardTitle>
          <CardDescription>
            发送邀请链接到指定邮箱，邀请用户加入 PromptMinder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">邮箱地址</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
              />
            </div>
            <Button type="submit" disabled={isSending || !email}>
              {isSending ? (
                <>
                  <Mail className="h-4 w-4 mr-2 animate-pulse" />
                  发送中...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  发送邀请
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 邀请列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              我的邀请
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'accepted', 'expired'].map(status => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' && '全部'}
                  {status === 'pending' && '待处理'}
                  {status === 'accepted' && '已接受'}
                  {status === 'expired' && '已过期'}
                </Button>
              ))}
            </div>
          </CardTitle>
          <CardDescription>
            查看和管理您发送的所有邀请
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {statusFilter === 'all' ? '暂无邀请记录' : `暂无${statusFilter === 'pending' ? '待处理' : statusFilter === 'accepted' ? '已接受' : '已过期'}的邀请`}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvitations.map(invitation => {
                const statusInfo = statusMap[invitation.status]
                const StatusIcon = statusInfo.icon
                
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>发送时间: {formatDate(invitation.invited_at)}</span>
                          {invitation.status === 'pending' && (
                            <span>· 过期时间: {formatDate(invitation.expires_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                      
                      {invitation.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}