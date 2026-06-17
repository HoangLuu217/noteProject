const { GoogleGenerativeAI } = require('@google/generative-ai');
const AiHistory = require('../model/AiHistory');

class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const callAI = async (prompt) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new CustomError('Chưa có GEMINI_API_KEY trong file .env. Vui lòng thêm vào để sử dụng AI!', 500);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Sử dụng model gemini-2.5-flash mới nhất
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Lỗi khi gọi Gemini AI:', error);
    throw new CustomError('Lỗi kết nối với AI', 500);
  }
};

// Các tính năng AI khác (Rewrite, Translate, Chat) sẽ được thành viên khác phát triển ở service riêng.

const generateFlashcards = async (userId, data) => {
  const { content, noteId } = data;
  if (!content) throw new CustomError('Content is required', 400);

  const prompt = `Bạn là một trợ lý tạo thẻ học. Hãy làm theo yêu cầu của người dùng để tạo ra thẻ ghi nhớ (flashcard).
  Nếu người dùng cung cấp một đoạn văn bản (Note), hãy trích xuất ý chính. Nếu người dùng đưa ra một câu lệnh (Ví dụ: "Tạo 1 câu hỏi có 3 đáp án và giải thích..."), hãy tuân thủ chính xác lệnh đó.
  Kết quả trả về bắt buộc phải là MẢNG JSON hợp lệ. Mỗi phần tử là một object có cấu trúc:
  - "type": "MULTIPLE_CHOICE" hoặc "BASIC"
  - "question": Câu hỏi
  - "options": Mảng các đáp án (tuỳ ý theo lệnh của người dùng)
  - "answer": Đáp án đúng
  - "explanation": Giải thích tại sao đáp án đó đúng (tuỳ chọn)
  
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
        
        // 3. Ép đáp án đúng (answer) BẮT BUỘC phải nằm trong danh sách options
        if (!options.includes(answer)) {
          answer = options[0]; // Chữa cháy bằng cách lấy đáp án đầu tiên làm đáp án đúng
        }
      } else {
        // Nếu là thẻ BASIC thì vứt mảng options đi
        options = [];
      }

      return { type, question, options, answer, explanation };
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

module.exports = {
  generateFlashcards,
  generateFlashcards,
  getAiHistory
};
