const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuración condicional de SSL para producción vs local
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000, // TiDB usa 4000 por defecto, MySQL 3306
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
};

// Si estamos en producción o DB_SSL es true, configurar SSL
if (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') {
    dbConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    };
    // Si se proporciona un archivo de certificado CA personalizado
    const caFile = process.env.DB_CA_PATH ? path.resolve(__dirname, '..', process.env.DB_CA_PATH) : path.join(__dirname, 'isrgrootx1.pem');
    if (fs.existsSync(caFile)) {
        dbConfig.ssl.ca = fs.readFileSync(caFile);
    }
}

const pool = mysql.createPool(dbConfig);

const promisePool = pool.promise();

module.exports = promisePool;