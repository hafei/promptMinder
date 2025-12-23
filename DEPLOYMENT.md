# 部署指南 (Deployment Guide)

## 自定义品牌标识 (Custom Branding)

要在 Docker 部署中自定义 Logo 和应用名称，您不需要重新构建镜像。只需通过环境变量配置和文件挂载即可实现。

### 1. 准备 Logo 文件
将您的 Logo 文件（例如 `my-logo.png`）放置在服务器上的部署目录中。

### 2. 修改 docker-compose.yml
在 `docker-compose.yml` 中，找到 `web` 服务部分，进行以下修改：

1.  **挂载 Logo 文件**：将您的 Logo 文件挂载到容器内的 `/app/public` 目录。
2.  **配置环境变量**：更新 environment 变量以使用新的 Logo 路径和应用名称。

```yaml
  web:
    # ... 其他配置 ...
    environment:
      # ... 其他环境变量 ...
      NEXT_PUBLIC_APP_NAME: "My Custom App" # 自定义应用名称
      NEXT_PUBLIC_APP_LOGO: "/custom-logo.png" # 对应挂载后的容器内路径
      NEXT_PUBLIC_APP_LOGO_WIDTH: "120" # Logo 宽度
      NEXT_PUBLIC_APP_LOGO_HEIGHT: "40" # Logo 高度
      NEXT_PUBLIC_APP_FAVICON: "/custom-favicon.ico" # 自定义 Favicon
    volumes:
      # 格式: - ./本地文件名:/app/public/容器内文件名
      - ./my-logo.png:/app/public/custom-logo.png
      - ./my-favicon.ico:/app/public/custom-favicon.ico
```

### 3. 重启服务
应用配置更改：
```bash
docker-compose up -d
```

## 完整环境变量列表
| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_APP_NAME` | 网站标题/名称 | PromptMinder |
| `NEXT_PUBLIC_APP_FAVICON` | Favicon 路径 | /favicon.ico |
| `NEXT_PUBLIC_APP_LOGO` | Logo 图片路径 | /logo2.png |
| `NEXT_PUBLIC_APP_LOGO_WIDTH` | Logo 宽度 (px) | 40 |
| `NEXT_PUBLIC_APP_LOGO_HEIGHT` | Logo 高度 (px) | 40 |
| `NEXT_PUBLIC_APP_DESCRIPTION` | 网站描述 (Meta/Footer) | "Make AI prompt..." |
