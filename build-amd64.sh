#!/bin/bash

# AMD64 Docker 构建脚本
# 使用方法: ./build-amd64.sh [选项]

set -e

# 默认值
IMAGE_NAME="promptminder"
TAG="amd64"
PORT="3000"
ENV_FILE=".env"
BUILD_ARGS=""
RUN_ARGS=""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
AMD64 Docker 构建脚本

使用方法:
    $0 [选项]

选项:
    -h, --help              显示此帮助信息
    -n, --name NAME         镜像名称 (默认: promptminder)
    -t, --tag TAG           镜像标签 (默认: amd64)
    -p, --port PORT         容器端口 (默认: 3000)
    -e, --env-file FILE     环境变量文件 (默认: .env)
    --build-only            仅构建镜像，不运行
    --run-only              仅运行现有镜像
    --no-cache              构建时不使用缓存
    --push                  构建后推送到镜像仓库
    --registry REGISTRY     镜像仓库地址

示例:
    $0                      # 使用默认设置构建并运行
    $0 --build-only         # 仅构建镜像
    $0 -n myapp -t v1.0     # 自定义镜像名称和标签
    $0 --push --registry myregistry.com  # 构建并推送到仓库

EOF
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -n|--name)
                IMAGE_NAME="$2"
                shift 2
                ;;
            -t|--tag)
                TAG="$2"
                shift 2
                ;;
            -p|--port)
                PORT="$2"
                shift 2
                ;;
            -e|--env-file)
                ENV_FILE="$2"
                shift 2
                ;;
            --build-only)
                BUILD_ONLY=true
                shift
                ;;
            --run-only)
                RUN_ONLY=true
                shift
                ;;
            --no-cache)
                BUILD_ARGS="$BUILD_ARGS --no-cache"
                shift
                ;;
            --push)
                PUSH=true
                shift
                ;;
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            *)
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装或不在 PATH 中"
        exit 1
    fi
    
    if [[ "$PUSH" == true ]] && ! command -v docker &> /dev/null; then
        print_error "推送功能需要 Docker 登录"
        exit 1
    fi
}

# 检查环境文件
check_env_file() {
    if [[ -f "$ENV_FILE" ]]; then
        print_info "找到环境文件: $ENV_FILE"
        
        # 读取环境变量用于构建参数
        if grep -q "SUPABASE_URL" "$ENV_FILE"; then
            SUPABASE_URL=$(grep "SUPABASE_URL" "$ENV_FILE" | cut -d'=' -f2)
            BUILD_ARGS="$BUILD_ARGS --build-arg SUPABASE_URL=$SUPABASE_URL"
            RUN_ARGS="$RUN_ARGS -e SUPABASE_URL=$SUPABASE_URL"
        fi
        
        if grep -q "SUPABASE_ANON_KEY" "$ENV_FILE"; then
            SUPABASE_ANON_KEY=$(grep "SUPABASE_ANON_KEY" "$ENV_FILE" | cut -d'=' -f2)
            BUILD_ARGS="$BUILD_ARGS --build-arg SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
            RUN_ARGS="$RUN_ARGS -e SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
        fi
    else
        print_warn "环境文件 $ENV_FILE 不存在，请确保手动传递环境变量"
    fi
}

# 构建镜像
build_image() {
    print_info "开始构建 AMD64 镜像..."
    print_info "镜像名称: $IMAGE_NAME:$TAG"
    
    local full_image_name="$IMAGE_NAME:$TAG"
    
    # 构建命令
    local cmd="docker build"
    cmd="$cmd --platform=linux/amd64"
    cmd="$cmd -f Dockerfile.amd64"
    cmd="$cmd $BUILD_ARGS"
    cmd="$cmd -t $full_image_name"
    cmd="$cmd ."
    
    print_info "执行命令: $cmd"
    eval $cmd
    
    if [[ $? -eq 0 ]]; then
        print_info "镜像构建成功!"
        
        # 显示镜像信息
        print_info "镜像信息:"
        docker images | grep "$IMAGE_NAME" | grep "$TAG"
        
        # 推送到仓库
        if [[ "$PUSH" == true ]]; then
            if [[ -n "$REGISTRY" ]]; then
                local registry_image="$REGISTRY/$full_image_name"
                print_info "标记镜像用于推送: $registry_image"
                docker tag "$full_image_name" "$registry_image"
                
                print_info "推送到镜像仓库..."
                docker push "$registry_image"
                
                if [[ $? -eq 0 ]]; then
                    print_info "镜像推送成功: $registry_image"
                else
                    print_error "镜像推送失败"
                    exit 1
                fi
            else
                print_warn "未指定镜像仓库，跳过推送"
            fi
        fi
    else
        print_error "镜像构建失败"
        exit 1
    fi
}

# 运行容器
run_container() {
    print_info "启动容器..."
    
    local full_image_name="$IMAGE_NAME:$TAG"
    
    # 停止并删除现有容器
    local existing_container=$(docker ps -q --filter "name=$IMAGE_NAME" || true)
    if [[ -n "$existing_container" ]]; then
        print_info "停止现有容器..."
        docker stop "$IMAGE_NAME" || true
        docker rm "$IMAGE_NAME" || true
    fi
    
    # 运行命令
    local cmd="docker run"
    cmd="$cmd -d"
    cmd="$cmd --name $IMAGE_NAME"
    cmd="$cmd -p $PORT:3000"
    cmd="$cmd $RUN_ARGS"
    cmd="$cmd $full_image_name"
    
    print_info "执行命令: $cmd"
    eval $cmd
    
    if [[ $? -eq 0 ]]; then
        print_info "容器启动成功!"
        print_info "应用访问地址: http://localhost:$PORT"
        print_info "查看日志: docker logs -f $IMAGE_NAME"
        
        # 等待容器启动并检查健康状态
        print_info "等待应用启动..."
        sleep 5
        
        if docker ps | grep -q "$IMAGE_NAME"; then
            print_info "容器运行状态: 正常"
        else
            print_warn "容器可能未正常启动，请检查日志"
        fi
    else
        print_error "容器启动失败"
        exit 1
    fi
}

# 主函数
main() {
    print_info "AMD64 Docker 构建脚本启动"
    
    parse_args "$@"
    check_dependencies
    check_env_file
    
    if [[ "$RUN_ONLY" != true ]]; then
        build_image
    fi
    
    if [[ "$BUILD_ONLY" != true ]]; then
        run_container
    fi
    
    print_info "操作完成!"
}

# 运行主函数
main "$@"