const tagService = require('../services/tagService');
const { sendError, sendSuccess } = require('../utils/response');

const getTags = async (req, res, next) => {
  try {
    const tags = await tagService.getTags(req.user._id);
    return sendSuccess(res, 'Tags retrieved successfully', { tags });
  } catch (error) {
    next(error);
  }
};

const getTagById = async (req, res, next) => {
  try {
    const tag = await tagService.getTagById(req.user._id, req.params.id);
    return sendSuccess(res, 'Tag retrieved successfully', { tag });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const createTag = async (req, res, next) => {
  try {
    const tag = await tagService.createTag(req.user._id, req.body);
    return sendSuccess(res, 'Tag created successfully', { tag }, 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const updateTag = async (req, res, next) => {
  try {
    const tag = await tagService.updateTag(req.user._id, req.params.id, req.body);
    return sendSuccess(res, 'Tag updated successfully', { tag });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const deleteTag = async (req, res, next) => {
  try {
    const tag = await tagService.deleteTag(req.user._id, req.params.id);
    return sendSuccess(res, 'Tag deleted successfully', { tagId: tag._id });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
};
