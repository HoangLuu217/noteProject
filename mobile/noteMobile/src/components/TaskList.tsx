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
}

export function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useStyles(colors);

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

        return (
          <View key={task.id} style={{ marginBottom: 8 }}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, opacity: cardOpacity }]}>
              <TouchableOpacity
                onPress={() => onToggle(task.id)}
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: checkboxBg,
                    borderColor: checkboxBorder,
                    borderWidth: task.completed ? 0 : 4,
                  },
                ]}
                activeOpacity={0.7}
              >
                {task.completed && <Check size={20} color="#fff" strokeWidth={3} />}
              </TouchableOpacity>

              <View style={styles.content}>
                <Text style={[styles.title, task.completed && styles.titleCompleted]}>
                  {task.title}
                </Text>

                {(task.content || task.description || task.time || task.type) && (
                  <View style={styles.metaStack}>
                    {(task.content || task.description) && (
                      <Text style={[styles.desc, task.completed && styles.descCompleted]}>
                        {task.content || task.description}
                      </Text>
                    )}

                    <View style={styles.tags}>
                      {task.time && (
                        <View style={[styles.tag, task.completed && styles.tagCompleted]}>
                          <Clock
                            size={12}
                            color={task.completed ? colors.outline : colors.onSurfaceVariant}
                            strokeWidth={3}
                          />
                          <Text style={[styles.tagText, task.completed && styles.tagTextCompleted]}>
                            {task.time}
                          </Text>
                        </View>
                      )}
                      {task.date && (
                        <View style={[styles.tag, task.completed && styles.tagCompleted]}>
                          <Calendar
                            size={12}
                            color={task.completed ? colors.outline : colors.onSurfaceVariant}
                            strokeWidth={3}
                          />
                          <Text style={[styles.tagText, task.completed && styles.tagTextCompleted]}>
                            {task.date}
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
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => onDelete(task.id)}
                style={styles.deleteBtn}
                activeOpacity={0.6}
              >
                <Trash2 size={24} color={colors.outlineVariant} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  list: {
    gap: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 16,
  },
  checkbox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 20,
    color: colors.onSurface,
    lineHeight: 24,
  },
  titleCompleted: {
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  metaStack: {
    gap: 8,
    marginTop: 8,
  },
  desc: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  descCompleted: {
    color: colors.outline,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  tagType: {
    backgroundColor: 'rgba(76, 201, 240, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  tagTypeText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.primary,
  },
  tagTextCompleted: {
    color: colors.outline,
  },
  deleteBtn: {
    padding: 8,
    marginTop: 2,
  },
}));
