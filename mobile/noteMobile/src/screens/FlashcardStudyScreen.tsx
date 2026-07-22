import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, RotateCcw, Settings, Flame, Star, ThumbsDown, Dumbbell, ThumbsUp, Layers } from 'lucide-react-native';
import { FlashcardSwipeItem } from '../components/FlashcardSwipeItem';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { Flashcard } from '../services/aiFlashcardClient';
import { useAuthStore } from '../stores/authStore';
import { SettingsModal } from '../components/SettingsModal';
import { checkInStreak } from '../services/streakService';
import { syncStudyProgress } from '../services/flashcardClient';

type TabType = 'ALL' | 'EASY' | 'HARD' | 'FORGOTTEN';
type CardRecord = Omit<Flashcard, 'status'> & { _id?: string, originalIndex: number, status: 'PENDING' | 'DONE' | 'FORGOTTEN', swipeCount?: number };

interface FlashcardStudyScreenProps {
  flashcards: (Flashcard & { _id?: string })[];
  noteTitle?: string;
  deckId?: string;
  onClose: () => void;
  onProgressUpdate?: (newProgress: number, nextReviewDate?: string) => void;
}

export function FlashcardStudyScreen({ flashcards, noteTitle, deckId, onClose, onProgressUpdate }: FlashcardStudyScreenProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const streak = useAuthStore((state) => state.streak);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const [cards, setCards] = useState<CardRecord[]>(
    flashcards.map((c, i) => ({ ...c, originalIndex: i, status: 'PENDING' }))
  );
  const [rememberedCount, setRememberedCount] = useState(0);
  const [score, setScore] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

  // Store study results to sync with backend
  const [studyResults, setStudyResults] = useState<{ flashcardId: string, isCorrect: boolean }[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const visibleDeck = useMemo(() => {
    return cards.filter(c => {
      if (c.status === 'DONE') return false;
      if (activeTab === 'FORGOTTEN') return c.status === 'FORGOTTEN';
      if (activeTab === 'ALL') return true;
      
      // For HARD and EASY tabs, only show PENDING cards
      if (c.status !== 'PENDING') return false;
      if (activeTab === 'HARD') return c.difficulty === 'HARD';
      if (activeTab === 'EASY') return c.difficulty === 'EASY';
      return false;
    });
  }, [cards, activeTab]);

  const handleSwipeRight = (originalIndex: number, points: number = 20) => {
    setRememberedCount((prev) => prev + 1);
    setScore((prev) => prev + points);
    
    setCards(prev => {
      const idx = prev.findIndex(c => c.originalIndex === originalIndex);
      if (idx !== -1 && prev[idx]._id) {
        // Nếu thẻ này chưa có kết quả (lần đầu vuốt hoặc vuốt lại ở tab forgotten mà trước đó chưa lưu correct)
        // Chúng ta sẽ add vào studyResults
        setStudyResults(res => [...res, { flashcardId: prev[idx]._id as string, isCorrect: true }]);
      }
      return prev.map(c => c.originalIndex === originalIndex ? { ...c, status: 'DONE' } : c);
    });
  };

  const handleSwipeLeft = (originalIndex: number) => {
    setScore((prev) => Math.max(0, prev - 5));
    setCards(prev => {
      const idx = prev.findIndex(c => c.originalIndex === originalIndex);
      if (idx === -1) return prev;
      
      if (prev[idx]._id) {
        setStudyResults(res => [...res, { flashcardId: prev[idx]._id as string, isCorrect: false }]);
      }
      
      const newCard = { ...prev[idx], status: 'FORGOTTEN' as const, swipeCount: (prev[idx].swipeCount || 0) + 1 };
      // Đưa thẻ xuống cuối danh sách để lúc qua tab Quên thẻ này sẽ hiện sau
      return [...prev.slice(0, idx), ...prev.slice(idx + 1), newCard];
    });
  };

  const handleRestart = () => {
    setCards(flashcards.map((c, i) => ({ ...c, originalIndex: i, status: 'PENDING' })));
    setRememberedCount(0);
    setScore(0);
    setActiveTab('ALL');
    setStudyResults([]); // Reset study results
  };

  const handleClose = () => {
    // If the user hasn't finished but has swiped some cards, save the partial progress silently
    const remainingCards = cards.filter(c => c.status !== 'DONE').length;
    if (remainingCards > 0 && studyResults.length > 0 && deckId) {
      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken) {
        const uniqueResults = studyResults.filter((v, i, a) => a.findIndex(t => (t.flashcardId === v.flashcardId)) === i);
        syncStudyProgress(accessToken, deckId, uniqueResults)
          .then((res) => {
            if (onProgressUpdate && typeof res.progress === 'number') {
              onProgressUpdate(res.progress, res.nextReviewDate);
            }
          })
          .catch(err => console.error('Failed to sync partial progress:', err));
      }
    }
    onClose();
  };

  // Đếm tổng số thẻ PENDING hoặc FORGOTTEN (chưa DONE)
  const remainingCards = cards.filter(c => c.status !== 'DONE').length;

  React.useEffect(() => {
    if (remainingCards === 0 && !isSyncing) {
      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken) {
        // 1. Auto check-in streak
        checkInStreak(accessToken)
          .then(res => {
            useAuthStore.getState().setStreak(res.currentStreak);
          })
          .catch(err => console.error('Failed to auto check-in:', err));
          
        // 2. Sync Study Progress
        if (deckId && studyResults.length > 0) {
          setIsSyncing(true);
          // Lọc trùng lặp kết quả (chỉ giữ kết quả đầu tiên cho mỗi thẻ nếu người dùng quẹt nhiều lần do forgotten)
          const uniqueResults = studyResults.filter((v, i, a) => a.findIndex(t => (t.flashcardId === v.flashcardId)) === i);
          
          syncStudyProgress(accessToken, deckId, uniqueResults)
            .then((res) => {
              console.log('Study progress synced:', res);
              if (onProgressUpdate && typeof res.progress === 'number') {
                onProgressUpdate(res.progress, res.nextReviewDate);
              }
            })
            .catch(err => console.error('Failed to sync study progress:', err));
        }
      }
    }
  }, [remainingCards]);

  if (remainingCards === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={[styles.iconButton]}>
            <X size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
        <View style={styles.completionContainer}>
          <Text style={[styles.completionTitle, { color: colors.primary }]}>{t('flashcardCompleteTitle')}</Text>
          <Text style={[styles.completionText, { color: colors.onSurfaceVariant }]}>
            {t('flashcardCompleteDesc', { count: flashcards.length.toString() })}
          </Text>
          <TouchableOpacity
            style={[styles.restartButton, { backgroundColor: colors.primary }]}
            onPress={handleRestart}
          >
            <RotateCcw size={20} color={colors.onPrimaryContainer} style={{ marginRight: 8 }} />
            <Text style={[styles.restartText, { color: colors.onPrimaryContainer }]}>{t('flashcardRestart')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalCards = flashcards.length;
  const progress = rememberedCount / totalCards;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* HEADER SECTION */}
      <View style={styles.headerContainer}>
        {/* Top Row: Close | Title | Settings */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
            <X size={24} color="#0B525B" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]} numberOfLines={1}>
              {noteTitle || t('flashcardTitle')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
              {t('flashcardProgress', { remembered: rememberedCount.toString(), total: totalCards.toString() })}
            </Text>
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={() => setIsSettingsOpen(true)}>
            <Settings size={22} color="#0B525B" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressWrapper}>
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${progress * 100}%` }
              ]}
            />
          </View>
        </View>

        {/* Chips Row */}
        <View style={styles.chipsRow}>
          <View style={[styles.chip, { backgroundColor: '#FFF3E0', borderColor: '#FDE68A' }]}>
            <Flame size={14} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={[styles.chipText, { color: '#92400E' }]}>{t('flashcardStreak', { streak: streak.toString() })}</Text>
          </View>

          <View style={[styles.chip, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
            <Star size={14} color="#4B5563" style={{ marginRight: 6 }} />
            <Text style={[styles.chipText, { color: '#374151' }]}>{t('flashcardScore', { score: score.toString() })}</Text>
          </View>
        </View>
      </View>

      {/* DECK SECTION */}
      <View style={styles.deckContainer}>
        {visibleDeck.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              {t('flashcardEmpty')}
            </Text>
          </View>
        ) : (
          visibleDeck.map((card, index) => {
            if (index > 2) return null;

            return (
              <FlashcardSwipeItem
                key={`${card.question}-${card.originalIndex}-${card.swipeCount || 0}`}
                stackedIndex={index}
                question={card.question}
                options={card.options}
                answer={card.answer}
                colors={colors}
                onSwipeLeft={() => handleSwipeLeft(card.originalIndex)}
                onSwipeRight={() => handleSwipeRight(card.originalIndex, 20)}
              />
            );
          }).reverse()
        )}
      </View>

      {/* FOOTER TAB BAR */}
      <View style={[styles.footerContainer, { backgroundColor: colors.surfaceContainerLowest, borderTopColor: colors.surfaceVariant }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ALL' && { backgroundColor: colors.primaryContainer }]}
          onPress={() => setActiveTab('ALL')}
        >
          <Layers size={22} color={activeTab === 'ALL' ? colors.onPrimaryContainer : colors.outline} strokeWidth={2.5} />
          <Text style={[styles.tabText, { color: activeTab === 'ALL' ? colors.onPrimaryContainer : colors.outline }]}>{t('flashcardTabAll')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HARD' && { backgroundColor: colors.primaryContainer }]}
          onPress={() => setActiveTab('HARD')}
        >
          <Dumbbell size={22} color={activeTab === 'HARD' ? colors.onPrimaryContainer : colors.outline} strokeWidth={2.5} />
          <Text style={[styles.tabText, { color: activeTab === 'HARD' ? colors.onPrimaryContainer : colors.outline }]}>{t('flashcardTabHard')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'EASY' && { backgroundColor: colors.primaryContainer }]}
          onPress={() => setActiveTab('EASY')}
        >
          <ThumbsUp size={22} color={activeTab === 'EASY' ? colors.onPrimaryContainer : colors.outline} strokeWidth={2.5} />
          <Text style={[styles.tabText, { color: activeTab === 'EASY' ? colors.onPrimaryContainer : colors.outline }]}>{t('flashcardTabEasy')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'FORGOTTEN' && { backgroundColor: colors.errorContainer }]}
          onPress={() => setActiveTab('FORGOTTEN')}
        >
          <ThumbsDown size={22} color={activeTab === 'FORGOTTEN' ? colors.onErrorContainer : colors.outline} strokeWidth={2.5} />
          <Text style={[styles.tabText, { color: activeTab === 'FORGOTTEN' ? colors.onErrorContainer : colors.outline }]}>{t('flashcardTabForgotten')}</Text>
        </TouchableOpacity>
      </View>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        type="AuthSettings"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 22,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 14,
  },
  progressWrapper: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 12,
  },
  deckContainer: {
    flex: 1,
  },
  topBar: {
    padding: 20,
    alignItems: 'flex-start',
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  completionTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 28,
    marginBottom: 16,
    textAlign: 'center',
  },
  completionText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  restartText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
  },
  footerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 5,
    borderTopWidth: 1,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 65,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
  },
});
