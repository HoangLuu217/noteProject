const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcardController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Routes cho Flashcard Deck
router.post('/decks', flashcardController.createDeck);
router.get('/decks', flashcardController.getDecks);
router.get('/decks/:deckId', flashcardController.getDeckById);
router.put('/decks/:deckId', flashcardController.updateDeck);
router.delete('/decks/:deckId', flashcardController.deleteDeck);

// Routes cho Flashcard item trong Deck
router.post('/decks/:deckId/flashcards', flashcardController.addFlashcardToDeck);
router.get('/decks/:deckId/flashcards', flashcardController.getFlashcardsByDeck);

// Cập nhật, xóa Flashcard độc lập (không cần deckId ở path URL nếu đã có flashcardId)
router.put('/:flashcardId', flashcardController.updateFlashcard);
router.delete('/:flashcardId', flashcardController.deleteFlashcard);

module.exports = router;
