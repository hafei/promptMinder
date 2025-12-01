# Docker 镜像 AMD64 版本下载与导出指南

本文档详细说明如何下载 PromptMinder 项目中 `docker-compose.yml` 文件里所有镜像的 AMD64 版本，并将其导出为 tar.gz 文件用于离线部署。

## 📋 镜像清单

从 `docker-compose.yml` 文件中提取的镜像列表：

| 服务名称 | 镜像名称 | 版本标签 |
|---------|----------|----------|
| db | postgres | 15-alpine |
| kong | kong | 3.0 |
| postgrest | postgrest/postgrest | v14.1 |
| minio | minio/minio | RELEASE.2025-09-07T16-13-09Z |
| storage-api | supabase/storage-api | v1.32.0 |
| web | promptminder | 0.1.0 (本地构建) |

## 🚀 下载 AMD64 版本镜像

### 方法一：直接拉取指定架构镜像

```bash
# 设置 Docker 平台为 linux/amd64
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# 下载所有镜像
docker pull --platform linux/amd64 postgres:15-alpine
docker pull --platform linux/amd64 kong:3.0
docker pull --platform linux/amd64 postgrest/postgrest:v14.1
docker pull --platform linux/amd64 minio/minio:RELEASE.2025-09-07T16-13-09Z
docker pull --platform linux/amd64 supabase/storage-api:v1.32.0
```

### 方法二：使用批量脚本

创建一个脚本文件 `download_amd64_images.sh`：

```bash
#!/bin/bash

# 设置目标平台
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# 镜像列表
images=(
    "postgres:15-alpine"
    "kong:3.0"
    "postgrest/postgrest:v14.1"
    "minio/minio:RELEASE.2025-09-07T16-13-09Z"
    "supabase/storage-api:v1.32.0"
)

# 下载镜像
echo "开始下载 AMD64 版本镜像..."
for image in "${images[@]}"; do
    echo "正在下载: $image"
    if docker pull --platform linux/amd64 "$image"; then
        echo "✅ $image 下载成功"
    else
        echo "❌ $image 下载失败"
        exit 1
    fi
done

echo "所有镜像下载完成！"
```

使用方法：
```bash
chmod +x download_amd64_images.sh
./download_amd64_images.sh
```

## 📦 导出镜像为 TAR.GZ 文件

### 单个镜像导出

```bash
# 导出单个镜像
docker save postgres:15-alpine | gzip > postgres-15-alpine-amd64.tar.gz
docker save kong:3.0 | gzip > kong-3.0-amd64.tar.gz
docker save postgrest/postgrest:v14.1 | gzip > postgrest-v14.1-amd64.tar.gz
docker save minio/minio:RELEASE.2025-09-07T16-13-09Z | gzip > minio-RELEASE.2025-09-07-amd64.tar.gz
docker save supabase/storage-api:v1.32.0 | gzip > supabase-storage-api-v1.32.0-amd64.tar.gz
```

### 批量导出脚本

创建 `export_images.sh` 脚本：

```bash
#!/bin/bash

# 镜像列表和对应的导出文件名
declare -A images=(
    ["postgres:15-alpine"]="postgres-15-alpine-amd64.tar.gz"
    ["kong:3.0"]="kong-3.0-amd64.tar.gz"
    ["postgrest/postgrest:v14.1"]="postgrest-v14.1-amd64.tar.gz"
    ["minio/minio:RELEASE.2025-09-07T16-13-09Z"]="minio-RELEASE.2025-09-07-amd64.tar.gz"
    ["supabase/storage-api:v1.32.0"]="supabase-storage-api-v1.32.0-amd64.tar.gz"
)

# 创建输出目录
mkdir -p amd64_images

# 导出镜像
echo "开始导出镜像..."
for image in "${!images[@]}"; do
    filename="${images[$image]}"
    echo "正在导出: $image -> $filename"
    
    if docker save "$image" | gzip > "amd64_images/$filename"; then
        echo "✅ $image 导出成功"
        
        # 显示文件大小
        size=$(du -h "amd64_images/$filename" | cut -f1)
        echo "📁 文件大小: $size"
    else
        echo "❌ $image 导出失败"
        exit 1
    fi
done

echo "所有镜像导出完成！"
echo "文件位置: amd64_images/"

# 显示所有导出文件
echo -e "\n📋 导出文件列表:"
ls -lh amd64_images/
```

使用方法：
```bash
chmod +x export_images.sh
./export_images.sh
```

## 🔄 一键完整脚本

创建完整的自动化脚本 `setup_amd64_images.sh`：

```bash
#!/bin/bash

set -e  # 遇到错误立即退出

echo "🚀 PromptMinder AMD64 镜像下载与导出工具"
echo "=========================================="

# 设置目标平台
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# 镜像列表
declare -A images=(
    ["postgres:15-alpine"]="postgres-15-alpine-amd64.tar.gz"
    ["kong:3.0"]="kong-3.0-amd64.tar.gz"
    ["postgrest/postgrest:v14.1"]="postgrest-v14.1-amd64.tar.gz"
    ["minio/minio:RELEASE.2025-09-07T16-13-09Z"]="minio-RELEASE.2025-09-07-amd64.tar.gz"
    ["supabase/storage-api:v1.32.0"]="supabase-storage-api-v1.32.0-amd64.tar.gz"
)

# 创建输出目录
mkdir -p amd64_images

# 步骤1: 下载镜像
echo -e "\n📥 步骤1: 下载 AMD64 版本镜像"
echo "==============================="

for image in "${!images[@]}"; do
    echo "正在下载: $image"
    if docker pull --platform linux/amd64 "$image"; then
        echo "✅ $image 下载成功"
    else
        echo "❌ $image 下载失败"
        exit 1
    fi
done

# 步骤2: 导出镜像
echo -e "\n📦 步骤2: 导出镜像为 TAR.GZ"
echo "==============================="

for image in "${!images[@]}"; do
    filename="${images[$image]}"
    echo "正在导出: $image -> $filename"
    
    if docker save "$image" | gzip > "amd64_images/$filename"; then
        echo "✅ $image 导出成功"
        
        # 显示文件大小
        size=$(du -h "amd64_images/$filename" | cut -f1)
        echo "📁 文件大小: $size"
    else
        echo "❌ $image 导出失败"
        exit 1
    fi
done

# 步骤3: 创建导入脚本
echo -e "\n📝 步骤3: 创建镜像导入脚本"
echo "==============================="

cat > amd64_images/import_images.sh << 'EOF'
#!/bin/bash

echo "🔄 导入 AMD64 镜像"
echo "=================="

# 导入所有镜像
for file in *.tar.gz; do
    if [ -f "$file" ]; then
        echo "正在导入: $file"
        if gunzip -c "$file" | docker load; then
            echo "✅ $file 导入成功"
        else
            echo "❌ $file 导入失败"
        fi
    fi
done

echo "所有镜像导入完成！"

# 验证导入的镜像
echo -e "\n📋 已导入的镜像列表:"
docker images | grep -E "(postgres|kong|postgrest|minio|supabase)"
EOF

chmod +x amd64_images/import_images.sh

# 步骤4: 创建验证脚本
cat > amd64_images/verify_images.sh << 'EOF'
#!/bin/bash

echo "🔍 验证 AMD64 镜像架构"
echo "===================="

declare -A images=(
    ["postgres:15-alpine"]="postgres-15-alpine-amd64.tar.gz"
    ["kong:3.0"]="kong-3.0-amd64.tar.gz"
    ["postgrest/postgrest:v14.1"]="postgrest-v14.1-amd64.tar.gz"
    ["minio/minio:RELEASE.2025-09-07T16-13-09Z"]="minio-RELEASE.2025-09-07-amd64.tar.gz"
    ["supabase/storage-api:v1.32.0"]="supabase-storage-api-v1.32.0-amd64.tar.gz"
)

for image in "${!images[@]}"; do
    echo "检查镜像: $image"
    if docker image inspect "$image" --format='{{.Architecture}}' 2>/dev/null | grep -q "amd64"; then
        echo "✅ $image - AMD64 架构"
    else
        echo "❌ $image - 非 AMD64 架构或镜像不存在"
    fi
done
EOF

chmod +x amd64_images/verify_images.sh

# 完成信息
echo -e "\n🎉 完成！"
echo "=========="
echo "所有镜像已下载并导出到 'amd64_images/' 目录"
echo ""
echo "📁 生成的文件："
ls -lh amd64_images/
echo ""
echo "📋 使用说明："
echo "1. 将 'amd64_images/' 目录复制到目标机器"
echo "2. 在目标机器上运行: ./amd64_images/import_images.sh"
echo "3. 验证镜像架构: ./amd64_images/verify_images.sh"
echo ""
echo "💡 提示: promptminder:0.1.0 是本地构建镜像，需要在目标机器上重新构建"
```

使用方法：
```bash
chmod +x setup_amd64_images.sh
./setup_amd64_images.sh
```

## 📂 文件结构说明

执行完成后，您将得到以下目录结构：

```
amd64_images/
├── postgres-15-alpine-amd64.tar.gz
├── kong-3.0-amd64.tar.gz
├── postgrest-v14.1-amd64.tar.gz
├── minio-RELEASE.2025-09-07-amd64.tar.gz
├── supabase-storage-api-v1.32.0-amd64.tar.gz
├── import_images.sh          # 镜像导入脚本
└── verify_images.sh          # 镜像验证脚本
```

## 🚚 离线部署步骤

1. **传输文件**
   ```bash
   # 将整个目录打包
   tar -czf promptminder-amd64-images.tar.gz amd64_images/
   
   # 传输到目标机器
   scp promptminder-amd64-images.tar.gz user@target-machine:/path/
   ```

2. **在目标机器上解压**
   ```bash
   tar -xzf promptminder-amd64-images.tar.gz
   cd amd64_images/
   ```

3. **导入镜像**
   ```bash
   ./import_images.sh
   ```

4. **验证镜像**
   ```bash
   ./verify_images.sh
   ```

5. **构建本地镜像**
   ```bash
   # 在项目根目录构建 promptminder 镜像
   docker build -t promptminder:0.1.0 .
   ```

6. **启动服务**
   ```bash
   docker-compose up -d
   ```

## ⚠️ 注意事项

### 1. 架构兼容性
- 确保目标机器支持 AMD64 架构
- 使用 `uname -m` 检查目标机器架构

### 2. Docker 版本
- 建议 Docker 版本 >= 20.10
- 确保支持 `--platform` 参数

### 3. 存储空间
- 所有镜像压缩后大约 1-2GB
- 确保有足够的存储空间

### 4. 网络问题
- 如果下载失败，可以尝试使用镜像加速器
- 考虑使用代理或VPN

### 5. 权限问题
- 确保用户有 Docker 执行权限
- 可能需要使用 `sudo` 或将用户加入 docker 组

## 🔧 故障排除

### 下载失败
```bash
# 清理失败的下载
docker system prune -f

# 重试下载
docker pull --platform linux/amd64 <image-name>
```

### 导入失败
```bash
# 检查文件完整性
gunzip -t <filename>.tar.gz

# 重新导出
docker save <image-name> | gzip > <filename>.tar.gz
```

### 架构不匹配
```bash
# 检查镜像架构
docker image inspect <image-name> --format='{{.Architecture}}'

# 强制指定平台
docker pull --platform linux/amd64 <image-name>
```

## 📊 预估文件大小

| 镜像 | 压缩后大小 | 解压后大小 |
|------|------------|------------|
| postgres:15-alpine | ~50MB | ~150MB |
| kong:3.0 | ~80MB | ~300MB |
| postgrest:v14.1 | ~40MB | ~120MB |
| minio:RELEASE.2025-09-07 | ~60MB | ~200MB |
| supabase/storage-api:v1.32.0 | ~50MB | ~150MB |
