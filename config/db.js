const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Configuración condicional de SSL para producción vs local
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000, // TiDB usa 4000 por defecto, MySQL 3306
    waitForConnections: true,
    // EN SERVERLESS: Mantén esto en 1 para evitar saturar la BD con múltiples lambdas
    connectionLimit: 1,
    queueLimit: 0
};

// Si estamos en producción (o si una variable lo indica), activamos SSL
if (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') {
    dbConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    };
}

const pool = mysql.createPool(dbConfig);

const promisePool = pool.promise();

module.exports = promisePool;