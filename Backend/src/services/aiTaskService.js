const { GoogleGenerativeAI } = require('@google/generative-ai');
const Task = require('../model/Task');

class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const generateTasksFromPrompt = async (userId, data) => {
  const { prompt, selectedDate, today } = data;
  if (!prompt || !prompt.trim()) {
    throw new CustomError('Prompt is required', 400);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new CustomError('Chưa có GEMINI_API_KEY trong file .env. Vui lòng thêm vào để sử dụng AI!', 500);
  }

  // Set up dates
  const todayDate = today ? new Date(today) : new Date();
  const dayName = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(todayDate);

  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDateLocal(todayDate);

  const tomorrow = new Date(todayDate);
  tomorrow.setDate(todayDate.getDate() + 1);
  const nextDay = new Date(todayDate);
  nextDay.setDate(todayDate.getDate() + 2);

  const tomorrowStr = formatDateLocal(tomorrow);
  const nextDayStr = formatDateLocal(nextDay);
  const selectedDateStr = selectedDate || todayStr;

  const systemInstruction = `Bạn là trợ lý ảo phân tích và lên kế hoạch công việc chuyên nghiệp. Nhiệm vụ của bạn là phân tích câu mô tả yêu cầu của người dùng và chuyển đổi thành cấu trúc JSON.
PHÂN BIỆT KẾ HOẠCH (PLAN) VÀ CÔNG VIỆC ĐƠN LẺ:
1. KẾ HOẠCH / LỘ TRÌNH (ví dụ: "kế hoạch ôn thi 3 ngày", "lên lịch tập gym tuần tới", "lộ trình học tiếng Anh"):
   - Đặt "isPlan" = true.
   - Tạo "mainTask" là công việc lớn bao quát (Ví dụ: "Kế hoạch ôn thi môn Toán").
   - Chia nhỏ thành các công việc con trong mảng "tasks", phân bổ ngày thực hiện cụ thể cho từng công việc con (ví dụ: ngày 1 làm gì, ngày 2 làm gì, tính từ ngày bắt đầu).
2. CÔNG VIỆC ĐƠN LẺ (ví dụ: "gọi điện cho mẹ lúc 8h tối", "uống nước", "mua sữa"):
   - Đặt "isPlan" = false.
   - Trực tiếp tạo các công việc đơn lẻ này trong mảng "tasks". Không cần "mainTask" (đặt là null).

Hãy tính toán ngày tháng chính xác tuyệt đối theo múi giờ địa phương của người dùng dựa trên thông tin ngữ cảnh bên dưới.`;

  const contextPrompt = `
Thông tin ngữ cảnh thời gian thực:
- Hôm nay là: ${dayName}, ngày ${todayStr}.
- Ngày mai là: ${tomorrowStr}.
- Ngày mốt là: ${nextDayStr}.
- Ngày người dùng đang mở xem trên lịch (mặc định nếu không chỉ định ngày khác): ${selectedDateStr}.

Yêu cầu:
Hãy phân tích yêu cầu tạo công việc từ người dùng sau: "${prompt}".

QUAN TRỌNG VỀ PHÂN TÍCH THỜI GIAN VÀ ĐA NGÀY:
1. Xác định ngày thực hiện (date) cho từng công việc con hoặc công việc đơn lẻ:
   - Nếu người dùng yêu cầu làm việc vào một ngày cụ thể (ví dụ: "ngày mai", "ngày 15/06"), hãy tính toán ra ngày chính xác dạng YYYY-MM-DD dựa trên hôm nay (${todayStr}).
   - Nếu người dùng yêu cầu lộ trình kéo dài nhiều ngày (ví dụ: "ôn thi trong 3 ngày"), hãy tự động tính toán các ngày kế tiếp nhau từ ngày bắt đầu (${selectedDateStr}) và gán ngày chính xác cho từng công việc con.
   - Nếu người dùng KHÔNG chỉ định thời gian/ngày cụ thể, hãy mặc định tạo công việc vào ngày người dùng đang mở xem trên lịch: ${selectedDateStr}.
2. Giờ thực hiện (time): dạng HH:MM hoặc chuỗi rỗng "".
3. Loại công việc (type): Phân loại từng công việc vào một trong các nhóm: "Personal", "Work", "Study", "Health". Chọn nhóm phù hợp nhất.
`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL_TASK || 'gemini-2.5-flash',
    systemInstruction,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          isPlan: {
            type: 'BOOLEAN',
            description: 'Đặt là true nếu yêu cầu của người dùng là một kế hoạch học tập, ôn thi, dự án hoặc một lộ trình gồm nhiều công việc con diễn ra trong nhiều ngày hoặc nhiều bước. Đặt là false nếu chỉ là các công việc đơn lẻ.'
          },
          mainTask: {
            type: 'OBJECT',
            description: 'Thông tin của công việc chính (chỉ có khi isPlan là true, nếu không thì trả về null).',
            properties: {
              title: { type: 'STRING', description: 'Tiêu đề ngắn gọn của kế hoạch chính (Ví dụ: Kế hoạch ôn thi Toán).' },
              description: { type: 'STRING', description: 'Mô tả khái quát kế hoạch.' },
              category: { type: 'STRING', enum: ['Personal', 'Work', 'Study', 'Health'], description: 'Loại kế hoạch chính.' },
              dueDate: { type: 'STRING', description: 'Ngày kết thúc kế hoạch dạng YYYY-MM-DD, thường là ngày của công việc con cuối cùng.' }
            },
            required: ['title', 'category']
          },
          tasks: {
            type: 'ARRAY',
            description: 'Danh sách các công việc con (nếu isPlan=true) hoặc danh sách các công việc đơn lẻ (nếu isPlan=false).',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Tiêu đề ngắn gọn của công việc bằng tiếng Việt.' },
                content: { type: 'STRING', description: 'Nội dung chi tiết hoặc ghi chú về công việc.' },
                date: { type: 'STRING', description: 'Ngày thực hiện định dạng YYYY-MM-DD.' },
                time: { type: 'STRING', description: 'Giờ thực hiện định dạng HH:MM hoặc chuỗi rỗng.' },
                type: { type: 'STRING', enum: ['Personal', 'Work', 'Study', 'Health'], description: 'Phân loại nhóm công việc.' }
              },
              required: ['title', 'date', 'time', 'type']
            }
          }
        },
        required: ['isPlan', 'tasks']
      }
    }
  });

  let aiResponseStr;
  let attempt = 0;
  const maxRetries = 2;

  while (true) {
    try {
      const result = await model.generateContent(contextPrompt);
      aiResponseStr = result.response.text();
      break;
    } catch (error) {
      console.error(`Lỗi khi gọi Gemini AI (lần thử ${attempt + 1}/${maxRetries + 1}):`, error.message);
      if (attempt === maxRetries) {
        throw new CustomError('Lỗi kết nối với AI. Hệ thống đang quá tải, vui lòng thử lại sau!', 500);
      }
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  aiResponseStr = aiResponseStr.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const parsedData = JSON.parse(aiResponseStr);

    // Save to Database directly
    if (parsedData.isPlan && parsedData.mainTask) {
      // Find the earliest date among all subtasks to schedule the main task
      const subtaskDates = (parsedData.tasks || []).map(t => t.date).filter(Boolean);
      subtaskDates.sort();
      const earliestDateStr = subtaskDates[0] || selectedDateStr;

      // Create Main Task
      const mainTaskObj = await Task.create({
        userId,
        title: parsedData.mainTask.title || 'AI Plan',
        description: parsedData.mainTask.description || '',
        category: parsedData.mainTask.category || 'Study',
        dueDate: new Date(earliestDateStr),
        date: earliestDateStr, // Set date to the earliest day of the plan
        isMainTask: true,
        progress: 0,
      });

      // Create Subtasks
      const subtaskPromises = (parsedData.tasks || []).map(task => {
        const taskData = {
          userId,
          title: task.title,
          description: task.content || '',
          category: task.type || 'Study',
          dueDate: task.date ? new Date(task.date) : null,
          parentTaskId: mainTaskObj._id,
        };
        if (task.time && task.date) {
          const [hours, minutes] = task.time.split(':').map(Number);
          const d = new Date(task.date);
          d.setHours(hours, minutes, 0, 0);
          taskData.dueDate = d;
        }
        return Task.create(taskData);
      });

      const childTasks = await Promise.all(subtaskPromises);

      // Convert to JSON and populate parentTaskId details to bypass schema casting
      const mainTaskJSON = mainTaskObj.toJSON();
      const childTasksJSON = childTasks.map(child => {
        const childJSON = child.toJSON();
        childJSON.parentTaskId = {
          _id: mainTaskObj._id,
          title: mainTaskObj.title
        };
        return childJSON;
      });

      return [mainTaskJSON, ...childTasksJSON];
    } else {
      // Create simple standalone tasks
      const taskPromises = (parsedData.tasks || []).map(task => {
        const taskData = {
          userId,
          title: task.title,
          description: task.content || '',
          category: task.type || 'Personal',
          dueDate: task.date ? new Date(task.date) : null,
        };
        if (task.time && task.date) {
          const [hours, minutes] = task.time.split(':').map(Number);
          const d = new Date(task.date);
          d.setHours(hours, minutes, 0, 0);
          taskData.dueDate = d;
        }
        return Task.create(taskData);
      });
      const createdTasks = await Promise.all(taskPromises);
      return createdTasks;
    }
  } catch (error) {
    console.error('Error saving AI tasks to DB:', error);
    throw new CustomError('Lỗi xử lý kế hoạch từ AI. Vui lòng thử lại!', 500);
  }
};

module.exports = {
  generateTasksFromPrompt
};
