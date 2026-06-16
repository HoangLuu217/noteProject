import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react-native';
import { createThemedStyles } from '../theme';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface DateRangeCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onSelectRange: (start: string, end: string) => void;
}

export function DateRangeCalendarModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  onSelectRange,
}: DateRangeCalendarModalProps) {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const styles = useStyles(colors);
  const today = new Date();

  // Temporary selection states
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // Calendar month view state
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (startDate) {
      const parts = startDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Sync temp selection with external values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempStartDate(startDate || '');
      setTempEndDate(endDate || '');
      if (startDate) {
        const parts = startDate.split('-');
        if (parts.length === 3) {
          setCurrentMonth(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
        }
      } else {
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      }
    }
  }, [isOpen, startDate, endDate]);

  const getWeekdayName = (dayIndex: number) => {
    const enShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const viShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return language === 'vi' ? viShort[dayIndex] : enShort[dayIndex];
  };

  const getMonthName = (monthIndex: number) => {
    const enFull = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const viFull = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return language === 'vi' ? viFull[monthIndex] : enFull[monthIndex];
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDay = (date: Date) => {
    const dateString = formatDate(date);

    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // First click: select the start date, reset end date
      setTempStartDate(dateString);
      setTempEndDate('');
    } else {
      // Second click: select the second date, re-order if necessary
      const d1 = new Date(tempStartDate);
      const d2 = date;

      if (d2 < d1) {
        setTempStartDate(formatDate(d2));
        setTempEndDate(tempStartDate);
      } else {
        setTempEndDate(formatDate(d2));
      }
    }
  };

  const handleConfirm = () => {
    onSelectRange(tempStartDate, tempEndDate);
    onClose();
  };

  const handleClear = () => {
    setTempStartDate('');
    setTempEndDate('');
    onSelectRange('', '');
    onClose();
  };

  // Generate grid days
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysInGrid: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysInGrid.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysInGrid.push(new Date(year, month, d));
  }

  const monthLabel = language === 'vi'
    ? `${getMonthName(month)} năm ${year}`
    : `${getMonthName(month)} ${year}`;

  const isConfirmEnabled = tempStartDate !== '' && tempEndDate !== '';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centeredView} pointerEvents="box-none">
        <View style={styles.calendarCard}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Calendar size={20} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.modalTitle}>
                {language === 'vi' ? 'Chọn khoảng thời gian' : 'Select Date Range'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIconBtn} activeOpacity={0.7}>
              <X size={20} color={colors.outline} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Range Indicators */}
          <View style={styles.rangeIndicatorRow}>
            <View style={styles.indicatorBox}>
              <Text style={styles.indicatorLabel}>{language === 'vi' ? 'Từ ngày' : 'From'}</Text>
              <Text style={[styles.indicatorValue, tempStartDate ? styles.indicatorValueActive : null]}>
                {tempStartDate || 'YYYY-MM-DD'}
              </Text>
            </View>
            <View style={styles.indicatorSeparator}>
              <Text style={styles.separatorText}>→</Text>
            </View>
            <View style={styles.indicatorBox}>
              <Text style={styles.indicatorLabel}>{language === 'vi' ? 'Đến ngày' : 'To'}</Text>
              <Text style={[styles.indicatorValue, tempEndDate ? styles.indicatorValueActive : null]}>
                {tempEndDate || 'YYYY-MM-DD'}
              </Text>
            </View>
          </View>

          {/* Month Navigator */}
          <View style={styles.monthNavigator}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} activeOpacity={0.7}>
              <ChevronLeft size={20} color={colors.onSurface} strokeWidth={2.5} />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>{monthLabel}</Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn} activeOpacity={0.7}>
              <ChevronRight size={20} color={colors.onSurface} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
              <Text key={dayIdx} style={styles.weekdayCol}>
                {getWeekdayName(dayIdx)}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {daysInGrid.map((date, i) => {
              if (date === null) {
                return <View key={`empty-${i}`} style={styles.dayColEmpty} />;
              }

              const dateString = formatDate(date);
              const isStart = tempStartDate === dateString;
              const isEnd = tempEndDate === dateString;
              const isWithin =
                tempStartDate &&
                tempEndDate &&
                dateString > tempStartDate &&
                dateString < tempEndDate;
              const isToday = isSameDay(date, today);

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleSelectDay(date)}
                  activeOpacity={0.85}
                  style={styles.dayCol}
                >
                  {/* Visual range connection line background */}
                  {isWithin && (
                    <View style={[styles.rangeLineBackground, { left: 0, right: 0 }]} />
                  )}
                  {isStart && tempEndDate !== '' && (
                    <View style={[styles.rangeLineBackground, { left: '50%', right: 0 }]} />
                  )}
                  {isEnd && tempStartDate !== '' && (
                    <View style={[styles.rangeLineBackground, { left: 0, right: '50%' }]} />
                  )}

                  {/* Day cell circle wrapper */}
                  <View
                    style={[
                      styles.dayCircle,
                      isStart || isEnd ? styles.dayCircleSelected : null,
                      isToday && !isStart && !isEnd ? styles.todayOutline : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        isStart || isEnd ? styles.dayNumSelected : null,
                        isWithin ? styles.dayNumWithin : null,
                        isToday && !isStart && !isEnd ? styles.todayNum : null,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.clearBtnText}>
                {language === 'vi' ? 'Xóa bộ lọc' : 'Clear Filter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!isConfirmEnabled}
              style={[
                styles.confirmBtn,
                !isConfirmEnabled ? styles.confirmBtnDisabled : null,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.confirmBtnText,
                  !isConfirmEnabled ? styles.confirmBtnTextDisabled : null,
                ]}
              >
                {language === 'vi' ? 'Xác nhận' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    paddingHorizontal: 16,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  closeIconBtn: {
    padding: 4,
    borderRadius: 100,
    backgroundColor: colors.surface,
  },
  rangeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  indicatorBox: {
    flex: 1,
    alignItems: 'center',
  },
  indicatorLabel: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 10,
    color: colors.outline,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  indicatorValue: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.outlineVariant,
  },
  indicatorValueActive: {
    color: colors.primary,
  },
  indicatorSeparator: {
    paddingHorizontal: 8,
  },
  separatorText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.outline,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  monthTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  weekdayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    paddingBottom: 6,
    marginBottom: 6,
  },
  weekdayCol: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    opacity: 0.7,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCol: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
    position: 'relative',
  },
  dayColEmpty: {
    width: '14.28%',
    height: 40,
  },
  rangeLineBackground: {
    position: 'absolute',
    height: 32,
    backgroundColor: colors.primaryContainer,
    opacity: 0.5,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
  },
  todayOutline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayNum: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.onSurface,
  },
  dayNumSelected: {
    color: colors.surfaceContainerLowest,
  },
  dayNumWithin: {
    color: colors.primary,
  },
  todayNum: {
    color: colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 16,
  },
  clearBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
  },
  clearBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  confirmBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 103, 128, 0.2)',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
    borderBottomWidth: 0,
  },
  confirmBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.primary,
  },
  confirmBtnTextDisabled: {
    color: colors.outline,
  },
}));
