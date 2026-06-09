const noteService = require('../services/noteService');
const { sendError, sendSuccess } = require('../utils/response');

const getNotes = async (req, res, next) => {
  try {
    const result = await noteService.getNotes(req.user._id, req.query);
    return sendSuccess(res, 'Notes retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getNoteById = async (req, res, next) => {
  try {
    const note = await noteService.getNoteById(req.user._id, req.params.id);
    return sendSuccess(res, 'Note retrieved successfully', { note });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const createNote = async (req, res, next) => {
  try {
    const note = await noteService.createNote(req.user._id, req.body);
    return sendSuccess(res, 'Note created successfully', { note }, 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const note = await noteService.updateNote(req.user._id, req.params.id, req.body);
    return sendSuccess(res, 'Note updated successfully', { note });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    const note = await noteService.deleteNote(req.user._id, req.params.id);
    return sendSuccess(res, 'Note deleted successfully', { noteId: note._id });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const searchNotes = async (req, res, next) => {
  try {
    const result = await noteService.searchNotes(req.user._id, req.query);
    return sendSuccess(res, 'Notes searched successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const toggleFavorite = async (req, res, next) => {
  try {
    const note = await noteService.toggleFavorite(req.user._id, req.params.id);
    return sendSuccess(res, 'Favorite status updated successfully', { note });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  toggleFavorite,
};
