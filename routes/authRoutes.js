const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/join -> Login o Registro unificado
router.post('/join', authController.joinTrip);

module.exports = router;