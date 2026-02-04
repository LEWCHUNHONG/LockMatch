#!/bin/bash

# Update system
apt-get update
apt-get upgrade -y

# Install Docker and Docker Compose
apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt-get install -y nginx

# Configure Nginx as reverse proxy
cat > /etc/nginx/sites-available/nodejs-app << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/nodejs-app /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
systemctl restart nginx

# Create app directory
mkdir -p /home/azureuser/app
chown -R azureuser:azureuser /home/azureuser/app

# Create deployment script
cat > /home/azureuser/deploy-app.sh << 'EOF'
#!/bin/bash

cd /home/azureuser/app

# Pull latest changes
git pull origin main

# Install backend dependencies
cd backend
npm install

# Build frontend
cd ../frontend
npm install
npm run build

# Start/Restart applications with PM2
cd ../backend
pm2 delete all || true
pm2 start app.js --name "backend"
cd ../frontend
pm2 serve build 3000 --name "frontend" --spa

# Save PM2 configuration
pm2 save
pm2 startup
EOF

chmod +x /home/azureuser/deploy-app.sh
chown azureuser:azureuser /home/azureuser/deploy-app.sh