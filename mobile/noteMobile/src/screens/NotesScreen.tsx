import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, X, FileText, ChevronLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link2, Palette, Check } from 'lucide-react-native';
import { theme, createThemedStyles } from '../theme';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { TopBar } from '../components/TopBar';

interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: number;
}

const FORMAT_COLORS = [
  { name: 'Red', color: '#E53935' },
  { name: 'Blue', color: '#1E88E5' },
  { name: 'Green', color: '#43A047' },
  { name: 'Yellow', color: '#FDD835' },
  { name: 'Purple', color: '#8E24AA' },
  { name: 'Orange', color: '#F4511E' },
  { name: 'Dark', color: '#2C3E50' },
];

function parseFormattedText(
  text: string, 
  colors: any, 
  isClickable = true,
  baseStyle?: any,
  ignoreAlign = false
): React.ReactNode[] {
  if (!text) return [];

  const tagRegex = /(<\/?b>|<\/?i>|<\/?u>|<\/?color=#[0-9a-fA-F]{6}>|<\/?color>|<\/?link=[^>]+>|<\/?link>|<\/?align=[^>]+>|<\/?align>)/g;
  const parts = text.split(tagRegex);
  
  const result: React.ReactNode[] = [];
  const defaultBaseStyle = {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  };
  
  const stylesStack: any[] = [baseStyle || defaultBaseStyle];
  let currentAlign: string | null = null;
  let currentLinkUrl: string | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part === '<b>') {
      stylesStack.push({ fontFamily: 'Quicksand-Bold' });
    } else if (part === '</b>') {
      stylesStack.pop();
    } else if (part === '<i>') {
      stylesStack.push({ fontStyle: 'italic' });
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
    } else if (part.startsWith('<align=')) {
      const alignMatch = part.match(/<align=(left|center|right|justify)>/);
      currentAlign = ignoreAlign ? null : (alignMatch ? alignMatch[1] : 'left');
    } else if (part === '</align>') {
      currentAlign = null;
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

      if (currentAlign) {
        result.push(
          <View key={`align-${i}`} style={{ width: '100%', alignItems: currentAlign === 'left' ? 'flex-start' : currentAlign === 'center' ? 'center' : currentAlign === 'right' ? 'flex-end' : 'stretch' }}>
            <Text style={{ textAlign: currentAlign as any, fontFamily: combinedStyle.fontFamily, color: combinedStyle.color }}>
              {textNode}
            </Text>
          </View>
        );
      } else {
        result.push(textNode);
      }
    }
  }

  return result;
}

function htmlToSpans(html: string) {
  let plainText = '';
  const spans: { start: number; end: number; style: string; value?: string }[] = [];
  
  if (!html) return { plainText, spans };
  
  const tagRegex = /(<\/?b>|<\/?i>|<\/?u>|<\/?color=#[0-9a-fA-F]{6}>|<\/?color>|<\/?link=[^>]+>|<\/?link>|<\/?align=[^>]+>|<\/?align>)/g;
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
    } else if (part.startsWith('<align=')) {
      const alignMatch = part.match(/<align=(left|center|right|justify)>/);
      const align = alignMatch ? alignMatch[1] : 'left';
      activeSpans.push({ style: 'align', start: plainText.length, value: align });
    } else if (part === '</align>') {
      const idx = activeSpans.findIndex(s => s.style === 'align');
      if (idx !== -1) {
        const s = activeSpans.splice(idx, 1)[0];
        spans.push({ start: s.start, end: plainText.length, style: 'align', value: s.value });
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
    } else if (span.style === 'align') {
      openTag = `<align=${span.value}>`;
      closeTag = '</align>';
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

interface NotesScreenProps {
  avatarUrl?: any;
}

export function NotesScreen({ avatarUrl }: NotesScreenProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useStyles(colors);
  const inputRef = useRef<TextInput>(null);

  const [notes, setNotes] = useState<NoteItem[]>([
    { id: '1', title: 'Ideas', content: 'Brainstorming session for the new app...', date: Date.now() },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
  const [activeAlign, setActiveAlign] = useState<string | null>(null);

  // Link Dialog states
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkIsSelected, setLinkIsSelected] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setSpans([]);
    setIsEditing(true); // Start in edit mode for new notes
    setShowColorSelector(false);
    setSelection({ start: 0, end: 0 });

    // Reset formatting toggles
    setIsBoldActive(false);
    setIsItalicActive(false);
    setIsUnderlineActive(false);
    setActiveColor(null);
    setActiveAlign(null);

    // Reset link dialog states
    setLinkModalVisible(false);
    setLinkUrl('');
    setLinkText('');
    setLinkIsSelected(false);

    setIsAdding(true);
  };

  const openEdit = (note: NoteItem) => {
    setEditingId(note.id);
    setTitle(note.title === 'Untitled' || note.title === 'Chưa đặt tên' || note.title === t('untitledNote') ? '' : note.title);
    
    // Parse HTML back to plainText and spans
    const parsed = htmlToSpans(note.content);
    setContent(parsed.plainText);
    setSpans(parsed.spans);
    
    setIsEditing(true); // Always start in edit mode
    setShowColorSelector(false);
    setSelection({ start: 0, end: 0 });

    // Reset formatting toggles
    setIsBoldActive(false);
    setIsItalicActive(false);
    setIsUnderlineActive(false);
    setActiveColor(null);
    setActiveAlign(null);

    // Reset link dialog states
    setLinkModalVisible(false);
    setLinkUrl('');
    setLinkText('');
    setLinkIsSelected(false);

    setIsAdding(true);
  };

  const closeModal = () => {
    setIsAdding(false);
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
      setActiveAlign(null);
      setLinkModalVisible(false);
      setLinkUrl('');
      setLinkText('');
      setLinkIsSelected(false);
    }, 150);
  };

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return;
    
    // Convert plainText & spans back to HTML string
    const htmlContent = spansToHtml(content, spans);
    
    if (editingId) {
      setNotes(notes.map(n => n.id === editingId ? { ...n, title: title.trim() || t('untitledNote'), content: htmlContent, date: Date.now() } : n));
    } else {
      const n: NoteItem = { id: Date.now().toString(), title: title.trim() || t('untitledNote'), content: htmlContent, date: Date.now() };
      setNotes([n, ...notes]);
    }
    closeModal();
  };

  const toggleStyleForRange = (style: string, value?: string) => {
    const start = selection.start;
    const end = selection.end;
    
    if (start === end) {
      if (style === 'bold') setIsBoldActive(!isBoldActive);
      else if (style === 'italic') setIsItalicActive(!isItalicActive);
      else if (style === 'underline') setIsUnderlineActive(!isUnderlineActive);
      else if (style === 'color') {
        if (activeColor === value) setActiveColor(null);
        else setActiveColor(value || null);
      } else if (style === 'align') {
        if (activeAlign === value) setActiveAlign(null);
        else setActiveAlign(value || null);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    // Check if the style is already fully active across the selected range
    const isCurrentlyActive = spans.some(span => 
      span.style === style && 
      (value === undefined || span.value === value) && 
      span.start <= start && span.end >= end
    );

    // Step 1: Remove the style from the selection range in all cases (to split/truncate overlaps)
    let updatedSpans: any[] = [];
    for (const span of spans) {
      if (span.style === style && (value === undefined || span.value === value)) {
        // Case 1: Span is completely inside selection -> remove it
        if (span.start >= start && span.end <= end) {
          continue;
        }
        // Case 2: Span completely covers selection -> split it
        if (span.start < start && span.end > end) {
          updatedSpans.push({ ...span, end: start });
          updatedSpans.push({ ...span, start: end });
          continue;
        }
        // Case 3: Span overlaps the start -> truncate end to start
        if (span.start < start && span.end > start && span.end <= end) {
          updatedSpans.push({ ...span, end: start });
          continue;
        }
        // Case 4: Span overlaps the end -> shift start to end
        if (span.start >= start && span.start < end && span.end > end) {
          updatedSpans.push({ ...span, start: end });
          continue;
        }
      }
      updatedSpans.push(span);
    }

    // Step 2: If the style was NOT fully active, we add the new span covering the range
    if (!isCurrentlyActive) {
      updatedSpans.push({ start, end, style, value });
    }

    setSpans(mergeSpans(updatedSpans));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleTextChange = (newText: string) => {
    const oldText = content;
    const diff = newText.length - oldText.length;
    const pos = selection.start;
    
    let updatedSpans = [...spans];
    
    if (diff > 0) {
      // Characters inserted
      const startPos = pos - diff;
      updatedSpans = updatedSpans.map(span => {
        let { start, end } = span;
        if (start >= startPos) {
          start += diff;
        }
        if (end >= startPos) {
          end += diff;
        }
        return { ...span, start, end };
      });
      
      // If formatting toggles are active, we expand or insert a new span for the typed text
      if (isBoldActive) {
        updatedSpans.push({ start: startPos, end: pos, style: 'bold' });
      }
      if (isItalicActive) {
        updatedSpans.push({ start: startPos, end: pos, style: 'italic' });
      }
      if (isUnderlineActive) {
        updatedSpans.push({ start: startPos, end: pos, style: 'underline' });
      }
      if (activeColor) {
        updatedSpans.push({ start: startPos, end: pos, style: 'color', value: activeColor });
      }
      if (activeAlign) {
        updatedSpans.push({ start: startPos, end: pos, style: 'align', value: activeAlign });
      }
    } else if (diff < 0) {
      // Characters deleted
      const startPos = pos;
      const deleteLen = -diff;
      updatedSpans = updatedSpans.map(span => {
        let { start, end } = span;
        if (start >= startPos + deleteLen) {
          start -= deleteLen;
        } else if (start > startPos) {
          start = startPos;
        }
        
        if (end >= startPos + deleteLen) {
          end -= deleteLen;
        } else if (end > startPos) {
          end = startPos;
        }
        return { ...span, start, end };
      }).filter(span => span.start < span.end);
    }
    
    updatedSpans = mergeSpans(updatedSpans);
    
    setContent(newText);
    setSpans(updatedSpans);
  };

  const handleSelectionChange = (newSelection: { start: number; end: number }) => {
    setSelection(newSelection);
    
    if (newSelection.start === newSelection.end) {
      const pos = newSelection.start;
      
      let bold = false;
      let italic = false;
      let underline = false;
      let color: string | null = null;
      let align: string | null = null;
      
      for (const span of spans) {
        if (pos > span.start && pos <= span.end) {
          if (span.style === 'bold') bold = true;
          if (span.style === 'italic') italic = true;
          if (span.style === 'underline') underline = true;
          if (span.style === 'color') color = span.value || null;
          if (span.style === 'align') align = span.value || null;
        }
      }
      
      setIsBoldActive(bold);
      setIsItalicActive(italic);
      setIsUnderlineActive(underline);
      setActiveColor(color);
      setActiveAlign(align);
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
      
      const alignSpan = spans.find(span => span.style === 'align' && !(span.end <= newSelection.start || span.start >= newSelection.end));
      setActiveAlign(alignSpan ? alignSpan.value || null : null);
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

  const toggleAlign = (align: string) => {
    toggleStyleForRange('align', align);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{t('notesTitle')}</Text>
          <Text style={styles.count}>{t('notesSaved', { count: String(notes.length) })}</Text>
        </View>

        <TouchableOpacity onPress={openAdd} style={styles.addBtn} activeOpacity={0.8}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {notes.length === 0 ? (
          <View style={styles.empty}>
            <FileText size={48} color={colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>{t('noNotesYet')}</Text>
          </View>
        ) : (
          notes.map(note => (
            <TouchableOpacity key={note.id} onPress={() => openEdit(note)} style={styles.card} activeOpacity={0.85}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{note.title === 'Untitled' || note.title === 'Chưa đặt tên' ? t('untitledNote') : note.title}</Text>
                <TouchableOpacity onPress={() => setNotes(notes.filter(n => n.id !== note.id))} style={styles.delBtn}>
                  <Trash2 size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              {note.content ? (
                <View style={styles.cardContentContainer}>
                  {parseFormattedText(note.content, colors, false)}
                </View>
              ) : null}
              <Text style={styles.cardDate}>{new Date(note.date).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={isAdding} animationType="slide" transparent={false} onRequestClose={closeModal}>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={styles.editorContainer}>
          {/* Header */}
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={24} color={colors.onSurface} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.editorTitle}>{editingId ? t('editNote') : t('newNote')}</Text>
            
            <View style={styles.editorRightActions}>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.editorSaveBtn, (!title.trim() && !content.trim()) && styles.editorSaveBtnDisabled]}
                disabled={!title.trim() && !content.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.editorSaveText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>



          {/* Body (Live Auto-Preview or TextInput) */}
          {!isEditing ? (
            <ScrollView style={styles.editorBody} contentContainerStyle={styles.editorScrollContent} showsVerticalScrollIndicator={false}>
              <TouchableOpacity onPress={() => setIsEditing(true)} activeOpacity={1}>
                <Text style={styles.previewInputTitle}>{title.trim() || t('untitledNote')}</Text>
                <View style={styles.editorDivider} />
                <View style={styles.previewContentContainer}>
                  {parseFormattedText(spansToHtml(content, spans), colors, true)}
                </View>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView style={styles.editorBody} contentContainerStyle={styles.editorScrollContent} showsVerticalScrollIndicator={false}>
              <TextInput
                placeholder={t('noteTitlePlaceholder')}
                value={title}
                onChangeText={setTitle}
                style={styles.editorInputTitle}
                placeholderTextColor={colors.outlineVariant}
                underlineColorAndroid="transparent"
              />
              <View style={styles.editorDivider} />
              <View style={{ position: 'relative', minHeight: 400 }}>
                {/* Background Formatted Text */}
                <View 
                  pointerEvents="none" 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    paddingVertical: 8, 
                    paddingHorizontal: 0,
                    zIndex: 1,
                  }}
                >
                  {content ? (
                    <Text style={{ fontSize: 18, fontFamily: 'Quicksand-Medium', color: colors.onSurface, lineHeight: 24 }}>
                      {parseFormattedText(spansToHtml(content, spans), colors, false, {
                        fontFamily: 'Quicksand-Medium',
                        fontSize: 18,
                        color: colors.onSurface,
                        lineHeight: 24,
                      }, true)}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 18, fontFamily: 'Quicksand-Medium', color: colors.outlineVariant, lineHeight: 24 }}>
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
                  autoFocus={true}
                  selectionColor={colors.primary}
                  underlineColorAndroid="transparent"
                />
              </View>
            </ScrollView>
          )}

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
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  delBtn: {
    padding: 8,
  },
  cardDate: {
    marginTop: 10,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  cardContentContainer: {
    marginTop: 8,
    width: '100%',
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 100,
    marginTop: 4,
  },
  editorTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    color: colors.onSurface,
  },
  editorRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doneBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 100,
  },
  editBtnTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 100,
  },
  editBtnTabText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  previewBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 100,
  },
  editorSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: colors.primaryContainer,
    borderRadius: 100,
  },
  editorSaveBtnDisabled: {
    opacity: 0.5,
  },
  editorSaveText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.primary,
  },
  editorBody: {
    flex: 1,
    paddingHorizontal: 24,
  },
  editorScrollContent: {
    paddingBottom: 40,
  },
  editorInputTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 24,
    color: colors.onSurface,
    paddingVertical: 12,
    marginBottom: 8,
  },
  editorDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: -40,
    marginBottom: 16,
  },
  editorInputContent: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 18,
    color: colors.onSurface,
    paddingVertical: 8,
    paddingHorizontal: 0,
    minHeight: 400,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  previewInputTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 26,
    color: colors.onSurface,
    paddingVertical: 12,
    marginBottom: 8,
  },
  previewContentContainer: {
    paddingVertical: 8,
    width: '100%',
  },
  editorFlex: {
    flex: 1,
  },
  toolbarContainer: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 8,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  toolbarBtn: {
    padding: 8,
    borderRadius: 12,
  },
  toolbarBtnActive: {
    backgroundColor: colors.surfaceVariant,
  },
  toolbarDivider: {
    width: 2,
    height: 20,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: 4,
  },
  colorSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    marginTop: 4,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorCircleActive: {
    borderColor: colors.primary,
    borderWidth: 2,
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
}));
