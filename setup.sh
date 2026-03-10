#!/bin/bash

echo "🔄 清理舊容器..."
docker stop lockmatch-mysql 2>/dev/null || true
docker rm lockmatch-mysql 2>/dev/null || true
docker volume rm sql-init 2>/dev/null || true

echo "🚀 創建新Volume..."

docker volume create sql-init

docker run --rm \
  -v sql-init:/init \
  alpine sh -c "apk add --no-cache curl && \
                curl -o /init/01-mufyp.sql https://raw.githubusercontent.com/LEWCHUNHONG/LockMatch/main/database/mufyp.sql"

echo "🚀 創建新容器（確定密碼）..."
docker run -d \
  --name lockmatch-mysql \
  -p 3307:3306 \
  -v sql-init:/docker-entrypoint-initdb.d \
  -e MYSQL_ROOT_PASSWORD=honghong \
  -e MYSQL_DATABASE=mufyp \
  mysql:8.0 \
  --default-authentication-plugin=mysql_native_password

echo "⏳ 等待 MySQL 啟動（30秒）..."
sleep 30

echo "🔍 測試連接..."
if docker exec lockmatch-mysql mysql -u root -phonghong -e "SELECT '✅ 連接成功';" 2>/dev/null; then
    echo "✅ 成功！密碼: honghong"
    
    # 創建數據和用戶
    docker exec lockmatch-mysql mysql -u root -phonghong mufyp << 'SQL'
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

TRUNCATE TABLE users;

INSERT INTO users (username, password, email) VALUES
('Sam', '111111', 'sam@example.com'),
('Admin', 'admin123', 'admin@example.com'),
('Test', 'test123', 'test@example.com');

SELECT * FROM users;
SQL
    
    # 更新 .env
    echo "📝 更新 .env..."
    cat > ~/Desktop/LockMatch/backend/.env << 'ENVEOF'
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=honghong
DB_NAME=mufyp
JWT_SECRET=lockmatch2026_super_strong_key
BASE_URL=http://:3000
AZURE_TEXT_ANALYTICS_ENDPOINT=https://lockmatch.cognitiveservices.azure.com/
AZURE_TEXT_ANALYTICS_API_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=grok-3-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview
ENVEOF
    
    echo ""
    echo "🎉 完成！"
    echo "========================"
    echo "📌 連接信息："
    echo "   主機: localhost"
    echo "   端口: 3307"
    echo "   用戶: root"
    echo "   密碼: honghong"
    echo "   數據庫: mufyp"
    echo ""
    echo "👤 測試帳號："
    echo "   Sam / 111111"
    echo "   Admin / admin123"
    echo "   Test / test123"
    echo "========================"
    
else
    echo "❌ 連接失敗，嘗試其他密碼..."
    
    # 嘗試常見密碼
    for pass in root password 123456 admin mysql ""; do
        echo "嘗試密碼: '$pass'"
        if docker exec lockmatch-mysql mysql -u root -p"$pass" -e "SELECT 1;" 2>/dev/null; then
            echo "✅ 找到密碼: $pass"
            
            # 設置為 honghong
            docker exec lockmatch-mysql mysql -u root -p"$pass" -e "ALTER USER 'root'@'%' IDENTIFIED BY 'honghong'; FLUSH PRIVILEGES;"
            
            cat > ~/Desktop/LockMatch/backend/.env << ENVEOF
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=honghong
DB_NAME=mufyp
JWT_SECRET=lockmatch2026_super_strong_key
BASE_URL=http://:3000
AZURE_TEXT_ANALYTICS_ENDPOINT=https://lockmatch.cognitiveservices.azure.com/
AZURE_TEXT_ANALYTICS_API_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=grok-3-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview
ENVEOF
            
            echo "✅ 已更新密碼為 honghong"
            break
        fi
    done
    
    echo "❌ 所有密碼都失敗，檢查容器日誌："
    docker logs lockmatch-mysql | tail -20
fi
