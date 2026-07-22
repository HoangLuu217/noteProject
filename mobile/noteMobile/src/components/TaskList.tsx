import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Check, Clock, Trash2, Calendar } from 'lucide-react-native';
import { Task } from '../types';
import { theme, createThemedStyles } from '../theme';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPressTask: (task: Task) => void;
}

export function TaskList({ tasks, onToggle, onDelete, onPressTask }: TaskListProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useStyles(colors);

  const formatDateTimeText = (time?: string, date?: string) => {
    if (time && date) {
      return `${time} • ${date}`;
    }
    return time || date || '';
  };

  return (
    <View style={styles.list}>
      {tasks.map((task) => {
        const isPrimary = task.theme === 'primary';
        const isSecondary = task.theme === 'secondary';

        let cardBg = colors.surface;
        let cardBorder = colors.outlineVariant;
        let cardOpacity = 1;

        if (task.completed) {
          cardBg = 'rgba(228, 227, 219, 0.3)';
          cardBorder = colors.outlineVariant;
          cardOpacity = 0.6;
        } else if (isPrimary) {
          cardBg = 'rgba(76, 201, 240, 0.1)';
          cardBorder = colors.primaryContainer;
        } else if (isSecondary) {
          cardBg = 'rgba(205, 241, 57, 0.1)';
          cardBorder = colors.secondaryContainer;
        }

        let checkboxBg = colors.surfaceContainerLowest;
        let checkboxBorder = colors.primaryContainer;
        if (task.completed) {
          checkboxBg = colors.secondary;
          checkboxBorder = 'transparent';
        } else if (isSecondary) {
          checkboxBorder = colors.secondaryContainer;
        }

        const hasDateTime = Boolean(task.time || task.date);
        const dateTimeText = formatDateTimeText(task.time, task.date);

        return (
          <View key={task.id} style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, opacity: cardOpacity }]}>
            <TouchableOpacity
              onPress={() => onToggle(task.id)}
              style={[
                styles.checkbox,
                {
                  backgroundColor: checkboxBg,
                  borderColor: checkboxBorder,
                  borderWidth: task.completed ? 0 : 2,
                },
              ]}
              activeOpacity={0.7}
            >
              {task.completed && <Check size={14} color="#fff" strokeWidth={3} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clickableContent}
              activeOpacity={0.7}
              onPress={() => onPressTask(task)}
            >
              {task.parentTask && (
                <View style={[styles.parentBadge, task.completed && styles.tagCompleted]}>
                  <Text
                    style={[styles.parentBadgeText, task.completed && styles.tagTextCompleted]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    📁 {task.parentTask.title.toUpperCase()}
                  </Text>
                </View>
              )}

              <Text
                style={[styles.title, task.completed && styles.titleCompleted]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {task.title}
              </Text>

              {(task.content || task.description || hasDateTime || task.type || task.isMainTask) && (
                <View style={styles.metaStack}>
                  {(task.content || task.description) && (
                    <Text
                      style={[styles.desc, task.completed && styles.descCompleted]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {task.content || task.description}
                    </Text>
                  )}

                  {task.isMainTask && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressText}>
                          {t('progress') || 'Progress'}: {task.progress || 0}%
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${task.progress || 0}%` }]} />
                      </View>
                    </View>
                  )}

                  {(hasDateTime || task.type) && (
                    <View style={styles.tags}>
                      {hasDateTime && (
                        <View style={[styles.tag, task.completed && styles.tagCompleted]}>
                          <Clock
                            size={11}
                            color={task.completed ? colors.outline : colors.onSurfaceVariant}
                            strokeWidth={2.5}
                          />
                          <Text style={[styles.tagText, task.completed && styles.tagTextCompleted]}>
                            {dateTimeText}
                          </Text>
                        </View>
                      )}
                      {task.type && (
                        <View style={[styles.tagType, task.completed && styles.tagCompleted]}>
                          <Text style={[styles.tagTypeText, task.completed && styles.tagTextCompleted]}>
                            {t(task.type.toLowerCase())}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onDelete(task.id)}
              style={styles.deleteBtn}
              activeOpacity={0.6}
            >
              <Trash2 size={18} color={colors.outlineVariant} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  clickableContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 15,
    color: colors.onSurface,
    lineHeight: 20,
  },
  titleCompleted: {
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  metaStack: {
    gap: 4,
    marginTop: 4,
  },
  desc: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 17,
  },
  descCompleted: {
    color: colors.outline,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagCompleted: {
    backgroundColor: colors.surfaceVariant,
  },
  tagText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  tagType: {
    backgroundColor: 'rgba(76, 201, 240, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  tagTypeText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 11,
    color: colors.primary,
  },
  tagTextCompleted: {
    color: colors.outline,
  },
  deleteBtn: {
    padding: 6,
    alignSelf: 'center',
  },
  progressContainer: {
    marginTop: 4,
    marginBottom: 2,
    gap: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 11,
    color: colors.primary,
  },
  progressTrack: {
    height: 5,
    borderRadius: 100,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 100,
  },
  parentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary + '30',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  parentBadgeText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
  },
}));
