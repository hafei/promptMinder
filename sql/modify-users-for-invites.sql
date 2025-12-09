-- 修改用户表，添加 email 字段
-- 保持现有数据，同时支持新的邀请注册机制

-- 1. 添加 email 字段到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. 确保现有用户有 email（使用 username 作为 email）
UPDATE users SET email = username WHERE email IS NULL;

-- 3. 将 email 设为必填字段
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- 4. 添加唯一约束
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- 5. 创建邀请邮件表视图（方便查询）
CREATE OR REPLACE VIEW invitation_stats AS
SELECT 
    status,
    COUNT(*) as count,
    DATE_TRUNC('day', invited_at) as date
FROM user_invitations 
GROUP BY status, DATE_TRUNC('day', invited_at)
ORDER BY date DESC;

-- 6. 创建用户邀请关系视图
CREATE OR REPLACE VIEW user_invitation_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.display_name,
    u.created_at,
    inv.email as invited_by_email,
    inv_users.display_name as invited_by_name,
    inv.invited_at as invitation_sent_at,
    inv.accepted_at as invitation_accepted_at
FROM users u
LEFT JOIN user_invitations inv ON u.id = inv.accepted_user_id
LEFT JOIN users inv_users ON inv.invited_by = inv_users.id
ORDER BY u.created_at DESC;