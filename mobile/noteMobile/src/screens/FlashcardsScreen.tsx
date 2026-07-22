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
  Platform,
} from 'react-native';
import { Plus, Trash2, Library, ChevronRight, Search } from 'lucide-react-native';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { useAuthStore } from '../stores/authStore';
import { FlashcardDeck, getDecks, createDeck, deleteDeck } from '../services/flashcardClient';
import { FlashcardDeckDetailScreen } from './FlashcardDeckDetailScreen';
import { CustomAlert } from '../components/CustomAlert';

export function FlashcardsScreen({ isActive }: { isActive?: boolean }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDecks = decks.filter(deck =>
    searchQuery.trim() === '' ||
    deck.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Modal Create
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const fetchDecks = async () => {
    if (!accessToken) return;
    if (decks.length === 0) setIsLoading(true);
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
    if (isActive !== false) {
      fetchDecks();
    }
  }, [accessToken, selectedDeck, isActive]); // Refetch when returning from detail screen or becoming active

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
    setAlertConfig({
      visible: true,
      title: language === 'en' ? 'Delete Deck' : 'Xóa bộ thẻ',
      message: language === 'en' ? 'Are you sure you want to delete this deck and all its flashcards?' : 'Bạn có chắc chắn muốn xóa bộ thẻ này và tất cả thẻ bên trong?',
      isDestructive: true,
      onConfirm: async () => {
        if (!accessToken) return;
        setAlertConfig(null);
        try {
          await deleteDeck(accessToken, deckId);
          setDecks(prev => prev.filter(d => d._id !== deckId));
        } catch (e) {
          console.error('Failed to delete deck:', e);
          // Show error alert (using standard Alert for simplicity or open a new CustomAlert later)
          Alert.alert(language === 'en' ? 'Error' : 'Lỗi', language === 'en' ? 'Failed to delete deck.' : 'Không thể xóa bộ thẻ. Có thể thẻ này không tồn tại hoặc bạn không có quyền.');
        }
      }
    });
  };

  if (selectedDeck) {
    return (
      <FlashcardDeckDetailScreen
        deck={selectedDeck}
        onClose={() => setSelectedDeck(null)}
        onDeckUpdated={(updatedDeck) => {
          setDecks(prev => prev.map(d => d._id === updatedDeck._id ? updatedDeck : d));
          setSelectedDeck(updatedDeck);
        }}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
          <Search size={18} color={colors.outline} />
          <TextInput
            placeholder={language === 'en' ? 'Search decks...' : 'Tìm bộ thẻ...'}
            placeholderTextColor={colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchBarInput, { color: colors.onSurface }]}
            underlineColorAndroid="transparent"
          />
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredDecks.length === 0 ? (
          <View style={styles.centerContainer}>
            <Library size={64} color={colors.surfaceVariant} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              {searchQuery.trim() ? (language === 'en' ? 'No decks found.' : 'Không tìm thấy bộ thẻ nào.') : (language === 'en' ? 'You have no flashcard decks yet.' : 'Bạn chưa có bộ thẻ nào.')}
            </Text>
          </View>
        ) : (
          filteredDecks.map((deck) => (
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
                  <Text style={[styles.deckTitle, { color: colors.onSurface }]} numberOfLines={1}>
                    {deck.title.replace('Flashcards from: ', '')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={[styles.deckDate, { color: colors.onSurfaceVariant, marginRight: 8 }]}>
                      {new Date(deck.createdAt).toLocaleDateString()}
                    </Text>
                    {(deck.progress !== undefined && deck.progress > 0) && (
                      <View style={{ backgroundColor: colors.primaryContainer, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: colors.onPrimaryContainer, fontWeight: 'bold' }}>
                          {deck.progress}% {language === 'en' ? 'LEARNED' : 'ĐÃ HỌC'}
                        </Text>
                      </View>
                    )}
                  </View>
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
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB to Add New Deck */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primaryContainer,
            shadowColor: colors.primary,
            borderBottomColor: colors.primary + '33'
          }
        ]}
        onPress={() => setIsCreateModalOpen(true)}
        activeOpacity={0.85}
      >
        <Plus size={28} color={colors.primary} strokeWidth={3} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 28,
  },
  centerContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    padding: 0,
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
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderBottomWidth: 5,
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
