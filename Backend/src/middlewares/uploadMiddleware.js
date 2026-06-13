const multer = require('multer');

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      const error = new Error('Only image files are allowed');
      error.statusCode = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

module.exports = {
  imageUpload,
};
