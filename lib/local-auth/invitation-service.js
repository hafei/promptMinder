import { createSupabaseServerClient } from '@/lib/supabaseServer.js'
import crypto from 'crypto'

/**
 * 生成安全的邀请令牌
 */
export function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 检查邮箱是否已被邀请
 */
export async function isEmailInvited(email) {
  const supabase = createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('user_invitations')
    .select('id, status, expires_at')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 表示没有找到记录
    console.error('检查邀请状态失败:', error)
    throw new Error('检查邀请状态失败')
  }
  
  return !!data
}

/**
 * 创建新的邀请
 */
export async function createInvitation(email, invitedBy) {
  const supabase = createSupabaseServerClient()
  
  // 检查是否已有待处理的邀请
  const existingInvitation = await isEmailInvited(email)
  if (existingInvitation) {
    throw new Error('该邮箱已被邀请，请勿重复邀请')
  }
  
  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
  
  const { data, error } = await supabase
    .from('user_invitations')
    .insert({
      email: email.toLowerCase(),
      token,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString()
    })
    .select(`
      id,
      email,
      token,
      status,
      invited_at,
      expires_at,
      users!user_invitations_invited_by_fkey (
        id,
        username,
        display_name
      )
    `)
    .single()
  
  if (error) {
    console.error('创建邀请失败:', error)
    throw new Error('创建邀请失败')
  }
  
  return data
}

/**
 * 通过令牌获取邀请信息
 */
export async function getInvitationByToken(token) {
  const supabase = createSupabaseServerClient()
  
  const { data, error } = await supabase
    .from('user_invitations')
    .select(`
      id,
      email,
      token,
      status,
      invited_at,
      expires_at,
      users!user_invitations_invited_by_fkey (
        id,
        username,
        display_name
      )
    `)
    .eq('token', token)
    .single()
  
  if (error) {
    console.error('获取邀请失败:', error)
    return null
  }
  
  // 检查邀请是否过期
  if (data.expires_at < new Date().toISOString()) {
    // 标记为过期
    await updateInvitationStatus(data.id, 'expired')
    return null
  }
  
  return data
}

/**
 * 更新邀请状态
 */
export async function updateInvitationStatus(invitationId, status, acceptedUserId = null) {
  const supabase = createSupabaseServerClient()
  
  const updateData = {
    status,
    updated_at: new Date().toISOString()
  }
  
  if (status === 'accepted') {
    updateData.accepted_at = new Date().toISOString()
    updateData.accepted_user_id = acceptedUserId
  }
  
  const { data, error } = await supabase
    .from('user_invitations')
    .update(updateData)
    .eq('id', invitationId)
    .select()
    .single()
  
  if (error) {
    console.error('更新邀请状态失败:', error)
    throw new Error('更新邀请状态失败')
  }
  
  return data
}

/**
 * 获取用户发送的邀请列表
 */
export async function getInvitationsByUser(userId, options = {}) {
  const supabase = createSupabaseServerClient()
  
  let query = supabase
    .from('user_invitations')
    .select(`
      id,
      email,
      status,
      invited_at,
      expires_at,
      accepted_at,
      users!user_invitations_invited_by_fkey (
        username,
        display_name
      )
    `)
    .eq('invited_by', userId)
    .order('invited_at', { ascending: false })
  
  // 状态过滤
  if (options.status) {
    query = query.eq('status', options.status)
  }
  
  // 分页
  if (options.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('获取邀请列表失败:', error)
    throw new Error('获取邀请列表失败')
  }
  
  return data
}

/**
 * 撤销邀请
 */
export async function revokeInvitation(invitationId, userId) {
  const supabase = createSupabaseServerClient()
  
  // 确认邀请属于该用户
  const { data: invitation } = await supabase
    .from('user_invitations')
    .select('invited_by, status')
    .eq('id', invitationId)
    .single()
  
  if (!invitation || invitation.invited_by !== userId) {
    throw new Error('无权限操作此邀请')
  }
  
  if (invitation.status !== 'pending') {
    throw new Error('只能撤销待处理的邀请')
  }
  
  return await updateInvitationStatus(invitationId, 'expired')
}

/**
 * 清理过期邀请（可由定时任务调用）
 */
export async function cleanupExpiredInvitations() {
  const supabase = createSupabaseServerClient()
  
  const { error } = await supabase.rpc('cleanup_expired_invitations')
  
  if (error) {
    console.error('清理过期邀请失败:', error)
    throw new Error('清理过期邀请失败')
  }
  
  return true
}