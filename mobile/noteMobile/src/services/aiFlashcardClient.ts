import { apiRequest } from './apiClient';

export interface Flashcard {
  type: 'MULTIPLE_CHOICE' | 'BASIC';
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export const generateFlashcards = async (
  accessToken: string,
  content: string,
  noteId: string
): Promise<Flashcard[]> => {
  const response = await apiRequest<{ flashcards: Flashcard[] }>('/ai-flashcards/generate-flashcards', {
    method: 'POST',
    token: accessToken,
    body: { content, noteId },
  });
  return response.flashcards;
};

export const getFlashcardsByNoteId = async (
  accessToken: string,
  noteId: string
): Promise<Flashcard[] | null> => {
  try {
    const response = await apiRequest<{ flashcards: Flashcard[] | null }>(`/ai-flashcards/note/${noteId}`, {
      method: 'GET',
      token: accessToken,
    });
    return response.flashcards;
  } catch (error) {
    return null;
  }
};
