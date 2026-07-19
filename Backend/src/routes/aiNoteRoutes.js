const express = require('express');
const router = express.Router();
const aiNoteController = require('../controllers/aiNoteController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/suggest', aiNoteController.suggestNoteContent);

module.exports = router;
