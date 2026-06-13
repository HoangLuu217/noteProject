const uploadService = require('../services/uploadService');
const { sendError, sendSuccess } = require('../utils/response');

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'Image file is required', 400);
    }

    const result = await uploadService.uploadAvatar(req.file, req.user._id.toString());

    return sendSuccess(res, 'Avatar uploaded successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  uploadAvatar,
};
