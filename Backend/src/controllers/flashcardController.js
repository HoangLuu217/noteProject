const flashcardService = require('../services/flashcardService');
const { sendError, sendSuccess } = require('../utils/response');

// ========================
// DECK CONTROLLERS
// ========================

const createDeck = async (req, res, next) => {
  try {
    const deck = await flashcardService.createDeck(req.user._id, req.body);
    return sendSuccess(res, 'Deck created successfully', { deck }, 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getDecks = async (req, res, next) => {
  try {
    const decks = await flashcardService.getDecks(req.user._id);
    return sendSuccess(res, 'Decks retrieved successfully', { decks });
  } catch (error) {
    next(error);
  }
};

const getDeckById = async (req, res, next) => {
  try {
    const deck = await flashcardService.getDeckById(req.user._id, req.params.deckId);
    return sendSuccess(res, 'Deck retrieved successfully', { deck });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const updateDeck = async (req, res, next) => {
  try {
    const deck = await flashcardService.updateDeck(req.user._id, req.params.deckId, req.body);
    return sendSuccess(res, 'Deck updated successfully', { deck });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const deleteDeck = async (req, res, next) => {
  try {
    const deck = await flashcardService.deleteDeck(req.user._id, req.params.deckId);
    return sendSuccess(res, 'Deck deleted successfully', { deckId: deck._id });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

// ========================
// FLASHCARD CONTROLLERS
// ========================

const addFlashcardToDeck = async (req, res, next) => {
  try {
    const flashcard = await flashcardService.addFlashcardToDeck(req.user._id, req.params.deckId, req.body);
    return sendSuccess(res, 'Flashcard added successfully', { flashcard }, 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getFlashcardsByDeck = async (req, res, next) => {
  try {
    const flashcards = await flashcardService.getFlashcardsByDeck(req.user._id, req.params.deckId);
    return sendSuccess(res, 'Flashcards retrieved successfully', { flashcards });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const updateFlashcard = async (req, res, next) => {
  try {
    const flashcard = await flashcardService.updateFlashcard(req.user._id, req.params.flashcardId, req.body);
    return sendSuccess(res, 'Flashcard updated successfully', { flashcard });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const deleteFlashcard = async (req, res, next) => {
  try {
    const flashcard = await flashcardService.deleteFlashcard(req.user._id, req.params.flashcardId);
    return sendSuccess(res, 'Flashcard deleted successfully', { flashcardId: flashcard._id });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  createDeck,
  getDecks,
  getDeckById,
  updateDeck,
  deleteDeck,
  addFlashcardToDeck,
  getFlashcardsByDeck,
  updateFlashcard,
  deleteFlashcard,
};
