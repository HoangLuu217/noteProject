const FlashcardDeck = require('../model/FlashcardDeck');
const Flashcard = require('../model/Flashcard');

class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Thuật toán SuperMemo-2 (SM-2) rút gọn
 * @param {boolean} isCorrect - Trả lời đúng hay sai
 * @param {number} easeFactor - Hệ số độ khó (mặc định 2.5)
 * @param {number} interval - Khoảng cách ngày ôn tập
 * @param {number} repetitions - Số lần trả lời đúng liên tiếp
 * @returns {object} { newEaseFactor, newInterval, newRepetitions, nextReviewDate, newStatus }
 */
const calculateSM2 = (isCorrect, easeFactor, interval, repetitions) => {
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (isCorrect) {
    // Nếu đúng: tăng số lần lặp, tính toán khoảng cách
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(newInterval * newEaseFactor);
    }
    newRepetitions += 1;
    // Tăng nhẹ easeFactor (tối đa 2.5 hoặc lớn hơn tuỳ ý, thường không giới hạn trên)
    newEaseFactor = newEaseFactor + 0.1;
  } else {
    // Nếu sai: reset số lần lặp về 0, ép ôn lại vào ngày mai
    newRepetitions = 0;
    newInterval = 1;
    // Giảm easeFactor nhưng không dưới 1.3
    newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
  }

  // Tính ngày ôn tập tiếp theo
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  // Reset giờ về 00:00 để so sánh ngày dễ dàng hơn
  nextReviewDate.setHours(0, 0, 0, 0);

  // Xác định trạng thái
  let newStatus = 'LEARNING';
  if (isCorrect) {
    if (newInterval > 21) {
      newStatus = 'MASTERED'; // Nhớ rất dai
    } else {
      newStatus = 'REVIEW';
    }
  }

  return { newEaseFactor, newInterval, newRepetitions, nextReviewDate, newStatus };
};

const syncStudyProgress = async (userId, deckId, results) => {
  // 1. Kiểm tra bộ thẻ có tồn tại và thuộc về user không
  const deck = await FlashcardDeck.findOne({ _id: deckId, userId });
  if (!deck) {
    throw new CustomError('Không tìm thấy bộ thẻ hoặc bạn không có quyền', 404);
  }

  // 2. Cập nhật từng Flashcard đồng thời (Concurrent) để giảm độ trễ
  const updatePromises = results.map(async (result) => {
    const { flashcardId, isCorrect } = result;
    const card = await Flashcard.findOne({ _id: flashcardId, deckId });
    
    if (card) {
      const { newEaseFactor, newInterval, newRepetitions, nextReviewDate, newStatus } = calculateSM2(
        isCorrect,
        card.easeFactor || 2.5,
        card.interval || 0,
        card.repetitions || 0
      );

      await Flashcard.updateOne(
        { _id: flashcardId },
        {
          $set: {
            easeFactor: newEaseFactor,
            interval: newInterval,
            repetitions: newRepetitions,
            nextReviewDate: nextReviewDate,
            status: newStatus
          }
        }
      );
    }
  });

  await Promise.all(updatePromises);

  // 3. Tính toán lại tiến độ (% MASTERED) và ngày ôn gần nhất của cả Deck
  const allCards = await Flashcard.find({ deckId });
  const totalCards = allCards.length;
  let retainedCount = 0;
  let deckNextReviewDate = null;

  allCards.forEach(card => {
    if (card.status === 'REVIEW' || card.status === 'MASTERED') {
      retainedCount += 1;
    }
    // Tìm ngày ôn tập gần nhất trong tương lai
    if (card.nextReviewDate) {
      if (!deckNextReviewDate || card.nextReviewDate < deckNextReviewDate) {
        deckNextReviewDate = card.nextReviewDate;
      }
    }
  });

  const progress = totalCards > 0 ? Math.round((retainedCount / totalCards) * 100) : 0;
  
  // 4. Cập nhật Deck
  deck.progress = progress;
  deck.lastStudiedAt = new Date();
  deck.totalStudied = (deck.totalStudied || 0) + 1;
  // Nếu có thẻ cần ôn, cập nhật ngày. Nếu tất cả thẻ chưa từng học, giữ null.
  if (deckNextReviewDate) {
    deck.nextReviewDate = deckNextReviewDate;
  }

  await deck.save();

  return { message: 'Đã đồng bộ tiến độ thành công', progress: deck.progress, nextReviewDate: deck.nextReviewDate };
};

module.exports = {
  syncStudyProgress
};
