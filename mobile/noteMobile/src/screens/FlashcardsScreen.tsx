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
} from 'react-native';
import { Plus, Trash2, Library, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { useAuthStore } from '../stores/authStore';
import { FlashcardDeck, getDecks, createDeck, deleteDeck } from '../services/flashcardClient';
import { FlashcardDeckDetailScreen } from './FlashcardDeckDetailScreen';

export function FlashcardsScreen() {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);

  // Modal Create
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchDecks = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const fetched = await getDecks(accessToken);
      setDecks(fetched || []);
    } catch (e) {
      console.error('Failed to load decks:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, [accessToken, selectedDeck]); // Refetch when returning from detail screen

  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim() || !accessToken) return;
    setIsCreating(true);
    try {
      const newDeck = await createDeck(accessToken, newDeckTitle.trim());
      setDecks([newDeck, ...decks]);
      setNewDeckTitle('');
      setIsCreateModalOpen(false);
    } catch (e) {
      console.error('Failed to create deck:', e);
      Alert.alert(language === 'en' ? 'Error' : 'Lỗi', language === 'en' ? 'Failed to create deck' : 'Không thể tạo bộ thẻ');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    Alert.alert(
      language === 'en' ? 'Delete Deck' : 'Xóa bộ thẻ',
      language === 'en' ? 'Are you sure you want to delete this deck and all its flashcards?' : 'Bạn có chắc chắn muốn xóa bộ thẻ này và tất cả thẻ bên trong?',
      [
        { text: language === 'en' ? 'Cancel' : 'Hủy', style: 'cancel' },
        {
          text: language === 'en' ? 'Delete' : 'Xóa',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            try {
              await deleteDeck(accessToken, deckId);
              setDecks(decks.filter(d => d._id !== deckId));
            } catch (e) {
              console.error('Failed to delete deck:', e);
              Alert.alert(language === 'en' ? 'Error' : 'Lỗi', language === 'en' ? 'Failed to delete deck.' : 'Không thể xóa bộ thẻ. Có thể thẻ này không tồn tại hoặc bạn không có quyền.');
            }
          },
        },
      ]
    );
  };

  if (selectedDeck) {
    return (
      <FlashcardDeckDetailScreen 
        deck={selectedDeck} 
        onClose={() => setSelectedDeck(null)} 
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
          {t('flashcardTitle')}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : decks.length === 0 ? (
        <View style={styles.centerContainer}>
          <Library size={64} color={colors.surfaceVariant} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            {language === 'en' ? 'You have no flashcard decks yet.' : 'Bạn chưa có bộ thẻ nào.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {decks.map((deck) => (
            <TouchableOpacity
              key={deck._id}
              style={[
                styles.deckCard,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  borderColor: colors.outlineVariant,
                }
              ]}
              activeOpacity={0.7}
              onPress={() => setSelectedDeck(deck)}
            >
              <View style={styles.deckInfo}>
                <Library size={24} color={colors.primary} style={{ marginRight: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deckTitle, { color: colors.onSurface }]} numberOfLines={2}>
                    {deck.title}
                  </Text>
                  <Text style={[styles.deckDate, { color: colors.onSurfaceVariant }]}>
                    {new Date(deck.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDeck(deck._id)}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* FAB to Add New Deck */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primaryContainer }]}
        onPress={() => setIsCreateModalOpen(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color={colors.onPrimaryContainer} />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={isCreateModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              {language === 'en' ? 'New Flashcard Deck' : 'Bộ thẻ mới'}
            </Text>
            
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceContainerHighest,
                  color: colors.onSurface,
                  borderColor: colors.outlineVariant,
                }
              ]}
              placeholder={language === 'en' ? 'Deck title...' : 'Tên bộ thẻ...'}
              placeholderTextColor={colors.onSurfaceVariant}
              value={newDeckTitle}
              onChangeText={setNewDeckTitle}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setIsCreateModalOpen(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.onSurfaceVariant }]}>
                  {language === 'en' ? 'Cancel' : 'Hủy'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateDeck}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.onPrimary }]}>
                    {language === 'en' ? 'Create' : 'Tạo mới'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 28,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  deckCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  deckInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deckTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 18,
    marginBottom: 4,
  },
  deckDate: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  input: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
