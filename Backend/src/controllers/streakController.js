const streakService = require('../services/streakService');
const { sendError, sendSuccess } = require('../utils/response');

const checkIn = async (req, res, next) => {
  try {
    const { clientDate } = req.body;
    const result = await streakService.updateStreak(req.user._id, clientDate);
    
    return sendSuccess(res, result.message, {
      currentStreak: result.currentStreak,
      highestStreak: result.highestStreak
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const status = await streakService.getStreakStatus(req.user._id);
    return sendSuccess(res, 'Retrieved streak status', status);
  } catch (error) {
    next(error);
  }
};

// API dùng riêng cho lúc Test (bỏ qua nếu lên Production)
const testCheckIn = async (req, res, next) => {
  try {
    const { clientDate } = req.body;
    const result = await streakService.updateStreak(req.user._id, clientDate);
    return sendSuccess(res, 'TEST: ' + result.message, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  getStatus,
  testCheckIn
};
