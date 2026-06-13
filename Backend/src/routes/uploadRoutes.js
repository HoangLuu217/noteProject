const express = require('express');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');
const { imageUpload } = require('../middlewares/uploadMiddleware');
const { sendError } = require('../utils/response');

const router = express.Router();

const handleUpload = (req, res, next) => {
  imageUpload.single('image')(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'Image must be smaller than 5MB', 400);
      }
      return sendError(res, error.message || 'Invalid image file', error.statusCode || 400);
    }
    next();
  });
};

router.post('/avatar', authMiddleware, handleUpload, uploadController.uploadAvatar);

module.exports = router;
