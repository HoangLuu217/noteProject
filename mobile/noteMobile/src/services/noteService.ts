import { apiRequest } from './apiClient';
import { Note } from '../types/note';

function mapBackendNoteToFrontend(backendNote: any): Note {
  return {
    id: backendNote._id,
    folderId: backendNote.folderId ? (typeof backendNote.folderId === 'object' ? backendNote.folderId._id : backendNote.folderId) : null,
    title: backendNote.title,
    content: backendNote.content || '',
    tags: backendNote.tags?.map((t: any) => typeof t === 'object' ? t._id : t) || [],
    isFavorite: backendNote.isFavorite || false,
    createdAt: backendNote.createdAt,
    updatedAt: backendNote.updatedAt,
  };
}

export const fetchNotesFromServer = async (token: string): Promise<Note[]> => {
  const result = await apiRequest<{ notes: any[] }>('/notes?limit=1000', { token });
  return result.notes.map(mapBackendNoteToFrontend);
};

export const createNoteOnServer = async (
  token: string,
  noteData: { title: string; content?: string; folderId?: string | null; tags?: string[] }
): Promise<Note> => {
  const result = await apiRequest<{ note: any }>('/notes', {
    method: 'POST',
    body: noteData,
    token,
  });
  return mapBackendNoteToFrontend(result.note);
};

export const updateNoteOnServer = async (
  token: string,
  id: string,
  noteData: { title?: string; content?: string; folderId?: string | null; tags?: string[]; isFavorite?: boolean }
): Promise<Note> => {
  const result = await apiRequest<{ note: any }>(`/notes/${id}`, {
    method: 'PUT',
    body: noteData,
    token,
  });
  return mapBackendNoteToFrontend(result.note);
};

export const deleteNoteFromServer = async (token: string, id: string): Promise<void> => {
  await apiRequest(`/notes/${id}`, {
    method: 'DELETE',
    token,
  });
};

export const toggleNoteFavoriteOnServer = async (token: string, id: string): Promise<Note> => {
  const result = await apiRequest<{ note: any }>(`/notes/${id}/favorite`, {
    method: 'PATCH',
    token,
  });
  return mapBackendNoteToFrontend(result.note);
};
