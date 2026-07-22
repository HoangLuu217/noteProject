import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Trash2, Zap, Edit2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { useAuthStore } from '../stores/authStore';
import {
  FlashcardDeck,
  getFlashcardsByDeck,
  addFlashcardToDeck,
  updateFlashcard,
  deleteFlashcard,
  globalFlashcardsCache
} from '../services/flashcardClient';
import { Flashcard } from '../services/aiFlashcardClient';
import { FlashcardStudyScreen } from './FlashcardStudyScreen';
import { CustomAlert } from '../components/CustomAlert';

interface FlashcardDeckDetailScreenProps {
  deck: FlashcardDeck;
  onClose: () => void;
  onDeckUpdated?: (deck: FlashcardDeck) => void;
}

export function FlashcardDeckDetailScreen({ deck, onClose, onDeckUpdated }: FlashcardDeckDetailScreenProps) {
  const [currentDeck, setCurrentDeck] = useState(deck);
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [flashcards, setFlashcards] = useState<(Flashcard & { _id: string })[]>([]);
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [studyCards, setStudyCards] = useState<(Flashcard & { _id: string })[] | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Form State
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [type, setType] = useState<'BASIC' | 'MULTIPLE_CHOICE'>('BASIC');
  const [difficulty, setDifficulty] = useState<'EASY' | 'HARD'>('EASY');

  const fetchCards = async () => {
    if (!accessToken) return;

    if (globalFlashcardsCache[deck._id]) {
      setFlashcards(globalFlashcardsCache[deck._id]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const fetched = await getFlashcardsByDeck(accessToken, deck._id);
      globalFlashcardsCache[deck._id] = fetched || [];
      setFlashcards(fetched || []);
    } catch (e) {
      console.error('Failed to load flashcards:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [accessToken, deck._id]);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const openAddModal = () => {
    setEditingCardId(null);
    setQuestion('');
    setAnswer('');
    setOptionsText('');
    setType('BASIC');
    setDifficulty('EASY');
    setIsModalOpen(true);
  };

  const openEditModal = (card: Flashcard & { _id: string }) => {
    setEditingCardId(card._id);
    setQuestion(card.question);
    setAnswer(card.answer);
    setOptionsText((card.options || []).join('\n'));
    setType(card.type || 'BASIC');
    setDifficulty(card.difficulty || 'EASY');
    setIsModalOpen(true);
  };

  const handleSaveCard = async () => {
    if (!question.trim() || !answer.trim() || !accessToken) return;
    setIsSaving(true);
    try {
      const parsedOptions = optionsText.split('\n').map(o => o.trim()).filter(o => o.length > 0);

      const payload = {
        question,
        answer,
        type,
        options: type === 'MULTIPLE_CHOICE' ? parsedOptions : [],
        difficulty,
      };

      setIsModalOpen(false); // Optimistic UI: Close immediately!

      if (editingCardId) {
        // Edit Optimistically
        const optimisticUpdated = { _id: editingCardId, ...payload, status: 'NEW' as any };
        const newCards = flashcards.map(c => c._id === editingCardId ? { ...c, ...payload } : c);
        setFlashcards(newCards);
        globalFlashcardsCache[deck._id] = newCards;

        updateFlashcard(accessToken, editingCardId, payload).catch(e => {
          console.error('Failed to update flashcard:', e);
          fetchCards(); // Rollback on error
          Alert.alert(language === 'en' ? 'Error' : 'Lỗi', language === 'en' ? 'Failed to save flashcard' : 'Không thể lưu thẻ');
        });
      } else {
        // Add Optimistically
        const optimisticId = Math.random().toString();
        const optimisticCreated = { _id: optimisticId, explanation: '', ...payload, status: 'NEW' as any } as Flashcard & { _id: string };
        const newCards = [optimisticCreated, ...flashcards];
        setFlashcards(newCards);
        globalFlashcardsCache[deck._id] = newCards;

        addFlashcardToDeck(accessToken, deck._id, payload).then(created => {
          setFlashcards(prev => {
            const updated = prev.map(c => c._id === optimisticId ? created : c);
            globalFlashcardsCache[deck._id] = updated;
            return updated;
          });
        }).catch(e => {
          console.error('Failed to create flashcard:', e);
          fetchCards(); // Rollback on error
          Alert.alert(language === 'en' ? 'Error' : 'Lỗi', language === 'en' ? 'Failed to save flashcard' : 'Không thể lưu thẻ');
        });
      }
    } catch (e) {
      console.error('Failed to process flashcard payload:', e);
      Alert.alert(language === 'en' ? 'Error' : 'Lỗi', language === 'en' ? 'Failed to save flashcard' : 'Không thể lưu thẻ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCard = (cardId: string) => {
    setAlertConfig({
      visible: true,
      title: language === 'en' ? 'Delete Flashcard' : 'Xóa thẻ ghi nhớ',
      message: language === 'en' ? 'Are you sure you want to delete this flashcard?' : 'Bạn có chắc chắn muốn xóa thẻ này?',
      isDestructive: true,
      onConfirm: async () => {
        if (!accessToken) return;
        setAlertConfig(null);
        try {
          await deleteFlashcard(accessToken, cardId);
          setFlashcards(prev => {
            const newCards = prev.filter(c => c._id !== cardId);
            globalFlashcardsCache[deck._id] = newCards;
            return newCards;
          });
        } catch (e) {
          console.error('Failed to delete card:', e);
        }
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <ChevronLeft size={28} color={colors.onBackground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onBackground }]} numberOfLines={1}>
          {deck.title.replace('Flashcards from: ', '')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statsCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>{language === 'en' ? 'Progress:' : 'Tiến độ:'}</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{currentDeck.progress || 0}% {language === 'en' ? 'LEARNED' : 'ĐÃ HỌC'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>{language === 'en' ? 'Last Studied:' : 'Lần cuối học:'}</Text>
            <Text style={[styles.statValue, { color: colors.onSurface }]}>
              {currentDeck.lastStudiedAt ? new Date(currentDeck.lastStudiedAt).toLocaleDateString() : 'Never'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>{language === 'en' ? 'Next Review:' : 'Ôn tập tiếp theo:'}</Text>
            <Text style={[styles.statValue, { color: colors.onSurface }]}>
              {currentDeck.nextReviewDate ? new Date(currentDeck.nextReviewDate).toLocaleDateString() : (language === 'en' ? 'Not scheduled' : 'Chưa có lịch')}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={[styles.centerContainer, { minHeight: 200 }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : flashcards.length === 0 ? (
          <View style={[styles.centerContainer, { minHeight: 200 }]}>
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              {language === 'en' ? 'This deck is empty.' : 'Bộ thẻ này trống.'}
            </Text>
          </View>
        ) : (
          flashcards.map((card, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={card._id} style={[styles.cardItem, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
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
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => openEditModal(card)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Edit2 size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCard(card._id)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                    {isExpanded ? (
                      <ChevronUp size={20} color={colors.outline} />
                    ) : (
                      <ChevronDown size={20} color={colors.outline} />
                    )}
                  </View>
                </TouchableOpacity>

                {expandedIndex === index && (
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
          })
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={[styles.fabContainer, { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center' }]}>
        {flashcards.length > 0 && (
          <>
            <TouchableOpacity
              style={[styles.studyButton, { backgroundColor: colors.primaryContainer, flex: 1, paddingVertical: 12 }]}
              onPress={() => {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const dueCards = flashcards.filter(c => !c.nextReviewDate || new Date(c.nextReviewDate) <= now);
                if (dueCards.length === 0) {
                  Alert.alert(language === 'en' ? 'All caught up!' : 'Tuyệt vời!', language === 'en' ? 'You have no due cards to study today.' : 'Bạn không có thẻ nào cần ôn tập hôm nay.');
                  return;
                }
                setStudyCards(dueCards);
              }}
              activeOpacity={0.8}
            >
              <Zap size={20} color={colors.onPrimaryContainer} style={{ marginRight: 8 }} />
              <Text style={[styles.studyButtonText, { color: colors.onPrimaryContainer, fontSize: 16 }]}>
                {language === 'en' ? 'Study Due' : 'Ôn tập'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.studyButton, { backgroundColor: colors.primaryContainer, flex: 1, paddingVertical: 12 }]}
              onPress={() => setStudyCards(flashcards)}
              activeOpacity={0.8}
            >
              <Text style={[styles.studyButtonText, { color: colors.onPrimaryContainer, fontSize: 16 }]}>
                {language === 'en' ? 'Study All' : 'Học tất cả'}
              </Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: colors.primaryContainer,
              shadowColor: colors.primary,
            }
          ]}
          onPress={openAddModal}
          activeOpacity={0.85}
        >
          <Plus size={28} color={colors.onPrimaryContainer} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={false}
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: colors.surface }}
        >
          <View style={{ flex: 1, paddingTop: insets.top }}>
            <View style={[styles.header, { paddingBottom: 10, paddingTop: 16 }]}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.backButton}>
                <ChevronLeft size={28} color={colors.onSurface} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
                {editingCardId
                  ? (language === 'en' ? 'Edit Flashcard' : 'Sửa thẻ')
                  : (language === 'en' ? 'New Flashcard' : 'Thêm thẻ mới')}
              </Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 16, paddingBottom: 60, flexGrow: 1 }} showsVerticalScrollIndicator={false}>

              <View style={styles.typeToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: type === 'BASIC' ? colors.primaryContainer : colors.surfaceContainerHighest }
                  ]}
                  onPress={() => setType('BASIC')}
                >
                  <Text style={[styles.typeButtonText, { color: type === 'BASIC' ? colors.onPrimaryContainer : colors.onSurfaceVariant }]}>
                    {language === 'en' ? 'Basic' : 'Tự luận'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: type === 'MULTIPLE_CHOICE' ? colors.primaryContainer : colors.surfaceContainerHighest }
                  ]}
                  onPress={() => setType('MULTIPLE_CHOICE')}
                >
                  <Text style={[styles.typeButtonText, { color: type === 'MULTIPLE_CHOICE' ? colors.onPrimaryContainer : colors.onSurfaceVariant }]}>
                    {language === 'en' ? 'Multiple Choice' : 'Trắc nghiệm'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                {language === 'en' ? 'Question' : 'Câu hỏi'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceContainerHighest, color: colors.onSurface, borderColor: colors.outlineVariant }]}
                value={question}
                onChangeText={setQuestion}
                multiline
              />

              {type === 'MULTIPLE_CHOICE' && (
                <>
                  <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                    {language === 'en' ? 'Options (One per line)' : 'Các lựa chọn (Mỗi dòng 1 đáp án)'}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceContainerHighest, color: colors.onSurface, borderColor: colors.outlineVariant, minHeight: 100 }]}
                    value={optionsText}
                    onChangeText={setOptionsText}
                    multiline
                    placeholder={language === 'en' ? 'Option 1\nOption 2\nOption 3\nOption 4' : 'Lựa chọn 1\nLựa chọn 2\nLựa chọn 3\nLựa chọn 4'}
                    placeholderTextColor={colors.outline}
                  />
                </>
              )}

              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                {language === 'en' ? 'Answer' : 'Đáp án đúng'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceContainerHighest, color: colors.onSurface, borderColor: colors.outlineVariant, minHeight: 80 }]}
                value={answer}
                onChangeText={setAnswer}
                multiline
              />

              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                {language === 'en' ? 'Difficulty' : 'Độ khó'}
              </Text>
              <View style={styles.difficultySelector}>
                {(['EASY', 'HARD'] as const).map(diff => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.diffButton,
                      {
                        backgroundColor: difficulty === diff ? colors.primaryContainer : colors.surfaceContainerHighest,
                        borderColor: difficulty === diff ? colors.primary : colors.outlineVariant,
                      }
                    ]}
                    onPress={() => setDifficulty(diff)}
                  >
                    <Text style={[
                      styles.diffButtonText,
                      { color: difficulty === diff ? colors.onPrimaryContainer : colors.onSurfaceVariant }
                    ]}>
                      {diff === 'EASY' ? t('flashcardDiffEasy') : t('flashcardDiffHard')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.modalActions, { marginTop: 'auto' }]}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.surfaceVariant }]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.onSurfaceVariant }]}>
                    {language === 'en' ? 'Cancel' : 'Hủy'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveCard}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: colors.onPrimary }]}>
                      {language === 'en' ? 'Save' : 'Lưu'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Study Mode Modal */}
      <Modal
        visible={studyCards !== null}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setStudyCards(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {studyCards && (
            <FlashcardStudyScreen
              flashcards={studyCards}
              noteTitle={currentDeck.title.replace('Flashcards from: ', '')}
              onClose={() => {
                setStudyCards(null);
              }}
              deckId={currentDeck._id}
              onProgressUpdate={(newProgress, nextReviewDate) => {
                // Approximate updating local state for immediate feedback
                const updated = {
                  ...currentDeck,
                  progress: newProgress,
                  lastStudiedAt: new Date().toISOString(),
                  ...(nextReviewDate ? { nextReviewDate } : {})
                };
                setCurrentDeck(updated);
                if (onDeckUpdated) {
                  onDeckUpdated(updated);
                }
                fetchCards(); // Safely fetch fresh data AFTER server sync is complete
              }}
            />
          )}
        </View>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig?.visible || false}
        title={alertConfig?.title || ''}
        message={alertConfig?.message || ''}
        isDestructive={alertConfig?.isDestructive}
        onCancel={() => setAlertConfig(null)}
        onConfirm={() => {
          if (alertConfig?.onConfirm) {
            alertConfig.onConfirm();
          }
        }}
      />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 24,
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 14,
  },
  statValue: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
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
    bottom: 120, // Keep floating above the navigation bar
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  studyButton: {
    flex: 1,
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  studyButtonText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  typeToggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
  },
  difficultySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  diffButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  diffButtonText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
  },
});
