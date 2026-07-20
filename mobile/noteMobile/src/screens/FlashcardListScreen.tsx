import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Play, ChevronDown, ChevronUp, Zap, RefreshCw, Save } from 'lucide-react-native';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { useAuthStore } from '../stores/authStore';
import { Flashcard, generateFlashcards, getFlashcardsByNoteId } from '../services/aiFlashcardClient';
import { createDeck, addFlashcardToDeck } from '../services/flashcardClient';
import { FlashcardStudyScreen } from './FlashcardStudyScreen';

interface FlashcardListScreenProps {
  noteId: string;
  noteContent: string;
  noteTitle?: string;
  onClose: () => void;
}

export function FlashcardListScreen({ noteId, noteContent, noteTitle, onClose }: FlashcardListScreenProps) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<'checking' | 'generating'>('checking');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [isStudyMode, setIsStudyMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const fetchFlashcards = async (forceRegenerate = false) => {
    if (!accessToken) return;
    setIsLoading(true);
    setLoadingState(forceRegenerate ? 'generating' : 'checking');
    try {
      // Strip html tags from note content for API if needed, but the backend can probably handle it
      const cleanContent = noteContent.replace(/<[^>]*>?/gm, '');

      if (!forceRegenerate) {
        const cached = await getFlashcardsByNoteId(accessToken, noteId);
        if (cached && cached.length > 0) {
          setFlashcards(cached);
          setIsLoading(false);
          return;
        }
      }

      setLoadingState('generating');
      const generated = await generateFlashcards(accessToken, cleanContent, noteId, language);
      setFlashcards(generated);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      Alert.alert('Lỗi', 'Không thể tạo flashcard từ ghi chú này. Hãy thử lại sau.');
      if (!forceRegenerate) {
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDeck = async () => {
    if (!accessToken || flashcards.length === 0) return;
    setIsSaving(true);
    try {
      // 1. Create a deck
      const deckTitle = noteTitle ? `Flashcards from: ${noteTitle}` : 'Untitled Flashcard Deck';
      const deck = await createDeck(accessToken, deckTitle, noteId);
      
      // 2. Add all flashcards to the deck
      for (const card of flashcards) {
        await addFlashcardToDeck(accessToken, deck._id, card);
      }
      
      setIsSaved(true);
      Alert.alert(language === 'en' ? 'Success' : 'Thành công', language === 'en' ? 'Flashcard deck saved successfully!' : 'Đã lưu bộ thẻ thành công!');
    } catch (error) {
      console.error('Error saving deck:', error);
      Alert.alert(language === 'en' ? 'Error' : 'Lỗi', language === 'en' ? 'Failed to save flashcard deck' : 'Không thể lưu bộ thẻ');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, [noteId, noteContent, accessToken]);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}>
          <X size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]} numberOfLines={1}>
          {t('flashcardTitle')}
        </Text>
        <TouchableOpacity
          onPress={() => fetchFlashcards(true)}
          style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}
        >
          <RefreshCw size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
            {loadingState === 'checking'
              ? t('flashcardChecking')
              : t('flashcardGenerating')}
          </Text>
        </View>
      ) : flashcards.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
            {t('flashcardNotFound')}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.listSubtitle, { color: colors.onSurfaceVariant }]}>
              {t('flashcardCreated', { count: flashcards.length.toString() })}
            </Text>

            {flashcards.map((card, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <View
                  key={index}
                  style={[
                    styles.cardItem,
                    {
                      backgroundColor: colors.surfaceContainerLowest,
                      borderColor: colors.outlineVariant
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleExpand(index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardQuestionContainer}>
                      <View style={styles.questionNumberWrapper}>
                        <Text style={[styles.cardNumber, { color: colors.primary }]}>Q{index + 1}</Text>
                        {card.difficulty && (
                          <View style={[
                            styles.difficultyBadge,
                            {
                              backgroundColor:
                                card.difficulty === 'HARD' ? colors.errorContainer :
                                  card.difficulty === 'EASY' ? colors.primaryContainer :
                                    colors.tertiaryContainer
                            }
                          ]}>
                            <Text style={[
                              styles.difficultyText,
                              {
                                color:
                                  card.difficulty === 'HARD' ? colors.onErrorContainer :
                                    card.difficulty === 'EASY' ? colors.onPrimaryContainer :
                                      colors.onTertiaryContainer
                              }
                            ]}>
                              {card.difficulty === 'HARD' ? t('flashcardDiffHard') : card.difficulty === 'EASY' ? t('flashcardDiffEasy') : t('flashcardDiffMedium')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.cardQuestion, { color: colors.onSurface }]}>
                        {card.question}
                      </Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={20} color={colors.outline} />
                    ) : (
                      <ChevronDown size={20} color={colors.outline} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.cardAnswerContainer, { borderTopColor: colors.surfaceVariant }]}>
                      {card.options && card.options.length > 0 && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={[styles.cardAnswerLabel, { color: colors.tertiary }]}>{language === 'en' ? 'Options:' : 'Các lựa chọn:'}</Text>
                          {card.options.map((opt, idx) => (
                            <Text key={idx} style={[styles.cardAnswer, { color: colors.onSurfaceVariant }]}>
                              {opt}
                            </Text>
                          ))}
                        </View>
                      )}
                      
                      <Text style={[styles.cardAnswerLabel, { color: colors.tertiary }]}>{t('flashcardAnswerLabel')}</Text>
                      <Text style={[styles.cardAnswer, { color: colors.onSurfaceVariant }]}>
                        {card.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Save Deck Floating Button (Above Study Button) */}
          {!isSaved && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                styles.saveFab,
                { backgroundColor: colors.secondaryContainer }
              ]}
              onPress={handleSaveDeck}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.onSecondaryContainer} />
              ) : (
                <Save size={28} color={colors.onSecondaryContainer} />
              )}
            </TouchableOpacity>
          )}

          {/* Floating Action Button for Study Mode */}
          <View style={styles.fabContainer}>
            <TouchableOpacity
              style={[
                styles.studyButton,
                { backgroundColor: colors.primaryContainer, flex: 1 }
              ]}
              onPress={() => setIsStudyMode(true)}
              activeOpacity={0.8}
            >
              <Zap size={24} color={colors.onPrimaryContainer} style={{ marginRight: 10 }} />
              <Text style={[styles.studyButtonText, { color: colors.onPrimaryContainer, fontSize: 16 }]}>
                {t('flashcardStartStudy')}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Study Mode Modal */}
      <Modal
        visible={isStudyMode}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setIsStudyMode(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <FlashcardStudyScreen
            flashcards={flashcards}
            noteTitle={noteTitle}
            onClose={() => setIsStudyMode(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listSubtitle: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  cardItem: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cardQuestionContainer: {
    flexDirection: 'row',
    flex: 1,
    paddingRight: 16,
  },
  questionNumberWrapper: {
    alignItems: 'center',
    marginRight: 12,
  },
  cardNumber: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 10,
  },
  cardQuestion: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  cardAnswerContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    marginTop: 8
  },
  cardAnswerLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  cardAnswer: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  studyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  studyButtonText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  saveFab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 10,
  },
});
