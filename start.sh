#!/bin/bash

# PromptMinder 一键启动脚本
# 根据参数自动选择开发或部署模式

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
  echo -e "${BLUE}PromptMinder 一键启动脚本${NC}"
  echo "=============================="
  echo ""
  echo "用法: $0 [选项]"
  echo ""
  echo "选项:"
  echo "  dev         启动开发环境 (Docker 后端 + 本地前端)"
  echo "  deploy      部署生产环境 (完整 Docker)"
  echo "  stop        停止所有服务"
  echo "  logs        查看服务日志"
  echo "  admin       创建管理员账户"
  echo "  build       构建 Docker 镜像"
  echo "  test        运行测试"
  echo "  clean       清理数据 (谨慎使用)"
  echo ""
  echo "示例:"
  echo "  $0 dev      # 启动开发环境"
  echo "  $0 deploy   # 部署生产环境"
  echo "  $0 stop     # 停止服务"
}

# 检查 Docker 是否运行
check_docker() {
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
    exit 1
  fi
}

# 检查 Node.js 和 npm
check_nodejs() {
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
  fi
  
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
  fi
}

# 检查环境变量
check_env() {
  echo -e "${BLUE}🔍 检查环境变量...${NC}"
  if [ -f "./scripts/check-env.sh" ]; then
    ./scripts/check-env.sh
  else
    echo -e "${YELLOW}⚠️  环境变量检查脚本不存在${NC}"
  fi
}

# 启动开发环境
start_dev() {
  echo -e "${YELLOW}🚀 启动开发环境...${NC}"
  check_docker
  check_nodejs
  check_env
  
  # 启动后端服务
  echo -e "${BLUE}📦 启动后端服务...${NC}"
  docker-compose -f docker-compose.backend.yml up -d
  
  # 等待服务启动
  echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
  sleep 15
  
  # 检查服务状态
  echo -e "${BLUE}🔍 检查服务状态...${NC}"
  docker-compose -f docker-compose.backend.yml ps
  
  # 检查管理员账户
  echo -e "${BLUE}👤 检查管理员账户...${NC}"
  ADMIN_EXISTS=$(docker exec $(docker-compose -f docker-compose.backend.yml ps -q db) psql -U promptminder -d promptminder -tAc "SELECT COUNT(*) FROM users WHERE is_admin = true;" 2>/dev/null | tr -d '[:space:]')
  
  if [ "$ADMIN_EXISTS" = "0" ]; then
    echo -e "${YELLOW}⚠️  未找到管理员账户${NC}"
    echo -e "${BLUE}请运行: $0 admin${NC}"
  fi
  
  echo -e "${GREEN}✅ 后端服务已启动！${NC}"
  echo ""
  echo -e "${BLUE}🎯 接下来的步骤：${NC}"
  echo "1. 运行 'npm run dev' 启动前端开发服务器"
  echo "2. 访问 http://localhost:3000"
  echo "3. 使用管理员账户登录"
  echo ""
  echo -e "${BLUE}🔗 有用的链接：${NC}"
  echo "- 前端开发: http://localhost:3000"
  echo "- Supabase Studio: http://localhost:3333"
  echo "- MinIO Console: http://localhost:9001"
  echo "- 数据库: localhost:5432"
  echo ""
  echo -e "${BLUE}📝 常用命令：${NC}"
  echo "- 查看后端日志: docker-compose -f docker-compose.backend.yml logs -f"
  echo "- 停止后端服务: docker-compose -f docker-compose.backend.yml down"
}

# 部署生产环境
deploy_prod() {
  echo -e "${YELLOW}🚀 部署生产环境...${NC}"
  check_docker
  check_env
  
  # 构建应用
  echo -e "${BLUE}🔨 构建应用...${NC}"
  npm run build
  
  # 构建 Docker 镜像
  echo -e "${BLUE}📦 构建 Docker 镜像...${NC}"
  npm run build:docker
  
  # 启动生产环境
  echo -e "${BLUE}🌟 启动生产环境...${NC}"
  docker-compose -f docker-compose.prod.yml up -d
  
  # 等待服务启动
  echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
  sleep 20
  
  # 检查服务状态
  echo -e "${BLUE}🔍 检查服务状态...${NC}"
  docker-compose -f docker-compose.prod.yml ps
  
  echo -e "${GREEN}✅ 生产环境部署完成！${NC}"
  echo ""
  echo -e "${BLUE}🔗 访问链接：${NC}"
  echo "- 应用: http://localhost:3000"
  echo ""
  echo -e "${BLUE}📝 常用命令：${NC}"
  echo "- 查看日志: npm run prod:logs"
  echo "- 停止服务: npm run prod:down"
}

# 停止服务
stop_services() {
  echo -e "${YELLOW}🛑 停止服务...${NC}"
  check_docker
  
  # 停止开发环境
  if docker-compose -f docker-compose.backend.yml ps -q | grep -q .; then
    echo -e "${BLUE}停止开发环境...${NC}"
    docker-compose -f docker-compose.backend.yml down
  fi
  
  # 停止生产环境
  if docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
    echo -e "${BLUE}停止生产环境...${NC}"
    docker-compose -f docker-compose.prod.yml down
  fi
  
  echo -e "${GREEN}✅ 所有服务已停止${NC}"
}

# 查看日志
show_logs() {
  echo -e "${YELLOW}📋 查看服务日志...${NC}"
  check_docker
  
  # 检查哪个环境在运行
  if docker-compose -f docker-compose.backend.yml ps -q | grep -q .; then
    echo -e "${BLUE}开发环境日志:${NC}"
    docker-compose -f docker-compose.backend.yml logs -f
  elif docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
    echo -e "${BLUE}生产环境日志:${NC}"
    docker-compose -f docker-compose.prod.yml logs -f
  else
    echo -e "${YELLOW}⚠️  没有运行的服务${NC}"
  fi
}

# 创建管理员
create_admin() {
  echo -e "${YELLOW}👤 创建管理员账户...${NC}"
  check_docker
  check_nodejs
  
  # 检查哪个环境在运行
  if docker-compose -f docker-compose.backend.yml ps -q | grep -q .; then
    DB_CONTAINER=$(docker-compose -f docker-compose.backend.yml ps -q db)
  elif docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
    DB_CONTAINER=$(docker-compose -f docker-compose.prod.yml ps -q db)
  else
    echo -e "${RED}❌ 没有运行的服务，请先启动开发或生产环境${NC}"
    exit 1
  fi
  
  if [ -z "$DB_CONTAINER" ]; then
    echo -e "${RED}❌ 数据库未运行${NC}"
    exit 1
  fi
  
  # 运行创建管理员脚本
  ./scripts/create-admin-docker.sh
}

# 构建镜像
build_image() {
  echo -e "${YELLOW}🔨 构建 Docker 镜像...${NC}"
  check_nodejs
  
  npm run build
  npm run build:docker
  
  echo -e "${GREEN}✅ Docker 镜像构建完成${NC}"
}

# 运行测试
run_tests() {
  echo -e "${YELLOW}🧪 运行测试...${NC}"
  check_nodejs
  
  npm run test
  
  echo -e "${GREEN}✅ 测试完成${NC}"
}

# 清理数据
clean_data() {
  echo -e "${RED}⚠️  警告：这将删除所有数据！${NC}"
  echo -e "${RED}请确认输入 'DELETE ALL DATA' 继续：${NC}"
  read -r confirmation
  
  if [ "$confirmation" = "DELETE ALL DATA" ]; then
    check_docker
    
    echo -e "${YELLOW}🗑️  清理数据...${NC}"
    docker-compose -f docker-compose.backend.yml down -v
    docker-compose -f docker-compose.prod.yml down -v
    docker volume rm promptminder-db-data promptminder-minio-data 2>/dev/null || true
    
    echo -e "${GREEN}✅ 数据清理完成${NC}"
  else
    echo -e "${BLUE}操作已取消${NC}"
  fi
}

# 主逻辑
case "${1:-}" in
  "dev")
    start_dev
    ;;
  "deploy")
    deploy_prod
    ;;
  "stop")
    stop_services
    ;;
  "logs")
    show_logs
    ;;
  "admin")
    create_admin
    ;;
  "build")
    build_image
    ;;
  "test")
    run_tests
    ;;
  "clean")
    clean_data
    ;;
  "reset")
    ./scripts/reset-db.sh
    ;;
  "check")
    ./scripts/check-env.sh
    ;;
  "help"|"-h"|"--help"|"")
    show_help
    ;;
  *)
    echo -e "${RED}❌ 未知选项: $1${NC}"
    echo ""
    show_help
    exit 1
    ;;
esac