#!/bin/bash

# 数据库重置脚本 - 清理并重新初始化数据库

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 重置数据库...${NC}"
echo "========================"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
  exit 1
fi

# 确认操作
echo -e "${RED}⚠️  警告：这将删除所有数据！${NC}"
echo -e "${RED}包括：用户数据、邀请、提示词等所有内容${NC}"
echo ""
read -p "确认删除所有数据？输入 'DELETE ALL' 继续: " confirmation

if [ "$confirmation" != "DELETE ALL" ]; then
  echo -e "${BLUE}操作已取消${NC}"
  exit 0
fi

# 停止所有服务
echo -e "${YELLOW}🛑 停止服务...${NC}"
docker-compose -f docker-compose.backend.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 删除数据库卷
echo -e "${YELLOW}🗑️  删除数据库数据...${NC}"
docker volume rm promptminder-db-data 2>/dev/null || true
docker volume rm promptminder-minio-data 2>/dev/null || true

# 删除网络（如果有）
docker network rm $(docker network ls -q --filter name=promptminder 2>/dev/null) 2>/dev/null || true

# 清理未使用的 Docker 资源
echo -e "${YELLOW}🧹 清理 Docker 资源...${NC}"
docker system prune -f 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ 数据库已重置${NC}"
echo ""
echo -e "${BLUE}🚀 重新启动数据库...${NC}"

# 启动数据库服务
docker-compose -f docker-compose.backend.yml up -d db

# 等待数据库启动
echo -e "${YELLOW}⏳ 等待数据库启动...${NC}"
sleep 10

# 检查数据库状态
DB_HEALTH=$(docker-compose -f docker-compose.backend.yml ps -q db)
if [ -n "$DB_HEALTH" ]; then
  echo -e "${GREEN}✅ 数据库启动成功${NC}"
    
  # 检查表是否创建成功
  echo -e "${BLUE}🔍 检查数据库表...${NC}"
  sleep 5
    
  TABLES=$(docker exec $(docker-compose -f docker-compose.backend.yml ps -q db) psql -U promptminder -d promptminder -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema IN ('public', 'auth');" 2>/dev/null | tr -d '[:space:]' || echo "0")
  
  if [ "$TABLES" -gt 0 ]; then
    echo -e "${GREEN}✅ 数据库表创建成功 (${TABLES} 张表)${NC}"
    
    # 特别检查 auth schema
    AUTH_TABLES=$(docker exec $(docker-compose -f docker-compose.backend.yml ps -q db) psql -U promptminder -d promptminder -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'auth';" 2>/dev/null | tr -d '[:space:]' || echo "0")
    
    if [ "$AUTH_TABLES" -gt 0 ]; then
      echo -e "${GREEN}✅ Auth 表创建成功 (${AUTH_TABLES} 张表)${NC}"
    else
      echo -e "${YELLOW}⚠️  Auth 表可能需要手动初始化${NC}"
      echo -e "${BLUE}运行：${NC}"
      echo "docker exec -it \$(docker-compose -f docker-compose.backend.yml ps -q db) psql -U promptminder -d promptminder -f /docker-entrypoint-initdb.d/02-init-auth.sql"
    fi
  else
    echo -e "${YELLOW}⚠️  数据库表可能还在创建中，请稍后检查${NC}"
  fi
else
  echo -e "${RED}❌ 数据库启动失败${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}🎯 接下来的步骤：${NC}"
echo "1. 启动完整后端服务：npm run dev:backend"
echo "2. 创建管理员账户：npm run admin"
echo "3. 启动前端：npm run dev"
echo "4. 访问：http://localhost:3000"
echo ""
echo -e "${BLUE}📊 检查数据库状态：${NC}"
echo "docker-compose -f docker-compose.backend.yml ps db"
echo ""
echo -e "${BLUE}📋 查看数据库日志：${NC}"
echo "docker-compose -f docker-compose.backend.yml logs db"