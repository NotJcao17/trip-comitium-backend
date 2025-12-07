const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const auth = require('../middleware/auth');

// Definir las rutas
// POST /api/trips -> Crear viaje
router.post('/', tripController.createTrip);

// GET /api/trips/participants -> Obtener lista
router.get('/participants', auth, tripController.getParticipants);

// DELETE /api/trips/participants/:id -> Eliminar participante
router.delete('/participants/:id', auth, tripController.deleteParticipant);

// GET /api/trips/:code -> Obtener info básica del viaje (Pública, solo con código)
router.get('/:code', tripController.getTripByCode);


module.exports = router;