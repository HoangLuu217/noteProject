const mongoose = require('mongoose');
const folderService = require('../services/folderService');
const { sendError, sendSuccess } = require('../utils/response');

const getFolders = async (req, res, next) => {
  try {
    const folders = await folderService.getFolders(req.user._id);
    return sendSuccess(res, 'Folders retrieved successfully', { folders });
  } catch (error) {
    next(error);
  }
};

const getFolderById = async (req, res, next) => {
  try {
    const folder = await folderService.getFolderById(req.user._id, req.params.id);
    return sendSuccess(res, 'Folder retrieved successfully', { folder });
  } catch (error) {
    next(error);
  }
};

const createFolder = async (req, res, next) => {
  try {
    const folder = await folderService.createFolder(req.user._id, req.body);
    return sendSuccess(res, 'Folder created successfully', { folder }, 201);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 'Folder name already exists', 409);
    }
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const updateFolder = async (req, res, next) => {
  try {
    const folder = await folderService.updateFolder(req.user._id, req.params.id, req.body);
    return sendSuccess(res, 'Folder updated successfully', { folder });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 'Folder name already exists', 409);
    }
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const deleteFolder = async (req, res, next) => {
  try {
    const folder = await folderService.deleteFolder(req.user._id, req.params.id);
    return sendSuccess(res, 'Folder deleted successfully', { folderId: folder._id });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getFolderNotes = async (req, res, next) => {
  try {
    const result = await folderService.getFolderNotes(req.user._id, req.params.id);
    return sendSuccess(res, 'Folder notes retrieved successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const searchFolders = async (req, res, next) => {
  try {
    const folders = await folderService.searchFolders(req.user._id, req.query.q);
    return sendSuccess(res, 'Folders searched successfully', { folders });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
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
