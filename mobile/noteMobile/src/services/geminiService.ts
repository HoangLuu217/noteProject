export interface GeneratedTaskData {
  title: string;
  content: string;
  date: string;
  time: string;
  type: string;
}

// Helper to format date as YYYY-MM-DD in Local Time
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateTaskFromPrompt = async (
  prompt: string,
  selectedDate: string
): Promise<GeneratedTaskData[]> => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const modelName = 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not defined. Please check your .env file.');
  }

  const today = new Date();
  const dayName = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(today);
  const todayStr = formatDateLocal(today);

  // Calculate tomorrow and next day for context
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 2);

  const tomorrowStr = formatDateLocal(tomorrow);
  const nextDayStr = formatDateLocal(nextDay);

  const systemInstruction = `Bạn là trợ lý ảo phân tích công việc chuyên nghiệp. Nhiệm vụ của bạn là phân tích câu mô tả công việc của người dùng và trích xuất thành một danh sách các công việc (JSON) có cấu trúc.
Hãy tính toán ngày tháng chính xác tuyệt đối theo múi giờ địa phương của người dùng dựa trên thông tin ngữ cảnh bên dưới.`;

  const contextPrompt = `
Thông tin ngữ cảnh thời gian thực:
- Hôm nay là: ${dayName}, ngày ${todayStr}.
- Ngày mai là: ${tomorrowStr}.
- Ngày mốt là: ${nextDayStr}.
- Ngày người dùng đang mở xem trên lịch (mặc định nếu không chỉ định ngày khác): ${selectedDate}.

Yêu cầu:
Hãy phân tích yêu cầu tạo công việc từ người dùng sau: "${prompt}".

QUAN TRỌNG VỀ PHÂN TÍCH THỜI GIAN VÀ ĐA NGÀY:
1. Xác định danh sách ngày thực hiện (date):
   - Nếu người dùng yêu cầu làm việc vào một ngày cụ thể (ví dụ: "ngày mai", "ngày 15/06"), hãy tính toán ra ngày chính xác dạng YYYY-MM-DD dựa trên hôm nay (${todayStr}) và trả về một công việc duy nhất cho ngày đó.
   - Nếu người dùng yêu cầu công việc lặp lại hoặc diễn ra trong nhiều ngày (ví dụ: "mỗi ngày từ hôm nay đến thứ sáu", "thứ hai, thứ tư, thứ sáu tuần sau", "tập thể dục mỗi ngày", "đi học vào các ngày 10, 12 và 15"), hãy tính toán ra tất cả các ngày chính xác đó và tạo ra một danh sách gồm nhiều công việc (mỗi công việc tương ứng với một ngày cụ thể).
   - Đối với yêu cầu lặp vô hạn (ví dụ: "mỗi ngày", "mỗi thứ hai"), nếu không ghi rõ phạm vi kết thúc thì hãy mặc định tạo công việc cho 7 ngày tiếp theo (hoặc 7 lần lặp tiếp theo).
   - Nếu người dùng KHÔNG chỉ định thời gian/ngày cụ thể, hãy mặc định tạo một công việc vào ngày người dùng đang mở xem trên lịch: ${selectedDate}.
2. Xác định giờ thực hiện (time) cho mỗi công việc:
   - Nếu người dùng ghi giờ (ví dụ: "9h tối", "14:30", "lúc 8 giờ sáng"), hãy trích xuất và đổi sang dạng HH:MM (24h format, ví dụ: 21:00, 14:30, 08:00) cho từng công việc.
   - Nếu người dùng không chỉ định giờ cụ thể, hãy trả về chuỗi rỗng "".
3. Xác định loại công việc (type):
   - Phân loại công việc vào một trong các nhóm: "Personal", "Work", "Study", "Health". Chọn nhóm phù hợp nhất cho từng công việc.
4. Sinh tiêu đề (title) và nội dung chi tiết (content) phù hợp, tự nhiên bằng tiếng Việt cho từng công việc. Tiêu đề nên ngắn gọn, súc tích.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: contextPrompt
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [
          {
            text: systemInstruction
          }
        ]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            tasks: {
              type: 'ARRAY',
              description: 'Danh sách các công việc được trích xuất hoặc tạo ra từ yêu cầu của người dùng.',
              items: {
                type: 'OBJECT',
                properties: {
                  title: {
                    type: 'STRING',
                    description: 'Tiêu đề ngắn gọn của công việc bằng tiếng Việt.'
                  },
                  content: {
                    type: 'STRING',
                    description: 'Nội dung chi tiết hoặc ghi chú về công việc.'
                  },
                  date: {
                    type: 'STRING',
                    description: 'Ngày thực hiện định dạng YYYY-MM-DD.'
                  },
                  time: {
                    type: 'STRING',
                    description: 'Giờ thực hiện định dạng HH:MM hoặc chuỗi rỗng.'
                  },
                  type: {
                    type: 'STRING',
                    enum: ['Personal', 'Work', 'Study', 'Health'],
                    description: 'Phân loại nhóm công việc.'
                  }
                },
                required: ['title', 'date', 'time', 'type']
              }
            }
          },
          required: ['tasks']
        }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`API call failed with status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsedData = JSON.parse(resultText);
    const tasks: GeneratedTaskData[] = parsedData.tasks || [];
    return tasks;
  } catch (error) {
    console.error('Error generating tasks from prompt:', error);
    throw error;
  }
};
