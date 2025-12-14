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
const allowedOrigins = [
    'http://localhost:4200',       // Desarrollo local (Angular)
    process.env.CLIENT_URL         // Producción (Netlify)
];

const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Bloqueado por CORS:', origin);
            callback(new Error('No permitido por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'auth-token']
};

app.use(cors(corsOptions));

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