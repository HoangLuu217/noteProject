const express = require('express');
const {
  firebaseLogin,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  requestRegisterOtp,
  resendRegisterOtp,
  verifyRegisterOtp,
  completeRegister,
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/firebase-login', firebaseLogin);
router.post('/register/request-otp', requestRegisterOtp);
router.post('/register/resend-otp', resendRegisterOtp);
router.post('/register/verify-otp', verifyRegisterOtp);
router.post('/register/complete', completeRegister);
router.post('/refresh', refreshToken);
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
