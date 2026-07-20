import { apiRequest } from './apiClient';
import { Flashcard } from './aiFlashcardClient';

export interface FlashcardDeck {
  _id: string;
  userId: string;
  noteId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export const createDeck = async (
  accessToken: string,
  title: string,
  noteId?: string
): Promise<FlashcardDeck> => {
  const response = await apiRequest<{ deck: FlashcardDeck }>('/flashcards/decks', {
    method: 'POST',
    token: accessToken,
    body: { title, noteId },
  });
  return response.deck;
};

export const getDecks = async (accessToken: string): Promise<FlashcardDeck[]> => {
  const response = await apiRequest<{ decks: FlashcardDeck[] }>('/flashcards/decks', {
    method: 'GET',
    token: accessToken,
  });
  return response.decks;
};

export const getDeckById = async (
  accessToken: string,
  deckId: string
): Promise<FlashcardDeck> => {
  const response = await apiRequest<{ deck: FlashcardDeck }>(`/flashcards/decks/${deckId}`, {
    method: 'GET',
    token: accessToken,
  });
  return response.deck;
};

export const updateDeck = async (
  accessToken: string,
  deckId: string,
  title: string
): Promise<FlashcardDeck> => {
  const response = await apiRequest<{ deck: FlashcardDeck }>(`/flashcards/decks/${deckId}`, {
    method: 'PUT',
    token: accessToken,
    body: { title },
  });
  return response.deck;
};

export const deleteDeck = async (
  accessToken: string,
  deckId: string
): Promise<void> => {
  await apiRequest(`/flashcards/decks/${deckId}`, {
    method: 'DELETE',
    token: accessToken,
  });
};

// --- FLASHCARD METHODS ---

export const addFlashcardToDeck = async (
  accessToken: string,
  deckId: string,
  flashcard: Partial<Flashcard>
): Promise<Flashcard & { _id: string }> => {
  const response = await apiRequest<{ flashcard: Flashcard & { _id: string } }>(
    `/flashcards/decks/${deckId}/flashcards`,
    {
      method: 'POST',
      token: accessToken,
      body: flashcard,
    }
  );
  return response.flashcard;
};

export const getFlashcardsByDeck = async (
  accessToken: string,
  deckId: string
): Promise<(Flashcard & { _id: string })[]> => {
  const response = await apiRequest<{ flashcards: (Flashcard & { _id: string })[] }>(
    `/flashcards/decks/${deckId}/flashcards`,
    {
      method: 'GET',
      token: accessToken,
    }
  );
  return response.flashcards;
};

export const updateFlashcard = async (
  accessToken: string,
  flashcardId: string,
  flashcard: Partial<Flashcard>
): Promise<Flashcard & { _id: string }> => {
  const response = await apiRequest<{ flashcard: Flashcard & { _id: string } }>(
    `/flashcards/${flashcardId}`,
    {
      method: 'PUT',
      token: accessToken,
      body: flashcard,
    }
  );
  return response.flashcard;
};

export const deleteFlashcard = async (
  accessToken: string,
  flashcardId: string
): Promise<void> => {
  await apiRequest(`/flashcards/${flashcardId}`, {
    method: 'DELETE',
    token: accessToken,
  });
};
