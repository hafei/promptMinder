#!/bin/bash

# 搜索项目中所有使用 CardFooter 的文件

echo "🔍 搜索 CardFooter 使用情况..."
echo "================================"

# 搜索所有使用 CardFooter 的文件
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | \
grep -l "CardFooter" 2>/dev/null | \
while read -r file; do
    echo "📄 $file"
    grep -n "CardFooter" "$file" || true
    echo ""
done

echo "================================"
echo "✅ 搜索完成"