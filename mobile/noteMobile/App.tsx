import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from './src/theme';
import { TopBar } from './src/components/TopBar';
import { BottomNav } from './src/components/BottomNav';
import { TasksScreen } from './src/screens/TasksScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { NotesScreen } from './src/screens/NotesScreen';
import { FocusScreen } from './src/screens/FocusScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { ThemeProvider, useTheme } from './src/components/ThemeProvider';
import { Task } from './src/types';
import { useAuthStore } from './src/stores/authStore';
import { fetchTasksFromServer } from './src/services/taskService';
import { LoadingScreen } from './src/components/common/LoadingScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from './src/screens/auth/ForgotPasswordScreen';
import { VerifyOtpScreen } from './src/screens/auth/VerifyOtpScreen';
import { ResetPasswordScreen } from './src/screens/auth/ResetPasswordScreen';
import { parsePasswordResetLink } from './src/utils/authLink';
import { checkInStreak } from './src/services/streakService';
import * as Linking from 'expo-linking';
import { Settings } from 'lucide-react-native';
import { SettingsModal } from './src/components/SettingsModal';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_AVATAR = require('./assets/images/defaultUser.jpg');

function BackgroundBubbles() {
  const { colors } = useTheme();
  const y1 = useRef(new Animated.Value(0)).current;
  const y2 = useRef(new Animated.Value(0)).current;
  const y3 = useRef(new Animated.Value(0)).current;

  const float = (anim: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -20, duration: 3000, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

  useEffect(() => {
    float(y1, 0).start();
    float(y2, 1000).start();
    float(y3, 2000).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.bubble, styles.bubble1, { backgroundColor: colors.primaryContainer, transform: [{ translateY: y1 }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble2, { backgroundColor: colors.secondaryContainer, transform: [{ translateY: y2 }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble3, { backgroundColor: colors.tertiaryContainer, transform: [{ translateY: y3 }] }]} />
    </View>
  );
}

const getRelativeDateString = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Morning yoga session 🧘',
    description: 'Completed in the morning',
    completed: true,
    theme: 'primary',
    date: getRelativeDateString(-1),
  },
  {
    id: '2',
    title: 'Weekly sync with team 👥',
    description: 'Starts at 10:30 AM',
    completed: false,
    theme: 'secondary',
    date: getRelativeDateString(0),
  },
  {
    id: '3',
    title: 'Draft quarterly report 📊',
    description: 'Need to compile metrics',
    completed: false,
    theme: 'neutral',
    date: getRelativeDateString(1),
  },
  {
    id: '4',
    title: 'Grocery shopping 🛒',
    description: 'Buy milk, eggs and fruits',
    completed: false,
    theme: 'primary',
    date: getRelativeDateString(2),
  },
];

function MainApp() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'focus' | 'notes' | 'flashcards' | 'expenses' | 'profile'>('tasks');
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const lastWidth = useRef(screenWidth);
  const isFirstRender = useRef(true);

  const { user, accessToken, updateProfile, setStreak } = useAuthStore();

  // Load tasks on mount or token change
  useEffect(() => {
    async function loadTasks() {
      if (accessToken) {
        console.log('📱 [Mobile] Fetching tasks from server...');
        try {
          const fetched = await fetchTasksFromServer(accessToken);
          console.log(`📱 [Mobile] Fetched ${fetched.length} tasks successfully!`);
          setTasks(fetched);
        } catch (e) {
          console.error('📱 [Mobile] Failed to load tasks from server:', e);
        }
      } else {
        console.log('📱 [Mobile] No access token found. Resetting tasks.');
        setTasks([]);
      }
    }

    async function handleStreakCheckIn() {
      if (accessToken) {
        try {
          const res = await checkInStreak(accessToken);
          console.log(`📱 [Mobile] Streak check-in: ${res.message} (Streak: ${res.currentStreak})`);
          setStreak(res.currentStreak);
        } catch (e) {
          console.error('📱 [Mobile] Failed to check-in streak:', e);
        }
      }
    }

    loadTasks();
    handleStreakCheckIn();
  }, [accessToken]);
  const { language } = useLanguage();
  const [avatarUrl, setAvatarUrl] = useState<any>(
    user?.avatar ? { uri: user.avatar } : DEFAULT_AVATAR
  );
  const [profileName, setProfileName] = useState(user?.fullName || 'HoangLuu');
  // Sync with store user
  useEffect(() => {
    if (user) {
      if (user.fullName) {
        setProfileName(user.fullName);
      }
      if (user.avatar) {
        setAvatarUrl({ uri: user.avatar });
      } else {
        setAvatarUrl(DEFAULT_AVATAR);
      }
    } else {
      setProfileName('HoangLuu');
      setAvatarUrl(DEFAULT_AVATAR);
    }
  }, [user]);

  const handleUpdateAvatar = async (newUri: string) => {
    try {
      if (accessToken) {
        const { uploadAvatarImage } = require('./src/services/uploadService');
        const uploaded = await uploadAvatarImage(accessToken, newUri);
        await updateProfile({ avatar: uploaded.url });
      }
    } catch (e) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Lỗi',
        e instanceof Error ? e.message : (language === 'en' ? 'Failed to update avatar' : 'Không thể cập nhật ảnh đại diện')
      );
      console.error('Failed to save avatar:', e);
    }
  };

  const handleUpdateName = async (newName: string) => {
    if (!newName || !newName.trim()) {
      Alert.alert(
        language === 'en' ? 'Invalid Name' : 'Tên không hợp lệ',
        language === 'en' ? 'Please enter a valid name' : 'Vui lòng nhập tên hợp lệ'
      );
      return;
    }
    try {
      if (accessToken) {
        await updateProfile({ fullName: newName });
      }
    } catch (e) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Lỗi',
        e instanceof Error ? e.message : (language === 'en' ? 'Failed to update name' : 'Không thể cập nhật tên')
      );
      console.error('Failed to save profile name:', e);
    }
  };

  const [fontsLoaded] = useFonts({
    'Quicksand-Regular': Quicksand_400Regular,
    'Quicksand-Medium': Quicksand_500Medium,
    'Quicksand-SemiBold': Quicksand_600SemiBold,
    'Quicksand-Bold': Quicksand_700Bold,
  });

  // Configure notifications (request permission and set channel)
  useEffect(() => {
    async function configureNotifications() {
      try {
        const saved = await AsyncStorage.getItem('@push_notifications_enabled');
        const isPushEnabled = saved === null ? true : saved === 'true';
        if (!isPushEnabled) {
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted' && Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }
      } catch (e) {
        console.error('Failed to configure notifications:', e);
      }
    }
    configureNotifications();
  }, []);

  // Sync scroll position when screen width changes (e.g. rotation) or on mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const index = ['tasks', 'focus', 'notes', 'flashcards', 'expenses', 'profile'].indexOf(activeTab);
      scrollX.setValue(index * screenWidth);
      return;
    }
    if (lastWidth.current !== screenWidth) {
      const index = ['tasks', 'focus', 'notes', 'flashcards', 'expenses', 'profile'].indexOf(activeTab);
      scrollX.setValue(index * screenWidth);
      lastWidth.current = screenWidth;
    }
  }, [screenWidth, activeTab]);

  const handleTabChange = (tab: 'tasks' | 'focus' | 'notes' | 'flashcards' | 'expenses' | 'profile') => {
    setActiveTab(tab);
    const index = ['tasks', 'focus', 'notes', 'flashcards', 'expenses', 'profile'].indexOf(tab);
    Animated.spring(scrollX, {
      toValue: index * screenWidth,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
      <BackgroundBubbles />

      <TopBar
        avatarUrl={avatarUrl}
        profileName={profileName}
        onAvatarPress={() => handleTabChange('profile')}
      />

      <View style={styles.content}>
        <View style={[styles.page, { display: activeTab === 'tasks' ? 'flex' : 'none' }]}><TasksScreen tasks={tasks} setTasks={setTasks} setSwipeEnabled={setSwipeEnabled} /></View>
        <View style={[styles.page, { display: activeTab === 'focus' ? 'flex' : 'none' }]}><FocusScreen /></View>
        <View style={[styles.page, { display: activeTab === 'notes' ? 'flex' : 'none' }]}><NotesScreen avatarUrl={avatarUrl} /></View>
        <View style={[styles.page, { display: activeTab === 'flashcards' ? 'flex' : 'none' }]}><FlashcardsScreen isActive={activeTab === 'flashcards'} /></View>
        <View style={[styles.page, { display: activeTab === 'expenses' ? 'flex' : 'none' }]}><ExpensesScreen /></View>
        <View style={[styles.page, { display: activeTab === 'profile' ? 'flex' : 'none' }]}><ProfileScreen avatarUrl={avatarUrl} onChangeAvatar={handleUpdateAvatar} tasks={tasks} profileName={profileName} onChangeName={handleUpdateName} /></View>
      </View>

      <BottomNav activeTab={activeTab} onChangeTab={handleTabChange} scrollX={scrollX} />
    </SafeAreaView>
  );
}

import { LanguageProvider, useLanguage } from './src/components/LanguageProvider';

function AppContent() {
  const { isHydrated, accessToken, loadProfile, setHydrated } = useAuthStore();
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password'>('login');
  const [authParams, setAuthParams] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const initialCheckDone = useRef(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().isHydrated) {
        setHydrated(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [setHydrated]);

  useEffect(() => {
    async function checkAuth() {
      if (isHydrated && !initialCheckDone.current) {
        initialCheckDone.current = true;
        if (accessToken) {
          try {
            await loadProfile();
          } catch (err) {
            console.error('Initial loadProfile failed:', err);
          }
        }
        setIsValidating(false);
      }
    }
    checkAuth();
  }, [isHydrated, accessToken]);

  const handleNavigate = (screen: typeof authScreen, params?: any) => {
    setAuthScreen(screen);
    setAuthParams(params);
  };

  useEffect(() => {
    const handleUrl = (url: string) => {
      const parsed = parsePasswordResetLink(url);
      if (parsed?.oobCode) {
        handleNavigate('reset-password', { oobCode: parsed.oobCode });
      }
    };

    const bootstrap = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleUrl(initialUrl);
      }
    };

    bootstrap();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!isHydrated || isValidating) {
    return <LoadingScreen />;
  }

  if (accessToken) {
    return <MainApp />;
  }

  let screenContent;
  switch (authScreen) {
    case 'login':
      screenContent = <LoginScreen onNavigate={handleNavigate} />;
      break;
    case 'register':
      screenContent = <RegisterScreen onNavigate={handleNavigate} />;
      break;
    case 'forgot-password':
      screenContent = <ForgotPasswordScreen onNavigate={handleNavigate} routeParams={authParams} />;
      break;
    case 'verify-otp':
      screenContent = <VerifyOtpScreen onNavigate={handleNavigate} />;
      break;
    case 'reset-password':
      screenContent = <ResetPasswordScreen onNavigate={handleNavigate} routeParams={authParams} />;
      break;
    default:
      screenContent = <LoginScreen onNavigate={handleNavigate} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {screenContent}

      {/* Floating Settings Button */}
      <TouchableOpacity
        style={[
          styles.floatingSettingsBtn,
          {
            top: insets.top > 0 ? insets.top + 8 : 16,
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: 'rgba(0, 0, 0, 0.05)',
          }
        ]}
        onPress={() => setIsSettingsOpen(true)}
        activeOpacity={0.8}
      >
        <Settings size={22} color={colors.primary} strokeWidth={2.5} />
      </TouchableOpacity>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        type="AuthSettings"
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
  },
  page: {
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 100,
  },
  bubble1: {
    top: 72,
    left: 28,
    width: 64,
    height: 64,
    opacity: 0.2,
  },
  bubble2: {
    top: '45%',
    right: -8,
    width: 120,
    height: 120,
    opacity: 0.2,
  },
  bubble3: {
    bottom: 160,
    left: '22%',
    width: 40,
    height: 40,
    opacity: 0.3,
  },
  floatingSettingsBtn: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 9999,
  },
});
