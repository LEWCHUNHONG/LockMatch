# Create and run a simple setup script
cd /home/azureuser

cat > quick-setup.sh << 'END'
#!/bin/bash
echo "Quick LockMatch Setup..."
apt update && apt upgrade -y
apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs npm mysql-server
npm install -g pm2
systemctl start mysql
systemctl enable mysql
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'lkw988667'; CREATE DATABASE mufyp;"
git clone https://github.com/LEWCHUNHONG/LockMatch.git
cd LockMatch
IP=$(curl -s http://checkip.amazonaws.com)
cd backend && cat > .env << EOF && npm install && cd ../frontend && cat > .env << EOF && npm install && cd .. && pm2 start ecosystem.config.js && pm2 save && pm2 startup
BASE_URL=http://$IP:3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=lkw988667
DB_NAME=mufyp
PORT=3000
EOF
EXPO_PUBLIC_API_URL=http://$IP:3000
PORT=8081
HOST=0.0.0.0
EOF
echo "Done! Backend: http://$IP:3000, Frontend: http://$IP:8081"
END

chmod +x quick-setup.sh
sudo bash quick-setup.sh
