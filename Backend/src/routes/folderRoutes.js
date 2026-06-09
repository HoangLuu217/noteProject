const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderNotes,
  searchFolders,
} = require('../controllers/folderController');

const router = express.Router();

router.use(authMiddleware);

router.get('/search', searchFolders);
router.get('/', getFolders);
router.get('/:id/notes', getFolderNotes);
router.get('/:id', getFolderById);
router.post('/', createFolder);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
