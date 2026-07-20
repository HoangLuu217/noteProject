const User = require('../model/User');


class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Hàm chuẩn hóa ngày (chỉ lấy YYYY-MM-DD), loại bỏ giờ/phút
 */
const normalizeDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const updateStreak = async (userId, clientDateString) => {
  const user = await User.findById(userId);
  if (!user) throw new CustomError('User not found', 404);

  // Lấy ngày hiện tại gửi từ Mobile (nếu không có thì dùng giờ Server)
  const clientDate = clientDateString ? new Date(clientDateString) : new Date();

  // Chuẩn hoá ngày để so sánh (bỏ qua Giờ, Phút, Giây)
  const today = normalizeDate(clientDate);
  const lastActive = normalizeDate(user.lastActiveDate);

  if (!lastActive) {
    user.currentStreak = 1;
    user.highestStreak = 1;
    user.lastActiveDate = today;
    await user.save();
    return { currentStreak: user.currentStreak, highestStreak: user.highestStreak, message: 'Bắt đầu chuỗi điểm danh đầu tiên!' };
  }

  const timeDiff = today.getTime() - lastActive.getTime();
  const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24)); // Số ngày chênh lệch

  if (dayDiff === 0) {
    // Đã điểm danh/hoạt động trong ngày hôm nay rồi, không làm gì cả
    return { currentStreak: user.currentStreak, highestStreak: user.highestStreak, message: 'Đã điểm danh hôm nay rồi.' };
  }

  if (dayDiff === 1) {
    // Hoạt động liên tiếp (hôm qua và hôm nay)
    user.currentStreak += 1;
    if (user.currentStreak > user.highestStreak) {
      user.highestStreak = user.currentStreak;
    }
    user.lastActiveDate = today;
    await user.save();
    return { currentStreak: user.currentStreak, highestStreak: user.highestStreak, message: 'Giữ vững chuỗi điểm danh!' };
  }
  user.currentStreak = 1;
  user.lastActiveDate = today;
  await user.save();

  return { currentStreak: user.currentStreak, highestStreak: user.highestStreak, message: 'Chuỗi bị đứt. Đã bắt đầu lại chuỗi mới.' };
};

const getStreakStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new CustomError('User not found', 404);

  return {
    currentStreak: user.currentStreak,
    highestStreak: user.highestStreak,
    lastActiveDate: user.lastActiveDate
  };
};

module.exports = {
  updateStreak,
  getStreakStatus
};
