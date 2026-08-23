const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');
const auth = require('../middleware/auth');
const { voteLimiter } = require('../middleware/rateLimiter');

// POST /api/votes -> Votar (Upsert logic con limitador de tasa)
router.post('/', auth, voteLimiter, voteController.submitVote);

// GET /api/votes/:pollId/my-vote -> Ver qué voté yo (para pintar el botón seleccionado en el frontend)
router.get('/:pollId/my-vote', auth, voteController.getMyVote);

// GET /api/votes/my-votes -> Obtener todos los poll_ids en los que el usuario ha votado
router.get('/my-votes', auth, voteController.getMyVotes);

module.exports = router;