const aiNoteService = require('../services/aiNoteService');
const { sendError, sendSuccess } = require('../utils/response');

const suggestNoteContent = async (req, res, next) => {
  try {
    const result = await aiNoteService.suggestNoteContent(req.user._id, req.body);
    return sendSuccess(res, 'AI suggestion generated successfully', { result });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  suggestNoteContent
};
