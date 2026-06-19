import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, RotateCcw } from 'lucide-react-native';
import { FlashcardSwipeItem } from '../components/FlashcardSwipeItem';
import { useTheme } from '../components/ThemeProvider';
import { Flashcard } from '../services/aiFlashcardClient';

interface FlashcardStudyScreenProps {
  flashcards: Flashcard[];
  onClose: () => void;
}

export function FlashcardStudyScreen({ flashcards, onClose }: FlashcardStudyScreenProps) {
  const { colors } = useTheme();
  
  // We manage the deck of cards. 
  // When a card is swiped right (remembered), we just remove it from the stack.
  // When a card is swiped left (forgot), we can either put it at the back of the deck or remove it.
  // Defaulting to "put it at the back" so the user learns it.
  const [deck, setDeck] = useState<Flashcard[]>(flashcards);
  const [rememberedCount, setRememberedCount] = useState(0);

  const handleSwipeRight = () => {
    setRememberedCount((prev) => prev + 1);
    setDeck((prev) => prev.slice(1));
  };

  const handleSwipeLeft = () => {
    setDeck((prev) => {
      const failedCard = prev[0];
      const remaining = prev.slice(1);
      return [...remaining, failedCard]; // Put back at the end
    });
  };

  const handleRestart = () => {
    setDeck(flashcards);
    setRememberedCount(0);
  };

  if (deck.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}>
              <X size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
          <View style={styles.completionContainer}>
            <Text style={[styles.completionTitle, { color: colors.primary }]}>Hoàn thành xuất sắc!</Text>
            <Text style={[styles.completionText, { color: colors.onSurfaceVariant }]}>
              Bạn đã ôn tập xong {flashcards.length} thẻ ghi nhớ.
            </Text>
            <TouchableOpacity 
              style={[styles.restartButton, { backgroundColor: colors.primary }]}
              onPress={handleRestart}
            >
              <RotateCcw size={20} color={colors.onPrimaryContainer} style={{ marginRight: 8 }} />
              <Text style={[styles.restartText, { color: colors.onPrimaryContainer }]}>Học lại từ đầu</Text>
            </TouchableOpacity>
          </View>
      </SafeAreaView>
    );
  }

  const progress = rememberedCount / (rememberedCount + deck.length);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}>
            <X size={24} color={colors.onSurface} />
          </TouchableOpacity>
          
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
            <Text style={[styles.progressText, { color: colors.onSurfaceVariant }]}>
              {rememberedCount} / {rememberedCount + deck.length} thẻ
            </Text>
          </View>
        </View>

        <View style={styles.deckContainer}>
          {/* Render bottom up so the first item is on top */}
          {deck.map((card, index) => {
            // Render only the top 3 cards for performance
            if (index > 2) return null;
            
            return (
              <FlashcardSwipeItem
                key={`${card.question}-${index}`}
                question={card.question}
                answer={card.answer}
                colors={colors}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
              />
            );
          }).reverse()}
        </View>
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
  progressWrapper: {
    flex: 1,
    marginLeft: 20,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    textAlign: 'right',
  },
  deckContainer: {
    flex: 1,
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
});
