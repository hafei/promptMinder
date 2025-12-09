#!/usr/bin/env node

const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * 生成管理员密码哈希
 */
function generateAdminHash(password) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  return hash;
}

/**
 * 生成随机密码
 */
function generateRandomPassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// 从命令行参数获取密码或生成随机密码
const password = process.argv[2] || generateRandomPassword();
const hash = generateAdminHash(password);

console.log('管理员账户信息:');
console.log('================');
console.log(`密码: ${password}`);
console.log(`哈希: ${hash}`);
console.log('');
console.log('请将以下 SQL 语句复制到数据库中执行:');
console.log('======================================');
console.log(`
INSERT INTO users (
  username,
  email,
  password_hash,
  display_name,
  is_admin
) VALUES (
  'admin',
  'admin@yourdomain.com',
  '${hash}',
  'Administrator',
  true
) ON CONFLICT (username) DO NOTHING;
`);
console.log('');
console.log('⚠️  重要提示:');
console.log('1. 请将 admin@yourdomain.com 替换为实际的管理员邮箱');
console.log('2. 请妥善保存生成的密码');
console.log('3. 首次登录后请立即修改密码');
console.log('4. 完成设置后请删除此文件');