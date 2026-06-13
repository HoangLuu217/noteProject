import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { X, User, Bell, Palette, Lock, Globe, Settings } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { theme, createThemedStyles, ColorTheme } from '../theme';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';
import { useAuthStore } from '../stores/authStore';

function LiquidToggle({
  value,
  onValueChange,
  colors,
  styles,
}: {
  value: boolean;
  onValueChange: () => void;
  colors: any;
  styles: any;
}) {
  const anim = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 7.5,
      tension: 40,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24],
  });

  const scaleX = anim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 1.35, 1.45, 1.35, 1],
  });

  const scaleY = anim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.85, 0.75, 0.85, 1],
  });

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceVariant, colors.primary],
  });

  return (
    <TouchableOpacity onPress={onValueChange} activeOpacity={0.8}>
      <Animated.View style={[styles.toggle, { backgroundColor: trackBg }]}>
        <Animated.View
          style={[
            styles.toggleKnob,
            {
              transform: [
                { translateX },
                { scaleX },
                { scaleY },
              ],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

function LiquidPillToggle({
  label,
  onPress,
  colors,
  styles,
}: {
  label: string;
  onPress: () => void;
  colors: any;
  styles: any;
}) {
  const scaleX = React.useRef(new Animated.Value(1)).current;
  const scaleY = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleX, { toValue: 1.25, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleX, { toValue: 1.0, friction: 3.5, tension: 40, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(scaleY, { toValue: 0.75, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleY, { toValue: 1.0, friction: 3.5, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <Animated.View
        style={[
          styles.pillBtn,
          {
            backgroundColor: colors.primary + '14',
            borderColor: colors.primary + '2B',
            borderWidth: 1.5,
            transform: [
              { scaleX },
              { scaleY },
            ],
          }
        ]}
      >
        <Text style={[styles.pillText, { color: colors.primary }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export type SettingsType = 'Account' | 'Notifications' | 'Theme' | 'Privacy' | 'Language' | 'AuthSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: SettingsType | null;
  profileName?: string;
  onNameChange?: (name: string) => void;
  profileSub?: string;
  onSubChange?: (sub: string) => void;
  dateSelectorStyle?: 'slider' | 'calendar';
  setDateSelectorStyle?: (style: 'slider' | 'calendar') => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  type,
  profileName,
  onNameChange,
  profileSub,
  onSubChange,
  dateSelectorStyle = 'slider',
  setDateSelectorStyle
}: SettingsModalProps) {
  const { isDark, toggleDarkMode, colorTheme, setColorTheme, colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const styles = useStyles(colors);
  const user = useAuthStore((s) => s.user);

  const getModalTitle = () => {
    switch (type) {
      case 'Account': return t('account');
      case 'Notifications': return t('notifications');
      case 'Theme': return t('theme');
      case 'Privacy': return t('privacy');
      case 'Language': return t('language');
      case 'AuthSettings': return language === 'en' ? 'Settings' : 'Cài đặt';
      default: return type || '';
    }
  };

  const changeDateSelectorStyle = async (style: 'slider' | 'calendar') => {
    try {
      setDateSelectorStyle?.(style);
      await AsyncStorage.setItem('@date_selector_style', style);
    } catch (e) {
      console.error('Failed to save date selector style:', e);
    }
  };

  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [emailEnabled, setEmailEnabled] = React.useState(false);
  const [nameInput, setNameInput] = React.useState('HoangLuu');
  const [subInput, setSubInput] = React.useState('Software Engineer');

  React.useEffect(() => {
    if (isOpen && profileName) {
      setNameInput(profileName);
    }
  }, [isOpen, profileName]);

  React.useEffect(() => {
    if (isOpen && profileSub) {
      setSubInput(profileSub);
    }
  }, [isOpen, profileSub]);

  React.useEffect(() => {
    if (isOpen && type === 'Notifications') {
      const loadSettings = async () => {
        try {
          const val = await AsyncStorage.getItem('@push_notifications_enabled');
          setPushEnabled(val === null ? true : val === 'true');

          const emailVal = await AsyncStorage.getItem('@email_reminders_enabled');
          setEmailEnabled(emailVal === 'true');
        } catch (e) {
          console.error(e);
        }
      };
      loadSettings();
    }
  }, [isOpen, type]);

  const togglePush = async () => {
    const nextVal = !pushEnabled;
    setPushEnabled(nextVal);
    try {
      await AsyncStorage.setItem('@push_notifications_enabled', String(nextVal));
      if (nextVal) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted' && Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleEmail = async () => {
    const nextVal = !emailEnabled;
    setEmailEnabled(nextVal);
    try {
      await AsyncStorage.setItem('@email_reminders_enabled', String(nextVal));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = () => {
    if (type === 'Account') {
      onNameChange?.(nameInput);
      onSubChange?.(subInput);
    }
    onClose();
  };

  if (!type) return null;

  const getIcon = () => {
    switch (type) {
      case 'Account': return <User size={28} color={colors.primary} />;
      case 'Notifications': return <Bell size={28} color={colors.secondary} />;
      case 'Theme': return <Palette size={28} color={colors.tertiary} />;
      case 'Privacy': return <Lock size={28} color={colors.error} />;
      case 'Language': return <Globe size={28} color={colors.primary} />;
      case 'AuthSettings': return <Settings size={28} color={colors.primary} />;
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'Account':
        return (
          <View style={styles.section}>
            <Text style={styles.inputLabel}>{t('name')}</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              style={styles.inputBox}
              placeholderTextColor={colors.outlineVariant}
            />
            <Text style={styles.inputLabel}>{t('profileSubtitle')}</Text>
            <TextInput
              value={subInput}
              onChangeText={setSubInput}
              style={styles.inputBox}
              placeholderTextColor={colors.outlineVariant}
            />
            <Text style={styles.inputLabel}>{t('email')}</Text>
            <TextInput
              defaultValue={user?.email || "hoangluu@taskflow.demo"}
              editable={false}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.inputBox, { opacity: 0.6 }]}
              placeholderTextColor={colors.outlineVariant}
            />
          </View>
        );
      case 'Notifications':
        return (
          <View style={styles.section}>
            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>{t('pushNotifications')}</Text>
              <LiquidToggle value={pushEnabled} onValueChange={togglePush} colors={colors} styles={styles} />
            </View>
            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>{t('emailReminders')}</Text>
              <LiquidToggle value={emailEnabled} onValueChange={toggleEmail} colors={colors} styles={styles} />
            </View>
          </View>
        );
      case 'Theme':
        return (
          <View style={styles.section}>
            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>{t('darkMode')}</Text>
              <LiquidToggle value={isDark} onValueChange={toggleDarkMode} colors={colors} styles={styles} />
            </View>
 
            <View style={styles.settingsSelectorRow}>
              <Text style={styles.selectorLabel}>{t('calendarView')}</Text>
              <LiquidPillToggle
                label={dateSelectorStyle === 'slider' ? t('slider') : t('calendar')}
                onPress={() => changeDateSelectorStyle(dateSelectorStyle === 'slider' ? 'calendar' : 'slider')}
                colors={colors}
                styles={styles}
              />
            </View>
 
            <View style={styles.themeGrid}>
              {[
                { type: 'green', label: t('pastelGreen'), bg: '#b9f3b8', fg: '#002106' },
                { type: 'blue', label: t('oceanBlue'), bg: '#4cc9f0', fg: '#005266' },
                { type: 'pink', label: t('strawberry'), bg: '#ffd9e6', fg: '#390021' },
                { type: 'yellow', label: t('sunnyYellow'), bg: '#f8e388', fg: '#211b00' },
              ].map((t) => {
                const isSelected = colorTheme === t.type;
                return (
                  <TouchableOpacity
                    key={t.type}
                    onPress={() => setColorTheme(t.type as ColorTheme)}
                    style={[
                      styles.themeBox,
                      {
                        backgroundColor: t.bg,
                        opacity: isSelected ? 1 : 0.5,
                        borderWidth: isSelected ? 4 : 2,
                        borderColor: isSelected ? '#fff' : 'rgba(0,0,0,0.05)',
                      }
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.themeBoxText, { color: t.fg }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      case 'Privacy':
        return (
          <View style={styles.section}>
            <TouchableOpacity style={styles.privacyBtn} activeOpacity={0.8}>
              <Text style={styles.privacyBtnText}>{t('changePassword')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.privacyBtn} activeOpacity={0.8}>
              <Text style={styles.privacyBtnText}>{t('twoFactor')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.privacyBtn, styles.deleteBtn]} activeOpacity={0.8}>
              <Text style={styles.deleteBtnText}>{t('deleteAccount')}</Text>
            </TouchableOpacity>
          </View>
        );
      case 'Language':
        return (
          <View style={styles.section}>
            <View style={styles.settingsSelectorRow}>
              <Text style={styles.selectorLabel}>{t('language')}</Text>
              <LiquidPillToggle
                label={language === 'en' ? 'English' : 'Tiếng Việt'}
                onPress={() => setLanguage(language === 'en' ? 'vi' : 'en')}
                colors={colors}
                styles={styles}
              />
            </View>
          </View>
        );
      case 'AuthSettings':
        return (
          <View style={styles.section}>
            {/* Language */}
            <View style={styles.settingsSelectorRow}>
              <Text style={styles.selectorLabel}>{t('language')}</Text>
              <LiquidPillToggle
                label={language === 'en' ? 'English' : 'Tiếng Việt'}
                onPress={() => setLanguage(language === 'en' ? 'vi' : 'en')}
                colors={colors}
                styles={styles}
              />
            </View>

            {/* Dark Mode */}
            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>{t('darkMode')}</Text>
              <LiquidToggle value={isDark} onValueChange={toggleDarkMode} colors={colors} styles={styles} />
            </View>

            {/* Theme Colors */}
            <Text style={[styles.inputLabel, { marginTop: 8 }]}>{t('theme')}</Text>
            <View style={styles.themeGrid}>
              {[
                { type: 'green', label: t('pastelGreen'), bg: '#b9f3b8', fg: '#002106' },
                { type: 'blue', label: t('oceanBlue'), bg: '#4cc9f0', fg: '#005266' },
                { type: 'pink', label: t('strawberry'), bg: '#ffd9e6', fg: '#390021' },
                { type: 'yellow', label: t('sunnyYellow'), bg: '#f8e388', fg: '#211b00' },
              ].map((themeItem) => {
                const isSelected = colorTheme === themeItem.type;
                return (
                  <TouchableOpacity
                    key={themeItem.type}
                    onPress={() => setColorTheme(themeItem.type as ColorTheme)}
                    style={[
                      styles.themeBox,
                      {
                        backgroundColor: themeItem.bg,
                        opacity: isSelected ? 1 : 0.5,
                        borderWidth: isSelected ? 4 : 2,
                        borderColor: isSelected ? '#fff' : 'rgba(0,0,0,0.05)',
                      }
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.themeBoxText, { color: themeItem.fg }]}>{themeItem.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.centeredView} pointerEvents="box-none">
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconRow}>
              <View style={styles.iconBox}>
                {getIcon()}
              </View>
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.outline} strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {renderContent()}

            <TouchableOpacity onPress={handleClose} style={styles.doneBtn} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>{t('done')}</Text>
            </TouchableOpacity>
          </ScrollView>
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
  },
  modal: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
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
  section: {
    gap: 16,
  },
  inputLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginLeft: 8,
    marginBottom: -8,
  },
  inputBox: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: colors.surface,
    fontFamily: 'Quicksand-Medium',
    fontSize: 15,
    color: colors.onSurface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  notifLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    padding: 4,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  themeBox: {
    width: '47%',
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  themeBoxText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
  },
  privacyBtn: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  privacyBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  deleteBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(186, 26, 26, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
  deleteBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.error,
  },
  doneBtn: {
    marginTop: 32,
    marginBottom: 4,
    height: 48,
    borderRadius: 100,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  doneBtnText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  settingsSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  selectorLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  pillText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
  },
}));
