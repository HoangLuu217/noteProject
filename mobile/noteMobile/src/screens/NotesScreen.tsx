import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, StyleSheet, Linking, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, X, FileText, ChevronLeft, Bold, Italic, Underline, Link2, Palette, Check, Folder as FolderIcon, ChevronDown, Edit, Search, Calendar, Zap } from 'lucide-react-native';
import { theme, createThemedStyles } from '../theme';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { useAuthStore } from '../stores/authStore';
import { Folder, Note } from '../types/note';
import {
  fetchFoldersFromServer,
  createFolderOnServer,
  updateFolderOnServer,
  deleteFolderFromServer,
} from '../services/folderService';
import {
  fetchNotesFromServer,
  createNoteOnServer,
  updateNoteOnServer,
  deleteNoteFromServer,
} from '../services/noteService';
import { FlashcardListScreen } from './FlashcardListScreen';
import { getAiNoteSuggestion, AiNoteActionType } from '../services/aiNoteService';

const FORMAT_COLORS = [
  { name: 'Red', color: '#E53935' },
  { name: 'Blue', color: '#1E88E5' },
  { name: 'Green', color: '#43A047' },
  { name: 'Yellow', color: '#FDD835' },
  { name: 'Purple', color: '#8E24AA' },
  { name: 'Orange', color: '#F4511E' },
  { name: 'Dark', color: '#2C3E50' },
];

const FOLDER_COLORS = [
  '#006780', // Ocean Blue
  '#386a3d', // Pastel Green
  '#8a315f', // Pink/Berry
  '#6c5e0f', // Sunny Yellow
  '#8E24AA', // Purple
  '#F4511E', // Orange
];

function parseFormattedText(
  text: string, 
  colors: any, 
  isClickable = true,
  baseStyle?: any
): React.ReactNode[] {
  if (!text) return [];

  const tagRegex = /(<\/?b>|<\/?i>|<\/?u>|<\/?color=#[0-9a-fA-F]{6}>|<\/?color>|<\/?link=[^>]+>|<\/?link>)/g;
  const parts = text.split(tagRegex);
  
  const result: React.ReactNode[] = [];
  const defaultBaseStyle = {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  };
  
  const stylesStack: any[] = [baseStyle || defaultBaseStyle];
  let currentLinkUrl: string | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part === '<b>') {
      stylesStack.push({ fontFamily: 'Quicksand-Bold' });
    } else if (part === '</b>') {
      stylesStack.pop();
    } else if (part === '<i>') {
      stylesStack.push({
        fontStyle: 'italic',
        fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif'
      });
    } else if (part === '</i>') {
      stylesStack.pop();
    } else if (part === '<u>') {
      stylesStack.push({ textDecorationLine: 'underline' });
    } else if (part === '</u>') {
      stylesStack.pop();
    } else if (part.startsWith('<color=')) {
      const colorMatch = part.match(/<color=(#[0-9a-fA-F]{6})>/);
      const color = colorMatch ? colorMatch[1] : colors.onSurface;
      stylesStack.push({ color });
    } else if (part === '</color>') {
      stylesStack.pop();
    } else if (part.startsWith('<link=')) {
      const linkMatch = part.match(/<link=([^>]+)>/);
      const url = linkMatch ? linkMatch[1] : '';
      currentLinkUrl = url;
      stylesStack.push({ color: colors.primary, textDecorationLine: 'underline' });
    } else if (part === '</link>') {
      currentLinkUrl = null;
      stylesStack.pop();
    } else {
      const combinedStyle = Object.assign({}, ...stylesStack);
      const key = `text-${i}`;

      const textNode = (
        <Text
          key={key}
          style={combinedStyle}
          onPress={
            isClickable && currentLinkUrl
              ? (() => {
                  const url = currentLinkUrl;
                  if (url) {
                    Linking.openURL(url).catch(err => console.error("Couldn't open URL", err));
                  }
                })
              : undefined
          }
        >
          {part}
        </Text>
      );

      result.push(textNode);
    }
  }

  return result;
}

function htmlToSpans(html: string) {
  let plainText = '';
  const spans: { start: number; end: number; style: string; value?: string }[] = [];
  
  if (!html) return { plainText, spans };
  
  const tagRegex = /(<\/?b>|<\/?i>|<\/?u>|<\/?color=#[0-9a-fA-F]{6}>|<\/?color>|<\/?link=[^>]+>|<\/?link>)/g;
  const parts = html.split(tagRegex);
  
  const activeSpans: { style: string; start: number; value?: string }[] = [];
  
  for (let part of parts) {
    if (!part) continue;
    
    if (part === '<b>') {
      activeSpans.push({ style: 'bold', start: plainText.length });
    } else if (part === '</b>') {
      const idx = activeSpans.findIndex(s => s.style === 'bold');
      if (idx !== -1) {
        const s = activeSpans.splice(idx, 1)[0];
        spans.push({ start: s.start, end: plainText.length, style: 'bold' });
      }
    } else if (part === '<i>') {
      activeSpans.push({ style: 'italic', start: plainText.length });
    } else if (part === '</i>') {
      const idx = activeSpans.findIndex(s => s.style === 'italic');
      if (idx !== -1) {
        const s = activeSpans.splice(idx, 1)[0];
        spans.push({ start: s.start, end: plainText.length, style: 'italic' });
      }
    } else if (part === '<u>') {
      activeSpans.push({ style: 'underline', start: plainText.length });
    } else if (part === '</u>') {
      const idx = activeSpans.findIndex(s => s.style === 'underline');
      if (idx !== -1) {
        const s = activeSpans.splice(idx, 1)[0];
        spans.push({ start: s.start, end: plainText.length, style: 'underline' });
      }
    } else if (part.startsWith('<color=')) {
      const colorMatch = part.match(/<color=(#[0-9a-fA-F]{6})>/);
      const color = colorMatch ? colorMatch[1] : '';
      activeSpans.push({ style: 'color', start: plainText.length, value: color });
    } else if (part === '</color>') {
      const idx = activeSpans.findIndex(s => s.style === 'color');
      if (idx !== -1) {
        const s = activeSpans.splice(idx, 1)[0];
        spans.push({ start: s.start, end: plainText.length, style: 'color', value: s.value });
      }
    } else if (part.startsWith('<link=')) {
      const linkMatch = part.match(/<link=([^>]+)>/);
      const url = linkMatch ? linkMatch[1] : '';
      activeSpans.push({ style: 'link', start: plainText.length, value: url });
    } else if (part === '</link>') {
      const idx = activeSpans.findIndex(s => s.style === 'link');
      if (idx !== -1) {
        const s = activeSpans.splice(idx, 1)[0];
        spans.push({ start: s.start, end: plainText.length, style: 'link', value: s.value });
      }
    } else {
      plainText += part;
    }
  }
  
  for (let s of activeSpans) {
    spans.push({ start: s.start, end: plainText.length, style: s.style, value: s.value });
  }
  
  return { plainText, spans };
}

function getNoteDisplayTitle(
  title: string | undefined,
  content: string | undefined,
  untitledPlaceholder: string
): { title: string; isPlaceholder: boolean } {
  const trimmedTitle = (title || '').trim();
  const isUntitled = !trimmedTitle || trimmedTitle === 'Untitled' || trimmedTitle === 'Chưa đặt tên';

  if (!isUntitled) {
    return { title: trimmedTitle, isPlaceholder: false };
  }

  if (content) {
    const { plainText } = htmlToSpans(content);
    const cleanedText = plainText.trim();
    if (cleanedText) {
      // Split by line breaks, get the first non-empty line
      const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        const firstLine = lines[0];
        const truncated = firstLine.length > 40 ? firstLine.slice(0, 40).trim() + '...' : firstLine;
        return { title: truncated, isPlaceholder: false };
      }
    }
  }

  return { title: untitledPlaceholder, isPlaceholder: true };
}

function spansToHtml(plainText: string, spans: { start: number; end: number; style: string; value?: string }[]) {
  if (!plainText) return '';
  if (spans.length === 0) return plainText;
  
  const insertions: { index: number; text: string; isClose: boolean; priority: number }[] = [];
  
  for (let span of spans) {
    const start = Math.max(0, Math.min(span.start, plainText.length));
    const end = Math.max(start, Math.min(span.end, plainText.length));
    
    if (start === end) continue;
    
    let openTag = '';
    let closeTag = '';
    
    if (span.style === 'bold') {
      openTag = '<b>';
      closeTag = '</b>';
    } else if (span.style === 'italic') {
      openTag = '<i>';
      closeTag = '</i>';
    } else if (span.style === 'underline') {
      openTag = '<u>';
      closeTag = '</u>';
    } else if (span.style === 'color') {
      openTag = `<color=${span.value}>`;
      closeTag = '</color>';
    } else if (span.style === 'link') {
      openTag = `<link=${span.value}>`;
      closeTag = '</link>';
    }
    
    insertions.push({ index: start, text: openTag, isClose: false, priority: 1 });
    insertions.push({ index: end, text: closeTag, isClose: true, priority: 0 });
  }
  
  insertions.sort((a, b) => {
    if (a.index !== b.index) {
      return a.index - b.index;
    }
    return a.priority - b.priority;
  });
  
  let result = '';
  let lastIndex = 0;
  for (let ins of insertions) {
    result += plainText.substring(lastIndex, ins.index);
    result += ins.text;
    lastIndex = ins.index;
  }
  result += plainText.substring(lastIndex);
  
  return result;
}

function mergeSpans(spans: any[]) {
  if (spans.length <= 1) return spans;
  
  const sorted = [...spans].sort((a, b) => {
    if (a.style !== b.style) return a.style.localeCompare(b.style);
    if (a.value !== b.value) return (a.value || '').localeCompare(b.value || '');
    return a.start - b.start;
  });
  
  const merged: any[] = [];
  let current = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.style === current.style && next.value === current.value && next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  
  return merged;
}

function findStringDiff(oldStr: string, newStr: string) {
  let start = 0;
  while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
    start++;
  }
  
  let oldEnd = oldStr.length;
  let newEnd = newStr.length;
  while (oldEnd > start && newEnd > start && oldStr[oldEnd - 1] === newStr[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  
  return {
    start,
    removedLength: oldEnd - start,
    addedLength: newEnd - start,
    addedText: newStr.substring(start, newEnd),
  };
}

interface NotesScreenProps {
  avatarUrl?: any;
}

export function NotesScreen({ avatarUrl }: NotesScreenProps) {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const styles = useStyles(colors);
  const inputRef = useRef<TextInput>(null);
  const toggledStylesRef = useRef<{
    bold: boolean | null;
    italic: boolean | null;
    underline: boolean | null;
    color: string | null;
    position: number | null;
  }>({
    bold: null,
    italic: null,
    underline: null,
    color: null,
    position: null,
  });
  const lastTextChangeTimeRef = useRef<number>(0);

  const accessToken = useAuthStore(state => state.accessToken);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Flashcard states
  const [flashcardNoteId, setFlashcardNoteId] = useState<string | null>(null);
  const [flashcardNoteContent, setFlashcardNoteContent] = useState<string>('');
  const [flashcardNoteTitle, setFlashcardNoteTitle] = useState<string>('');

  const formatDateString = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString();
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return new Date().toLocaleDateString();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  // Folder modal states
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0]);

  // Note-Folder selection in editor
  const [noteFolderId, setNoteFolderId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isPreSelectingFolder, setIsPreSelectingFolder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState('');
  const [inlineFolderColor, setInlineFolderColor] = useState(FOLDER_COLORS[0]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [spans, setSpans] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Formatting active states (WYSIWYG-like toggles)
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);
  const [activeColor, setActiveColor] = useState<string | null>(null);


  // Link Dialog states
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkIsSelected, setLinkIsSelected] = useState(false);

  // AI Assistant states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiResultModalVisible, setAiResultModalVisible] = useState(false);

  // AI Cache states
  const [lastSummarizedNoteId, setLastSummarizedNoteId] = useState<string | null>(null);
  const [lastSummarizedContent, setLastSummarizedContent] = useState<string>('');
  const [lastSummaryResult, setLastSummaryResult] = useState<string>('');

  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [fetchedNotes, fetchedFolders] = await Promise.all([
        fetchNotesFromServer(accessToken),
        fetchFoldersFromServer(accessToken),
      ]);
      setNotes(fetchedNotes);
      setFolders(fetchedFolders);
    } catch (error) {
      console.error('Failed to load notes/folders:', error);
      Alert.alert(t('error') || 'Error', 'Failed to fetch notes & folders from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  useEffect(() => {
    if (isAdding && !isPreSelectingFolder) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAdding, isPreSelectingFolder]);

  const openAdd = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setSpans([]);
    setIsEditing(true); // Start in edit mode for new notes
    setNoteFolderId(selectedFolderId); // Auto-assign to current selected folder
    setShowColorSelector(false);
    setSelection({ start: 0, end: 0 });

    // Reset formatting toggles
    setIsBoldActive(false);
    setIsItalicActive(false);
    setIsUnderlineActive(false);
    setActiveColor(null);

    // Reset link dialog states
    setLinkModalVisible(false);
    setLinkUrl('');
    setLinkText('');
    setLinkIsSelected(false);

    setIsAdding(true);
    setIsPreSelectingFolder(true);
    setIsCreatingInline(false);
    setInlineFolderName('');
    setInlineFolderColor(FOLDER_COLORS[0]);
  };

  const openEdit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title === 'Untitled' || note.title === 'Chưa đặt tên' || note.title === t('untitledNote') ? '' : note.title);
    
    // Parse HTML back to plainText and spans
    const parsed = htmlToSpans(note.content);
    setContent(parsed.plainText);
    setSpans(parsed.spans);
    setNoteFolderId(note.folderId);
    
    setIsEditing(true); // Always start in edit mode
    setShowColorSelector(false);
    setSelection({ start: 0, end: 0 });

    // Reset formatting toggles
    setIsBoldActive(false);
    setIsItalicActive(false);
    setIsUnderlineActive(false);
    setActiveColor(null);

    // Reset link dialog states
    setLinkModalVisible(false);
    setLinkUrl('');
    setLinkText('');
    setLinkIsSelected(false);

    setIsAdding(true);
  };

  const closeModal = async () => {
    setIsAdding(false);

    // Save immediately before clearing state
    if (accessToken && (content.trim() || title.trim())) {
      const htmlContent = spansToHtml(content, spans);
      try {
        if (editingId) {
          const updated = await updateNoteOnServer(accessToken, editingId, {
            title: title.trim() || t('untitledNote'),
            content: htmlContent,
            folderId: noteFolderId,
          });
          setNotes(prevNotes => prevNotes.map(n => n.id === editingId ? updated : n));
        } else {
          const created = await createNoteOnServer(accessToken, {
            title: title.trim() || t('untitledNote'),
            content: htmlContent,
            folderId: noteFolderId,
          });
          setNotes(prevNotes => [created, ...prevNotes]);
        }
      } catch (error) {
        console.error('Failed to save on close:', error);
      }
    }

    setTimeout(() => {
      setEditingId(null);
      setTitle('');
      setContent('');
      setSpans([]);
      setIsEditing(false);
      setShowColorSelector(false);
      setIsBoldActive(false);
      setIsItalicActive(false);
      setIsUnderlineActive(false);
      setActiveColor(null);
      setLinkModalVisible(false);
      setLinkUrl('');
      setLinkText('');
      setLinkIsSelected(false);
      setNoteFolderId(null);
      // Reset AI states
      setAiLoading(false);
      setAiLoadingMessage('');
      setAiResult('');
      setAiResultModalVisible(false);
      setLastSummarizedNoteId(null);
      setLastSummarizedContent('');
      setLastSummaryResult('');
    }, 150);
  };

  const handleAiAction = async (actionType: AiNoteActionType) => {
    if (!accessToken) return;

    if (actionType === 'SUMMARIZE' && !content.trim()) {
      Alert.alert(language === 'vi' ? 'Thông báo' : 'Notice', language === 'vi' ? 'Ghi chú trống, không thể thực hiện hành động này.' : 'Note is empty, cannot perform this action.');
      return;
    }

    // Check cache: if this is a SUMMARIZE action and current note ID and content match the last request, reuse the cache
    if (actionType === 'SUMMARIZE' && editingId === lastSummarizedNoteId && content.trim() === lastSummarizedContent.trim() && lastSummaryResult) {
      setAiResult(lastSummaryResult);
      setAiResultModalVisible(true);
      return;
    }

    // Set loading message
    let msg = language === 'vi' ? 'AI đang tóm tắt ghi chú...' : 'AI is summarizing note...';

    setAiLoadingMessage(msg);
    setAiLoading(true);

    try {
      const resultText = await getAiNoteSuggestion(accessToken, {
        actionType,
        title,
        content,
        noteId: editingId
      });

      setAiResult(resultText);

      // Save to cache
      if (actionType === 'SUMMARIZE') {
        setLastSummarizedNoteId(editingId);
        setLastSummarizedContent(content.trim());
        setLastSummaryResult(resultText);
      }

      setAiResultModalVisible(true);
    } catch (error: any) {
      console.error('AI suggestion failed:', error);
      Alert.alert(t('error') || 'Error', error?.message || 'AI request failed');
    } finally {
      setAiLoading(false);
      setAiLoadingMessage('');
    }
  };

  // Debounced auto-save effect
  useEffect(() => {
    if (!isAdding) return;
    if (!content.trim() && !title.trim()) return;

    const timer = setTimeout(() => {
      const saveNote = async () => {
        if (!accessToken) return;
        const htmlContent = spansToHtml(content, spans);
        try {
          if (editingId) {
            const updated = await updateNoteOnServer(accessToken, editingId, {
              title: title.trim() || t('untitledNote'),
              content: htmlContent,
              folderId: noteFolderId,
            });
            setNotes(prevNotes => prevNotes.map(n => n.id === editingId ? updated : n));
          } else {
            const created = await createNoteOnServer(accessToken, {
              title: title.trim() || t('untitledNote'),
              content: htmlContent,
              folderId: noteFolderId,
            });
            setEditingId(created.id);
            setNotes(prevNotes => [created, ...prevNotes]);
          }
        } catch (error) {
          console.error('Failed to auto-save note:', error);
        }
      };
      saveNote();
    }, 1500); // Save 1.5 seconds after inactivity

    return () => clearTimeout(timer);
  }, [content, spans, title, noteFolderId, editingId, isAdding, accessToken]);

  const handleDeleteNote = async (id: string) => {
    if (!accessToken) return;
    try {
      await deleteNoteFromServer(accessToken, id);
      setNotes(notes.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete note:', error);
      Alert.alert(t('error') || 'Error', 'Failed to delete note from server');
    }
  };

  const openFlashcards = (noteId: string, content: string, title: string) => {
    setFlashcardNoteId(noteId);
    setFlashcardNoteContent(content);
    setFlashcardNoteTitle(title);
  };

  const confirmDeleteNote = (id: string) => {
    Alert.alert(
      t('deleteNote') === 'deleteNote' ? (language === 'vi' ? 'Xóa ghi chú' : 'Delete Note') : t('deleteNote'),
      t('deleteNoteConfirm') === 'deleteNoteConfirm' ? (language === 'vi' ? 'Bạn có chắc chắn muốn xóa ghi chú này không? Hành động này không thể hoàn tác.' : 'Are you sure you want to delete this note? This action cannot be undone.') : t('deleteNoteConfirm'),
      [
        { text: t('cancel') === 'cancel' ? (language === 'vi' ? 'Hủy' : 'Cancel') : t('cancel'), style: 'cancel' },
        { text: t('delete') === 'delete' ? (language === 'vi' ? 'Xóa' : 'Delete') : t('delete'), style: 'destructive', onPress: () => handleDeleteNote(id) }
      ]
    );
  };

  // Folder functions
  const openAddFolder = () => {
    setEditingFolderId(null);
    setFolderName('');
    setFolderColor(FOLDER_COLORS[0]);
    setFolderModalVisible(true);
  };

  const openEditFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setFolderName(folder.name);
    setFolderColor(folder.color);
    setFolderModalVisible(true);
  };

  const closeFolderModal = () => {
    setFolderModalVisible(false);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim() || !accessToken) return;
    try {
      if (editingFolderId) {
        const updated = await updateFolderOnServer(accessToken, editingFolderId, {
          name: folderName.trim(),
          color: folderColor,
        });
        setFolders(folders.map(f => f.id === editingFolderId ? updated : f));
      } else {
        const created = await createFolderOnServer(accessToken, {
          name: folderName.trim(),
          color: folderColor,
        });
        setFolders([...folders, created]);
        if (isPreSelectingFolder) {
          setNoteFolderId(created.id);
          setIsPreSelectingFolder(false);
        }
      }
      closeFolderModal();
    } catch (error: any) {
      console.error('Failed to save folder:', error);
      const msg = error.message === 'Folder name already exists' ? t('folderNameExists') : error.message;
      Alert.alert(t('error') || 'Error', msg || 'Failed to save folder to server');
    }
  };

  const handleSaveInlineFolder = async () => {
    if (!inlineFolderName.trim() || !accessToken) return;
    try {
      const created = await createFolderOnServer(accessToken, {
        name: inlineFolderName.trim(),
        color: inlineFolderColor,
      });
      setFolders([...folders, created]);
      setNoteFolderId(created.id);
      setIsPreSelectingFolder(false);
      setIsCreatingInline(false);
      setInlineFolderName('');
    } catch (error: any) {
      console.error('Failed to save inline folder:', error);
      const msg = error.message === 'Folder name already exists' ? t('folderNameExists') : error.message;
      Alert.alert(t('error') || 'Error', msg || 'Failed to save folder to server');
    }
  };

  const handleDeleteFolder = async () => {
    if (!editingFolderId || !accessToken) return;
    Alert.alert(
      t('deleteFolder') === 'deleteFolder' ? (language === 'vi' ? 'Xóa thư mục' : 'Delete Folder') : t('deleteFolder'),
      t('deleteFolderConfirm') === 'deleteFolderConfirm' ? (language === 'vi' ? 'Bạn có chắc chắn muốn xóa thư mục này? Các ghi chú bên trong sẽ không bị xóa mà trở thành không có thư mục.' : 'Are you sure you want to delete this folder? Notes inside will remain uncategorized.') : t('deleteFolderConfirm'),
      [
        { text: t('cancel') === 'cancel' ? (language === 'vi' ? 'Hủy' : 'Cancel') : t('cancel'), style: 'cancel' },
        {
          text: t('delete') === 'delete' ? (language === 'vi' ? 'Xóa' : 'Delete') : t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolderFromServer(accessToken, editingFolderId);
              setFolders(folders.filter(f => f.id !== editingFolderId));
              setNotes(notes.map(n => n.folderId === editingFolderId ? { ...n, folderId: null } : n));
              if (selectedFolderId === editingFolderId) {
                setSelectedFolderId(null);
              }
              closeFolderModal();
            } catch (error) {
              console.error('Failed to delete folder:', error);
              Alert.alert(t('error') || 'Error', 'Failed to delete folder from server');
            }
          }
        }
      ]
    );
  };

  const toggleStyleForRange = (style: string, value?: string) => {
    const start = selection.start;
    const end = selection.end;
    
    if (start === end) {
      if (toggledStylesRef.current.position !== start) {
        toggledStylesRef.current.position = start;
      }
      
      if (style === 'bold') {
        const nextVal = toggledStylesRef.current.bold !== null ? !toggledStylesRef.current.bold : !isBoldActive;
        toggledStylesRef.current.bold = nextVal;
        setIsBoldActive(nextVal);
      } else if (style === 'italic') {
        const nextVal = toggledStylesRef.current.italic !== null ? !toggledStylesRef.current.italic : !isItalicActive;
        toggledStylesRef.current.italic = nextVal;
        setIsItalicActive(nextVal);
      } else if (style === 'underline') {
        const nextVal = toggledStylesRef.current.underline !== null ? !toggledStylesRef.current.underline : !isUnderlineActive;
        toggledStylesRef.current.underline = nextVal;
        setIsUnderlineActive(nextVal);
      } else if (style === 'color') {
        const targetColor = value || null;
        const currentColor = toggledStylesRef.current.color !== null ? toggledStylesRef.current.color : activeColor;
        const nextVal = currentColor === targetColor ? null : targetColor;
        toggledStylesRef.current.color = nextVal;
        setActiveColor(nextVal);
      }
      
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const isCurrentlyActive = spans.some(span => 
      span.style === style && 
      (value === undefined || span.value === value) && 
      span.start <= start && span.end >= end
    );

    let updatedSpans: any[] = [];
    for (const span of spans) {
      if (span.style === style && (value === undefined || span.value === value)) {
        if (span.start >= start && span.end <= end) {
          continue;
        }
        if (span.start < start && span.end > end) {
          updatedSpans.push({ ...span, end: start });
          updatedSpans.push({ ...span, start: end });
          continue;
        }
        if (span.start < start && span.end > start && span.end <= end) {
          updatedSpans.push({ ...span, end: start });
          continue;
        }
        if (span.start >= start && span.start < end && span.end > end) {
          updatedSpans.push({ ...span, start: end });
          continue;
        }
      }
      updatedSpans.push(span);
    }

    if (!isCurrentlyActive) {
      updatedSpans.push({ start, end, style, value });
    }

    setSpans(mergeSpans(updatedSpans));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleTextChange = (newText: string) => {
    const oldText = content;
    const { start, removedLength, addedLength } = findStringDiff(oldText, newText);
    
    lastTextChangeTimeRef.current = Date.now();
    
    const diff = addedLength - removedLength;
    let updatedSpans: any[] = [];
    
    for (const span of spans) {
      let { start: sStart, end: sEnd } = span;
      
      if (sEnd <= start) {
        updatedSpans.push(span);
        continue;
      }
      
      if (sStart >= start + removedLength) {
        updatedSpans.push({ ...span, start: sStart + diff, end: sEnd + diff });
        continue;
      }
      
      if (sStart <= start && sEnd >= start + removedLength) {
        updatedSpans.push({ ...span, end: sEnd + diff });
        continue;
      }
      
      if (sStart >= start && sEnd <= start + removedLength) {
        continue;
      }
      
      if (sStart >= start && sStart < start + removedLength && sEnd > start + removedLength) {
        updatedSpans.push({ ...span, start: start + addedLength, end: sEnd + diff });
        continue;
      }
      
      if (sStart < start && sEnd > start && sEnd <= start + removedLength) {
        updatedSpans.push({ ...span, end: start });
        continue;
      }
      
      updatedSpans.push(span);
    }
    
    updatedSpans = updatedSpans.filter(span => span.start < span.end);
    
    if (addedLength > 0) {
      const insertStart = start;
      const insertEnd = start + addedLength;
      
      if (isBoldActive) {
        updatedSpans.push({ start: insertStart, end: insertEnd, style: 'bold' });
      }
      if (isItalicActive) {
        updatedSpans.push({ start: insertStart, end: insertEnd, style: 'italic' });
      }
      if (isUnderlineActive) {
        updatedSpans.push({ start: insertStart, end: insertEnd, style: 'underline' });
      }
      if (activeColor) {
        updatedSpans.push({ start: insertStart, end: insertEnd, style: 'color', value: activeColor });
      }
    }
    
    toggledStylesRef.current = {
      bold: null,
      italic: null,
      underline: null,
      color: null,
      position: null,
    };
    
    updatedSpans = mergeSpans(updatedSpans);
    
    setContent(newText);
    setSpans(updatedSpans);
  };

  const handleSelectionChange = (newSelection: { start: number; end: number }) => {
    const isTyping = Date.now() - lastTextChangeTimeRef.current < 200;
    
    if (isTyping) {
      setSelection(newSelection);
      return;
    }

    setSelection(newSelection);
    
    if (newSelection.start === newSelection.end) {
      const pos = newSelection.start;
      
      if (toggledStylesRef.current.position !== pos) {
        toggledStylesRef.current = {
          bold: null,
          italic: null,
          underline: null,
          color: null,
          position: null,
        };
      }
      
      let bold = false;
      let italic = false;
      let underline = false;
      let color: string | null = null;
      
      const checkPos = pos > 0 ? Math.min(pos - 1, content.length - 1) : 0;
      
      for (const span of spans) {
        const isCovered = pos === 0 
          ? (span.start === 0) 
          : (checkPos >= span.start && checkPos < span.end);
          
        if (isCovered) {
          if (span.style === 'bold') bold = true;
          if (span.style === 'italic') italic = true;
          if (span.style === 'underline') underline = true;
          if (span.style === 'color') color = span.value || null;
        }
      }
      
      setIsBoldActive(toggledStylesRef.current.bold !== null ? toggledStylesRef.current.bold : bold);
      setIsItalicActive(toggledStylesRef.current.italic !== null ? toggledStylesRef.current.italic : italic);
      setIsUnderlineActive(toggledStylesRef.current.underline !== null ? toggledStylesRef.current.underline : underline);
      setActiveColor(toggledStylesRef.current.color !== null ? toggledStylesRef.current.color : color);
    } else {
      const checkStyle = (style: string, value?: string) => {
        return spans.some(span => 
          span.style === style && 
          (value === undefined || span.value === value) && 
          !(span.end <= newSelection.start || span.start >= newSelection.end)
        );
      };
      
      setIsBoldActive(checkStyle('bold'));
      setIsItalicActive(checkStyle('italic'));
      setIsUnderlineActive(checkStyle('underline'));
      
      const colorSpan = spans.find(span => span.style === 'color' && !(span.end <= newSelection.start || span.start >= newSelection.end));
      setActiveColor(colorSpan ? colorSpan.value || null : null);
      
      toggledStylesRef.current = {
        bold: null,
        italic: null,
        underline: null,
        color: null,
        position: null,
      };
    }
  };

  const toggleBold = () => {
    toggleStyleForRange('bold');
  };

  const toggleItalic = () => {
    toggleStyleForRange('italic');
  };

  const toggleUnderline = () => {
    toggleStyleForRange('underline');
  };

  const handleLinkPress = () => {
    const start = selection.start;
    const end = selection.end;
    
    if (start !== end) {
      setLinkIsSelected(true);
      setLinkText('');
      setLinkUrl('https://');
      setLinkModalVisible(true);
    } else {
      setLinkIsSelected(false);
      setLinkText('');
      setLinkUrl('https://');
      setLinkModalVisible(true);
    }
  };

  const submitLinkModal = () => {
    if (!linkUrl.trim()) return;
    
    const start = selection.start;
    const end = selection.end;
    
    if (linkIsSelected) {
      toggleStyleForRange('link', linkUrl.trim());
    } else {
      const textToInsert = linkText.trim() || linkUrl.trim();
      const insertStart = start;
      const insertEnd = start + textToInsert.length;
      
      const newContent = content.substring(0, start) + textToInsert + content.substring(end);
      
      let updatedSpans = [...spans];
      const diff = textToInsert.length;
      
      updatedSpans = updatedSpans.map(span => {
        let { start: sStart, end: sEnd } = span;
        if (sStart >= insertStart) {
          sStart += diff;
        }
        if (sEnd >= insertStart) {
          sEnd += diff;
        }
        return { ...span, start: sStart, end: sEnd };
      });
      
      updatedSpans.push({ start: insertStart, end: insertEnd, style: 'link', value: linkUrl.trim() });
      
      setSpans(mergeSpans(updatedSpans));
      setContent(newContent);
      setSelection({ start: insertEnd, end: insertEnd });
    }
    
    setLinkModalVisible(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const selectColor = (color: string) => {
    toggleStyleForRange('color', color);
    setShowColorSelector(false);
  };



  const filteredNotes = notes.filter(note => {
    const matchesFolder = selectedFolderId === null || note.folderId === selectedFolderId;
    const matchesSearch = searchQuery.trim() === '' ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Search size={18} color={colors.outline} />
        <TextInput
          placeholder={t('searchNotesPlaceholder') || 'Search notes...'}
          placeholderTextColor={colors.outline}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBarInput}
          underlineColorAndroid="transparent"
        />
      </View>

      {/* Folders horizontal carousel */}
      <View style={styles.foldersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.foldersScroll}
        >
          {/* All Notes Capsule */}
          <TouchableOpacity
            style={[
              styles.folderCard,
              selectedFolderId === null ? [styles.folderCardActive, { backgroundColor: colors.primary + '1A', borderColor: colors.primary }] : { borderColor: colors.outlineVariant }
            ]}
            onPress={() => setSelectedFolderId(null)}
            activeOpacity={0.8}
          >
            <FolderIcon size={16} color={colors.primary} />
            <Text style={[
              styles.folderCardName,
              selectedFolderId === null && { color: colors.primary }
            ]}>
              {t('allNotes')}
            </Text>
          </TouchableOpacity>

          {/* Custom folders */}
          {folders.map(folder => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <TouchableOpacity
                key={folder.id}
                style={[
                  styles.folderCard,
                  isSelected ? [styles.folderCardActive, { backgroundColor: folder.color + '1A', borderColor: folder.color }] : { borderColor: folder.color }
                ]}
                onPress={() => setSelectedFolderId(folder.id)}
                onLongPress={() => openEditFolder(folder)}
                activeOpacity={0.8}
              >
                <FolderIcon size={16} color={folder.color} />
                <Text style={[
                  styles.folderCardName,
                  isSelected && { color: folder.color }
                ]} numberOfLines={1}>
                  {folder.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* New folder button */}
          <TouchableOpacity
            style={[styles.folderCard, styles.folderCardAdd, { borderColor: colors.outlineVariant }]}
            onPress={openAddFolder}
            activeOpacity={0.8}
          >
            <Plus size={16} color={colors.outline} />
            <Text style={styles.folderCardAddText}>{t('newFolder')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filteredNotes.length === 0 ? (
          <View style={styles.empty}>
            <FileText size={48} color={colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>{t('noNotesYet')}</Text>
          </View>
        ) : (
          filteredNotes.map(note => {
            const folder = folders.find(f => f.id === note.folderId);
            return (
              <TouchableOpacity
                key={note.id}
                onPress={() => openEdit(note)}
                style={[
                  styles.card,
                  { backgroundColor: colors.primary + '10', borderColor: colors.primaryContainer }
                ]}
                activeOpacity={0.85}
              >
                <View style={styles.cardRow}>
                  {(() => {
                    const { title: displayTitle, isPlaceholder } = getNoteDisplayTitle(note.title, note.content, t('untitledNote'));
                    return (
                      <Text
                        style={[
                          styles.cardTitle,
                          isPlaceholder && styles.placeholderTitle
                        ]}
                        numberOfLines={1}
                      >
                        {displayTitle}
                      </Text>
                    );
                  })()}
                  <TouchableOpacity onPress={() => confirmDeleteNote(note.id)} style={styles.delBtn}>
                    <Trash2 size={18} color={colors.outline} />
                  </TouchableOpacity>
                </View>

                {note.content ? (
                  <View style={styles.cardContentContainer}>
                    <Text style={styles.cardContentText} numberOfLines={2} ellipsizeMode="tail">
                      {parseFormattedText(note.content, colors, false)}
                    </Text>
                  </View>
                ) : null}
                
                <View style={styles.cardFooter}>
                  <View style={styles.cardDateTag}>
                    <Calendar size={12} color={colors.onSurfaceVariant} strokeWidth={3} />
                    <Text style={styles.cardDate}>
                      {formatDateString(note.createdAt)}
                    </Text>
                  </View>
                  {folder && (
                    <View style={[styles.noteFolderBadge, { backgroundColor: folder.color + '20', flexShrink: 1, maxWidth: '40%', marginLeft: 8 }]}>
                      <FolderIcon size={12} color={folder.color} />
                      <Text style={[styles.noteFolderBadgeText, { color: folder.color }]} numberOfLines={1} ellipsizeMode="tail">
                        {folder.name}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  {note.content ? (
                    <TouchableOpacity 
                      style={[styles.noteFolderBadge, { backgroundColor: colors.primaryContainer }]}
                      onPress={() => {
                        const { title: displayTitle } = getNoteDisplayTitle(note.title, note.content, t('untitledNote'));
                        openFlashcards(note.id, note.content, displayTitle);
                      }}
                    >
                      <Zap size={12} color={colors.primary} />
                      <Text style={[styles.noteFolderBadgeText, { color: colors.primary }]}>
                        Flashcard
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Editor Modal */}
      <Modal visible={isAdding} animationType="slide" transparent={false} onRequestClose={closeModal}>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <View style={styles.editorContainer}>
              <View style={styles.editorHeader}>
                <TouchableOpacity onPress={closeModal} style={styles.backBtn} activeOpacity={0.7}>
                  <ChevronLeft size={20} color={colors.onSurface} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.editorBody} contentContainerStyle={styles.editorScrollContent} showsVerticalScrollIndicator={false}>

                <View style={{ position: 'relative', minHeight: 400 }}>
                  {/* Background Formatted Text */}
                  <View 
                    pointerEvents="none" 
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      paddingTop: Platform.OS === 'ios' ? 8 : 10,
                      paddingBottom: Platform.OS === 'ios' ? 8 : 10,
                      paddingLeft: Platform.OS === 'ios' ? 4 : 0,
                      paddingRight: Platform.OS === 'ios' ? 4 : 0,
                      zIndex: 1,
                    }}
                  >
                    {content ? (
                      <Text style={{ fontSize: 17, fontFamily: 'Quicksand-Medium', color: colors.onSurface, lineHeight: 26 }}>
                        {parseFormattedText(spansToHtml(content, spans), colors, false, {
                          fontFamily: 'Quicksand-Medium',
                          fontSize: 17,
                          color: colors.onSurface,
                          lineHeight: 26,
                        })}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 17, fontFamily: 'Quicksand-Medium', color: colors.outlineVariant, lineHeight: 26 }}>
                        {t('writeNotePlaceholder')}
                      </Text>
                    )}
                  </View>

                  {/* Foreground Invisible TextInput */}
                  <TextInput
                    ref={inputRef}
                    placeholder=""
                    value={content}
                    onChangeText={handleTextChange}
                    style={[
                      styles.editorInputContent,
                      {
                        color: 'transparent',
                        backgroundColor: 'transparent',
                        zIndex: 2,
                      }
                    ]}
                    multiline
                    scrollEnabled={false}
                    selection={selection}
                    onSelectionChange={(e) => handleSelectionChange(e.nativeEvent.selection)}
                    autoFocus={!isPreSelectingFolder}
                    selectionColor={colors.primary}
                    underlineColorAndroid="transparent"
                  />
                </View>
              </ScrollView>

              {/* Formatting Toolbar */}
              <View style={styles.toolbarContainer}>
                <View style={styles.toolbar}>
                  <TouchableOpacity 
                    onPress={toggleBold} 
                    style={[styles.toolbarBtn, isBoldActive && styles.toolbarBtnActive]}
                  >
                    <Bold size={20} color={isBoldActive ? colors.primary : colors.onSurface} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={toggleItalic} 
                    style={[styles.toolbarBtn, isItalicActive && styles.toolbarBtnActive]}
                  >
                    <Italic size={20} color={isItalicActive ? colors.primary : colors.onSurface} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={toggleUnderline} 
                    style={[styles.toolbarBtn, isUnderlineActive && styles.toolbarBtnActive]}
                  >
                    <Underline size={20} color={isUnderlineActive ? colors.primary : colors.onSurface} />
                  </TouchableOpacity>
                  
                  <View style={styles.toolbarDivider} />

                  <TouchableOpacity 
                    onPress={handleLinkPress} 
                    style={styles.toolbarBtn}
                  >
                    <Link2 size={20} color={colors.onSurface} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setShowColorSelector(!showColorSelector)} 
                    style={[styles.toolbarBtn, showColorSelector && styles.toolbarBtnActive]}
                  >
                    <Palette size={20} color={activeColor ? activeColor : colors.onSurface} />
                  </TouchableOpacity>

                  <View style={styles.toolbarDivider} />

                  <TouchableOpacity 
                    onPress={() => handleAiAction('SUMMARIZE')} 
                    style={[styles.toolbarBtn, { backgroundColor: colors.primaryContainer }]}
                    accessibilityLabel="Tóm tắt ghi chú"
                  >
                    <FileText size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {showColorSelector && (
                  <View style={styles.colorSelectorRow}>
                    {FORMAT_COLORS.map(c => (
                      <TouchableOpacity
                        key={c.name}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c.color },
                          activeColor === c.color && styles.colorCircleActive
                        ]}
                        onPress={() => selectColor(c.color)}
                      />
                    ))}
                    <TouchableOpacity
                      style={[styles.colorCircle, { backgroundColor: colors.onSurface }, !activeColor && styles.colorCircleActive]}
                      onPress={() => selectColor('')}
                    />
                  </View>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>

            {/* Link Insertion Modal */}
            <Modal
              visible={linkModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => {
                setLinkModalVisible(false);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
            >
              <Pressable 
                style={styles.modalOverlay} 
                onPress={() => {
                  setLinkModalVisible(false);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
              >
                <View style={styles.linkDialog} onStartShouldSetResponder={() => true}>
                  <Text style={styles.linkDialogTitle}>{t('insertLink')}</Text>
                  
                  {!linkIsSelected && (
                    <View style={styles.linkDialogInputGroup}>
                      <Text style={styles.linkDialogLabel}>{t('linkText')}</Text>
                      <TextInput
                        style={styles.linkDialogInput}
                        placeholder={t('linkTextPlaceholder')}
                        placeholderTextColor={colors.outlineVariant}
                        value={linkText}
                        onChangeText={setLinkText}
                      />
                    </View>
                  )}
                  
                  <View style={styles.linkDialogInputGroup}>
                    <Text style={styles.linkDialogLabel}>{t('linkUrl')}</Text>
                    <TextInput
                      style={styles.linkDialogInput}
                      placeholder="https://example.com"
                      placeholderTextColor={colors.outlineVariant}
                      value={linkUrl}
                      onChangeText={setLinkUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                  
                  <View style={styles.linkDialogButtons}>
                    <TouchableOpacity 
                      style={[styles.linkDialogBtn, styles.linkDialogBtnCancel]} 
                      onPress={() => {
                        setLinkModalVisible(false);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                    >
                      <Text style={styles.linkDialogBtnTextCancel}>{t('cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.linkDialogBtn, styles.linkDialogBtnConfirm]} 
                      onPress={submitLinkModal}
                    >
                      <Text style={styles.linkDialogBtnTextConfirm}>{t('insert')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Pressable>
            </Modal>

            {/* Pre-folder selection overlay */}
            {isPreSelectingFolder && (
              <Pressable
                style={[StyleSheet.absoluteFillObject, styles.modalOverlay, { zIndex: 999 }]}
                onPress={() => {
                  setNoteFolderId(null);
                  setIsPreSelectingFolder(false);
                  setIsCreatingInline(false);
                }}
              >
                <Pressable onPress={() => {}} style={{ width: '95%', maxWidth: 320 }}>
                  <View style={[styles.folderDialog, { width: '100%' }]}>
                    <Text style={styles.folderDialogTitle}>
                      {isCreatingInline ? t('newFolder') : (t('selectFolder') || 'Select Folder')}
                    </Text>

                    {isCreatingInline ? (
                      <View style={{ gap: 12 }}>
                        {/* Folder Name Input */}
                        <TextInput
                          style={styles.dialogInput}
                          placeholder={t('folderNamePlaceholder')}
                          placeholderTextColor={colors.outlineVariant}
                          value={inlineFolderName}
                          onChangeText={setInlineFolderName}
                          autoFocus={true}
                        />

                        {/* Color Picker Row */}
                        <View style={styles.folderColorContainer}>
                          {FOLDER_COLORS.map(color => (
                            <TouchableOpacity
                              key={color}
                              style={[
                                styles.folderColorDot,
                                { backgroundColor: color },
                                inlineFolderColor === color && styles.folderColorDotActive
                              ]}
                              onPress={() => setInlineFolderColor(color)}
                            >
                              {inlineFolderColor === color && <Check size={14} color="#fff" />}
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Action Buttons for Inline Creation */}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                          <TouchableOpacity
                            style={[styles.dialogBtn, styles.dialogBtnCancel, { flex: 1 }]}
                            onPress={() => {
                              setIsCreatingInline(false);
                              setInlineFolderName('');
                            }}
                          >
                            <Text style={styles.dialogBtnTextCancel}>{t('cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.dialogBtn, styles.dialogBtnConfirm, { flex: 1, backgroundColor: colors.primary }]}
                            onPress={handleSaveInlineFolder}
                            disabled={!inlineFolderName.trim()}
                          >
                            <Text style={styles.dialogBtnTextConfirm}>{t('save')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                        {/* "Create New Folder" Option */}
                        <TouchableOpacity
                          style={styles.preFolderItem}
                          onPress={() => {
                            setInlineFolderName('');
                            setInlineFolderColor(FOLDER_COLORS[0]);
                            setIsCreatingInline(true);
                          }}
                        >
                          <Plus size={18} color={colors.primary} />
                          <Text style={[styles.preFolderItemText, { color: colors.primary }]}>
                            {t('newFolder') || 'New Folder'}
                          </Text>
                        </TouchableOpacity>

                        {/* Custom Folders */}
                        {folders.map(folder => (
                          <TouchableOpacity
                            key={folder.id}
                            style={styles.preFolderItem}
                            onPress={() => {
                              setNoteFolderId(folder.id);
                              setIsPreSelectingFolder(false);
                            }}
                          >
                            <FolderIcon size={18} color={folder.color} />
                            <Text style={styles.preFolderItemText}>{folder.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </Pressable>
              </Pressable>
            )}

            {/* AI Loading Modal */}
            <Modal
              visible={aiLoading}
              transparent={true}
              animationType="fade"
            >
              <View style={styles.aiLoadingOverlay}>
                <View style={styles.aiLoadingCard}>
                  <FileText size={32} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.aiLoadingText}>
                    {aiLoadingMessage || (language === 'vi' ? 'AI đang xử lý...' : 'AI is processing...')}
                  </Text>
                  <Text style={styles.aiLoadingSubtext}>
                    {language === 'vi' ? 'Vui lòng đợi trong giây lát' : 'Please wait a moment...'}
                  </Text>
                </View>
              </View>
            </Modal>

            {/* AI Result Preview Modal */}
            <Modal
              visible={aiResultModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setAiResultModalVisible(false)}
            >
              <View style={styles.aiResultOverlay}>
                <View style={styles.aiResultCard}>
                  <View style={styles.aiResultHeader}>
                    <FileText size={22} color={colors.primary} />
                    <Text style={styles.aiResultTitle}>
                      {language === 'vi' ? 'Bản tóm tắt từ AI' : 'AI Summary'}
                    </Text>
                    <TouchableOpacity onPress={() => setAiResultModalVisible(false)}>
                      <X size={20} color={colors.outline} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.aiResultScroll} showsVerticalScrollIndicator={true}>
                    <Text style={{ fontFamily: 'Quicksand-Medium', fontSize: 15, color: colors.onSurface, lineHeight: 22 }}>
                      {parseFormattedText(aiResult, colors, false, {
                        fontFamily: 'Quicksand-Medium',
                        fontSize: 15,
                        color: colors.onSurface,
                        lineHeight: 22,
                      })}
                    </Text>
                  </ScrollView>

                  <View style={styles.aiResultActions}>
                    <TouchableOpacity 
                      style={[styles.aiResultBtn, styles.aiResultBtnReplace]} 
                      onPress={() => {
                        const { plainText, spans: parsedSpans } = htmlToSpans(aiResult);
                        setContent(plainText);
                        setSpans(parsedSpans);
                        setAiResultModalVisible(false);
                      }}
                    >
                      <Text style={styles.aiResultBtnTextReplace}>
                        {language === 'vi' ? 'Thay thế tất cả' : 'Replace all'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.aiResultBtn, styles.aiResultBtnAppend]} 
                      onPress={() => {
                        const divider = content.trim() ? '\n\n' : '';
                        const { plainText, spans: parsedSpans } = htmlToSpans(aiResult);
                        
                        const shiftOffset = content.length + divider.length;
                        const shiftedSpans = parsedSpans.map(span => ({
                          ...span,
                          start: span.start + shiftOffset,
                          end: span.end + shiftOffset,
                        }));
                        
                        setContent(content + divider + plainText);
                        setSpans(mergeSpans([...spans, ...shiftedSpans]));
                        setAiResultModalVisible(false);
                      }}
                    >
                      <Text style={styles.aiResultBtnTextAppend}>
                        {language === 'vi' ? 'Chèn vào cuối' : 'Insert at end'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {/* Flashcard List Modal */}
      <Modal
        visible={!!flashcardNoteId}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setFlashcardNoteId(null)}
      >
        {flashcardNoteId && (
          <FlashcardListScreen 
            noteId={flashcardNoteId}
            noteContent={flashcardNoteContent}
            noteTitle={flashcardNoteTitle}
            onClose={() => setFlashcardNoteId(null)}
          />
        )}
      </Modal>

      {/* Folder Create/Edit Dialog Modal */}
      <Modal
        visible={folderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeFolderModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeFolderModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={styles.folderDialog} onStartShouldSetResponder={() => true}>
              <Text style={styles.folderDialogTitle}>
                {editingFolderId ? t('editFolder') : t('newFolder')}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.dialogLabel}>{t('folderNamePlaceholder')}</Text>
                <TextInput
                  style={styles.dialogInput}
                  placeholder={t('folderNamePlaceholder')}
                  placeholderTextColor={colors.outlineVariant}
                  value={folderName}
                  onChangeText={setFolderName}
                  autoFocus={true}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.dialogLabel}>{t('folderColor')}</Text>
                <View style={styles.folderColorContainer}>
                  {FOLDER_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.folderColorDot,
                        { backgroundColor: color },
                        folderColor === color && styles.folderColorDotActive
                      ]}
                      onPress={() => setFolderColor(color)}
                    >
                      {folderColor === color && <Check size={14} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.folderDialogButtons}>
                {editingFolderId && (
                  <TouchableOpacity
                    style={[styles.dialogBtn, styles.dialogBtnDelete]}
                    onPress={handleDeleteFolder}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={16} color="#fff" />
                  </TouchableOpacity>
                )}

                <View style={{ flex: 1 }} />

                <TouchableOpacity
                  style={[styles.dialogBtn, styles.dialogBtnCancel]}
                  onPress={closeFolderModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dialogBtnTextCancel}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dialogBtn,
                    styles.dialogBtnConfirm,
                    { backgroundColor: colors.primaryContainer, opacity: folderName.trim() ? 1 : 0.5 }
                  ]}
                  onPress={handleSaveFolder}
                  disabled={!folderName.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dialogBtnTextConfirm}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        onPress={openAdd}
        style={[styles.fab, { backgroundColor: colors.primaryContainer }]}
        activeOpacity={0.85}
      >
        <Plus size={28} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderBottomWidth: 5,
    borderBottomColor: colors.primary + '33',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginBottom: 16,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
    padding: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 28,
    color: colors.onSurface,
  },
  count: {
    fontFamily: 'Quicksand-Medium',
    color: colors.onSurfaceVariant,
  },
  addBtn: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  list: {
    paddingBottom: 160,
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 8,
    color: colors.onSurfaceVariant,
  },
  card: {
    borderRadius: 24,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  placeholderTitle: {
    fontFamily: 'Quicksand-Medium',
    fontStyle: 'italic',
    color: colors.outline,
  },
  delBtn: {
    padding: 4,
  },
  cardContentContainer: {
    marginTop: 2,
    width: '100%',
  },
  cardContentText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    opacity: 0.8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardDateTag: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDate: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  editorTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 22,
    color: colors.onSurface,
    textAlign: 'center',
  },
  editorRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editorSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    backgroundColor: colors.primary,
    borderRadius: 100,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editorSaveBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
    shadowOpacity: 0,
    elevation: 0,
    borderColor: 'transparent',
    opacity: 0.5,
  },
  editorSaveText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  editorBody: {
    flex: 1,
    paddingHorizontal: 0,
  },
  editorScrollContent: {
    paddingBottom: 40,
  },
  editorInputTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 28,
    color: colors.onSurface,
    paddingVertical: 14,
    marginBottom: 4,
  },
  editorDivider: {
    height: 1.5,
    backgroundColor: colors.outlineVariant,
    opacity: 0.4,
    marginHorizontal: -24,
    marginBottom: 20,
  },
  editorInputContent: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 17,
    color: colors.onSurface,
    paddingTop: Platform.OS === 'ios' ? 8 : 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 10,
    paddingLeft: Platform.OS === 'ios' ? 4 : 0,
    paddingRight: Platform.OS === 'ios' ? 4 : 0,
    minHeight: 400,
    textAlignVertical: 'top',
    lineHeight: 26,
  },
  toolbarContainer: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 24,
    padding: 8,
    marginHorizontal: 8,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  toolbarBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarBtnActive: {
    backgroundColor: colors.primary + '1A',
  },
  toolbarDivider: {
    width: 1.5,
    height: 18,
    backgroundColor: colors.outlineVariant,
    opacity: 0.6,
    marginHorizontal: 2,
  },
  colorSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    marginTop: 6,
    opacity: 0.9,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  colorCircleActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  linkDialog: {
    width: '90%',
    maxWidth: 320,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  linkDialogTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    color: colors.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  linkDialogInputGroup: {
    marginBottom: 12,
  },
  linkDialogLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  linkDialogInput: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  linkDialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  linkDialogBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkDialogBtnCancel: {
    backgroundColor: colors.surfaceVariant,
  },
  linkDialogBtnConfirm: {
    backgroundColor: colors.primary,
  },
  linkDialogBtnTextCancel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  linkDialogBtnTextConfirm: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: '#fff',
  },

  // Folder UI Elements
  foldersSection: {
    marginBottom: 16,
  },
  foldersScroll: {
    gap: 10,
    paddingRight: 24,
    paddingVertical: 4,
  },
  folderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folderCardActive: {
    borderWidth: 1.5,
  },
  folderCardName: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  folderCardAdd: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  folderCardAddText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.outline,
  },

  // Folder Dialog/Modal Elements
  folderDialog: {
    width: '95%',
    maxWidth: 320,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  folderDialogTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    color: colors.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  dialogLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  dialogInput: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  folderColorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  folderColorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  folderColorDotActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  folderDialogButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  dialogBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnCancel: {
    backgroundColor: colors.surfaceVariant,
  },
  dialogBtnConfirm: {
    backgroundColor: colors.primaryContainer,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderBottomWidth: 4,
    borderBottomColor: colors.primary + '33',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  dialogBtnDelete: {
    backgroundColor: colors.error,
  },
  dialogBtnTextCancel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  dialogBtnTextConfirm: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.primary,
  },

  // Editor selectors
  editorFolderSection: {
    marginBottom: 20,
  },
  editorFolderLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    opacity: 0.8,
  },
  editorFolderScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  editorFolderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  editorFolderChipActive: {
    borderWidth: 1.5,
  },
  editorFolderChipText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.outline,
  },
  editorFolderChipTextActive: {
    fontFamily: 'Quicksand-Bold',
    color: colors.primary,
  },

  preFolderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  preFolderItemText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },

  noteFolderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
  },
  noteFolderBadgeText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 11,
  },

  // AI Styles
  aiMenuDialog: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  aiMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: 12,
  },
  aiMenuTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.onSurface,
    flex: 1,
    marginLeft: 8,
  },
  aiOptionsList: {
    gap: 12,
    marginBottom: 16,
  },
  aiOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: colors.outlineVariant,
  },
  aiOptionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  aiOptionTextContainer: {
    flex: 1,
  },
  aiOptionName: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 2,
  },
  aiOptionDesc: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    opacity: 0.8,
  },
  aiPromptContainer: {
    marginBottom: 12,
  },
  aiPromptLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: 10,
  },
  aiPromptInput: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: 16,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  aiPromptButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  aiPromptBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPromptBtnCancel: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  aiPromptBtnSubmit: {
    backgroundColor: colors.primaryContainer,
  },
  aiPromptBtnTextCancel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  aiPromptBtnTextSubmit: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.primary,
  },
  aiLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLoadingCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  aiLoadingText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
    marginTop: 16,
    marginBottom: 6,
  },
  aiLoadingSubtext: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    opacity: 0.7,
  },
  aiResultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  aiResultCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '88%',
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: 12,
  },
  aiResultTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.onSurface,
    flex: 1,
    marginLeft: 8,
  },
  aiResultScroll: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: colors.outlineVariant,
    padding: 16,
    maxHeight: 480,
    marginBottom: 20,
  },
  aiResultText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
    lineHeight: 22,
  },
  aiResultActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  aiResultBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiResultBtnReplace: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
  },
  aiResultBtnAppend: {
    backgroundColor: colors.primaryContainer,
  },
  aiResultBtnTextReplace: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  aiResultBtnTextAppend: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.primary,
  },
  aiResultBtnClose: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  aiResultBtnTextClose: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.outline,
  },
}));
