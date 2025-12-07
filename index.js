const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');

// Cargar variables de entorno
dotenv.config();

// Inicializar la app
const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
// 1. Habilitar CORS para conectar angular
app.use(cors());

// 2. Habilitar lectura de JSON para recibir datos
app.use(express.json());

// --- RUTAS ---
// ruta base
app.get('/', (req, res) => {
    res.send('Servidor Trip Comitium funcionando correctamente');
});

// Importar rutas
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/polls', require('./routes/pollRoutes'));
app.use('/api/votes', require('./routes/voteRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));

// --- ARRANCAR SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});