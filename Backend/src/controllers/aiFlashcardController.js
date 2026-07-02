const aiService = require('../services/aiFlashcardService');
const { sendError, sendSuccess } = require('../utils/response');

// Các tính năng AI khác (Rewrite, Translate, Chat) sẽ được thành viên khác phát triển ở file riêng.

const generateFlashcards = async (req, res, next) => {
  try {
    const flashcards = await aiService.generateFlashcards(req.user._id, req.body);
    return sendSuccess(res, 'Flashcards generated successfully', { flashcards });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await aiService.getAiHistory(req.user._id);
    return sendSuccess(res, 'AI history retrieved successfully', { history });
  } catch (error) {
    next(error);
  }
};

const getFlashcardsByNoteId = async (req, res, next) => {
  try {
    const flashcards = await aiService.getFlashcardsByNoteId(req.user._id, req.params.noteId);
    return sendSuccess(res, 'Flashcards retrieved successfully', { flashcards });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateFlashcards,
  getHistory,
  getFlashcardsByNoteId
};
