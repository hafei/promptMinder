#!/bin/bash

# 本地开发环境快速启动脚本
# 启动 Docker 数据库 + 本地前端开发服务器

echo "🚀 启动 PromptMinder 开发环境..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker 未运行，请先启动 Docker"
  exit 1
fi

# 启动数据库和相关服务
echo "📦 启动数据库服务..."
docker-compose up -d db kong postgrest auth storage-api

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 检查是否创建了管理员账户
echo "👤 检查管理员账户..."
ADMIN_EXISTS=$(docker exec -it $(docker-compose ps -q db) psql -U promptminder -d promptminder -tAc "SELECT COUNT(*) FROM users WHERE is_admin = true;" 2>/dev/null | tr -d '[:space:]')

if [ "$ADMIN_EXISTS" = "0" ]; then
  echo "⚠️  未找到管理员账户，请运行："
  echo "   node scripts/create-admin.js"
  echo ""
  echo "然后复制 SQL 语句到数据库执行，或者："
  echo "   docker exec -it \$(docker-compose ps -q db) psql -U promptminder -d promptminder"
  echo "粘贴 SQL 语句并执行"
fi

echo ""
echo "✅ 后端服务已启动！"
echo ""
echo "🎯 接下来的步骤："
echo "1. 运行 'npm run dev' 启动前端开发服务器"
echo "2. 访问 http://localhost:3000"
echo "3. 使用管理员账户登录"
echo "4. 测试邀请注册功能"
echo ""
echo "💡 测试完成后停止服务："
echo "   docker-compose down"