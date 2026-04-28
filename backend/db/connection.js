// db/connection.js
require('dotenv').config();

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  

  keepAliveInitialDelay: 10000,
  enableKeepAlive: true,
});


setInterval(() => {
  connection.query('SELECT 1', (err) => {
    if (err) {
      console.error('❌ MySQL Ping 失敗:', err.message);
    } else {
      console.log('🟢 MySQL Keep-Alive Ping 成功');
    }
  });
}, 4 * 60 * 1000);

connection.on('error', (err) => {
  console.error('❌ MySQL 連線錯誤:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 嘗試重新連線...');
  }
});

module.exports = connection;