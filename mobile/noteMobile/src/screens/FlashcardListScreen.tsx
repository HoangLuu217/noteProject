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
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Play, ChevronDown, ChevronUp, Zap, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../components/ThemeProvider';
import { useAuthStore } from '../stores/authStore';
import { Flashcard, generateFlashcards, getFlashcardsByNoteId } from '../services/aiFlashcardClient';
import { FlashcardStudyScreen } from './FlashcardStudyScreen';

interface FlashcardListScreenProps {
  noteId: string;
  noteContent: string;
  noteTitle?: string;
  onClose: () => void;
}

export function FlashcardListScreen({ noteId, noteContent, noteTitle, onClose }: FlashcardListScreenProps) {
  const { colors } = useTheme();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<'checking' | 'generating'>('checking');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [isStudyMode, setIsStudyMode] = useState(false);

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
      const generated = await generateFlashcards(accessToken, cleanContent, noteId);
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

  useEffect(() => {
    fetchFlashcards();
  }, [noteId, noteContent, accessToken]);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}>
          <X size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]} numberOfLines={1}>
          {noteTitle ? noteTitle : 'Ôn tập Flashcard'}
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
              ? 'Đang kiểm tra và tải thẻ ghi nhớ...' 
              : 'AI đang phân tích ghi chú và tạo bộ thẻ...'}
          </Text>
        </View>
      ) : flashcards.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
            Không tìm thấy thông tin phù hợp để tạo thẻ ghi nhớ.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.listSubtitle, { color: colors.onSurfaceVariant }]}>
              Đã tạo {flashcards.length} thẻ ghi nhớ từ ghi chú này. Đọc qua danh sách để làm quen trước khi học.
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
                              {card.difficulty === 'HARD' ? 'Khó' : card.difficulty === 'EASY' ? 'Dễ' : 'TB'}
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
                      <Text style={[styles.cardAnswerLabel, { color: colors.tertiary }]}>Đáp án:</Text>
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

          {/* Floating Action Button for Study Mode */}
          <View style={styles.fabContainer}>
            <TouchableOpacity
              style={[
                styles.studyButton,
                { backgroundColor: colors.primaryContainer }
              ]}
              onPress={() => setIsStudyMode(true)}
              activeOpacity={0.8}
            >
              <Zap size={24} color={colors.onPrimaryContainer} style={{ marginRight: 10 }} />
              <Text style={[styles.studyButtonText, { color: colors.onPrimaryContainer }]}>
                Bắt đầu học thẻ (Swipe)
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
    </SafeAreaView>
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
});
