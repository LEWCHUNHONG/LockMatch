FROM node:18-alpine

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製源代碼
COPY . .

# 暴露端口
EXPOSE 3000

# 最簡單嘅啟動命令
CMD ["node", "app.js"]