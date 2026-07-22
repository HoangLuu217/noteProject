import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { Plus, Sparkles, Calendar, X } from 'lucide-react-native';
import { DateRangeCalendarModal } from '../components/DateRangeCalendarModal';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskList } from '../components/TaskList';
import { AddTaskModal } from '../components/AddTaskModal';
import { AddAITaskModal } from '../components/AddAITaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { Task } from '../types';
import { theme, createThemedStyles } from '../theme';
import { DateSelector } from '../components/DateSelector';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { useAuthStore } from '../stores/authStore';
import { createTaskOnServer, updateTaskOnServer, deleteTaskFromServer } from '../services/taskService';


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
  loadTasks,
}: {
  setSwipeEnabled?: (enabled: boolean) => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  loadTasks: () => Promise<void>;
}) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const styles = useStyles(colors);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const accessToken = useAuthStore((s) => s.accessToken);

  const planSuggestions = useMemo(() => {
    const titles = tasks
      .filter((t) => t.isMainTask && t.title)
      .map((t) => t.title);
    return Array.from(new Set(titles)).filter(Boolean);
  }, [tasks]);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

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
    if (!accessToken) return;
    const taskToToggle = tasks.find((t) => t.id === id);
    if (!taskToToggle) return;

    const nextCompleted = !taskToToggle.completed;
    try {
      let notificationId = taskToToggle.notificationId;

      if (nextCompleted) {
        if (notificationId) {
          await cancelNotificationForTask(notificationId);
          notificationId = undefined;
        }
      } else {
        if (taskToToggle.date && taskToToggle.time) {
          notificationId = await scheduleNotificationForTask(taskToToggle.title, taskToToggle.date, taskToToggle.time, t('taskReminder'));
        }
      }

      await updateTaskOnServer(accessToken, id, {
        completed: nextCompleted,
        notificationId,
      });

      // Update local state temporarily for snappy UI
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            return { ...t, completed: nextCompleted, notificationId };
          }
          return t;
        })
      );

      // Sync from server to get accurate progress changes on parents
      await loadTasks();
    } catch (e) {
      console.error('Failed to toggle task:', e);
      Alert.alert(t('error') || 'Error', 'Failed to update task status on server');
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    const taskToDelete = tasks.find((task) => task.id === id);
    try {
      if (taskToDelete?.notificationId) {
        await cancelNotificationForTask(taskToDelete.notificationId);
      }

      await deleteTaskFromServer(accessToken, id);

      // Reload tasks from server to sync cascade deletions and parent progress
      await loadTasks();
    } catch (e) {
      console.error('Failed to delete task:', e);
      Alert.alert(t('error') || 'Error', 'Failed to delete task from server');
    }
  };

  const handleSaveDetail = async (id: string, updatedData: Partial<Task> & { planLabel?: string }) => {
    if (!accessToken) return;
    try {
      console.log('📱 [Mobile] Saving task detail for ID:', id, 'Payload:', JSON.stringify(updatedData));
      await updateTaskOnServer(accessToken, id, updatedData);
      await loadTasks();
    } catch (e: any) {
      console.error('Failed to save task detail:', e);
      throw e;
    }
  };

  const handleDeleteDetail = async (id: string) => {
    await handleDelete(id);
  };

  const handleAdd = async (
    taskData:
      | { id?: string; title: string; time: string; content: string; type: string; date?: string; planLabel?: string }
      | Array<{ id?: string; title: string; time: string; content: string; type: string; date?: string; planLabel?: string }>
  ) => {
    if (!accessToken) {
      console.log('📱 [Mobile] Cannot add task: No access token');
      return;
    }
    console.log('📱 [Mobile] handleAdd invoked with data:', JSON.stringify(taskData));
    const dataList = Array.isArray(taskData) ? taskData : [taskData];

    try {
      for (let i = 0; i < dataList.length; i++) {
        const item = dataList[i];
        let savedTask: Task;

        if (item.id) {
          console.log('📱 [Mobile] Task already saved on server, skipping creation:', item.id);
          savedTask = item as Task;
        } else {
          console.log('📱 [Mobile] Creating task on server for item:', JSON.stringify(item));
          savedTask = await createTaskOnServer(accessToken, {
            title: item.title,
            content: item.content,
            date: item.date,
            time: item.time,
            type: item.type,
            completed: false,
            planLabel: item.planLabel,
          });
          console.log('📱 [Mobile] Created task on server successfully! Result:', JSON.stringify(savedTask));
        }

        let notificationId: string | undefined = undefined;
        if (item.date && item.time) {
          notificationId = await scheduleNotificationForTask(item.title, item.date, item.time, t('taskReminder'));
          if (notificationId) {
            savedTask.notificationId = notificationId;
            console.log('📱 [Mobile] Scheduling local notification. ID:', notificationId);
            await updateTaskOnServer(accessToken, savedTask.id, { notificationId });
          }
        }
      }

      await loadTasks();
    } catch (e) {
      console.error('Failed to create task on server:', e);
      Alert.alert(
        t('error') || 'Error',
        e instanceof Error ? e.message : 'Failed to create task on server'
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Date selector */}
        <View style={{ marginTop: 8, marginBottom: 12 }}>
          <DateSelector
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            setSwipeEnabled={setSwipeEnabled}
            taskDates={tasks.filter(t => t.date).map(t => t.date as string)}
            viewStyle="slider"
          />
        </View>

        <View style={{ paddingHorizontal: 12 }}>
          {/* Header Action Row (Filters) */}
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

              {/* Calendar Range Filter Button */}
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  (startDate && endDate) ? styles.filterPillActive : styles.filterPillDefault,
                  { paddingHorizontal: 12 }
                ]}
                onPress={() => setIsCalendarModalOpen(true)}
                activeOpacity={0.8}
              >
                <Calendar size={18} color={(startDate && endDate) ? colors.primary : colors.outline} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Range Banner */}
          {startDate && endDate ? (
            <View style={styles.activeRangeBanner}>
              <Calendar size={16} color={colors.primary} strokeWidth={2.5} style={{ marginRight: 4 }} />
              <Text style={styles.activeRangeText}>
                {language === 'vi' ? 'Lọc từ: ' : 'Filtered: '}
                {formatShortDate(startDate)} → {formatShortDate(endDate)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                style={styles.clearRangeBtn}
                activeOpacity={0.7}
              >
                <X size={14} color={colors.outline} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Daily Progress Bar */}
          {(() => {
            const dayTasks = tasks.filter((t) => {
              if (startDate && endDate) {
                return !t.date || (t.date >= startDate && t.date <= endDate);
              }
              return !t.date || t.date === formatDate(selectedDate);
            });
            const totalTasks = dayTasks.length;
            const completedTasks = dayTasks.filter((t) => t.completed).length;
            const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

            if (totalTasks === 0) return null;

            return (
              <View style={styles.progressContainer}>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressLabel}>
                    {startDate && endDate
                      ? (language === 'vi' ? 'Tiến độ khoảng thời gian' : 'Range Progress')
                      : t('dailyProgress')
                    }
                  </Text>
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
              .filter((t) => {
                if (startDate && endDate) {
                  return !t.date || (t.date >= startDate && t.date <= endDate);
                }
                return !t.date || t.date === formatDate(selectedDate);
              })
              .filter((t) => {
                if (filter === 'pending') return !t.completed;
                if (filter === 'completed') return t.completed;
                return true;
              })}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onPressTask={(task) => setSelectedDetailTask(task)}
          />
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => setIsOptionModalOpen(true)}
        activeOpacity={0.85}
      >
        <Plus size={28} color={colors.primary} strokeWidth={3} />
      </TouchableOpacity>

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
        initialDate={startDate ? startDate : formatDate(selectedDate)}
        planSuggestions={planSuggestions}
      />

      <AddAITaskModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onAdd={handleAdd}
        initialDate={startDate ? startDate : formatDate(selectedDate)}
      />

      <TaskDetailModal
        isOpen={selectedDetailTask !== null}
        onClose={() => setSelectedDetailTask(null)}
        task={selectedDetailTask}
        onSave={handleSaveDetail}
        onDelete={handleDeleteDetail}
        planSuggestions={planSuggestions}
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
    </View>
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
    marginBottom: 12,
    width: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 100,
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
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderBottomWidth: 5,
    borderBottomColor: colors.primary + '33',
    zIndex: 99,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    fontSize: 13,
    textTransform: 'capitalize',
  },
  filterTextActive: {
    color: colors.primary,
  },
  filterTextDefault: {
    color: colors.outline,
  },
  progressContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
  activeRangeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer + '1F',
    borderWidth: 1.5,
    borderColor: colors.primary + '33',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  activeRangeText: {
    flex: 1,
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.primary,
  },
  clearRangeBtn: {
    padding: 4,
    borderRadius: 100,
    backgroundColor: colors.surfaceContainerHigh,
  },
}));
