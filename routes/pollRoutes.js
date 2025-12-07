const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const auth = require('../middleware/auth'); // Importamos el middleware de seguridad

// Todas estas rutas requieren estar logueado (tener Token), por eso auth

// GET /api/polls -> Obtener encuestas del viaje (Usuario y Admin)
router.get('/', auth, pollController.getPollsByTrip);

// GET /api/polls/:pollId -> Obtener una encuesta específica
router.get('/:pollId', auth, pollController.getPollById);

// POST /api/polls -> Crear encuesta (Solo Admin - validado en controlador)
router.post('/', auth, pollController.createPoll);

// PATCH /api/polls/:pollId/status -> Cambiar estado (Solo Admin)
router.patch('/:pollId/status', auth, pollController.updatePollStatus);

// DELETE /api/polls/:pollId -> Borrar encuesta (Solo Admin)
router.delete('/:pollId', auth, pollController.deletePoll);

module.exports = router;