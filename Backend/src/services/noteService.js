const mongoose = require('mongoose');
const Note = require('../model/Note');

const buildFilter = (userId, query = {}) => {
  const filter = { userId };

  if (query.folderId) {
    filter.folderId = query.folderId;
  }

  if (query.favorite === 'true') {
    filter.isFavorite = true;
  }

  return filter;
};

const getNotes = async (userId, query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filter = buildFilter(userId, query);

  const [notes, total] = await Promise.all([
    Note.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('folderId'),
    Note.countDocuments(filter),
  ]);

  return {
    notes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getNoteById = async (userId, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid note id');
    error.statusCode = 400;
    throw error;
  }

  const note = await Note.findOne({ _id: id, userId }).populate('folderId');
  if (!note) {
    const error = new Error('Note not found');
    error.statusCode = 404;
    throw error;
  }

  return note;
};

const createNote = async (userId, payload) => {
  const { title, content = '', folderId = null } = payload;

  if (!title || !title.trim()) {
    const error = new Error('Title is required');
    error.statusCode = 400;
    throw error;
  }

  const note = await Note.create({
    userId,
    title: title.trim(),
    content,
    folderId,
  });

  return note.populate('folderId');
};

const updateNote = async (userId, id, payload) => {
  const note = await getNoteById(userId, id);
  const { title, content, folderId, isFavorite } = payload;

  if (typeof title === 'string' && title.trim()) {
    note.title = title.trim();
  }
  if (typeof content === 'string') {
    note.content = content;
  }
  if (folderId !== undefined) {
    note.folderId = folderId;
  }
  if (typeof isFavorite === 'boolean') {
    note.isFavorite = isFavorite;
  }

  await note.save();
  await note.populate('folderId');
  return note;
};

const deleteNote = async (userId, id) => {
  const note = await getNoteById(userId, id);
  await note.deleteOne();
  return note;
};

const searchNotes = async (userId, query = {}) => {
  const q = (query.q || '').trim();
  if (!q) {
    const error = new Error('Search query is required');
    error.statusCode = 400;
    throw error;
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {
    userId,
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } },
    ],
  };

  const [notes, total] = await Promise.all([
    Note.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('folderId'),
    Note.countDocuments(filter),
  ]);

  return {
    notes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const toggleFavorite = async (userId, id) => {
  const note = await getNoteById(userId, id);
  note.isFavorite = !note.isFavorite;
  await note.save();
  await note.populate('folderId');
  return note;
};

module.exports = {
  buildFilter,
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  toggleFavorite,
};
