const express = require('express');
const {
  firebaseLogin,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/firebase-login', firebaseLogin);
router.post('/refresh', refreshToken);
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
