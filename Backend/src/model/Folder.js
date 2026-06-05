const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: '#ffffff',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'folders',
  }
);

module.exports = mongoose.model('Folder', folderSchema);
