import React, { useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { ClipboardList, Smile, Timer, StickyNote, Wallet } from 'lucide-react-native';
import { theme, createThemedStyles } from '../theme';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';

function hexToRgba(hex: string, alpha: number) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface BottomNavProps {
  activeTab: 'tasks' | 'focus' | 'notes' | 'expenses' | 'profile';
  onChangeTab: (tab: 'tasks' | 'focus' | 'notes' | 'expenses' | 'profile') => void;
  scrollX: Animated.Value;
  onDragScroll?: (offsetX: number) => void;
}

export function BottomNav({ activeTab, onChangeTab, scrollX, onDragScroll }: BottomNavProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useStyles(colors);

  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const NAV_WIDTH = SCREEN_WIDTH - 32;
  const PADDING_HORIZONTAL = 8;

  const tabs = [
    { id: 'tasks', label: t('tabTasks'), icon: ClipboardList },
    { id: 'focus', label: t('tabFocus'), icon: Timer },
    { id: 'notes', label: t('tabNotes'), icon: StickyNote },
    { id: 'expenses', label: t('tabExpenses'), icon: Wallet },
  ] as const;

  const COL_WIDTH = (NAV_WIDTH - PADDING_HORIZONTAL * 2) / tabs.length;
  const INDICATOR_WIDTH = COL_WIDTH - 4;

  // Center position of the indicator for each tab
  const inputRange = tabs.map((_, i) => i * SCREEN_WIDTH);
  const outputRange = tabs.map((_, i) => PADDING_HORIZONTAL + i * COL_WIDTH + COL_WIDTH / 2);

  const indicatorCenter = scrollX.interpolate({
    inputRange,
    outputRange,
    extrapolate: 'clamp',
  });

  // Dynamic width of the indicator (stretches in between tabs like liquid)
  const widthInputRange: number[] = [];
  const widthOutputRange: number[] = [];
  tabs.forEach((_, i) => {
    widthInputRange.push(i * SCREEN_WIDTH);
    widthOutputRange.push(INDICATOR_WIDTH);
    if (i < tabs.length - 1) {
      widthInputRange.push((i + 0.5) * SCREEN_WIDTH);
      widthOutputRange.push(INDICATOR_WIDTH * 1.45);
    }
  });

  const indicatorWidth = scrollX.interpolate({
    inputRange: widthInputRange,
    outputRange: widthOutputRange,
    extrapolate: 'clamp',
  });

  const indicatorLeft = Animated.subtract(indicatorCenter, Animated.divide(indicatorWidth, 2));

  const indicatorOpacity = scrollX.interpolate({
    inputRange: [0, 1 * SCREEN_WIDTH, 2 * SCREEN_WIDTH, 3 * SCREEN_WIDTH, 4 * SCREEN_WIDTH],
    outputRange: [1, 1, 1, 1, 0],
    extrapolate: 'clamp',
  });

  const MIN_CENTER = PADDING_HORIZONTAL + COL_WIDTH / 2;
  const MAX_CENTER = PADDING_HORIZONTAL + COL_WIDTH * (tabs.length - 1) + COL_WIDTH / 2;
  const TRACK_WIDTH = MAX_CENTER - MIN_CENTER;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const screenWidthRef = useRef(SCREEN_WIDTH);
  screenWidthRef.current = SCREEN_WIDTH;

  const trackWidthRef = useRef(TRACK_WIDTH);
  trackWidthRef.current = TRACK_WIDTH;

  const colWidthRef = useRef(COL_WIDTH);
  colWidthRef.current = COL_WIDTH;

  const isDragging = useRef(false);
  const pressAnim = useRef(new Animated.Value(1)).current;
  const dragStartScrollX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = false;
        const rawIndex = tabs.map(t => t.id).indexOf(activeTabRef.current as any);
        const index = rawIndex === -1 ? 3 : rawIndex;
        dragStartScrollX.current = index * screenWidthRef.current;
        Animated.spring(pressAnim, {
          toValue: 1.15,
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        const dx = gestureState.dx;
        if (Math.abs(dx) > 10) {
          isDragging.current = true;
        }
        if (isDragging.current) {
          const ratio = (screenWidthRef.current * (tabs.length - 1)) / trackWidthRef.current;
          const targetScroll = dragStartScrollX.current + dx * ratio;
          const clampedScroll = Math.max(0, Math.min(targetScroll, screenWidthRef.current * (tabs.length - 1)));
          scrollX.setValue(clampedScroll);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        Animated.spring(pressAnim, {
          toValue: 1.0,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();

        if (isDragging.current) {
          const ratio = (screenWidthRef.current * (tabs.length - 1)) / trackWidthRef.current;
          const targetScroll = dragStartScrollX.current + gestureState.dx * ratio;
          const clampedScroll = Math.max(0, Math.min(targetScroll, screenWidthRef.current * (tabs.length - 1)));
          const index = Math.round(clampedScroll / screenWidthRef.current);
          const snappedTab = tabs[Math.max(0, Math.min(index, tabs.length - 1))].id;
          onChangeTab(snappedTab);
        } else {
          // Tap gesture - find exact clicked tab column
          const relativeX = evt.nativeEvent.pageX - 16;
          const clickedIndex = Math.max(0, Math.min(Math.floor((relativeX - PADDING_HORIZONTAL) / colWidthRef.current), tabs.length - 1));
          onChangeTab(tabs[clickedIndex].id);
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(pressAnim, {
          toValue: 1.0,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const navBg = isDark ? 'rgba(30, 31, 28, 0.75)' : 'rgba(255, 255, 255, 0.75)';
  const navBorderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  const indicatorBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
  const indicatorBorderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';

  // Interpolate top/bottom/radius to make it grow and bulge out from nav only when pressed
  const indicatorTop = pressAnim.interpolate({
    inputRange: [1.0, 1.25],
    outputRange: [10, -8],
  });
  const indicatorBottom = pressAnim.interpolate({
    inputRange: [1.0, 1.25],
    outputRange: [10, -8],
  });
  const indicatorRadius = pressAnim.interpolate({
    inputRange: [1.0, 1.25],
    outputRange: [28, 46],
  });

  return (
    <View
      {...panResponder.panHandlers}
      style={[styles.nav, { width: NAV_WIDTH, backgroundColor: navBg, borderColor: navBorderColor }]}
    >
      {/* Main neutral indicator (dynamically bulging glass bubble on press) */}
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            left: indicatorLeft,
            width: indicatorWidth,
            transform: [{ scale: pressAnim }],
            backgroundColor: indicatorBg,
            borderColor: indicatorBorderColor,
            borderWidth: 1.5,
            top: indicatorTop,
            bottom: indicatorBottom,
            borderRadius: indicatorRadius,
            shadowColor: isDark ? 'transparent' : 'rgba(0, 0, 0, 0.04)',
            opacity: indicatorOpacity,
          }
        ]}
      />

      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        // Dynamic scale interpolation for this tab
        const tabScale = scrollX.interpolate({
          inputRange: [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH
          ],
          outputRange: [1, 1.25, 1],
          extrapolate: 'clamp',
        });

        return (
          <View
            key={tab.id}
            style={[styles.iconButton, { width: COL_WIDTH }]}
          >
            <Animated.View style={{ transform: [{ scale: tabScale }] }}>
              <Icon
                size={28}
                color={isActive ? colors.primary : colors.onSurfaceVariant}
                style={!isActive && styles.iconInactive}
                strokeWidth={isActive ? 3 : 2}
              />
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  nav: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    height: 76,
    borderRadius: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    overflow: 'visible',
  },
  iconButton: {
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  iconInactive: {
    opacity: 0.7,
  },
}));
