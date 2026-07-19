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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

const suggestNoteContent = async (userId, data) => {
  const { actionType, content, noteId } = data;

  if (actionType && actionType !== 'SUMMARIZE') {
    throw new CustomError('Chức năng AI không hợp lệ', 400);
  }

  if (!content || !content.trim()) {
    throw new CustomError('Nội dung ghi chú trống, không thể tóm tắt!', 400);
  }

  const prompt = `Bạn là một trợ lý AI ghi chú chuyên nghiệp. Hãy viết một bản tóm tắt thật chi tiết, đầy đủ thông tin, cấu trúc rõ ràng và khoa học cho nội dung ghi chú dưới đây.
Yêu cầu định dạng bắt buộc:
1. Sử dụng thẻ <b> và </b> để in đậm các đề mục chính, từ khóa quan trọng hoặc các tiêu đề con. 
2. Tuyệt đối KHÔNG sử dụng cú pháp markdown như dấu sao đôi ** hoặc dấu sao đơn * để tạo chữ in đậm hoặc danh sách.
3. Để tạo danh sách gạch đầu dòng, hãy sử dụng dấu gạch ngang đầu dòng "-" ở đầu dòng mới (ví dụ: "- Nội dung chính...").
4. Trả về trực tiếp văn bản tóm tắt hoàn chỉnh chứa các thẻ <b> và </b>, không bọc trong khối code hay định dạng JSON nào khác.
5. Bản tóm tắt cần chi tiết, nhiều thông tin hữu ích, trình bày chuyên nghiệp bằng tiếng Việt.
6. Tuyệt đối KHÔNG viết tiêu đề bản tóm tắt (ví dụ: "TÓM TẮT CHI TIẾT...", "TÓM TẮT:...").
7. Tuyệt đối KHÔNG viết bất kỳ câu mở đầu, giới thiệu hay dẫn dắt nào (ví dụ: "Đây là bản tóm tắt...", "Dưới đây là tóm tắt..."). Hãy bắt đầu trực tiếp vào nội dung tóm tắt chính.

Nội dung ghi chú cần tóm tắt:
${content}`;

  const aiResponse = await callAI(prompt);

  // Lưu lịch sử sử dụng AI
  await AiHistory.create({
    userId,
    actionType: 'CHAT',
    originalContent: content,
    aiResponse,
    noteId: noteId || null
  });

  return aiResponse;
};

module.exports = {
  suggestNoteContent
};
