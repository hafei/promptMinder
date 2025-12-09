import { getCurrentUser } from '@/lib/local-auth/session.js'
import { InviteManager } from '@/components/admin/InviteManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Settings } from 'lucide-react'

export default async function AdminInvitationsPage() {
  const currentUser = await getCurrentUser()
  
  if (!currentUser) {
    throw new Error('未登录')
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">邀请管理</h1>
        <p className="text-muted-foreground">
          管理用户邀请，控制注册权限
        </p>
      </div>
      
      <InviteManager currentUserId={currentUser.id} />
    </div>
  )
}