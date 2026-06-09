const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  toggleFavorite,
} = require('../controllers/noteController');

const router = express.Router();

router.use(authMiddleware);

router.get('/search', searchNotes);
router.get('/', getNotes);
router.get('/:id', getNoteById);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);
router.patch('/:id/favorite', toggleFavorite);

module.exports = router;
