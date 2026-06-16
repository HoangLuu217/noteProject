export interface Folder {
  id: string;
  name: string;
  color: string; // Hex color string
  createdAt?: string;
  updatedAt?: string;
}

export interface Note {
  id: string;
  folderId: string | null;
  title: string;
  content: string; // HTML-like string with formatting tags
  tags?: string[];
  isFavorite: boolean;
  createdAt?: string;
  updatedAt?: string;
}
