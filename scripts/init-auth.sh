#!/bin/bash

# Supabase Auth 服务初始化脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 初始化 Supabase Auth 服务${NC}"
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

echo -e "${BLUE}📋 检查 Auth 表状态...${NC}"

# 检查 auth schema 是否存在
AUTH_EXISTS=$(docker exec $DB_CONTAINER psql -U promptminder -d promptminder -tAc "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'auth';" 2>/dev/null | tr -d '[:space:]' || echo "0")

if [ "$AUTH_EXISTS" = "0" ]; then
  echo -e "${YELLOW}⚠️  Auth schema 不存在，正在创建...${NC}"
  docker exec $DB_CONTAINER psql -U promptminder -d promptminder -c "CREATE SCHEMA IF NOT EXISTS auth;"
  docker exec $DB_CONTAINER psql -U promptminder -d promptminder -c "GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, postgres;"
  docker exec $DB_CONTAINER psql -U promptminder -d promptminder -c "GRANT CREATE ON SCHEMA auth TO service_role;"
  echo -e "${GREEN}✅ Auth schema 创建成功${NC}"
fi

# 检查 auth.users 表是否存在
USERS_EXISTS=$(docker exec $DB_CONTAINER psql -U promptminder -d promptminder -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users';" 2>/dev/null | tr -d '[:space:]' || echo "0")

if [ "$USERS_EXISTS" = "0" ]; then
  echo -e "${YELLOW}⚠️  Auth 表不存在，正在创建...${NC}"
  docker exec $DB_CONTAINER psql -U promptminder -d promptminder -f /docker-entrypoint-initdb.d/02-init-auth.sql
  echo -e "${GREEN}✅ Auth 表创建成功${NC}"
else
  echo -e "${GREEN}✅ Auth 表已存在${NC}"
fi

# 检查是否有必要的数据
AUTH_TABLES=$(docker exec $DB_CONTAINER psql -U promptminder -d promptminder -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'auth';" 2>/dev/null | tr -d '[:space:]')

echo -e "${BLUE}📊 Auth 表统计：${NC}"
echo "总共 $AUTH_TABLES 张表"

# 显示所有 auth 表
docker exec $DB_CONTAINER psql -U promptminder -d promptminder -c "\dt auth.*" 2>/dev/null || true

echo ""
echo -e "${BLUE}🔄 重启 Auth 服务...${NC}"

# 重启 Auth 服务
AUTH_CONTAINER=$(docker-compose -f docker-compose.backend.yml ps -q auth)
if [ -n "$AUTH_CONTAINER" ]; then
  docker-compose -f docker-compose.backend.yml restart auth
  echo -e "${GREEN}✅ Auth 服务重启完成${NC}"
else
  echo -e "${YELLOW}⚠️  Auth 服务未运行，正在启动...${NC}"
  docker-compose -f docker-compose.backend.yml up -d auth
  echo -e "${GREEN}✅ Auth 服务启动完成${NC}"
fi

# 等待 Auth 服务启动
echo -e "${YELLOW}⏳ 等待 Auth 服务启动...${NC}"
sleep 10

# 检查 Auth 服务状态
AUTH_HEALTH=$(docker-compose -f docker-compose.backend.yml ps auth | grep "Up" | wc -l | tr -d '[:space:]')
if [ "$AUTH_HEALTH" = "1" ]; then
  echo -e "${GREEN}✅ Auth 服务运行正常${NC}"
  
  # 检查健康状态
  echo -e "${BLUE}🏥 检查服务健康状态...${NC}"
  if docker exec $(docker-compose -f docker-compose.backend.yml ps -q auth) wget --no-verbose --tries=1 --spider http://localhost:9999/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Auth 服务健康检查通过${NC}"
  else
    echo -e "${YELLOW}⚠️  Auth 服务健康检查失败，但服务可能还在启动${NC}"
  fi
else
  echo -e "${RED}❌ Auth 服务启动失败${NC}"
  echo ""
  echo -e "${BLUE}📋 查看日志：${NC}"
  docker-compose -f docker-compose.backend.yml logs auth
  exit 1
fi

echo ""
echo -e "${GREEN}🎉 Supabase Auth 初始化完成！${NC}"
echo ""
echo -e "${BLUE}🔗 有用的链接：${NC}"
echo "- Auth 服务: http://localhost:9999"
echo "- Kong Gateway: http://localhost:8000"
echo "- 数据库: localhost:5432"
echo ""
echo -e "${BLUE}📝 常用命令：${NC}"
echo "- 查看 Auth 日志: docker-compose -f docker-compose.backend.yml logs -f auth"
echo "- 重启 Auth 服务: docker-compose -f docker-compose.backend.yml restart auth"
echo "- 停止 Auth 服务: docker-compose -f docker-compose.backend.yml stop auth"