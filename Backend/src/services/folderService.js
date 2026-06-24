const mongoose = require('mongoose');
const Folder = require('../model/Folder');
const Note = require('../model/Note');

const isValidColor = (color) => {
  if (color === undefined) return true;
  return typeof color === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
};

const getFolders = async (userId) => {
  return Folder.find({ userId }).sort({ createdAt: -1 });
};

const getFolderById = async (userId, folderId) => {
  if (!mongoose.Types.ObjectId.isValid(folderId)) {
    const error = new Error('Invalid folder id');
    error.statusCode = 400;
    throw error;
  }

  const folder = await Folder.findOne({ _id: folderId, userId });
  if (!folder) {
    const error = new Error('Folder not found');
    error.statusCode = 404;
    throw error;
  }

  return folder;
};

const createFolder = async (userId, payload) => {
  const { name, color = '#ffffff' } = payload;

  if (!name || !name.trim()) {
    const error = new Error('Folder name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidColor(color)) {
    const error = new Error('Invalid color format');
    error.statusCode = 400;
    throw error;
  }

  const folder = await Folder.create({
    userId,
    name: name.trim(),
    color,
  });

  return folder;
};

const updateFolder = async (userId, folderId, payload) => {
  const folder = await getFolderById(userId, folderId);
  const { name, color } = payload;

  if (typeof name === 'string' && name.trim()) {
    folder.name = name.trim();
  }

  if (color !== undefined) {
    if (!isValidColor(color)) {
      const error = new Error('Invalid color format');
      error.statusCode = 400;
      throw error;
    }
    folder.color = color;
  }

  await folder.save();
  return folder;
};

const deleteFolder = async (userId, folderId) => {
  const folder = await getFolderById(userId, folderId);
  await Note.updateMany({ userId, folderId: folder._id }, { $set: { folderId: null } });
  await folder.deleteOne();
  return folder;
};

const getFolderNotes = async (userId, folderId) => {
  const folder = await getFolderById(userId, folderId);
  const notes = await Note.find({ userId, folderId: folder._id }).sort({ createdAt: -1 }).populate('folderId');
  return { folder, notes };
};

const searchFolders = async (userId, q) => {
  const query = (q || '').trim();
  if (!query) {
    const error = new Error('Search query is required');
    error.statusCode = 400;
    throw error;
  }

  return Folder.find({
    userId,
    name: { $regex: query, $options: 'i' },
  }).sort({ createdAt: -1 });
};

module.exports = {
  getFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderNotes,
  searchFolders,
};
