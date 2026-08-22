const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/join -> Login o Registro unificado (con limitador contra fuerza bruta)
router.post('/join', authLimiter, authController.joinTrip);

module.exports = router;