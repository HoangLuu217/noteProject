const mongoose = require('mongoose');

const aiHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actionType: {
      type: String,
      enum: ['REWRITE', 'TRANSLATE', 'CHAT', 'GENERATE_FLASHCARDS'],
      required: true,
    },
    originalContent: {
      type: String,
    },
    aiResponse: {
      type: String,
    },
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
    },
  },
  {
    timestamps: true,
    collection: 'ai_histories',
  }
);

module.exports = mongoose.model('AiHistory', aiHistorySchema);
