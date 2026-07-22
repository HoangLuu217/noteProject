const mongoose = require('mongoose');

const flashcardDeckSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: false,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastStudiedAt: {
      type: Date,
      default: null
    },
    nextReviewDate: {
      type: Date,
      default: null
    },
    totalStudied: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'flashcard_decks',
  }
);

module.exports = mongoose.model('FlashcardDeck', flashcardDeckSchema);
