const rateLimit = require('express-rate-limit');

// Límite para intentos de autenticación / unirse al viaje (prevenir fuerza bruta de PIN)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 15, // Máximo 15 intentos por IP
    standardHeaders: true, // Devuelve headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
    message: {
        error: 'Demasiados intentos de acceso desde esta IP. Por favor, inténtalo de nuevo en 15 minutos.'
    }
});

// Límite para creación de viajes
const createTripLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20, // Máximo 20 viajes por IP en 1 hora
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Has alcanzado el límite de creación de viajes. Inténtalo más tarde.'
    }
});

// Límite para emisión de votos (prevenir flooding/spam)
const voteLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // Máximo 60 votos por minuto por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiadas solicitudes de voto. Por favor espera un momento.'
    }
});

module.exports = {
    authLimiter,
    createTripLimiter,
    voteLimiter
};
