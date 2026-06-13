const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  return process.env.JWT_SECRET;
};

const generateAccessToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

const generateRegistrationToken = (payload) => {
  return jwt.sign({ ...payload, purpose: 'email_register' }, getJwtSecret(), {
    expiresIn: '30m',
  });
};

const verifyRegistrationToken = (token) => {
  const decoded = jwt.verify(token, getJwtSecret());
  if (decoded.purpose !== 'email_register') {
    const error = new Error('Invalid registration token');
    error.statusCode = 400;
    throw error;
  }
  return decoded;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateRegistrationToken,
  verifyRegistrationToken,
};
