import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, TouchableOpacity, Text, View, Dimensions, Modal, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react-native';
import { theme, createThemedStyles } from '../theme';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function DateSelector({
  selectedDate,
  onSelectDate,
  setSwipeEnabled,
  taskDates = [],
  viewStyle = 'slider',
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  setSwipeEnabled?: (enabled: boolean) => void;
  taskDates?: string[];
  viewStyle?: 'slider' | 'calendar';
}) {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const styles = useStyles(colors);
  const scrollRef = useRef<ScrollView | null>(null);
  const today = new Date();
  const days = Array.from({ length: 21 }, (_, i) => addDays(today, i - 3));

  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  });
  const [isModalVisible, setIsModalVisible] = useState(false);

  const getWeekdayName = (dayIndex: number, short = true) => {
    const enShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const viShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const enFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const viFull = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    
    if (language === 'vi') {
      return short ? viShort[dayIndex] : viFull[dayIndex];
    }
    return short ? enShort[dayIndex] : enFull[dayIndex];
  };

  const getMonthName = (monthIndex: number, short = false) => {
    const enShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const enFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const viShort = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
    const viFull = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

    if (language === 'vi') {
      return short ? viShort[monthIndex] : viFull[monthIndex];
    }
    return short ? enShort[monthIndex] : enFull[monthIndex];
  };

  const getFormattedDateLabel = (date: Date) => {
    const weekday = getWeekdayName(date.getDay(), false);
    const month = getMonthName(date.getMonth(), true);
    const day = date.getDate();
    const year = date.getFullYear();

    if (language === 'vi') {
      return `${weekday}, ngày ${day} ${month}, ${year}`;
    }
    return `${weekday}, ${month} ${day}, ${year}`;
  };

  useEffect(() => {
    setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    if (viewStyle !== 'slider') return;
    const idx = days.findIndex(d => isSameDay(d, selectedDate));
    if (idx !== -1 && scrollRef.current) {
      const itemWidth = 72 + 12; // width (72) + gap (12) in row
      const scrollX = idx * itemWidth - SCREEN_WIDTH / 2 + 72 / 2 + 24; // 24 is paddingHorizontal
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: true });
      }, 50);
    }
  }, [selectedDate, viewStyle]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (viewStyle === 'calendar') {
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

    return (
      <View style={styles.buttonWrapper}>
        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          style={styles.calendarBtn}
          activeOpacity={0.8}
        >
          <View style={styles.calendarBtnLeft}>
            <Calendar size={20} color={colors.primary} strokeWidth={2.5} style={{ marginRight: 8 }} />
            <Text style={styles.calendarBtnText}>{getFormattedDateLabel(selectedDate)}</Text>
          </View>
          <ChevronRight size={20} color={colors.outline} strokeWidth={2.5} />
        </TouchableOpacity>

        <Modal
          visible={isModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setIsModalVisible(false)} />
          <View style={styles.modalCenteredView} pointerEvents="box-none">
            <View style={styles.calendarContainer}>
              {/* Navigation Header */}
              <View style={styles.calendarHeader}>
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
                  <Text key={dayIdx} style={styles.weekdayCol}>{getWeekdayName(dayIdx, true)}</Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {daysInGrid.map((date, i) => {
                  if (date === null) {
                    return <View key={`empty-${i}`} style={styles.dayColEmpty} />;
                  }

                  const selected = isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, today);
                  const hasTasks = taskDates.includes(formatDate(date));

                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        onSelectDate(date);
                        setIsModalVisible(false);
                      }}
                      activeOpacity={0.85}
                      style={[
                        styles.dayCol,
                        selected ? styles.daySelected : styles.dayDefault,
                        isToday && !selected ? styles.todayOutline : null
                      ]}
                    >
                      <Text style={[
                        styles.dayColNum,
                        selected ? styles.dayNumSelected : styles.dayNumDefault,
                        isToday && !selected ? styles.weekdayToday : null
                      ]}>
                        {date.getDate()}
                      </Text>
                      {hasTasks && <View style={[styles.gridDot, selected ? styles.dotSelected : styles.dotDefault]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.8}
              >
                <X size={18} color={colors.onSurfaceVariant} strokeWidth={3} />
                <Text style={styles.closeBtnText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      nestedScrollEnabled={true}
      onTouchStart={() => setSwipeEnabled?.(false)}
      onTouchEnd={() => setSwipeEnabled?.(true)}
      onMomentumScrollEnd={() => setSwipeEnabled?.(true)}
    >
      {days.map((date, i) => {
        const selected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, today);
        const hasTasks = taskDates.includes(formatDate(date));

        return (
          <TouchableOpacity
            key={i}
            onPress={() => onSelectDate(date)}
            activeOpacity={0.85}
            style={[
              styles.dayButton,
              selected ? styles.daySelected : styles.dayDefault,
              isToday && !selected ? styles.todayOutline : null
            ]}
          >
            <Text style={[
              styles.weekday,
              selected ? styles.weekdaySelected : styles.weekdayDefault,
              isToday && !selected ? styles.weekdayToday : null
            ]}>
              {isToday ? t('today') : getWeekdayName(date.getDay(), true)}
            </Text>
            <Text style={[styles.dayNum, selected ? styles.dayNumSelected : styles.dayNumDefault]}>
              {date.getDate()}
            </Text>
            {hasTasks && <View style={[styles.dot, selected ? styles.dotSelected : styles.dotDefault]} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  row: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    gap: 12,
  },
  dayButton: {
    width: 72,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dayDefault: {
    backgroundColor: colors.surfaceContainer,
  },
  daySelected: {
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: '#fff',
  },
  weekday: {
    fontSize: 12,
    fontFamily: 'Quicksand-Bold',
    marginBottom: 4,
  },
  weekdayDefault: {
    color: colors.onSurfaceVariant,
    opacity: 0.7,
  },
  weekdaySelected: {
    color: colors.onPrimaryContainer,
    opacity: 0.9,
  },
  dayNum: {
    fontSize: 22,
    fontFamily: 'Quicksand-Bold',
  },
  dayNumDefault: {
    color: colors.onSurface,
  },
  dayNumSelected: {
    color: colors.onPrimaryContainer,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  dotDefault: {
    backgroundColor: colors.primary,
  },
  dotSelected: {
    backgroundColor: colors.onPrimaryContainer,
  },
  todayOutline: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  weekdayToday: {
    color: colors.primary,
  },
  calendarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
    width: '100%',
    maxWidth: 340,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  monthTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  weekdayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  weekdayCol: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    opacity: 0.7,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCol: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  dayColEmpty: {
    width: '14.28%',
    height: 44,
  },
  dayColNum: {
    fontSize: 15,
    fontFamily: 'Quicksand-Bold',
  },
  gridDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 4,
  },
  buttonWrapper: {
    paddingHorizontal: 24,
  },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 28, 23, 0.4)',
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  closeBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
}));
