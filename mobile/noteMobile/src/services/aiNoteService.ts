import { apiRequest } from './apiClient';

export type AiNoteActionType = 'SUMMARIZE' | 'CONTINUE_WRITING' | 'REWRITE' | 'SUGGEST_IDEAS';

export type AiNotePayload = {
  actionType: AiNoteActionType;
  title?: string;
  content?: string;
  userPrompt?: string;
  noteId?: string | null;
};

export const getAiNoteSuggestion = async (
  token: string,
  payload: AiNotePayload
): Promise<string> => {
  const response = await apiRequest<{ result: string }>('/ai-notes/suggest', {
    method: 'POST',
    body: payload,
    token,
  });
  return response.result;
};
