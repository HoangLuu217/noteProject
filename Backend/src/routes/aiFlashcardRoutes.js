const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiFlashcardController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Các tính năng AI khác sẽ có file routes riêng
router.post('/generate-flashcards', aiController.generateFlashcards);
router.get('/history', aiController.getHistory);

module.exports = router;
