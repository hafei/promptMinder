#!/bin/bash

# 插入管理员账户脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}👤 插入管理员账户${NC}"
echo "================================"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
  exit 1
fi

# 检查数据库是否运行
DB_CONTAINER=$(docker-compose -f docker-compose.backend.yml ps -q db)
if [ -z "$DB_CONTAINER" ]; then
  echo -e "${RED}❌ 数据库未运行，请先运行：npm run dev:backend${NC}"
  exit 1
fi

echo -e "${BLUE}🔍 检查是否已存在管理员账户...${NC}"

# 检查是否已存在管理员
ADMIN_EXISTS=$(docker exec $DB_CONTAINER psql -U promptminder -d promptminder -tAc "SELECT COUNT(*) FROM users WHERE is_admin = true;" 2>/dev/null | tr -d '[:space:]')

if [ "$ADMIN_EXISTS" != "0" ]; then
  echo -e "${YELLOW}⚠️  已存在 $ADMIN_EXISTS 个管理员账户${NC}"
  
  # 显示现有管理员
  echo -e "${BLUE}📋 现有管理员账户：${NC}"
  docker exec $DB_CONTAINER psql -U promptminder -d promptminder -c "SELECT username, email, display_name, is_admin FROM users WHERE is_admin = true;" 2>/dev/null || echo "无法查询管理员信息"
  
  echo -e "${YELLOW}是否要覆盖？(y/N):${NC}"
  read -r OVERWRITE
  if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
    echo -e "${BLUE}操作已取消${NC}"
    exit 0
  fi
  
  # 删除现有管理员
  echo -e "${YELLOW}🗑️  删除现有管理员账户...${NC}"
  docker exec $DB_CONTAINER psql -U promptminder -d promptminder -c "DELETE FROM users WHERE is_admin = true;" 2>/dev/null
fi

echo -e "${BLUE}📝 插入新的管理员账户...${NC}"

# 生成密码哈希 (password: admin123)
echo -e "${YELLOW}🔐 生成密码哈希...${NC}"
PASSWORD_HASH=$(node -e "
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('admin123', 10);
console.log(hash);
")

echo -e "${BLUE}密码哈希: $PASSWORD_HASH${NC}"

# 插入管理员账户
SQL_COMMAND="
INSERT INTO users (
    username,
    email,
    password_hash,
    display_name,
    is_admin
) VALUES (
    'admin',
    'admin@promptminder.com',
    '$PASSWORD_HASH',
    'Administrator',
    true
);
"

echo -e "${BLUE}📊 执行SQL:${NC}"
echo "$SQL_COMMAND"

# 执行插入
if docker exec $DB_CONTAINER psql -U promptminder -d promptminder -c "$SQL_COMMAND" 2>/dev/null; then
  echo -e "${GREEN}✅ 管理员账户插入成功！${NC}"
else
  echo -e "${RED}❌ 插入失败${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}🎯 管理员账户信息${NC}"
echo "================================"
echo "邮箱: admin@promptminder.com"
echo "密码: admin123"
echo "用户名: admin"
echo "显示名: Administrator"
echo "权限: 管理员"

echo ""
echo -e "${GREEN}✅ 现在可以使用管理员账户登录了！${NC}"
echo ""
echo -e "${BLUE}🔗 登录地址${NC}"
echo "http://localhost:3000/sign-in"
echo ""
echo -e "${BLUE}📋 验证命令${NC}"
echo "docker exec \$(docker-compose -f docker-compose.backend.yml ps -q db) psql -U promptminder -d promptminder -c \"SELECT username, email, is_admin FROM users WHERE is_admin = true;\""