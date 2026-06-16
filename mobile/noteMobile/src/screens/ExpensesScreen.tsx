import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import {
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit2,
  X,
  Wallet,
  Utensils,
  ShoppingBag,
  Car,
  Film,
  Receipt,
  HelpCircle,
} from 'lucide-react-native';
import { createThemedStyles } from '../theme';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { useAuthStore } from '../stores/authStore';
import {
  fetchExpensesFromServer,
  createExpenseOnServer,
  updateExpenseOnServer,
  deleteExpenseFromServer,
} from '../services/expenseService';
import { Expense, ExpenseItem } from '../types';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { DateRangeCalendarModal } from '../components/DateRangeCalendarModal';

const CATEGORIES = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Bills', 'Others'];

const CategoryIcon = ({ category, color, size = 22 }: { category: string; color: string; size?: number }) => {
  switch (category) {
    case 'Food':
      return <Utensils size={size} color={color} />;
    case 'Shopping':
      return <ShoppingBag size={size} color={color} />;
    case 'Transport':
      return <Car size={size} color={color} />;
    case 'Entertainment':
      return <Film size={size} color={color} />;
    case 'Bills':
      return <Receipt size={size} color={color} />;
    default:
      return <HelpCircle size={size} color={color} />;
  }
};

export function ExpensesScreen() {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const styles = useStyles(colors);
  const accessToken = useAuthStore((s) => s.accessToken);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  const formatItemDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToView, setExpenseToView] = useState<Expense | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Load expenses from backend
  const loadExpenses = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const filters: any = {};
      if (selectedCategory !== 'All') filters.category = selectedCategory;
      if (searchQuery.trim()) filters.q = searchQuery.trim();
      if (startDate.trim()) filters.startDate = startDate.trim();
      if (endDate.trim()) filters.endDate = endDate.trim();
      filters.limit = 1000; // Load all matching for local breakdown computations

      const { expenses: data } = await fetchExpensesFromServer(accessToken, filters);
      setExpenses(data);
    } catch (e) {
      console.error('Failed to load expenses:', e);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, searchQuery, selectedCategory, startDate, endDate]);

  // Debounced/Triggered loading
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleSaveExpense = async (expenseData: Partial<Expense>) => {
    if (!accessToken) return;
    if (expenseToEdit) {
      await updateExpenseOnServer(accessToken, expenseToEdit.id, expenseData);
    } else {
      await createExpenseOnServer(accessToken, expenseData);
    }
    setExpenseToEdit(null);
    loadExpenses();
  };

  const handleDeleteExpense = async (id: string) => {
    Alert.alert(
      language === 'vi' ? 'Xác nhận xóa' : 'Confirm Delete',
      t('deleteExpenseConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: language === 'vi' ? 'Xóa' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            try {
              await deleteExpenseFromServer(accessToken, id);
              Alert.alert(t('success') || 'Success', t('expenseDeleted'));
              loadExpenses();
            } catch (e) {
              Alert.alert(t('error') || 'Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('vi-VN')} đ`;
  };

  // Category breakdown removed

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Spending Card removed */}

        {/* Search, Filter inputs */}
        <View style={styles.filterSection}>
          <View style={styles.searchFilterRow}>
            {/* Search Bar */}
            <View style={styles.searchBarWrapper}>
              <Search size={16} color={colors.outline} style={styles.searchIcon} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('searchExpenses')}
                placeholderTextColor={colors.outlineVariant}
                style={styles.searchInput}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                  <X size={16} color={colors.outline} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Single premium date range selector */}
            <TouchableOpacity
              style={styles.singleDateRangeBtn}
              onPress={() => setIsCalendarModalOpen(true)}
              activeOpacity={0.8}
            >
              <Calendar size={16} color={colors.primary} strokeWidth={2.5} />
              <Text numberOfLines={1} style={styles.dateRangeBtnText}>
                {startDate && endDate
                  ? `${formatShortDate(startDate)} → ${formatShortDate(endDate)}`
                  : language === 'vi'
                  ? 'Chọn ngày'
                  : 'Filter Date'}
              </Text>
              {startDate || endDate ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setStartDate('');
                    setEndDate('');
                  }}
                  style={styles.clearDateBtn}
                  activeOpacity={0.7}
                >
                  <X size={14} color={colors.outline} strokeWidth={2.5} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>

          {/* Horizontally scrollable Categories pill list */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesPillScroll}
            contentContainerStyle={styles.categoriesPillContainer}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory('All')}
              style={[
                styles.categoryPill,
                selectedCategory === 'All' ? styles.categoryPillActive : styles.categoryPillDefault,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === 'All' ? styles.categoryPillTextActive : styles.categoryPillTextDefault,
                ]}
              >
                {t('allCategories')}
              </Text>
            </TouchableOpacity>

            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryPill,
                    isActive ? styles.categoryPillActive : styles.categoryPillDefault,
                  ]}
                  activeOpacity={0.8}
                >
                  <CategoryIcon category={cat} color={isActive ? colors.primary : colors.outline} size={15} />
                  <Text
                    style={[
                      styles.categoryPillText,
                      isActive ? styles.categoryPillTextActive : styles.categoryPillTextDefault,
                    ]}
                  >
                    {t(`category${cat}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Expenses List */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Wallet size={48} color={colors.outlineVariant} strokeWidth={1.5} />
            <Text style={styles.emptyText}>{t('noExpensesYet')}</Text>
          </View>
        ) : (
          <View style={styles.expensesList}>
            {expenses.map((exp) => (
              <TouchableOpacity
                key={exp.id}
                style={styles.expenseCard}
                onPress={() => setExpenseToView(exp)}
                activeOpacity={0.7}
              >
                <View style={styles.expenseCardLeft}>
                  <View style={[styles.categoryIconContainer, { backgroundColor: colors.primary + '1A' }]}>
                    <CategoryIcon category={exp.category} color={colors.primary} size={22} />
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseTitle} numberOfLines={1}>
                      {exp.title}
                    </Text>
                    <View style={styles.expenseSubinfo}>
                      <Text style={styles.expenseCategoryTag}>
                        {t(`category${exp.category}`)}
                      </Text>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.expenseDateTag}>{exp.expenseDate}</Text>
                      {exp.items.length > 0 ? (
                        <>
                          <Text style={styles.bullet}>•</Text>
                          <Text style={styles.expenseItemsBadge}>
                            {exp.items.length === 1
                              ? t('itemCount').replace('{count}', '1')
                              : t('itemsCount').replace('{count}', String(exp.items.length))}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>
                
                <View style={styles.expenseCardRight}>
                  <Text style={styles.expenseAmount}>{formatCurrency(exp.totalAmount)}</Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => {
                        setExpenseToEdit(exp);
                        setIsAddModalOpen(true);
                      }}
                      style={styles.iconActionBtn}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={16} color={colors.outline} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteExpense(exp.id)}
                      style={styles.iconActionBtn}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => {
          setExpenseToEdit(null);
          setIsAddModalOpen(true);
        }}
        activeOpacity={0.85}
      >
        <Plus size={24} color={colors.primary} strokeWidth={3} />
      </TouchableOpacity>

      {/* Add / Edit Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveExpense}
        expense={expenseToEdit}
      />

      <DateRangeCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        startDate={startDate}
        endDate={endDate}
        onSelectRange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
      />

      {/* Detail view Modal */}
      {expenseToView && (
        <Modal
          visible={expenseToView !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setExpenseToView(null)}
        >
          <Pressable style={styles.backdrop} onPress={() => setExpenseToView(null)} />
          <View style={styles.sheetContainer} pointerEvents="box-none">
            <View style={styles.sheetContent}>
              <View style={styles.sheetHandle} />
              
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{t('expenseDetail')}</Text>
                <TouchableOpacity onPress={() => setExpenseToView(null)} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={20} color={colors.outline} strokeWidth={3} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
                <Text style={styles.detailTitle}>{expenseToView.title}</Text>
                
                <View style={styles.detailTagsRow}>
                  <View style={styles.detailTag}>
                    <CategoryIcon category={expenseToView.category} color={colors.primary} size={14} />
                    <Text style={styles.detailTagText}>{t(`category${expenseToView.category}`)}</Text>
                  </View>
                  <View style={styles.detailTag}>
                    <Calendar size={14} color={colors.primary} />
                    <Text style={styles.detailTagText}>{expenseToView.expenseDate}</Text>
                  </View>
                </View>

                {expenseToView.note ? (
                  <View style={styles.detailNoteContainer}>
                    <Text style={styles.detailNoteLabel}>{t('expenseNote')}:</Text>
                    <Text style={styles.detailNoteText}>{expenseToView.note}</Text>
                  </View>
                ) : null}

                {/* Items Table */}
                {expenseToView.items && expenseToView.items.length > 0 ? (
                  <View style={styles.itemsTable}>
                    <Text style={styles.itemsTableTitle}>{t('expenseItems')}</Text>
                    
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.headerCell, styles.nameCell]}>{t('itemNamePlaceholder')}</Text>
                      <Text style={[styles.headerCell, styles.qtyCell]}>{t('qty')}</Text>
                      <Text style={[styles.headerCell, styles.priceCell]}>{t('unitPrice')}</Text>
                      <Text style={[styles.headerCell, styles.subtotalCell]}>{language === 'vi' ? 'Tổng' : 'Total'}</Text>
                    </View>

                    {expenseToView.items.map((item, idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <View style={styles.nameCell}>
                          <Text style={styles.cell} numberOfLines={2}>{item.itemName}</Text>
                          {item.createdAt ? (
                            <Text style={styles.itemDateText}>
                              {formatItemDateTime(item.createdAt)}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.cell, styles.qtyCell]}>{item.quantity}</Text>
                        <Text style={[styles.cell, styles.priceCell]}>{formatCurrency(item.unitPrice)}</Text>
                        <Text style={[styles.cell, styles.subtotalCell, styles.subtotalValueCell]}>
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailTotalLabel}>{t('totalAmount')}</Text>
                  <Text style={styles.detailTotalAmount}>{formatCurrency(expenseToView.totalAmount)}</Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 120,
  },
  // overviewCard styles removed
  filterSection: {
    marginBottom: 24,
  },
  searchFilterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchBarWrapper: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Quicksand-Medium',
    fontSize: 14,
    color: colors.onSurface,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  singleDateRangeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  dateRangeBtnText: {
    flex: 1,
    fontFamily: 'Quicksand-Medium',
    fontSize: 12.5,
    color: colors.onSurface,
  },
  clearDateBtn: {
    padding: 2,
    borderRadius: 100,
    backgroundColor: colors.surface,
  },
  categoriesPillScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  categoriesPillContainer: {
    gap: 8,
    paddingRight: 48,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryPillActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  categoryPillDefault: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  categoryPillText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
  },
  categoryPillTextActive: {
    color: colors.primary,
  },
  categoryPillTextDefault: {
    color: colors.outline,
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.outline,
  },
  expensesList: {
    gap: 14,
  },
  expenseCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  expenseCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 4,
  },
  expenseSubinfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseCategoryTag: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 11,
    color: colors.primary,
  },
  bullet: {
    fontSize: 11,
    color: colors.outlineVariant,
    marginHorizontal: 5,
  },
  expenseDateTag: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 11,
    color: colors.outline,
  },
  expenseItemsBadge: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 11,
    color: colors.outline,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  expenseCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  expenseAmount: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionBtn: {
    padding: 4,
  },
  fabBtn: {
    position: 'absolute',
    bottom: 116,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(0, 103, 128, 0.2)',
    zIndex: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 28, 23, 0.4)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 24,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    color: colors.onSurface,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 100,
  },
  sheetScroll: {
    paddingBottom: 20,
  },
  detailTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: 10,
  },
  detailTagsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  detailTagText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  detailNoteContainer: {
    backgroundColor: colors.surfaceContainer,
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  detailNoteLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.outline,
    marginBottom: 4,
  },
  detailNoteText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
    lineHeight: 20,
  },
  itemsTable: {
    marginBottom: 24,
  },
  itemsTableTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerCell: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.outline,
  },
  nameCell: {
    flex: 2,
    textAlign: 'left',
  },
  qtyCell: {
    width: 40,
    textAlign: 'center',
  },
  priceCell: {
    flex: 1.2,
    textAlign: 'right',
  },
  subtotalCell: {
    flex: 1.5,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '2F',
    alignItems: 'center',
  },
  cell: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 14,
    color: colors.onSurface,
  },
  itemDateText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 10,
    color: colors.outline,
    marginTop: 2,
  },
  subtotalValueCell: {
    fontFamily: 'Quicksand-Bold',
    color: colors.primary,
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer + '1A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
  },
  detailTotalLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  detailTotalAmount: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 24,
    color: colors.primary,
  },
}));
