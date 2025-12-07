const mysql = require('mysql2');
const dotenv = require('dotenv'); // para cargar el env

// Cargar variables de entorno
dotenv.config();

// Crear el pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convertir a promesas para poder usar async/await
const promisePool = pool.promise();

// Prueba de conexión inicial 
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error conectando a la BD:', err.code);
        if (err.code === 'ECONNREFUSED') console.error('Revisa si MySQL está prendido o la contraseña es incorrecta.');
        if (err.code === 'ER_BAD_DB_ERROR') console.error('Revisa si el nombre de la BD en .env es correcto.');
    }
    if (connection) {
        console.log('Conectado exitosamente a MySQL Database');
        connection.release();
    }
});

module.exports = promisePool;