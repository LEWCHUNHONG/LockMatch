FROM node:18-alpine

WORKDIR /app

# 安裝必要工具
RUN apk add --no-cache curl bash

# 複製 package 文件
COPY package*.json ./

# 安裝依賴
RUN npm install

# 安裝 Expo CLI
RUN npm install -g expo-cli

# 複製源代碼
COPY . .

# 創建 .env 文件（會在啟動時更新）
RUN echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > .env

# 暴露端口
EXPOSE 8081

# 簡單啟動命令
CMD ["npx", "expo", "start", "--port", "8081"]