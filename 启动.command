#!/bin/bash
cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo ""
echo "  🎨 ${BLUE}生图笔记启动器${NC}"
echo "  =================="
echo ""

# 杀掉旧的进程（如果有）
echo "  🧹 清理旧进程..."
pkill -f "next dev" 2>/dev/null
sleep 0.5

# 启动服务
echo "  🚀 启动开发服务器..."
echo ""

npm run dev &
NPM_PID=$!

# 等待最多15秒
for i in {1..15}; do
    sleep 1
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        echo ""
        echo "  ${GREEN}✅ 服务启动成功！${NC}"
        break
    fi
    echo -n "."
done

# 检查是否成功
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo ""
    echo -e "  ${RED}❌ 启动失败！${NC}"
    echo ""
    echo "  可能的原因："
    echo "    1. 端口被占用 - 重启电脑试试"
    echo "    2. Node.js 有问题"
    echo ""
    read -p "按回车查看详细错误..."
    wait $NPM_PID
    exit 1
fi

echo ""
echo "  🌐 正在打开浏览器..."

# 打开浏览器
if command -v "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" &> /dev/null; then
    open -a "Google Chrome" "http://localhost:3000"
else
    open "http://localhost:3000"
fi

echo ""
echo "  ${GREEN}🎉 完成！${NC}"
echo ""
echo "  💡 使用说明："
echo "     • 这个终端窗口不要关，关了服务就停了"
echo "     • 可以把这个窗口最小化"
echo "     • 以后直接双击这个文件就能启动"
echo ""
echo "  📂 数据位置: $(pwd)/data/"
echo ""

# 保持窗口打开，显示服务日志
echo "  ================== 服务日志 =================="
echo ""
wait $NPM_PID
