import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { createThemedStyles } from '../theme';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';
import { generateTaskFromPrompt } from '../services/geminiService';
import { useAuthStore } from '../stores/authStore';

interface AddAITaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    taskData:
      | { title: string; date: string; time: string; content: string; type: string }
      | Array<{ title: string; date: string; time: string; content: string; type: string }>
  ) => void;
  initialDate?: string;
}

const TASK_TYPES = ['Personal', 'Work', 'Study', 'Health'];

export function AddAITaskModal({ isOpen, onClose, onAdd, initialDate }: AddAITaskModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useStyles(colors);

  const accessToken = useAuthStore((s) => s.accessToken);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAiPrompt('');
      setAiErrorMessage(null);
    }
  }, [isOpen]);

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setAiErrorMessage(null);

    try {
      const generatedList = await generateTaskFromPrompt(aiPrompt, initialDate || '', accessToken || '');
      
      if (!generatedList || generatedList.length === 0) {
        throw new Error(t('aiError'));
      }

      const tasksToAdd = generatedList.map((generated) => {
        const matchedType = TASK_TYPES.find(
          (t) => t.toLowerCase() === (generated.type || 'Personal').toLowerCase()
        ) || 'Personal';

        return {
          title: generated.title || 'AI Task',
          content: generated.content || '',
          date: generated.date || initialDate || '',
          time: generated.time || '',
          type: matchedType,
        };
      });

      onAdd(tasksToAdd);

      setAiPrompt('');
      onClose();
    } catch (e: any) {
      console.error('Failed to generate task with AI:', e);
      setAiErrorMessage(e.message || t('aiError'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centeredView} pointerEvents="box-none">
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.modalTitle}>{t('createWithAI')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.outline} strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <View style={styles.aiCard}>
            <TextInput
              value={aiPrompt}
              onChangeText={(text) => {
                setAiPrompt(text);
                setAiErrorMessage(null);
              }}
              placeholder={t('aiPromptPlaceholder')}
              placeholderTextColor={colors.outlineVariant}
              style={styles.aiTextarea}
              multiline
              numberOfLines={4}
              editable={!isGenerating}
            />
            
            <TouchableOpacity
              style={[styles.aiSubmitBtn, (isGenerating || !aiPrompt.trim()) && styles.aiSubmitBtnDisabled]}
              onPress={handleGenerateWithAI}
              disabled={isGenerating || !aiPrompt.trim()}
              activeOpacity={0.8}
            >
              {isGenerating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.aiSubmitBtnText}>{t('aiGenerating')}</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#ffffff" strokeWidth={2.5} />
                  <Text style={styles.aiSubmitBtnText}>{t('createWithAI')}</Text>
                </View>
              )}
            </TouchableOpacity>

            {aiErrorMessage && (
              <Text style={styles.aiErrorText}>{aiErrorMessage}</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = createThemedStyles((colors) => ({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 28, 23, 0.4)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 36,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 24,
    color: colors.onSurface,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 100,
  },
  label: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
    marginLeft: 8,
  },
  aiCard: {
    backgroundColor: colors.primary + '0D',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.primary + '1F',
  },
  aiTextarea: {
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  aiSubmitBtn: {
    height: 52,
    borderRadius: 100,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  aiSubmitBtnDisabled: {
    opacity: 0.6,
  },
  aiSubmitBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  aiErrorText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.error,
    marginTop: 10,
    textAlign: 'center',
  },
}));
