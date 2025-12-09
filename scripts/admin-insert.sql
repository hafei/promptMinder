-- 直接插入管理员账户的 SQL 命令
-- 密码: admin123

-- 先删除现有管理员（如果存在）
DELETE FROM users WHERE is_admin = true;

-- 插入新管理员
INSERT INTO users (
    username,
    email,
    password_hash,
    display_name,
    is_admin
) VALUES (
    'admin',
    'admin@promptminder.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMy.Mrz4.8.G/9Lv8gd/tZvMML8JIqy7Km',  -- 'admin123' 的哈希
    'Administrator',
    true
);

-- 查看结果
SELECT username, email, display_name, is_admin FROM users WHERE is_admin = true;