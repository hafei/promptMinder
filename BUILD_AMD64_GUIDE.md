# 构建 AMD64 镜像操作指南

本文档介绍如何构建和运行 PromptMinder 应用的 AMD64 架构 Docker 镜像。

## 概述

我们已经从 Dockerfile 和 docker-compose.yml 文件中移除了 platform 参数，这样可以在构建时通过命令行参数指定目标平台，提供更大的灵活性。

## 构建 AMD64 镜像

### 方法一：使用 Docker Buildx（推荐）

Docker Buildx 是 Docker 的构建插件，支持多平台构建。

1. **确保已安装并启用 Docker Buildx**：
   ```bash
   docker buildx version
   ```

2. **创建并使用 Buildx 构建器**（如果尚未创建）：
   ```bash
   docker buildx create --name mybuilder --use
   docker buildx inspect --bootstrap
   ```

3. **构建 AMD64 镜像**：
   ```bash
   docker buildx build --platform linux/amd64 -t promptminder:v0.1.0 .
   ```

4. **构建并加载到本地 Docker**：
   ```bash
   docker buildx build --platform linux/amd64 -t promptminder:amd64-latest --load .
   ```

5. **构建并推送到镜像仓库**：
   ```bash
   docker buildx build --platform linux/amd64 -t your-registry/promptminder:amd64-latest --push .
   ```

### 方法二：使用传统 Docker Build

如果您不想使用 Buildx，也可以使用传统方式构建：

1. **确保您的系统是 AMD64 架构**：
   ```bash
   uname -m
   # 应该显示 x86_64
   ```

2. **构建镜像**：
   ```bash
   docker build -t promptminder:amd64-latest .
   ```

### 方法三：使用脚本构建

项目提供了一个便捷的构建脚本 `build-and-export-amd64.sh`：

```bash
# 给脚本执行权限
chmod +x build-and-export-amd64.sh

# 运行脚本
./build-and-export-amd64.sh
```

## 运行 AMD64 镜像

### 使用 Docker Compose

1. **修改 docker-compose.yml 中的镜像标签**（如果需要）：
   ```yaml
   web:
     image: promptminder:amd64-latest
   ```

2. **启动服务**：
   ```bash
   docker-compose up -d
   ```

### 使用 Docker Run

```bash
docker run -d \
  --name promptminder \
 SE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROL -p 3000:3000 \
  -e SUPABASE_URL=your-supabase-url \
  -e SUPABAE_KEY=your-service-key \
  promptminder:amd64-latest
```

## 验证架构

您可以使用以下命令验证镜像的架构：

```bash
docker inspect promptminder:amd64-latest | grep Architecture
```

或者：

```bash
docker run --rm promptminder:amd64-latest uname -m
```

## 故障排除

### 问题：构建失败，提示架构不匹配

**解决方案**：确保使用 `--platform linux/amd64` 参数构建镜像。

### 问题：运行时出现架构错误

**解决方案**：确认您的 Docker 环境支持运行 AMD64 镜像。在 ARM64 系统上，可能需要使用模拟器。

### 问题：Buildx 不可用

**解决方案**：
1. 更新 Docker 到最新版本
2. 手动安装 Buildx：
   ```bash
   # Linux
   curl -LO "https://github.com/docker/buildx/releases/download/v0.11.2/buildx-v0.11.2.linux-amd64"
   chmod +x buildx-v0.11.2.linux-amd64
   mkdir -p ~/.docker/cli-plugins
   mv buildx-v0.11.2.linux-amd64 ~/.docker/cli-plugins/docker-buildx
   ```

## 最佳实践

1. **使用明确的标签**：为不同架构的镜像使用不同的标签，如 `promptminder:amd64-latest` 和 `promptminder:arm64-latest`。

2. **CI/CD 集成**：在 CI/CD 流水线中使用 Buildx 构建多架构镜像。

3. **镜像仓库**：考虑使用支持多架构的镜像仓库，如 Docker Hub 或 GitHub Container Registry。

4. **测试**：在部署前，确保在目标架构环境中测试镜像。

## 示例：完整的多架构构建流程

```bash
# 1. 创建构建器
docker buildx create --name multiarch --use

# 2. 构建 AMD64 镜像
docker buildx build --platform linux/amd64 -t your-registry/promptminder:amd64-latest --push .

# 3. 构建 ARM64 镜像（如果需要）
docker buildx build --platform linux/arm64 -t your-registry/promptminder:arm64-latest --push .

# 4. 创建多架构清单
docker manifest create your-registry/promptminder:latest \
  your-registry/promptminder:amd64-latest \
  your-registry/promptminder:arm64-latest

# 5. 推送多架构清单
docker manifest push your-registry/promptminder:latest
```

这样，用户就可以简单地使用 `your-registry/promptminder:latest` 标签，Docker 会自动拉取适合其系统架构的镜像。