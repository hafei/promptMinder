# 管理员权限系统说明

## 权限层级

1. **超级管理员 (Super Admin)**
   - 在环境变量 `ADMIN_USERNAMES` 中配置
   - 可以管理其他用户的管理员权限
   - 拥有所有管理功能的访问权限

2. **管理员 (Admin)**
   - 由超级管理员通过用户管理页面设置
   - 拥有基本的管理功能权限（如审核贡献）
   - 不能设置其他用户的管理员权限

## 配置说明

在 `.env` 文件中配置超级管理员：
```
ADMIN_USERNAMES=admin,superuser@example.com
```

支持两种格式：
- `admin` - 用户名前缀匹配（admin@example.com, admin@domain.com 都会匹配）
- `superuser@example.com` - 完整邮箱匹配

## 权限检查逻辑

1. 首先检查用户是否已登录
2. 然后检查是否是超级管理员（在 ADMIN_USERNAMES 中）
3. 最后检查是否是普通管理员（user_metadata.is_admin = true）

## API 端点权限要求

- `/api/admin/check` - 需要超级管理员或管理员权限
- `/api/admin/set-admin` - 仅限超级管理员
- `/api/admin/users` - 需要超级管理员或管理员权限