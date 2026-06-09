const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../model');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: token is required',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('-password -accessToken -refreshToken');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found',
      });
    }

    req.user = user;
    req.auth = decoded;
    req.accessToken = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: invalid or expired token',
    });
  }
};

module.exports = authMiddleware;
