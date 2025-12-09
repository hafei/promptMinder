-- 创建初始管理员用户
-- 这个脚本用于创建第一个管理员账户
-- 请在部署后立即执行，然后删除此文件

-- 使用您希望的管理员邮箱和密码
-- 注意：在生产环境中，请使用强密码
INSERT INTO users (
  username,
  email,
  password_hash,
  display_name,
  is_admin
) VALUES (
  'admin',
  'admin@yourdomain.com',
  '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', -- 请替换为实际的密码哈希
  'Administrator',
  true
) ON CONFLICT (username) DO NOTHING;

-- 密码哈希生成方法（Node.js）:
-- const bcrypt = require('bcrypt');
-- const password = 'your-admin-password';
-- const hash = bcrypt.hashSync(password, 10);
-- console.log(hash);