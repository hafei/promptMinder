#!/bin/bash

# 快速重建和测试脚本
# 使用方法：./quick-test.sh [可选的镜像标签]

# 设置镜像标签
IMAGE_TAG=${1:-promptminder:test-$(date +%s)}

echo "🏗️  构建 Docker 镜像: $IMAGE_TAG"
docker build -t $IMAGE_TAG .

echo "🔄 更新 docker-compose.yml 中的镜像标签"
sed -i.bak "s|image: promptminder:.*|image: $IMAGE_TAG|g" docker-compose.yml

echo "🚀 启动服务..."
docker-compose up -d

echo "⏳ 等待服务启动..."
sleep 10

echo "🧪 运行健康检查..."
docker-compose ps

echo "📊 查看应用日志 (Ctrl+C 退出):"
docker-compose logs -f web