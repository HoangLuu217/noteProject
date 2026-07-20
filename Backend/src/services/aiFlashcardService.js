const { GoogleGenerativeAI } = require('@google/generative-ai');
const AiHistory = require('../model/AiHistory');

class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const callAI = async (prompt, maxRetries = 2) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new CustomError('Chưa có GEMINI_API_KEY trong file .env. Vui lòng thêm vào để sử dụng AI!', 500);
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelName = process.env.GEMINI_MODEL_FLASHCARD || 'gemini-flash-latest';
  const model = genAI.getGenerativeModel({ model: modelName });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error(`Lỗi khi gọi Gemini AI (lần thử ${attempt + 1}/${maxRetries + 1}):`, error.message);

      if (attempt === maxRetries) {
        throw new CustomError('Lỗi kết nối với AI. Hệ thống đang quá tải, vui lòng thử lại sau!', 500);
      }

      // Đợi 1.5s trước khi thử lại
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
};

// Các tính năng AI khác (Rewrite, Translate, Chat) sẽ được thành viên khác phát triển ở service riêng.

const generateFlashcards = async (userId, data) => {
  const { content, noteId, language } = data;
  if (!content) throw new CustomError('Content is required', 400);

  const langInstruction = language === 'en' 
    ? 'QUAN TRỌNG: Tất cả câu hỏi (question), đáp án (answer, options) và giải thích (explanation) PHẢI được viết bằng TIẾNG ANH (English).'
    : 'Tất cả câu hỏi, đáp án, và giải thích trong mảng JSON phải được viết bằng TIẾNG VIỆT.';

  const prompt = `Bạn là một trợ lý tạo thẻ học. Hãy làm theo yêu cầu của người dùng để tạo ra thẻ ghi nhớ (flashcard).
  Nếu người dùng cung cấp một đoạn văn bản (Note), hãy trích xuất ý chính. Nếu người dùng đưa ra một câu lệnh (Ví dụ: "Tạo 1 câu hỏi có 3 đáp án và giải thích..."), hãy tuân thủ chính xác lệnh đó.
  ${langInstruction}
  Kết quả trả về bắt buộc phải là MẢNG JSON hợp lệ. Mỗi phần tử là một object có cấu trúc:
  - "type": "MULTIPLE_CHOICE" hoặc "BASIC"
  - "question": Câu hỏi
  - "options": Mảng các đáp án (tuỳ ý theo lệnh của người dùng)
  - "answer": Đáp án đúng (Bắt buộc phải trích xuất chính xác từ options. Nếu lệnh yêu cầu nhiều đáp án đúng, hãy trả về một MẢNG các chuỗi. Ngược lại, trả về một chuỗi)
  - "explanation": Giải thích tại sao đáp án đó đúng (tuỳ chọn)
  - "difficulty": Độ khó của câu hỏi ("EASY" hoặc "HARD")
  
  KHÔNG bọc JSON trong \`\`\`json. CHỈ in ra mảng JSON.
  Nội dung/Lệnh của người dùng: ${content}`;

  let aiResponseStr = await callAI(prompt);

  // Dọn dẹp chuỗi trả về để chống lỗi JSON parse nếu AI vô tình kèm theo markdown
  aiResponseStr = aiResponseStr.replace(/```json/gi, '').replace(/```/g, '').trim();

  let flashcardsArray;
  try {
    const rawArray = JSON.parse(aiResponseStr);

    // BƯỚC BẢO VỆ (Tầng AI Validation): Lọc dữ liệu để xoá bỏ mọi trường rác và đảm bảo logic
    flashcardsArray = rawArray.map(item => {
      const type = item.type === 'MULTIPLE_CHOICE' ? 'MULTIPLE_CHOICE' : 'BASIC';
      const question = item.question || 'Câu hỏi bị lỗi';
      let options = Array.isArray(item.options) ? item.options : [];
      let answer = item.answer || 'Câu trả lời bị lỗi';
      const explanation = item.explanation || '';

      if (type === 'MULTIPLE_CHOICE') {
        // 1. Loại bỏ các đáp án trùng lặp
        options = [...new Set(options)];

        // 2. Ép số lượng đáp án từ 2 đến 6
        if (options.length < 2) options.push('Đáp án sai 1', 'Đáp án sai 2');
        if (options.length > 6) options = options.slice(0, 6);

        // 3. Xử lý trường hợp đáp án có thể là mảng (nhiều đáp án đúng) hoặc chuỗi
        if (Array.isArray(answer)) {
          // Lọc ra những đáp án thực sự có trong options
          const validAnswers = answer.filter(a => options.includes(a));
          if (validAnswers.length > 0) {
            answer = validAnswers.join(' & ');
          } else {
            answer = options[0];
          }
        } else if (typeof answer === 'string') {
          // Nếu là chuỗi, kiểm tra xem nó có nằm trong options không
          // Nếu không nằm trọn vẹn trong options, có thể AI đã gộp nhiều đáp án (VD: "A và B")
          // Chúng ta sẽ kiểm tra xem answer có chứa option nào không
          const matchedOptions = options.filter(opt => answer.includes(opt));
          if (matchedOptions.length > 0 && !options.includes(answer)) {
             answer = matchedOptions.join(' & ');
          } else if (!options.includes(answer)) {
             answer = options[0]; // Chữa cháy
          }
        } else {
          answer = options[0];
        }
      } else {
        // Nếu là thẻ BASIC thì vứt mảng options đi
        options = [];
      }

      // Xử lý độ khó (mặc định là EASY nếu AI trả về sai)
      let difficulty = item.difficulty;
      if (!['EASY', 'HARD'].includes(difficulty)) {
        difficulty = 'EASY';
      }

      return { type, question, options, answer, explanation, difficulty };
    });
  } catch (error) {
    throw new CustomError('AI trả về sai định dạng JSON. Vui lòng thử lại!', 500);
  }

  await AiHistory.create({
    userId,
    actionType: 'GENERATE_FLASHCARDS',
    originalContent: content,
    aiResponse: JSON.stringify(flashcardsArray),
    noteId
  });

  return flashcardsArray;
};

const getAiHistory = async (userId) => {
  const history = await AiHistory.find({ userId }).sort({ createdAt: -1 });
  return history;
};

const getFlashcardsByNoteId = async (userId, noteId) => {
  const history = await AiHistory.findOne({
    userId,
    noteId,
    actionType: 'GENERATE_FLASHCARDS'
  }).sort({ createdAt: -1 });

  if (!history || !history.aiResponse) {
    return null;
  }

  try {
    return JSON.parse(history.aiResponse);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateFlashcards,
  getAiHistory,
  getFlashcardsByNoteId
};
