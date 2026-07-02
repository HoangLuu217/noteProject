const express = require('express');
const router = express.Router();
const streakController = require('../controllers/streakController');
const authMiddleware = require('../middlewares/authMiddleware');

// Tất cả các route dưới đây đều yêu cầu đăng nhập
router.use(authMiddleware);

// API Lấy trạng thái Streak hiện tại
router.get('/status', streakController.getStatus);

// API Điểm danh / Cập nhật Streak
router.post('/check-in', streakController.checkIn);

// API Test điểm danh (cho phép truyền ngày tuỳ ý để test)
router.post('/test-check-in', streakController.testCheckIn);

module.exports = router;
