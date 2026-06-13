const authService = require('../services/authService');
const { sendError, sendSuccess } = require('../utils/response');

const firebaseLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return sendError(res, 'Firebase ID token is required', 400);
    }

    const result = await authService.firebaseLogin(idToken);

    return sendSuccess(res, 'Firebase login successful', result);
  } catch (error) {
    if (
      error.code === 'auth/argument-error' ||
      error.code === 'auth/id-token-expired' ||
      error.code === 'auth/invalid-id-token'
    ) {
      return sendError(res, 'Invalid Firebase ID token', 401);
    }

    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }

    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: incomingRefreshToken } = req.body;
    const tokenPair = await authService.refreshToken(incomingRefreshToken);

    return sendSuccess(res, 'Token refreshed successfully', tokenPair);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }

    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid refresh token', 401);
    }

    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user);
    return sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res) => {
  return sendSuccess(res, 'Profile retrieved successfully', {
    user: authService.normalizeUser(req.user),
  });
};

const updateProfile = async (req, res, next) => {
  try {
    const updatedUser = await authService.updateProfile(req.user, req.body);

    return sendSuccess(res, 'Profile updated successfully', {
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const requestRegisterOtp = async (req, res, next) => {
  try {
    const { email, fullName } = req.body;
    const result = await authService.requestRegisterOtp({ email, fullName });
    return sendSuccess(res, 'OTP sent successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const resendRegisterOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.resendRegisterOtp({ email });
    return sendSuccess(res, 'OTP resent successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const verifyRegisterOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyRegisterOtp({ email, otp });
    return sendSuccess(res, 'OTP verified successfully', result);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const completeRegister = async (req, res, next) => {
  try {
    const { registrationToken, idToken } = req.body;
    const result = await authService.completeRegister({ registrationToken, idToken });

    return sendSuccess(res, 'Registration completed successfully', result);
  } catch (error) {
    if (
      error.code === 'auth/argument-error' ||
      error.code === 'auth/id-token-expired' ||
      error.code === 'auth/invalid-id-token'
    ) {
      return sendError(res, 'Invalid Firebase ID token', 401);
    }

    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid or expired registration token', 401);
    }

    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }

    next(error);
  }
};

module.exports = {
  firebaseLogin,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  requestRegisterOtp,
  resendRegisterOtp,
  verifyRegisterOtp,
  completeRegister,
};
