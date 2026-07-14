const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  generateTaskWithAI,
} = require('../controllers/taskController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.post('/generate-ai', generateTaskWithAI);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
