const initializeFirebaseAdmin = require('../config/firebase');
const { User } = require('../model');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');

const normalizeUser = (user) => ({
  _id: user._id,
  email: user.email,
  fullName: user.fullName,
  avatar: user.avatar,
  firebaseUid: user.firebaseUid,
  authProvider: user.authProvider,
  isEmailVerified: user.isEmailVerified,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const buildTokenPair = (user) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

const persistTokenPair = async (user, tokenPair) => {
  user.accessToken = tokenPair.accessToken;
  user.refreshToken = tokenPair.refreshToken;
  user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.lastLoginAt = new Date();
  await user.save();
};

const firebaseLogin = async (idToken) => {
  const admin = initializeFirebaseAdmin();
  const decodedToken = await admin.auth().verifyIdToken(idToken);

  const firebaseUid = decodedToken.uid;
  const email = decodedToken.email;
  const fullName = decodedToken.name || decodedToken.email || 'User';
  const avatar = decodedToken.picture || '';
  const isEmailVerified = Boolean(decodedToken.email_verified);
  const signInProvider = decodedToken.firebase?.sign_in_provider || 'firebase';
  const authProvider = signInProvider === 'google.com' ? 'google' : 'firebase';

  if (!email) {
    const error = new Error('Firebase account does not provide an email');
    error.statusCode = 400;
    throw error;
  }

  let user = await User.findOne({ $or: [{ firebaseUid }, { email }] });

  if (!user) {
    user = await User.create({
      email,
      fullName,
      avatar,
      firebaseUid,
      authProvider,
      isEmailVerified,
      lastLoginAt: new Date(),
    });
  } else {
    user.firebaseUid = user.firebaseUid || firebaseUid;
    user.fullName = fullName || user.fullName;
    user.avatar = avatar || user.avatar;
    user.authProvider = authProvider;
    user.isEmailVerified = isEmailVerified || user.isEmailVerified;
    user.lastLoginAt = new Date();
    await user.save();
  }

  const tokenPair = buildTokenPair(user);
  await persistTokenPair(user, tokenPair);

  return {
    user: normalizeUser(user),
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
  };
};

const refreshToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    const error = new Error('Refresh token is required');
    error.statusCode = 400;
    throw error;
  }

  const decoded = verifyRefreshToken(incomingRefreshToken);
  const user = await User.findById(decoded.userId);

  if (!user || !user.refreshToken || user.refreshToken !== incomingRefreshToken) {
    const error = new Error('Invalid refresh token');
    error.statusCode = 401;
    throw error;
  }

  if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt.getTime() < Date.now()) {
    user.accessToken = '';
    user.refreshToken = '';
    user.refreshTokenExpiresAt = null;
    await user.save();

    const error = new Error('Refresh token expired');
    error.statusCode = 401;
    throw error;
  }

  const tokenPair = buildTokenPair(user);
  await persistTokenPair(user, tokenPair);

  return tokenPair;
};

const logout = async (user) => {
  user.accessToken = '';
  user.refreshToken = '';
  user.refreshTokenExpiresAt = null;
  await user.save();
};

const updateProfile = async (user, payload) => {
  const { fullName, avatar } = payload;

  if (typeof fullName === 'string' && fullName.trim()) {
    user.fullName = fullName.trim();
  }

  if (typeof avatar === 'string') {
    user.avatar = avatar;
  }

  user.lastLoginAt = user.lastLoginAt || new Date();
  await user.save();

  return normalizeUser(user);
};

module.exports = {
  firebaseLogin,
  refreshToken,
  logout,
  updateProfile,
  normalizeUser,
};
