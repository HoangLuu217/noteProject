import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { User, Bell, Palette, Lock, ChevronRight, Pencil, Globe } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsModal, SettingsType } from '../components/SettingsModal';
import { useAuthStore } from '../stores/authStore';
import { theme, createThemedStyles } from '../theme';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { Task } from '../types';

function calculateStreak(tasks: Task[]): number {
  const completedDates = new Set(
    tasks
      .filter(t => t.completed && t.date)
      .map(t => t.date as string)
  );

  if (completedDates.size === 0) return 0;

  const today = new Date();
  const formatDateStr = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  let streak = 0;
  let checkDate = new Date(today);

  // Check if today has a completed task
  const todayStr = formatDateStr(checkDate);
  const hasToday = completedDates.has(todayStr);

  // Check if yesterday has a completed task
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateStr(yesterday);
  const hasYesterday = completedDates.has(yesterdayStr);

  // If neither today nor yesterday has a completed task, streak is 0
  if (!hasToday && !hasYesterday) {
    return 0;
  }

  // Start checking from the most recent active day (today if today has tasks, else yesterday)
  if (hasToday) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    streak = 1;
    checkDate = yesterday;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Loop backwards to find consecutive days
  while (true) {
    const dateStr = formatDateStr(checkDate);
    if (completedDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

interface ProfileScreenProps {
  avatarUrl: any;
  onChangeAvatar?: (newUri: string) => void;
  tasks?: Task[];
  profileName: string;
  onChangeName: (name: string) => void;
  dateSelectorStyle: 'slider' | 'calendar';
  setDateSelectorStyle: (style: 'slider' | 'calendar') => void;
}

export function ProfileScreen({ avatarUrl, onChangeAvatar, tasks = [], profileName, onChangeName, dateSelectorStyle, setDateSelectorStyle }: ProfileScreenProps) {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const styles = useStyles(colors);
  const logout = useAuthStore((s) => s.logout);
  const [activeModal, setActiveModal] = useState<SettingsType | null>(null);
  const [profileSub, setProfileSub] = useState('Software Engineer');

  const handleSelectAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        onChangeAvatar?.(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Error picking image:', e);
    }
  };

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const streak = calculateStreak(tasks);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const savedSub = await AsyncStorage.getItem('@profile_sub');
        if (savedSub) {
          setProfileSub(savedSub);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadProfileData();
  }, []);

  const getThemeBadgeText = (themeName: string) => {
    switch (themeName) {
      case 'green': return t('pastelGreen');
      case 'blue': return t('oceanBlue');
      case 'pink': return t('strawberry');
      case 'yellow': return t('sunnyYellow');
      default: return t('oceanBlue');
    }
  };

  const { colorTheme } = useTheme();

  const settingsItems = [
    {
      type: 'Account' as SettingsType,
      label: t('account'),
      sub: t('manageProfile'),
      icon: <User size={24} color={colors.primary} strokeWidth={2.5} />,
      iconBg: 'rgba(76, 201, 240, 0.3)',
    },
    {
      type: 'Notifications' as SettingsType,
      label: t('notifications'),
      sub: t('alertsReminders'),
      icon: <Bell size={24} color={colors.secondary} strokeWidth={2.5} />,
      iconBg: 'rgba(205, 241, 57, 0.3)',
    },
    {
      type: 'Theme' as SettingsType,
      label: t('theme'),
      sub: t('colorsSquishiness'),
      icon: <Palette size={24} color={colors.tertiary} strokeWidth={2.5} />,
      iconBg: 'rgba(206, 189, 0, 0.3)',
      badge: getThemeBadgeText(colorTheme),
    },
    {
      type: 'Language' as SettingsType,
      label: t('language'),
      sub: t('languageSub'),
      icon: <Globe size={24} color={colors.primary} strokeWidth={2.5} />,
      iconBg: 'rgba(76, 201, 240, 0.3)',
      badge: language === 'en' ? 'English' : 'Tiếng Việt',
    },
    {
      type: 'Privacy' as SettingsType,
      label: t('privacy'),
      sub: t('securitySettings'),
      icon: <Lock size={24} color={colors.error} strokeWidth={2.5} />,
      iconBg: 'rgba(255, 218, 214, 0.3)',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Hero */}
      <View style={styles.hero}>
        <TouchableOpacity 
          style={styles.avatarWrapper} 
          onPress={handleSelectAvatar}
          activeOpacity={0.85}
        >
          <View style={styles.avatarRing}>
            <Image 
              source={typeof avatarUrl === 'string' ? { uri: avatarUrl } : avatarUrl} 
              style={styles.avatar} 
            />
          </View>
          <View style={styles.editBtn}>
            <Pencil size={16} color={colors.onSecondaryContainer} strokeWidth={3} />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{profileName}</Text>
        <Text style={styles.profileSub}>{profileSub}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: 'rgba(0, 103, 128, 0.05)', borderColor: 'rgba(0, 103, 128, 0.2)' }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{completedTasksCount}</Text>
          <Text style={[styles.statLabel, { color: `${colors.primary}AA` }]}>{t('tasksDone')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: 'rgba(205, 241, 57, 0.1)', borderColor: 'rgba(83, 101, 0, 0.2)' }]}>
          <Text style={[styles.statNum, { color: colors.secondary }]}>{streak}</Text>
          <Text style={[styles.statLabel, { color: `${colors.secondary}AA` }]}>{t('dayStreak')}</Text>
        </View>
      </View>

      {/* Settings */}
      <Text style={styles.sectionTitle}>{t('settings')}</Text>
      <View style={styles.settingsList}>
        {settingsItems.map((item) => (
          <TouchableOpacity
            key={item.type}
            onPress={() => setActiveModal(item.type)}
            style={styles.settingRow}
            activeOpacity={0.85}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: item.iconBg }]}>
                {item.icon}
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingSub}>{item.sub}</Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              {item.badge && (
                <Text style={styles.settingBadge}>{item.badge}</Text>
              )}
              <ChevronRight size={24} color={colors.outline} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        activeOpacity={0.85}
        onPress={() => {
          logout().catch((err) => {
            console.error('Logout error:', err);
          });
        }}
      >
        <Text style={styles.logoutBtnText}>{t('logOut')}</Text>
      </TouchableOpacity>

      <SettingsModal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        type={activeModal}
        profileName={profileName}
        onNameChange={onChangeName}
        profileSub={profileSub}
        onSubChange={async (newSub) => {
          setProfileSub(newSub);
          try {
            await AsyncStorage.setItem('@profile_sub', newSub);
          } catch (e) {
            console.error(e);
          }
        }}
        dateSelectorStyle={dateSelectorStyle}
        setDateSelectorStyle={setDateSelectorStyle}
      />
    </ScrollView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#006780',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  editBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileName: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 36,
    color: colors.onSurface,
    marginBottom: 4,
    textAlign: 'center',
  },
  profileSub: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: colors.outline,
    letterSpacing: 0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 48,
  },
  statCard: {
    flex: 1,
    borderRadius: 32,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statNum: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 36,
    lineHeight: 44,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 22,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  settingsList: {
    gap: 16,
    marginBottom: 48,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
    paddingRight: 12,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  settingSub: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 14,
    color: colors.outline,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  settingBadge: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: colors.secondary,
  },
  logoutBtn: {
    paddingVertical: 20,
    borderRadius: 24,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  logoutBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    color: colors.onSurfaceVariant,
  },
}));
