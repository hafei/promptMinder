#!/bin/bash

# 环境变量检查脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 检查环境变量配置${NC}"
echo "================================"

# 检查 .env 文件是否存在
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠️  未找到 .env 文件${NC}"
  echo "创建示例 .env 文件..."
  
  cat > .env << 'EOF'
# =====================================================
# PromptMinder 环境变量配置
# =====================================================

# 数据库配置
POSTGRES_USER=promptminder
POSTGRES_PASSWORD=promptminder
POSTGRES_DB=promptminder

# JWT 密钥（至少32个字符）
JWT_SECRET=super-secret-jwt-key-with-at-least-32-characters-1234

# Supabase 密钥（使用上面的 JWT_SECRET 生成）
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.CHANGE_THIS
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.CHANGE_THIS

# 认证配置
AUTH_SECRET=your-auth-secret-key-min-32-chars-change-this

# Supabase 配置
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY0NTk1MDk1LCJleHAiOjIwNzk5NTUwOTV9.l9Q1xWgNzA2cDRzCTMey-1T4Z-1J-X3zLwMqfPWidW0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjQ1OTUwOTUsImV4cCI6MjA3OTk1NTA5NX0.E7DyQokAZkc3u77_NxDpX_uVKDmK8kZJeCM_XI5-t48

# 应用配置
NEXT_PUBLIC_BASE_URL=http://localhost:40000
APP_PORT=40000
PORT=40000

# 管理员配置
ADMIN_USERNAMES=admin

# MinIO 配置
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# 邮件配置（可选）
# RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
# FROM_EMAIL=noreply@yourdomain.com

# AI 服务配置（可选）
# CUSTOM_API_KEY=sk-xx
# CUSTOM_API_URL=https://api.openai.com/v1
# CUSTOM_MODEL_NAME=gpt-3.5-turbo
EOF
  
  echo -e "${GREEN}✅ 已创建 .env 文件${NC}"
  echo -e "${YELLOW}⚠️  请根据需要修改 .env 文件中的配置${NC}"
else
  echo -e "${GREEN}✅ 找到 .env 文件${NC}"
fi

# 加载环境变量
set -a
source .env
set +a

# 必需的环境变量列表
REQUIRED_VARS=(
  "JWT_SECRET"
  "SUPABASE_ANON_KEY" 
  "SUPABASE_SERVICE_ROLE_KEY"
  "AUTH_SECRET"
  "NEXT_PUBLIC_BASE_URL"
)

# 可选但推荐的环境变量
OPTIONAL_VARS=(
  "RESEND_API_KEY"
  "FROM_EMAIL"
  "CUSTOM_API_KEY"
)

echo ""
echo -e "${BLUE}📋 检查必需的环境变量${NC}"

# 检查必需变量
missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ $var 未设置${NC}"
    missing_vars+=("$var")
  else
    # 检查 JWT 密钥长度
    if [ "$var" = "JWT_SECRET" ] || [ "$var" = "AUTH_SECRET" ]; then
      if [ ${#var} -lt 32 ]; then
        echo -e "${YELLOW}⚠️  $var 长度不足 32 个字符${NC}"
      else
        echo -e "${GREEN}✅ $var 已设置 (长度: ${#var})${NC}"
      fi
    else
      echo -e "${GREEN}✅ $var 已设置${NC}"
    fi
  fi
done

echo ""
echo -e "${BLUE}📋 检查可选的环境变量${NC}"

# 检查可选变量
for var in "${OPTIONAL_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}⚠️  $var 未设置（可选）${NC}"
  else
    echo -e "${GREEN}✅ $var 已设置${NC}"
  fi
done

# 检查 JWT_SECRET 是否符合要求
echo ""
echo -e "${BLUE}🔐 JWT 密钥检查${NC}"

if [ -n "$JWT_SECRET" ]; then
  if [ ${#JWT_SECRET} -ge 32 ]; then
    echo -e "${GREEN}✅ JWT_SECRET 长度符合要求 (${#JWT_SECRET} 字符)${NC}"
  else
    echo -e "${RED}❌ JWT_SECRET 长度不足 32 字符 (当前: ${#JWT_SECRET} 字符)${NC}"
    missing_vars+=("JWT_SECRET_TOO_SHORT")
  fi
else
  echo -e "${RED}❌ JWT_SECRET 未设置${NC}"
fi

# 检查 AUTH_SECRET 长度
if [ -n "$AUTH_SECRET" ]; then
  if [ ${#AUTH_SECRET} -ge 32 ]; then
    echo -e "${GREEN}✅ AUTH_SECRET 长度符合要求 (${#AUTH_SECRET} 字符)${NC}"
  else
    echo -e "${RED}❌ AUTH_SECRET 长度不足 32 字符 (当前: ${#AUTH_SECRET} 字符)${NC}"
    missing_vars+=("AUTH_SECRET_TOO_SHORT")
  fi
else
  echo -e "${RED}❌ AUTH_SECRET 未设置${NC}"
fi

# 生成新的密钥（如果需要）
if [ ${#missing_vars[@]} -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}🔧 生成新的安全密钥${NC}"
  
  # 生成新的 JWT_SECRET
  if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
    NEW_JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    echo -e "${BLUE}新的 JWT_SECRET: $NEW_JWT_SECRET${NC}"
    
    # 更新 .env 文件
    if grep -q "JWT_SECRET=" .env; then
      sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env
    else
      echo "JWT_SECRET=$NEW_JWT_SECRET" >> .env
    fi
    echo -e "${GREEN}✅ 已更新 JWT_SECRET${NC}"
  fi
  
  # 生成新的 AUTH_SECRET
  if [ -z "$AUTH_SECRET" ] || [ ${#AUTH_SECRET} -lt 32 ]; then
    NEW_AUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    echo -e "${BLUE}新的 AUTH_SECRET: $NEW_AUTH_SECRET${NC}"
    
    # 更新 .env 文件
    if grep -q "AUTH_SECRET=" .env; then
      sed -i.bak2 "s/AUTH_SECRET=.*/AUTH_SECRET=$NEW_AUTH_SECRET/" .env
    else
      echo "AUTH_SECRET=$NEW_AUTH_SECRET" >> .env
    fi
    echo -e "${GREEN}✅ 已更新 AUTH_SECRET${NC}"
  fi
  
  # 删除备份文件
  rm -f .env.bak .env.bak2
fi

# 最终结果
echo ""
echo "================================"

if [ ${#missing_vars[@]} -eq 0 ]; then
  echo -e "${GREEN}🎉 所有环境变量配置正确！${NC}"
  echo ""
  echo -e "${BLUE}🚀 现在可以启动服务：${NC}"
  echo "  npm run start:dev      # 开发环境"
  echo "  npm run start:prod     # 生产环境"
else
  echo -e "${RED}❌ 还有环境变量需要配置${NC}"
  echo ""
  echo -e "${YELLOW}请检查并修复以下问题：${NC}"
  for var in "${missing_vars[@]}"; do
    echo -e "  - $var"
  done
  echo ""
  echo -e "${YELLOW}或者运行：${NC}"
  echo "  npm run check          # 重新检查环境变量"
fi

# 显示当前配置摘要
echo ""
echo -e "${BLUE}📊 当前配置摘要${NC}"
echo "================================"
echo -e "NEXT_PUBLIC_BASE_URL: ${NEXT_PUBLIC_BASE_URL:-未设置}"
echo -e "POSTGRES_USER: ${POSTGRES_USER:-未设置}"
echo -e "MINIO_ROOT_USER: ${MINIO_ROOT_USER:-未设置}"
echo -e "ADMIN_USERNAMES: ${ADMIN_USERNAMES:-未设置}"
echo -e "RESEND_API_KEY: ${RESEND_API_KEY:+已配置}${RESEND_API_KEY:-未配置}"
echo -e "CUSTOM_API_KEY: ${CUSTOM_API_KEY:+已配置}${CUSTOM_API_KEY:-未配置}"