const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema(
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
    collection: 'tags',
  }
);

module.exports = mongoose.model('Tag', tagSchema);
