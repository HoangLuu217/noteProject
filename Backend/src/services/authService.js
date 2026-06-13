const initializeFirebaseAdmin = require('../config/firebase');
const crypto = require('crypto');
const { EmailOtp, User } = require('../model');
const { sendOtpEmail } = require('./emailService');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRegistrationToken,
  verifyRegistrationToken,
} = require('../utils/jwt');
const { hashOtp, compareOtp } = require('../utils/password');

const OTP_EXPIRES_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const normalizeEmail = (email) => email.trim().toLowerCase();

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const generateOtpCode = () => crypto.randomInt(100000, 999999).toString();

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

const resolveAuthProvider = (signInProvider) => {
  if (signInProvider === 'google.com') return 'google';
  return 'password';
};

const assertEmailAvailable = async (email) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createHttpError('Email already registered', 409);
  }

  try {
    const admin = initializeFirebaseAdmin();
    await admin.auth().getUserByEmail(email);
    throw createHttpError('Email already registered', 409);
  } catch (error) {
    if (error.statusCode === 409) throw error;
    if (error.code !== 'auth/user-not-found') throw error;
  }
};

const upsertUserFromFirebase = async (
  decodedToken,
  { forceEmailVerified = false, fullNameOverride } = {}
) => {
  const firebaseUid = decodedToken.uid;
  const email = normalizeEmail(decodedToken.email);
  const fullName = fullNameOverride || decodedToken.name || decodedToken.email || 'User';
  const avatar = decodedToken.picture || '';
  const isEmailVerified = forceEmailVerified || Boolean(decodedToken.email_verified);
  const signInProvider = decodedToken.firebase?.sign_in_provider || 'password';
  const authProvider = resolveAuthProvider(signInProvider);

  if (!decodedToken.email) {
    throw createHttpError('Firebase account does not provide an email', 400);
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
    user.firebaseUid = firebaseUid;
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

const firebaseLogin = async (idToken) => {
  const admin = initializeFirebaseAdmin();
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return upsertUserFromFirebase(decodedToken);
};

const issueRegisterOtp = async ({ email, fullName, existingRecord = null }) => {
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = fullName.trim();
  const code = generateOtpCode();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);

  await EmailOtp.findOneAndUpdate(
    { email: normalizedEmail, purpose: 'register' },
    {
      email: normalizedEmail,
      purpose: 'register',
      codeHash,
      fullName: trimmedName,
      attempts: 0,
      expiresAt,
      lastSentAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendOtpEmail({ email: normalizedEmail, code, fullName: trimmedName });

  return {
    email: normalizedEmail,
    expiresIn: OTP_EXPIRES_MS / 1000,
    resendAfter: OTP_RESEND_COOLDOWN_MS / 1000,
  };
};

const requestRegisterOtp = async ({ email, fullName }) => {
  if (!email?.trim() || !fullName?.trim()) {
    throw createHttpError('Email and full name are required', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  await assertEmailAvailable(normalizedEmail);
  return issueRegisterOtp({ email: normalizedEmail, fullName });
};

const resendRegisterOtp = async ({ email }) => {
  if (!email?.trim()) {
    throw createHttpError('Email is required', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  const record = await EmailOtp.findOne({ email: normalizedEmail, purpose: 'register' });

  if (!record) {
    throw createHttpError('OTP not found. Request a new code', 404);
  }

  if (record.lastSentAt && Date.now() - record.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (Date.now() - record.lastSentAt.getTime())) / 1000
    );
    throw createHttpError(`Please wait ${waitSeconds}s before resending OTP`, 429);
  }

  return issueRegisterOtp({
    email: normalizedEmail,
    fullName: record.fullName,
    existingRecord: record,
  });
};

const verifyRegisterOtp = async ({ email, otp }) => {
  if (!email?.trim() || !otp?.trim()) {
    throw createHttpError('Email and OTP are required', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  const record = await EmailOtp.findOne({ email: normalizedEmail, purpose: 'register' });

  if (!record) {
    throw createHttpError('OTP not found. Request a new code', 404);
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await EmailOtp.deleteOne({ _id: record._id });
    throw createHttpError('OTP expired. Request a new code', 410);
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await EmailOtp.deleteOne({ _id: record._id });
    throw createHttpError('Too many invalid attempts. Request a new code', 429);
  }

  const isValid = await compareOtp(otp.trim(), record.codeHash);
  if (!isValid) {
    record.attempts += 1;
    await record.save();
    throw createHttpError('Invalid OTP code', 400);
  }

  await EmailOtp.deleteOne({ _id: record._id });

  const registrationToken = generateRegistrationToken({
    email: normalizedEmail,
    fullName: record.fullName,
  });

  return {
    email: normalizedEmail,
    fullName: record.fullName,
    registrationToken,
  };
};

const completeRegister = async ({ registrationToken, idToken }) => {
  if (!registrationToken || !idToken) {
    throw createHttpError('Registration token and Firebase ID token are required', 400);
  }

  const registration = verifyRegistrationToken(registrationToken);
  const admin = initializeFirebaseAdmin();
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const firebaseEmail = decodedToken.email ? normalizeEmail(decodedToken.email) : '';

  if (registration.email !== firebaseEmail) {
    throw createHttpError('Registration email does not match Firebase account', 400);
  }

  return upsertUserFromFirebase(decodedToken, {
    forceEmailVerified: true,
    fullNameOverride: registration.fullName,
  });
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
  requestRegisterOtp,
  resendRegisterOtp,
  verifyRegisterOtp,
  completeRegister,
  refreshToken,
  logout,
  updateProfile,
  normalizeUser,
};
