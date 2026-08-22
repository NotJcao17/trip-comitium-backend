const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const auth = require('../middleware/auth'); // Middleware de autenticación
const verifyAdmin = require('../middleware/admin'); // Middleware de administrador

// Rutas accesibles para cualquier miembro autenticado del viaje
// GET /api/polls -> Obtener encuestas del viaje
router.get('/', auth, pollController.getPollsByTrip);

// GET /api/polls/:pollId -> Obtener una encuesta específica
router.get('/:pollId', auth, pollController.getPollById);

// Rutas protegidas exclusivamente para Administradores
// POST /api/polls -> Crear encuesta (Solo Admin)
router.post('/', auth, verifyAdmin, pollController.createPoll);

// PATCH /api/polls/:pollId/status -> Cambiar estado (Solo Admin)
router.patch('/:pollId/status', auth, verifyAdmin, pollController.updatePollStatus);

// DELETE /api/polls/:pollId -> Borrar encuesta (Solo Admin)
router.delete('/:pollId', auth, verifyAdmin, pollController.deletePoll);

module.exports = router;