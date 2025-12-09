#!/bin/bash

# 创建管理员账户的便捷脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 创建管理员账户脚本${NC}"
echo "============================"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
  exit 1
fi

# 检查数据库是否运行
DB_CONTAINER=$(docker-compose ps -q db)
if [ -z "$DB_CONTAINER" ]; then
  echo -e "${RED}❌ 数据库未运行，请先运行：docker-compose up -d db${NC}"
  exit 1
fi

# 获取用户输入
echo ""
read -p "请输入管理员邮箱: " ADMIN_EMAIL
read -s -p "请输入管理员密码: " ADMIN_PASSWORD
echo ""
read -s -p "请再次输入密码: " ADMIN_PASSWORD_CONFIRM
echo ""

# 验证输入
if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo -e "${RED}❌ 邮箱和密码不能为空${NC}"
  exit 1
fi

if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
  echo -e "${RED}❌ 两次输入的密码不一致${NC}"
  exit 1
fi

# 生成密码哈希（使用 Node.js）
echo "🔐 生成密码哈希..."
PASSWORD_HASH=$(node -e "
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('$ADMIN_PASSWORD', 10);
console.log(hash);
")

# 插入管理员账户到数据库
echo "📝 创建管理员账户..."
docker exec $DB_CONTAINER psql -U promptminder -d promptminder -c "
INSERT INTO users (
  username,
  email,
  password_hash,
  display_name,
  is_admin
) VALUES (
  'admin',
  '$ADMIN_EMAIL',
  '$PASSWORD_HASH',
  'Administrator',
  true
) ON CONFLICT (username) DO NOTHING;
" 2>/dev/null

# 验证创建结果
ADMIN_COUNT=$(docker exec $DB_CONTAINER psql -U promptminder -d promptminder -tAc "SELECT COUNT(*) FROM users WHERE is_admin = true;" 2>/dev/null | tr -d '[:space:]')

if [ "$ADMIN_COUNT" = "1" ]; then
  echo -e "${GREEN}✅ 管理员账户创建成功！${NC}"
  echo ""
  echo "登录信息："
  echo "  邮箱: $ADMIN_EMAIL"
  echo "  密码: $ADMIN_PASSWORD"
  echo ""
  echo "现在可以访问 http://localhost:3000/sign-in 登录"
else
  echo -e "${RED}❌ 创建失败，请检查错误信息${NC}"
  exit 1
fi