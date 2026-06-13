import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Plus, Sparkles } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskList } from '../components/TaskList';
import { AddTaskModal } from '../components/AddTaskModal';
import { AddAITaskModal } from '../components/AddAITaskModal';
import { Task } from '../types';
import { theme, createThemedStyles } from '../theme';
import { DateSelector } from '../components/DateSelector';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';


function parseTaskDateTime(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr || !timeStr) return null;

  const dateParts = dateStr.split('-');
  if (dateParts.length !== 3) return null;
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // 0-indexed
  const day = parseInt(dateParts[2], 10);

  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  const date = new Date(year, month, day, hours, minutes, 0, 0);
  return isNaN(date.getTime()) ? null : date;
}

const scheduleNotificationForTask = async (
  title: string,
  dateStr?: string,
  timeStr?: string,
  reminderTitle: string = "Task Reminder 📋"
): Promise<string | undefined> => {
  try {
    const saved = await AsyncStorage.getItem('@push_notifications_enabled');
    const isPushEnabled = saved === null ? true : saved === 'true';
    if (!isPushEnabled) {
      console.log('🔔 [Notification] Skipped scheduling: Push notifications are disabled in settings');
      return undefined;
    }

    const targetDate = parseTaskDateTime(dateStr, timeStr);
    if (!targetDate) {
      console.log('🔔 [Notification] Skipped scheduling: Invalid date/time strings');
      return undefined;
    }

    if (targetDate.getTime() <= Date.now()) {
      console.log(`🔔 [Notification] Skipped scheduling: Target time (${targetDate.toISOString()}) is in the past or current time.`);
      return undefined;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log(`🔔 [Notification] Current permission status: ${status}. Requesting permission...`);
      const { status: askStatus } = await Notifications.requestPermissionsAsync();
      if (askStatus !== 'granted') {
        console.log('🔔 [Notification] Permission denied. Cannot schedule.');
        return undefined;
      }
    }

    console.log(`🔔 [Notification] Attempting to schedule for "${title}" at ${targetDate.toString()}...`);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminderTitle,
        body: title,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId: 'default',
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });
    console.log(`🔔 [Notification] Successfully scheduled! ID: ${id}`);
    return id;
  } catch (e) {
    console.error('🔔 [Notification] Error scheduling notification for task:', e);
    return undefined;
  }
};

const cancelNotificationForTask = async (notificationId?: string) => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.error('Failed to cancel task notification:', e);
  }
};

export function TasksScreen({
  setSwipeEnabled,
  tasks,
  setTasks,
  dateSelectorStyle,
}: {
  setSwipeEnabled?: (enabled: boolean) => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  dateSelectorStyle?: 'slider' | 'calendar';
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useStyles(colors);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Request notifications permission on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        console.error('Error requesting notification permissions:', e);
      }
    };
    requestPermissions();
  }, []);

  const handleToggle = async (id: string) => {
    const updatedTasks = await Promise.all(
      tasks.map(async (task) => {
        if (task.id === id) {
          const nextCompleted = !task.completed;
          let notificationId = task.notificationId;

          if (nextCompleted) {
            if (notificationId) {
              await cancelNotificationForTask(notificationId);
              notificationId = undefined;
            }
          } else {
            if (task.date && task.time) {
              notificationId = await scheduleNotificationForTask(task.title, task.date, task.time, t('taskReminder'));
            }
          }

          return { ...task, completed: nextCompleted, notificationId };
        }
        return task;
      })
    );
    setTasks(updatedTasks);
  };

  const handleDelete = async (id: string) => {
    const taskToDelete = tasks.find((task) => task.id === id);
    if (taskToDelete?.notificationId) {
      await cancelNotificationForTask(taskToDelete.notificationId);
    }
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const handleAdd = async (
    taskData:
      | { title: string; time: string; content: string; type: string; date?: string }
      | Array<{ title: string; time: string; content: string; type: string; date?: string }>
  ) => {
    const dataList = Array.isArray(taskData) ? taskData : [taskData];
    const newTasks: Task[] = [];

    for (let i = 0; i < dataList.length; i++) {
      const item = dataList[i];
      let notificationId: string | undefined = undefined;
      if (item.date && item.time) {
        notificationId = await scheduleNotificationForTask(item.title, item.date, item.time, t('taskReminder'));
      }

      newTasks.push({
        id: `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 9)}`,
        title: item.title,
        content: item.content,
        time: item.time,
        type: item.type,
        date: item.date,
        completed: false,
        theme: 'primary', // Fallback, will be calculated dynamically below
        notificationId,
      });
    }

    setTasks((prevTasks) => {
      const tasksWithThemes = newTasks.map((t, idx) => ({
        ...t,
        theme: ((prevTasks.length + idx) % 2 === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
      }));
      return [...tasksWithThemes, ...prevTasks];
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Date selector */}
      <View style={{ marginTop: 8, marginBottom: 24 }}>
        <DateSelector
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          setSwipeEnabled={setSwipeEnabled}
          taskDates={tasks.filter(t => t.date).map(t => t.date as string)}
          viewStyle={dateSelectorStyle}
        />
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        {/* Header Action Row (Filters + Compact Plus Button) */}
        <View style={styles.headerActionRow}>
          <View style={styles.filterRow}>
            {(['all', 'pending', 'completed'] as const).map((f) => {
              const isActive = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    isActive ? styles.filterPillActive : styles.filterPillDefault,
                  ]}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterText,
                      isActive ? styles.filterTextActive : styles.filterTextDefault,
                    ]}
                  >
                    {f === 'all' ? t('filterAll') : f === 'pending' ? t('filterPending') : t('filterCompleted')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={() => setIsOptionModalOpen(true)} style={styles.addCircleBtn} activeOpacity={0.85}>
            <Plus size={24} color={colors.primary} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {/* Daily Progress Bar */}
        {(() => {
          const dayTasks = tasks.filter((t) => !t.date || t.date === formatDate(selectedDate));
          const totalTasks = dayTasks.length;
          const completedTasks = dayTasks.filter((t) => t.completed).length;
          const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

          if (totalTasks === 0) return null;

          return (
            <View style={styles.progressContainer}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressLabel}>{t('dailyProgress')}</Text>
                <Text style={styles.progressStats}>
                  {completedTasks}/{totalTasks} ({Math.round(progress * 100)}%)
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
          );
        })()}

        {/* Task List */}
        <TaskList
          tasks={tasks
            .filter((t) => !t.date || t.date === formatDate(selectedDate))
            .filter((t) => {
              if (filter === 'pending') return !t.completed;
              if (filter === 'completed') return t.completed;
              return true;
            })}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      </View>

      {/* Option Selection bottom sheet */}
      <Modal visible={isOptionModalOpen} transparent animationType="slide" onRequestClose={() => setIsOptionModalOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setIsOptionModalOpen(false)} />
        <View style={styles.sheetContainer} pointerEvents="box-none">
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('chooseCreationMethod')}</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setIsOptionModalOpen(false);
                setIsModalOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Plus size={22} color={colors.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.sheetOptionTexts}>
                <Text style={styles.sheetOptionTitle}>{t('createManually')}</Text>
                <Text style={styles.sheetOptionSub}>{t('createManuallySub')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setIsOptionModalOpen(false);
                setIsAIModalOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: colors.primary + '1F' }]}>
                <Sparkles size={22} color={colors.primary} strokeWidth={2.5} />
              </View>
              <View style={styles.sheetOptionTexts}>
                <Text style={[styles.sheetOptionTitle, { color: colors.primary }]}>{t('createWithAI')}</Text>
                <Text style={styles.sheetOptionSub}>{t('createWithAISub')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
        initialDate={formatDate(selectedDate)}
      />

      <AddAITaskModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onAdd={handleAdd}
        initialDate={formatDate(selectedDate)}
      />
    </ScrollView>
  );
}

function formatDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  greetingCard: {
    marginTop: 32,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: colors.surfaceContainerLow,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  greetingEmoji: {
    fontSize: 36,
  },
  greetingTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 24,
    color: colors.onSurface,
    lineHeight: 30,
  },
  greetingSub: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    width: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(0, 103, 128, 0.2)',
  },
  filterPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterPillActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  filterPillDefault: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  filterText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: colors.primary,
  },
  filterTextDefault: {
    color: colors.outline,
  },
  progressContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  progressStats: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.primary,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 28, 23, 0.4)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    width: '100%',
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
  sheetTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 24,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: colors.surface,
    marginBottom: 14,
    gap: 16,
  },
  sheetOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionTexts: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 17,
    color: colors.onSurface,
    marginBottom: 2,
  },
  sheetOptionSub: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    opacity: 0.8,
  },
}));
