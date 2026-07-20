const FlashcardDeck = require('../model/FlashcardDeck');
const Flashcard = require('../model/Flashcard');
const mongoose = require('mongoose');

class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ========================
// FLASHCARD DECK SERVICES
// ========================

const createDeck = async (userId, data) => {
  const { title, description, noteId } = data;
  if (!title) {
    throw new CustomError('Title is required', 400);
  }

  const newDeck = await FlashcardDeck.create({
    userId,
    noteId,
    title,
    description,
  });

  return newDeck;
};

const getDecks = async (userId) => {
  const decks = await FlashcardDeck.find({ userId }).sort({ createdAt: -1 });
  return decks;
};

const getDeckById = async (userId, deckId) => {
  const deck = await FlashcardDeck.findOne({ _id: deckId, userId });
  if (!deck) {
    throw new CustomError('Deck not found', 404);
  }
  return deck;
};

const updateDeck = async (userId, deckId, data) => {
  const deck = await FlashcardDeck.findOneAndUpdate(
    { _id: deckId, userId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!deck) {
    throw new CustomError('Deck not found', 404);
  }

  return deck;
};

const deleteDeck = async (userId, deckId) => {
  const deck = await FlashcardDeck.findOneAndDelete({ _id: deckId, userId });
  if (!deck) {
    throw new CustomError('Deck not found', 404);
  }

  // Xóa các flashcards thuộc deck này
  await Flashcard.deleteMany({ deckId });

  return deck;
};

// ========================
// FLASHCARD SERVICES
// ========================

const addFlashcardToDeck = async (userId, deckId, data) => {
  // Kiểm tra quyền sở hữu deck
  const deck = await getDeckById(userId, deckId);
  if (!deck) {
     throw new CustomError('Deck not found', 404);
  }

  const { question, answer, difficulty, type, options } = data;
  if (!question || !answer) {
    throw new CustomError('Question and answer are required', 400);
  }

  const flashcard = await Flashcard.create({
    deckId,
    question,
    answer,
    difficulty: difficulty || 'EASY',
    type: type || 'BASIC',
    options: Array.isArray(options) ? options : [],
  });

  return flashcard;
};

const getFlashcardsByDeck = async (userId, deckId) => {
  // Kiểm tra quyền sở hữu deck trước
  await getDeckById(userId, deckId);

  const flashcards = await Flashcard.find({ deckId }).sort({ createdAt: -1 });
  return flashcards;
};

const updateFlashcard = async (userId, flashcardId, data) => {
  // Tìm flashcard và xem có thuộc deck của user không
  const flashcard = await Flashcard.findById(flashcardId).populate('deckId');
  if (!flashcard || flashcard.deckId.userId.toString() !== userId.toString()) {
    throw new CustomError('Flashcard not found or unauthorized', 404);
  }

  const updatedFlashcard = await Flashcard.findByIdAndUpdate(
    flashcardId,
    { $set: data },
    { new: true, runValidators: true }
  );

  return updatedFlashcard;
};

const deleteFlashcard = async (userId, flashcardId) => {
  const flashcard = await Flashcard.findById(flashcardId).populate('deckId');
  if (!flashcard || flashcard.deckId.userId.toString() !== userId.toString()) {
    throw new CustomError('Flashcard not found or unauthorized', 404);
  }

  await Flashcard.findByIdAndDelete(flashcardId);
  return flashcard;
};

module.exports = {
  createDeck,
  getDecks,
  getDeckById,
  updateDeck,
  deleteDeck,
  addFlashcardToDeck,
  getFlashcardsByDeck,
  updateFlashcard,
  deleteFlashcard,
};
