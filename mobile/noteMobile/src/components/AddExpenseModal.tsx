import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, Plus, Trash2, Calendar, ChevronDown, Edit2, Check } from 'lucide-react-native';
import { createThemedStyles } from '../theme';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';
import { Expense, ExpenseItem } from '../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Partial<Expense>) => Promise<void>;
  expense?: Expense | null;
}

const CATEGORIES = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Bills', 'Others'];

export function AddExpenseModal({ isOpen, onClose, onSave, expense }: AddExpenseModalProps) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const styles = useStyles(colors);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food');
  const [expenseDate, setExpenseDate] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize values when modal opens or expense changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(false);
      if (expense) {
        setTitle(expense.title);
        setCategory(expense.category);
        setExpenseDate(expense.expenseDate);
        setNote(expense.note || '');
        setItems(expense.items && expense.items.length > 0 ? expense.items : [{ itemName: '', quantity: 1, unitPrice: 0, amount: 0 }]);
        setEditingIndex(null); // Compact by default when editing existing
      } else {
        setTitle('');
        setCategory('Food');
        
        // Default date to today
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setExpenseDate(`${yyyy}-${mm}-${dd}`);
        
        setNote('');
        setItems([{ itemName: '', quantity: 1, unitPrice: 0, amount: 0 }]);
        setEditingIndex(0); // Edit first item by default when creating
      }
    }
  }, [isOpen, expense]);

  // Calculate items total amount
  const computedTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { itemName: '', quantity: 1, unitPrice: 0, amount: 0 },
    ]);
    setEditingIndex(items.length); // Immediately open edit mode for new item
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ itemName: '', quantity: 1, unitPrice: 0, amount: 0 }]);
    } else {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleUpdateItem = (index: number, key: keyof ExpenseItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [key]: value };
          if (key === 'quantity' || key === 'unitPrice') {
            const qty = key === 'quantity' ? Number(value) || 0 : item.quantity;
            const price = key === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
            updatedItem.amount = qty * price;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('vi-VN')} đ`;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(language === 'vi' ? 'Vui lòng nhập tiêu đề' : 'Title is required');
      return;
    }

    // Validate items
    if (items.length === 0) {
      setError(language === 'vi' ? 'Vui lòng nhập ít nhất 1 sản phẩm' : 'Please add at least 1 item');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].itemName.trim()) {
        setError(
          language === 'vi'
            ? `Vui lòng nhập tên sản phẩm thứ ${i + 1}`
            : `Item name at row ${i + 1} is empty`
        );
        return;
      }
      if (items[i].quantity <= 0) {
        setError(
          language === 'vi'
            ? `Số lượng sản phẩm thứ ${i + 1} phải lớn hơn 0`
            : `Quantity at row ${i + 1} must be greater than 0`
        );
        return;
      }
      if (items[i].unitPrice <= 0) {
        setError(
          language === 'vi'
            ? `Đơn giá sản phẩm thứ ${i + 1} phải lớn hơn 0`
            : `Unit price at row ${i + 1} must be greater than 0`
        );
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        category,
        expenseDate,
        note,
        totalAmount: computedTotal,
        items,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || (language === 'vi' ? 'Lưu thất bại' : 'Failed to save'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centeredView} pointerEvents="box-none">
        <View style={styles.modal}>
          <View style={styles.headerRow}>
            {/* Title & Edit Icon Wrapper */}
            <View style={styles.titleEditWrapper}>
              <TextInput
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  setError(null);
                }}
                placeholder={language === 'vi' ? 'Tiêu đề...' : 'Title...'}
                placeholderTextColor={colors.outlineVariant}
                style={styles.headerTitleInput}
                editable={!isLoading}
                numberOfLines={1}
                maxLength={45}
              />
              <Edit2 size={14} color={colors.primary} strokeWidth={2.5} style={styles.editIcon} />
            </View>

            {/* Category selector on the side */}
            <TouchableOpacity
              style={styles.categoryHeaderPill}
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              <Text numberOfLines={1} style={styles.categoryHeaderPillText}>
                {t(`category${category}`)}
              </Text>
              <ChevronDown size={12} color={colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Close button */}
            <TouchableOpacity onPress={CloseBtn => onClose()} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.outline} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Items Section */}
            <View style={styles.itemsSectionHeader}>
              <Text style={styles.sectionTitle}>{t('expenseItems')}</Text>
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={handleAddItem}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Plus size={16} color={colors.primary} strokeWidth={3} />
                <Text style={styles.addItemBtnText}>{t('addItem')}</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => {
              const isEditing = editingIndex === index;

              if (!isEditing) {
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.compactItemRow}
                    onPress={() => setEditingIndex(index)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.compactItemLeft}>
                      <Text style={styles.compactItemName} numberOfLines={1}>
                        {item.itemName || (language === 'vi' ? 'Sản phẩm chưa đặt tên' : 'Unnamed item')}
                      </Text>
                      <Text style={styles.compactItemSub}>
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </Text>
                    </View>
                    <View style={styles.compactItemRight}>
                      <Text style={styles.compactItemAmount}>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </Text>
                      <View style={styles.compactActionButtons}>
                        <TouchableOpacity
                          onPress={() => setEditingIndex(index)}
                          style={styles.compactActionBtn}
                          activeOpacity={0.7}
                        >
                          <Edit2 size={14} color={colors.outline} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveItem(index)}
                          style={styles.compactActionBtn}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={14} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemRowTop}>
                    <TextInput
                      value={item.itemName}
                      onChangeText={(val) => handleUpdateItem(index, 'itemName', val)}
                      placeholder={t('itemNamePlaceholder')}
                      placeholderTextColor={colors.outlineVariant}
                      style={[styles.input, styles.itemNameInput]}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setEditingIndex(null)}
                      style={styles.doneItemBtn}
                      activeOpacity={0.7}
                    >
                      <Check size={16} color={colors.primary} strokeWidth={3} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(index)}
                      style={styles.removeItemBtn}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.itemRowBottom}>
                    <View style={styles.qtyCol}>
                      <Text style={styles.itemSubLabel}>{t('qty')}</Text>
                      <TextInput
                        value={String(item.quantity)}
                        onChangeText={(val) => handleUpdateItem(index, 'quantity', parseInt(val, 10) || 0)}
                        keyboardType="number-pad"
                        style={[styles.input, styles.numberInput]}
                        editable={!isLoading}
                      />
                    </View>

                    <View style={styles.priceCol}>
                      <Text style={styles.itemSubLabel}>{t('unitPrice')}</Text>
                      <TextInput
                        value={String(item.unitPrice)}
                        onChangeText={(val) => handleUpdateItem(index, 'unitPrice', parseInt(val, 10) || 0)}
                        keyboardType="numeric"
                        style={[styles.input, styles.numberInput]}
                        editable={!isLoading}
                      />
                    </View>

                    <View style={styles.subtotalCol}>
                      <Text style={styles.itemSubLabel}>{language === 'vi' ? 'Thành tiền' : 'Amount'}</Text>
                      <Text style={styles.itemSubtotalText}>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Display total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('totalAmount')}:</Text>
              <Text style={styles.totalAmountText}>{formatCurrency(computedTotal)}</Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {expense ? (language === 'vi' ? 'Cập nhật' : 'Update') : t('save')}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Category Selection Bottom Sheet */}
      {showCategoryPicker && (
        <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShowCategoryPicker(false)} />
          <View style={styles.categoryPickerWrap} pointerEvents="box-none">
            <View style={styles.categoryPicker}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                  style={styles.categoryItem}
                >
                  <Text style={[styles.categoryItemText, cat === category && styles.categoryItemTextActive]}>
                    {t(`category${cat}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      )}
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
    maxHeight: '85%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 36,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
    width: '100%',
  },
  titleEditWrapper: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.outlineVariant + '40',
    paddingBottom: 2,
    gap: 6,
  },
  headerTitleInput: {
    flex: 1,
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.onSurface,
    padding: 0,
  },
  editIcon: {
    opacity: 0.8,
  },
  categoryHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryContainer + '20',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
  },
  categoryHeaderPillText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12.5,
    color: colors.primary,
    maxWidth: 70,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: colors.surface,
    borderRadius: 100,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  label: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
    marginLeft: 8,
  },
  input: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: colors.surface,
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  textarea: {
    minHeight: 90,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.surface,
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  fieldCol: {
    flex: 1,
  },
  selectInput: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: 16,
  },
  selectText: {
    flex: 1,
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurface,
  },
  categoryText: {
    fontFamily: 'Quicksand-Bold',
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTextInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurface,
    padding: 0,
  },
  itemsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  addItemBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.primary,
  },
  itemRow: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  itemRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemNameInput: {
    flex: 1,
    marginBottom: 0,
    height: 48,
    borderRadius: 16,
  },
  removeItemBtn: {
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  itemRowBottom: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  qtyCol: {
    width: 60,
  },
  priceCol: {
    flex: 1,
  },
  subtotalCol: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  itemSubLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 11,
    color: colors.outline,
    marginBottom: 4,
    marginLeft: 4,
  },
  numberInput: {
    height: 44,
    borderRadius: 14,
    marginBottom: 0,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  itemSubtotalText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: colors.primary,
    marginTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer + '2F',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  totalLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  totalAmountText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    color: colors.primary,
  },
  totalAmountInputWrapper: {
    marginTop: 8,
  },
  submitBtn: {
    height: 56,
    borderRadius: 100,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0, 103, 128, 0.2)',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.primary,
  },
  errorText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryPickerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPicker: {
    width: '80%',
    maxWidth: 300,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  categoryItem: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  categoryItemText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 18,
    color: colors.onSurfaceVariant,
  },
  categoryItemTextActive: {
    fontFamily: 'Quicksand-Bold',
    color: colors.primary,
  },
  compactItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.02)',
  },
  compactItemLeft: {
    flex: 1.2,
    justifyContent: 'center',
  },
  compactItemName: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 2,
  },
  compactItemSub: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 12,
    color: colors.outline,
  },
  compactItemRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  compactItemAmount: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: colors.primary,
  },
  compactActionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  compactActionBtn: {
    padding: 6,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '40',
  },
  doneItemBtn: {
    padding: 10,
    backgroundColor: colors.primaryContainer + '20',
    borderRadius: 12,
    marginRight: 8,
  },
}));
