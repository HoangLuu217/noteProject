import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react-native';
import { theme, createThemedStyles } from '../theme';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const TASK_TYPES = ['Personal', 'Work', 'Study', 'Health'];

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  disabledIndices,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disabledIndices?: number[];
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedIndex]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

    if (disabledIndices && disabledIndices.includes(clampedIndex)) {
      // Find the nearest enabled index
      let nearestIndex = clampedIndex;
      let minDiff = Infinity;
      for (let i = 0; i < items.length; i++) {
        if (!disabledIndices.includes(i)) {
          const diff = Math.abs(i - clampedIndex);
          if (diff < minDiff) {
            minDiff = diff;
            nearestIndex = i;
          }
        }
      }
      onSelect(nearestIndex);
      listRef.current?.scrollToIndex({ index: nearestIndex, animated: true });
    } else {
      onSelect(clampedIndex);
    }
  };

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(_, index) => String(index)}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={onMomentumScrollEnd}
      getItemLayout={(_, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      contentContainerStyle={styles.wheelContent}
      style={styles.wheelList}
      renderItem={({ item, index }) => {
        const isActive = index === selectedIndex;
        const isDisabled = disabledIndices?.includes(index);

        return (
          <TouchableOpacity
            style={[styles.wheelItem, isDisabled && { opacity: 0.15 }]}
            disabled={isDisabled}
            onPress={() => {
              if (isDisabled) return;
              onSelect(index);
              listRef.current?.scrollToIndex({ index, animated: true });
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.wheelText, isActive && styles.wheelTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

function TimePicker({
  onClose,
  onConfirm,
  initialTime,
  selectedDate,
}: {
  onClose: () => void;
  onConfirm: (time: string) => void;
  initialTime: string;
  selectedDate: string;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useStyles(colors);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const getMinDateTime = () => {
    return new Date(Date.now() + 2 * 60 * 1000);
  };

  const parseInitial = () => {
    const match = initialTime.match(/(\d{1,2}):(\d{2})/);
    const minDateTime = getMinDateTime();
    const minHour = minDateTime.getHours();
    const minMin = minDateTime.getMinutes();
    const minDateStr = `${minDateTime.getFullYear()}-${String(minDateTime.getMonth() + 1).padStart(2, '0')}-${String(minDateTime.getDate()).padStart(2, '0')}`;

    let initialHour = minHour;
    let initialMin = minMin;

    if (match) {
      initialHour = Number.parseInt(match[1], 10);
      initialMin = Number.parseInt(match[2], 10);
    }

    if (selectedDate === minDateStr) {
      if (initialHour < minHour) {
        initialHour = minHour;
        initialMin = minMin;
      } else if (initialHour === minHour && initialMin < minMin) {
        initialMin = minMin;
      }
    }

    return {
      hourIdx: Math.max(0, Math.min(initialHour, 23)),
      minIdx: Math.max(0, Math.min(initialMin, 59)),
    };
  };

  const initial = parseInitial();
  const [hourIdx, setHourIdx] = useState(initial.hourIdx);
  const [minIdx, setMinIdx] = useState(initial.minIdx);

  const minDateTime = getMinDateTime();
  const minHour = minDateTime.getHours();
  const minMinute = minDateTime.getMinutes();
  const minDateStr = `${minDateTime.getFullYear()}-${String(minDateTime.getMonth() + 1).padStart(2, '0')}-${String(minDateTime.getDate()).padStart(2, '0')}`;
  
  const isTodaySelected = selectedDate === minDateStr;

  const disabledHours = isTodaySelected
    ? Array.from({ length: minHour }, (_, i) => i)
    : [];

  const disabledMinutes = isTodaySelected && hourIdx === minHour
    ? Array.from({ length: minMinute }, (_, i) => i)
    : [];

  useEffect(() => {
    if (disabledMinutes.includes(minIdx)) {
      let nearestMin = minIdx;
      let minDiff = Infinity;
      for (let i = 0; i < minutes.length; i++) {
        if (!disabledMinutes.includes(i)) {
          const diff = Math.abs(i - minIdx);
          if (diff < minDiff) {
            minDiff = diff;
            nearestMin = i;
          }
        }
      }
      setMinIdx(nearestMin);
    }
  }, [hourIdx, disabledMinutes, minIdx]);

  const handleConfirm = () => {
    onConfirm(`${hours[hourIdx]}:${minutes[minIdx]}`);
    onClose();
  };

  return (
    <View style={styles.fullscreenOverlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.pickerOverlay} pointerEvents="box-none">
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />

          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{t('pickATime')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.outline} strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <View style={styles.wheelsContainer}>
            <View pointerEvents="none" style={styles.highlightBand} />
            <View style={styles.wheelsRow}>
              <WheelColumn items={hours} selectedIndex={hourIdx} onSelect={setHourIdx} disabledIndices={disabledHours} />
              <Text style={styles.colon}>:</Text>
              <WheelColumn items={minutes} selectedIndex={minIdx} onSelect={setMinIdx} disabledIndices={disabledMinutes} />
            </View>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmBtnText}>{t('confirm')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function CalendarPicker({
  selectedDate,
  onSelect,
  onClose,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const styles = useStyles(colors);

  const parseSelectedDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date();
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  const initialDate = parseSelectedDate(selectedDate);
  const [currentDate, setCurrentDate] = useState(initialDate);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = new Date(year, month, 1).getDay();

  const days: { dayNum: number; isCurrentMonth: boolean; dateString: string }[] = [];

  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    const dateString = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ dayNum: d, isCurrentMonth: false, dateString });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ dayNum: d, isCurrentMonth: true, dateString });
  }

  const totalCells = 42;
  const remainingCells = totalCells - days.length;
  for (let d = 1; d <= remainingCells; d++) {
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const dateString = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ dayNum: d, isCurrentMonth: false, dateString });
  }

  const getWeekdayName = (dayIndex: number) => {
    const enShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const viShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return language === 'vi' ? viShort[dayIndex] : enShort[dayIndex];
  };

  const getMonthName = (monthIndex: number) => {
    const enFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const viFull = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    return language === 'vi' ? viFull[monthIndex] : enFull[monthIndex];
  };

  const getTodayString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  const todayStr = getTodayString();

  const minDateTime = new Date(Date.now() + 2 * 60 * 1000);
  const minDateStr = `${minDateTime.getFullYear()}-${String(minDateTime.getMonth() + 1).padStart(2, '0')}-${String(minDateTime.getDate()).padStart(2, '0')}`;


  return (
    <View style={styles.fullscreenOverlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.typePickerWrap} pointerEvents="box-none">
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} activeOpacity={0.7}>
              <ChevronLeft size={20} color={colors.onSurface} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {language === 'vi' ? `${getMonthName(month)} năm ${year}` : `${getMonthName(month)} ${year}`}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn} activeOpacity={0.7}>
              <ChevronRight size={20} color={colors.onSurface} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdaysRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
              <Text key={dayIdx} style={styles.weekdayLabel}>
                {getWeekdayName(dayIdx)}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isSelected = day.dateString === selectedDate;
              const isToday = day.dateString === todayStr;
              const isPast = day.dateString < minDateStr;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    !day.isCurrentMonth && styles.dayCellOutside,
                    isToday && !isSelected && styles.dayCellToday,
                    isPast && styles.dayCellPast,
                  ]}
                  disabled={isPast}
                  onPress={() => {
                    onSelect(day.dateString);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      isSelected && styles.dayCellTextSelected,
                      !day.isCurrentMonth && styles.dayCellTextOutside,
                      isToday && !isSelected && styles.dayCellTextToday,
                      isPast && styles.dayCellTextPast,
                    ]}
                  >
                    {day.dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function validateTaskDateTime(t: (key: string) => string, dateStr?: string, timeStr?: string): string | null {
  if (!dateStr) return null;

  const dateParts = dateStr.split('-');
  if (dateParts.length !== 3) return null;
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // 0-indexed
  const day = parseInt(dateParts[2], 10);

  if (timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return t('invalidTimeFormat');

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    const selectedDateTime = new Date(year, month, day, hours, minutes, 0, 0);
    if (isNaN(selectedDateTime.getTime())) return t('invalidDateTime');

    if (selectedDateTime.getTime() < Date.now()) {
      return t('cannotSchedulePast');
    }
  } else {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const selectedDateOnly = new Date(year, month, day, 0, 0, 0, 0);
    if (isNaN(selectedDateOnly.getTime())) return t('invalidDate');

    if (selectedDateOnly.getTime() < todayStart.getTime()) {
      return t('cannotSchedulePast');
    }
  }

  return null;
}

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (taskData: { title: string; date: string; time: string; content: string; type: string }) => void;
  initialDate?: string;
}

export function AddTaskModal({ isOpen, onClose, onAdd, initialDate }: AddTaskModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useStyles(colors);

  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('Personal');
  const [date, setDate] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectDate = (selectedDate: string) => {
    setDate(selectedDate);
    setError(null);
  };

  const handleSelectTime = (selectedTime: string) => {
    setTime(selectedTime);
    setError(null);
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialDate || initialDate === '') {
        setDate(initialDate || '');
      }
    }
  }, [isOpen, initialDate]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const validationError = validateTaskDateTime(t, date, time);
    if (validationError) {
      setError(validationError);
      return;
    }

    onAdd({ title, time, content, type, date });
    setTitle('');
    setTime('');
    setContent('');
    setType('Personal');
    setError(null);
    onClose();
  };

  return (
    <>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.centeredView} pointerEvents="box-none">
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.modalTitle}>{t('newTaskTitle')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={20} color={colors.outline} strokeWidth={3} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>{t('taskTitle')} *</Text>
              <TextInput
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  setError(null);
                }}
                placeholder={t('taskTitlePlaceholder')}
                placeholderTextColor={colors.outlineVariant}
                style={styles.input}
              />

              <Text style={styles.label}>{t('taskContent')}</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder={t('taskDescPlaceholder')}
                placeholderTextColor={colors.outlineVariant}
                style={styles.textarea}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>{t('taskDate')}</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
                style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}
              >
                <Text style={[styles.selectText, !date && styles.placeholderText]}>{date || 'YYYY-MM-DD'}</Text>
              </TouchableOpacity>

              <View style={styles.twoCol}>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>{t('taskTime')}</Text>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    style={styles.selectInput}
                    activeOpacity={0.8}
                  >
                    <Clock
                      size={16}
                      color={time ? colors.onSurface : colors.outlineVariant}
                      strokeWidth={2.5}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.selectText, !time && styles.placeholderText]}
                    >
                      {time || '--:--'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.label}>{t('taskCategory')}</Text>
                  <TouchableOpacity style={styles.selectInput} onPress={() => setShowTypePicker(true)} activeOpacity={0.8}>
                    <Text numberOfLines={1} style={[styles.selectText, styles.typeText]}>
                      {t(type.toLowerCase())}
                    </Text>
                    <ChevronDown size={18} color={colors.onSurfaceVariant} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn} activeOpacity={0.8}>
                <Text style={styles.submitBtnText}>{t('createTask')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {showTimePicker && (
          <TimePicker
            onClose={() => setShowTimePicker(false)}
            onConfirm={handleSelectTime}
            initialTime={time}
            selectedDate={date}
          />
        )}

        {showTypePicker && (
          <View style={styles.fullscreenOverlay}>
            <Pressable style={styles.backdrop} onPress={() => setShowTypePicker(false)} />
            <View style={styles.typePickerWrap} pointerEvents="box-none">
              <View style={styles.typePicker}>
                {TASK_TYPES.map((taskType) => (
                  <TouchableOpacity key={taskType} onPress={() => { setType(taskType); setShowTypePicker(false); }} style={styles.typeItem}>
                    <Text style={[styles.typeItemText, taskType === type && styles.typeItemTextActive]}>
                      {t(taskType.toLowerCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {showDatePicker && (
          <CalendarPicker
            selectedDate={date}
            onSelect={handleSelectDate}
            onClose={() => setShowDatePicker(false)}
          />
        )}
      </Modal>
    </>
  );
}

const useStyles = createThemedStyles((colors) => ({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 28, 23, 0.4)',
  },
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
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
    marginBottom: 24,
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
  input: {
    height: 64,
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
    minHeight: 120,
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  },
  selectText: {
    flex: 1,
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurface,
  },
  placeholderText: {
    color: colors.outlineVariant,
  },
  typeText: {
    fontFamily: 'Quicksand-Bold',
  },
  submitBtn: {
    height: 56,
    borderRadius: 100,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderBottomWidth: 4,
    borderBottomColor: colors.primary + '33',
  },
  submitBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.primary,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 8,
  },
  pickerTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 22,
    color: colors.onSurface,
  },
  wheelsContainer: {
    position: 'relative',
    width: '100%',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  highlightBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    backgroundColor: colors.primaryContainer,
    opacity: 0.25,
    borderRadius: 16,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  wheelList: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: 72,
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 22,
    color: colors.onSurfaceVariant,
    opacity: 0.4,
  },
  wheelTextActive: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 26,
    color: colors.primary,
    opacity: 1,
  },
  colon: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 28,
    color: colors.onSurface,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  confirmBtn: {
    height: 56,
    borderRadius: 100,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.primary,
  },
  typePickerWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  calendarContainer: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 100,
  },
  calendarTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  weekdaysRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    opacity: 0.6,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: colors.primaryContainer,
  },
  dayCellOutside: {
    opacity: 0.25,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayCellText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
  },
  dayCellTextSelected: {
    fontFamily: 'Quicksand-Bold',
    color: colors.primary,
  },
  dayCellTextOutside: {
    color: colors.onSurfaceVariant,
  },
  dayCellTextToday: {
    fontFamily: 'Quicksand-Bold',
    color: colors.primary,
  },
  typePicker: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    paddingVertical: 12,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  typeItem: { paddingVertical: 14, paddingHorizontal: 20 },
  typeItemText: { fontFamily: 'Quicksand-Medium', fontSize: 16, color: colors.onSurfaceVariant },
  typeItemTextActive: { color: colors.primary, fontFamily: 'Quicksand-Bold' },
  errorText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: -8,
  },
  dayCellPast: {
    opacity: 0.15,
  },
  dayCellTextPast: {
    color: colors.outlineVariant,
  },
}));
