import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, ChevronDown, Clock, Pencil, Save, Trash2, X } from 'lucide-react-native';
import { Task } from '../types';
import { createThemedStyles } from '../theme';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';
import { TimePicker, CalendarPicker } from './AddTaskModal';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (id: string, updatedData: Partial<Task> & { planLabel?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  planSuggestions?: string[];
}

const TASK_TYPES = ['Personal', 'Work', 'Study', 'Health'];

export function TaskDetailModal({ isOpen, onClose, task, onSave, onDelete, planSuggestions }: TaskDetailModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useStyles(colors);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('Personal');
  const [planLabel, setPlanLabel] = useState('');
  const [progress, setProgress] = useState(0);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title || '');
      setContent(task.content || task.description || '');
      setDate(task.date || '');
      setTime(task.time || '');
      setType(task.type || 'Personal');
      setPlanLabel(task.parentTask?.title || '');
      setProgress(task.progress || (task.completed ? 100 : 0));
      setError(null);
      setIsEditing(false); // Default to read-only detail view
    }
  }, [isOpen, task]);

  if (!task) return null;

  const handleSelectDate = (selectedDate: string) => {
    setDate(selectedDate);
  };

  const handleSelectTime = (selectedTime: string) => {
    setTime(selectedTime);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError(t('titleRequired') || 'Title is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(task.id, {
        title: title.trim(),
        content: content.trim(),
        description: content.trim(),
        date: date || undefined,
        time: time || undefined,
        type,
        planLabel: planLabel.trim(),
        progress,
      });
      onClose();
    } catch (e: any) {
      console.error('Failed to save task details:', e);
      setError(e.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (e: any) {
      console.error('Failed to delete task:', e);
      setError(e.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickUpdateProgress = async (newProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    setProgress(clampedProgress);
    try {
      await onSave(task.id, {
        progress: clampedProgress,
        completed: clampedProgress === 100,
      });
    } catch (e: any) {
      console.error('Failed to update progress:', e);
      setError(e.message || 'Failed to update progress');
    }
  };

  return (
    <>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.centeredView} pointerEvents="box-none">
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>
                {isEditing
                  ? (t('editTask') || 'Chỉnh sửa công việc')
                  : (t('taskDetails') || 'Chi tiết công việc')}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={20} color={colors.outline} strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {!isEditing ? (
              /* DETAIL VIEW (READ-ONLY) */
              <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 24 }}>
                {task.parentTask && (
                  <View style={styles.detailParentBadge}>
                    <Text style={styles.detailParentBadgeText}>
                      📁 {task.parentTask.title.toUpperCase()}
                    </Text>
                  </View>
                )}

                <Text style={styles.detailTitle}>{title || task.title}</Text>

                {(date || time || type) && (
                  <View style={styles.detailMetaRow}>
                    {date ? (
                      <View style={styles.detailChip}>
                        <Calendar size={13} color={colors.primary} strokeWidth={2.5} />
                        <Text style={styles.detailChipText}>{date}</Text>
                      </View>
                    ) : null}

                    {time ? (
                      <View style={styles.detailChip}>
                        <Clock size={13} color={colors.primary} strokeWidth={2.5} />
                        <Text style={styles.detailChipText}>{time}</Text>
                      </View>
                    ) : null}

                    {type ? (
                      <View style={styles.detailTypeChip}>
                        <Text style={styles.detailTypeChipText}>{t(type.toLowerCase()) || type}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Interactive Progress Selector in Detail View */}
                <View style={styles.detailProgressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.detailProgressLabel}>
                      {t('progress') || 'Tiến độ'}
                    </Text>
                    <Text style={styles.detailProgressValue}>{progress}%</Text>
                  </View>
                  <View style={styles.detailProgressTrack}>
                    <View style={[styles.detailProgressFill, { width: `${progress}%` }]} />
                  </View>
                  <View style={styles.presetRow}>
                    {[0, 25, 50, 75, 100].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.presetBtn, progress === val && styles.presetBtnActive]}
                        onPress={() => handleQuickUpdateProgress(val)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.presetText, progress === val && styles.presetTextActive]}>
                          {val}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.detailContentBox}>
                  <Text style={styles.detailContentLabel}>
                    {t('taskContent') || 'Nội dung chi tiết'}
                  </Text>
                  {content ? (
                    <Text style={styles.detailContentText}>{content}</Text>
                  ) : (
                    <Text style={styles.detailNoContentText}>
                      {t('noContent') || 'Không có mô tả chi tiết'}
                    </Text>
                  )}
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.deleteBtn}
                    disabled={isDeleting}
                    activeOpacity={0.8}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Trash2 size={18} color={colors.error} style={{ marginRight: 8 }} />
                        <Text style={styles.deleteBtnText}>{t('delete') || 'Xóa'}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.editBtn}
                    activeOpacity={0.8}
                  >
                    <Pencil size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.editBtnText}>{t('edit') || 'Chỉnh sửa'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* EDIT MODE VIEW */
              <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Title */}
                <Text style={styles.label}>{t('taskTitle') || 'Title'} *</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('taskTitlePlaceholder') || 'Enter title'}
                  placeholderTextColor={colors.outlineVariant}
                  style={styles.input}
                />

                {/* Description */}
                <Text style={styles.label}>{t('taskContent') || 'Description'}</Text>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder={t('taskDescPlaceholder') || 'Enter description'}
                  placeholderTextColor={colors.outlineVariant}
                  style={styles.textarea}
                  multiline
                  numberOfLines={4}
                />

                {/* Plan Label */}
                <Text style={styles.label}>
                  {t('planLabel') || 'Plan Label / Nhãn dán kế hoạch'}
                </Text>
                <TextInput
                  value={planLabel}
                  onChangeText={setPlanLabel}
                  placeholder={t('planLabelPlaceholder') || 'e.g. Ôn thi học kỳ, Học lái xe...'}
                  placeholderTextColor={colors.outlineVariant}
                  style={styles.input}
                />

                {planSuggestions && planSuggestions.length > 0 && (
                  <View style={styles.chipsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
                      {planSuggestions.map((plan) => (
                        <TouchableOpacity
                          key={plan}
                          style={[styles.chip, planLabel === plan && styles.chipActive]}
                          onPress={() => setPlanLabel(plan)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipText, planLabel === plan && styles.chipTextActive]}>
                            📁 {plan}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}



                {/* Date & Time / Category */}
                <Text style={styles.label}>{t('taskDate') || 'Date'}</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}
                >
                  <Calendar size={18} color={colors.onSurfaceVariant} style={{ marginRight: 8 }} />
                  <Text style={[styles.selectText, !date && styles.placeholderText]}>
                    {date || 'YYYY-MM-DD'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.twoCol}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>{t('taskTime') || 'Time'}</Text>
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(true)}
                      style={styles.selectInput}
                      activeOpacity={0.8}
                    >
                      <Clock
                        size={16}
                        color={time ? colors.onSurface : colors.outlineVariant}
                        strokeWidth={2.5}
                        style={{ marginRight: 8 }}
                      />
                      <Text numberOfLines={1} style={[styles.selectText, !time && styles.placeholderText]}>
                        {time || '--:--'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>{t('taskCategory') || 'Category'}</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setShowTypePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text numberOfLines={1} style={[styles.selectText, styles.typeText]}>
                        {t(type.toLowerCase()) || type}
                      </Text>
                      <ChevronDown size={18} color={colors.onSurfaceVariant} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                {/* Action Buttons: Cancel and Save */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => setIsEditing(false)}
                    style={styles.cancelBtn}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>{t('cancel') || 'Hủy'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSave}
                    style={styles.saveBtn}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Save size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.saveBtnText}>{t('save') || 'Lưu'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        {showTypePicker && (
          <View style={styles.fullscreenOverlay}>
            <Pressable style={styles.backdrop} onPress={() => setShowTypePicker(false)} />
            <View style={styles.typePickerWrap} pointerEvents="box-none">
              <View style={styles.typePicker}>
                {TASK_TYPES.map((taskType) => (
                  <TouchableOpacity
                    key={taskType}
                    onPress={() => {
                      setType(taskType);
                      setShowTypePicker(false);
                    }}
                    style={styles.typeItem}
                  >
                    <Text style={[styles.typeItemText, taskType === type && styles.typeItemTextActive]}>
                      {t(taskType.toLowerCase()) || taskType}
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

        {showTimePicker && (
          <TimePicker
            onClose={() => setShowTimePicker(false)}
            onConfirm={handleSelectTime}
            initialTime={time}
            selectedDate={date}
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
    maxHeight: '85%',
    maxWidth: 420,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 24,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 22,
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
    marginTop: 8,
  },
  input: {
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: colors.surface,
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  textarea: {
    minHeight: 100,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 12,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  fieldCol: {
    flex: 1,
  },
  selectInput: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  selectText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
  },
  placeholderText: {
    color: colors.outlineVariant,
  },
  typeText: {
    color: colors.primary,
    fontFamily: 'Quicksand-Bold',
  },
  errorText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  deleteBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: colors.error,
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 100,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  editBtn: {
    flex: 2,
    height: 48,
    borderRadius: 100,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  editBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  progressEditContainer: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  progressAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adjustBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  adjustBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  progressPreviewContainer: {
    flex: 1,
  },
  progressPreviewTrack: {
    height: 10,
    backgroundColor: colors.surface,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  progressPreviewFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  presetBtn: {
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  presetTextActive: {
    color: '#ffffff',
  },
  typePickerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  typePicker: {
    width: 260,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  typeItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  typeItemText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    color: colors.onSurface,
    textAlign: 'center',
  },
  typeItemTextActive: {
    color: colors.primary,
    fontFamily: 'Quicksand-Bold',
  },
  chipsContainer: {
    marginBottom: 16,
    marginTop: -4,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  // Read-only Detail styles
  detailParentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary + '30',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  detailParentBadgeText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  detailTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    color: colors.onSurface,
    lineHeight: 26,
    marginBottom: 12,
  },
  detailMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  detailChip: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  detailChipText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  detailTypeChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  detailTypeChipText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.primary,
  },
  detailProgressContainer: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailProgressLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  detailProgressValue: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.primary,
  },
  detailProgressTrack: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 100,
    overflow: 'hidden',
    marginTop: 6,
  },
  detailProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 100,
  },
  detailContentBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: 14,
  },
  detailContentLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.outline,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailContentText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
    lineHeight: 22,
  },
  detailNoContentText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 14,
    color: colors.outlineVariant,
    fontStyle: 'italic',
  },
}));
