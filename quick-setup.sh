#!/bin/bash

echo "🎯 終極本地測試 - 不使用 Docker Compose 健康檢查"

# 1. 啟動 MySQL
echo "1. 啟動 MySQL 容器..."
docker run -d --name lockmatch-mysql \
  -e MYSQL_ROOT_PASSWORD=honghong \
  -e MYSQL_DATABASE=mufyp \
  -p 3307:3306 \
  -v $(pwd)/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql \
  -v $(pwd)/database/mufyp.sql:/docker-entrypoint-initdb.d/02-data.sql \
  mysql:8.0

echo "等待 MySQL 啟動..."
sleep 30

# 2. 手動在本地啟動後端
echo "2. 手動啟動後端..."
cd backend

# 創建 .env 文件
cat > .env <<EOF
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=honghong
DB_NAME=mufyp
BASE_URL=http://localhost:3000
EOF

echo "後端配置："
cat .env

# 安裝依賴（如果未安裝）
if [ ! -d "node_modules" ]; then
    echo "安裝後端依賴..."
    npm install
fi

echo "啟動後端服務..."
node app.js &
BACKEND_PID=$!
echo "後端進程 PID: $BACKEND_PID"

cd ..

# 等待後端啟動
sleep 10

# 3. 手動在本地啟動前端
echo "3. 手動啟動前端..."
cd frontend

# 創建 .env 文件
echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > .env
echo "EXPO_PUBLIC_USE_TUNNEL=false" >> .env

echo "前端配置："
cat .env

# 安裝依賴（如果未安裝）
if [ ! -d "node_modules" ]; then
    echo "安裝前端依賴..."
    npm install
fi

# 獲取本地 IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' 2>/dev/null || ipconfig getifaddr en0 2>/dev/null || echo "未知")

echo ""
echo "========================================"
echo "🚀 本地服務已啟動！"
echo "========================================"
echo "後端 API: http://localhost:3000"
echo "前端/Expo: http://localhost:8081"
echo "MySQL: localhost:3307 (root/honghong)"
echo ""
echo "📱 手機連接 (同一 WiFi):"
echo "在 Expo Go App 輸入: exp://$LOCAL_IP:8081"
echo ""
echo "或者掃描 QR Code (訪問 http://localhost:8081)"
echo "========================================"
echo ""

# 啟動 Expo
npx expo start --port 8081

# 清理函數
cleanup() {
    echo ""
    echo "🧹 清理中..."
    kill $BACKEND_PID 2>/dev/null
    docker stop lockmatch-mysql 2>/dev/null
    docker rm lockmatch-mysql 2>/dev/null
    echo "✅ 清理完成"
    exit 0
}

# 設置退出時清理
trap cleanup INT TERM EXIT