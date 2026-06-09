const { sendError } = require('../utils/response');

const notFoundHandler = (req, res) => {
  return sendError(res, `Route not found: ${req.originalUrl}`, 404);
};

const errorHandler = (error, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));

    return sendError(res, 'Validation failed', 400, errors);
  }

  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyValue || {})[0] || 'field';
    return sendError(res, `${duplicateField} already exists`, 409);
  }

  if (error.name === 'CastError') {
    return sendError(res, 'Invalid resource id', 400);
  }

  if (error.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }

  return sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    statusCode
  );
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
