const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema(
  {
    deckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlashcardDeck',
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      default: [],
    },
    answer: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'HARD'],
      default: 'EASY',
    },
    type: {
      type: String,
      enum: ['BASIC', 'MULTIPLE_CHOICE'],
      default: 'BASIC',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'flashcards',
  }
);

module.exports = mongoose.model('Flashcard', flashcardSchema);
