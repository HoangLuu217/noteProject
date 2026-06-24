import { apiRequest } from './apiClient';
import { Folder } from '../types/note';

function mapBackendFolderToFrontend(backendFolder: any): Folder {
  return {
    id: backendFolder._id,
    name: backendFolder.name,
    color: backendFolder.color || '#ffffff',
    createdAt: backendFolder.createdAt,
    updatedAt: backendFolder.updatedAt,
  };
}

export const fetchFoldersFromServer = async (token: string): Promise<Folder[]> => {
  const result = await apiRequest<{ folders: any[] }>('/folders', { token });
  return result.folders.map(mapBackendFolderToFrontend);
};

export const createFolderOnServer = async (
  token: string,
  folderData: { name: string; color: string }
): Promise<Folder> => {
  const result = await apiRequest<{ folder: any }>('/folders', {
    method: 'POST',
    body: folderData,
    token,
  });
  return mapBackendFolderToFrontend(result.folder);
};

export const updateFolderOnServer = async (
  token: string,
  id: string,
  folderData: { name?: string; color?: string }
): Promise<Folder> => {
  const result = await apiRequest<{ folder: any }>(`/folders/${id}`, {
    method: 'PUT',
    body: folderData,
    token,
  });
  return mapBackendFolderToFrontend(result.folder);
};

export const deleteFolderFromServer = async (token: string, id: string): Promise<void> => {
  await apiRequest(`/folders/${id}`, {
    method: 'DELETE',
    token,
  });
};
