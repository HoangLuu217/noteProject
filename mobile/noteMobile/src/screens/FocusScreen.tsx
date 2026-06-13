import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView, StyleSheet, TextInput, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Play, Pause, RotateCcw, X, Clock, Volume2, VolumeX, Music } from 'lucide-react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { theme, createThemedStyles } from '../theme';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';



const SOUNDS: Record<string, any> = {
  austria: require('../../assets/sounds/Austria_Alarm.mp3'),
  alarm: require('../../assets/sounds/alarm.mp3'),
  danger: require('../../assets/sounds/danger.mp3'),
};

const getSoundName = (key: string, t: (k: string) => string) => {
  if (key === 'austria') return t('soundAustria');
  if (key === 'alarm') return t('soundAlarm');
  if (key === 'danger') return t('soundDanger');
  return key.charAt(0).toUpperCase() + key.slice(1);
};

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ff4d4d',
        opacity,
      }}
    />
  );
}

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
    outputRange: [0, 22],
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
      <Animated.View style={[styles.toggleTrack, { backgroundColor: trackBg }]}>
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

export function FocusScreen() {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const styles = useStyles(colors);

  const [initialTime, setInitialTime] = useState(25 * 60); // 25 minutes
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  const [isSelectingTime, setIsSelectingTime] = useState(false);

  const [selectedSound, setSelectedSound] = useState<'austria' | 'alarm' | 'danger'>('alarm');
  const [isSelectingSound, setIsSelectingSound] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const activeSoundRef = useRef<Audio.Sound | null>(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  const [customMinutes, setCustomMinutes] = useState('');
  const [isEnteringCustom, setIsEnteringCustom] = useState(false);

  // Request notifications permission on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
      } catch (e) {
        console.error('Error requesting notification permissions:', e);
      }
    };
    requestPermissions();
  }, []);

  const scheduleTimerNotification = async (seconds: number, soundEnabledOverride?: boolean) => {
    try {
      const saved = await AsyncStorage.getItem('@push_notifications_enabled');
      const isPushEnabled = saved === null ? true : saved === 'true';
      if (!isPushEnabled) {
        return;
      }

      await cancelTimerNotification();

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: askStatus } = await Notifications.requestPermissionsAsync();
        if (askStatus !== 'granted') {
          return;
        }
      }

      const activeSoundEnabled = soundEnabledOverride !== undefined ? soundEnabledOverride : isSoundEnabled;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: t('focusNotificationTitle'),
          body: t('focusNotificationBody'),
          sound: activeSoundEnabled,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'default',
          color: '#4cc9f0', // Accent color for the notification icon on Android
          vibrate: activeSoundEnabled ? [0, 250, 250, 250] : undefined, // Vibration pattern
        } as any,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: seconds,
        },
      });
      notificationIdRef.current = id;
    } catch (e) {
      console.error('Failed to schedule notification:', e);
    }
  };

  const cancelTimerNotification = async () => {
    try {
      if (notificationIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        notificationIdRef.current = null;
      }
    } catch (e) {
      console.error('Failed to cancel notification:', e);
    }
  };

  // Load sound preference on mount
  useEffect(() => {
    const loadSoundPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('@focus_sound');
        if (saved && SOUNDS[saved]) {
          setSelectedSound(saved as any);
        }
        const savedEnabled = await AsyncStorage.getItem('@focus_sound_enabled');
        if (savedEnabled !== null) {
          setIsSoundEnabled(savedEnabled === 'true');
        }
      } catch (e) {
        console.error('Failed to load focus sound:', e);
      }
    };
    loadSoundPreference();
  }, []);

  const handleToggleSound = async () => {
    const nextVal = !isSoundEnabled;
    setIsSoundEnabled(nextVal);
    try {
      await AsyncStorage.setItem('@focus_sound_enabled', String(nextVal));
      if (isActive && timeLeft > 0) {
        await scheduleTimerNotification(timeLeft, nextVal);
      }
    } catch (e) {
      console.error('Failed to save focus sound enabled state:', e);
    }
  };

  // Configure audio mode for out-loud playback
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      } catch (e) {
        console.error('Error setting audio mode:', e);
      }
    };
    configureAudio();
  }, []);

  // Cleanup preview audio, alarm audio, and notifications on unmount
  useEffect(() => {
    return () => {
      cancelTimerNotification();
      if (previewSoundRef.current) {
        previewSoundRef.current.unloadAsync().catch(() => {});
      }
      if (activeSoundRef.current) {
        activeSoundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Stop preview sound when modal is closed
  useEffect(() => {
    if (!isSelectingSound) {
      if (previewSoundRef.current) {
        previewSoundRef.current.unloadAsync().catch(() => {});
        previewSoundRef.current = null;
      }
    }
  }, [isSelectingSound]);

  const playEndSound = async () => {
    if (!isSoundEnabled) return;
    try {
      if (activeSoundRef.current) {
        await activeSoundRef.current.unloadAsync().catch(() => {});
        activeSoundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        SOUNDS[selectedSound],
        { volume: 1.0 }
      );
      activeSoundRef.current = sound;
      setIsAlarmPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          activeSoundRef.current = null;
          setIsAlarmPlaying(false);
        }
      });
      await sound.playAsync();
    } catch (e) {
      console.error('Error playing sound:', e);
      setIsAlarmPlaying(false);
    }
  };

  const stopEndSound = async () => {
    try {
      if (activeSoundRef.current) {
        await activeSoundRef.current.stopAsync().catch(() => {});
        await activeSoundRef.current.unloadAsync().catch(() => {});
        activeSoundRef.current = null;
      }
      setIsAlarmPlaying(false);
    } catch (e) {
      console.error('Error stopping sound:', e);
    }
  };

  const previewSound = async (soundKey: string) => {
    try {
      if (previewSoundRef.current) {
        await previewSoundRef.current.unloadAsync().catch(() => {});
        previewSoundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        SOUNDS[soundKey],
        { volume: 1.0 }
      );
      previewSoundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          previewSoundRef.current = null;
        }
      });
      await sound.playAsync();
    } catch (e) {
      console.error('Error playing preview sound:', e);
    }
  };

  const handleSoundSelect = async (soundKey: string) => {
    setSelectedSound(soundKey as any);
    previewSound(soundKey);
    try {
      await AsyncStorage.setItem('@focus_sound', soundKey);
    } catch (e) {
      console.error('Failed to save focus sound:', e);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => Math.max(0, t - 1));
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      playEndSound();
      cancelTimerNotification();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, selectedSound]);

  const toggleTimer = async () => {
    const nextActive = !isActive;
    setIsActive(nextActive);
    await stopEndSound();
    if (nextActive) {
      if (timeLeft > 0) {
        await scheduleTimerNotification(timeLeft);
      }
    } else {
      await cancelTimerNotification();
    }
  };

  const resetTimer = async () => {
    setIsActive(false);
    setTimeLeft(initialTime);
    await cancelTimerNotification();
    await stopEndSound();
  };

  const handleTimeSelect = async (minutes: number) => {
    const newTime = minutes * 60;
    setInitialTime(newTime);
    setTimeLeft(newTime);
    setIsActive(false);
    setIsSelectingTime(false);
    await cancelTimerNotification();
    await stopEndSound();
  };

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  const presets = [5, 10, 15, 25, 30, 45, 60, 90];
  const timeOptions: (number | 'custom')[] = [...presets, 'custom'];
  const isCustomSelected = !presets.map((p) => p * 60).includes(initialTime);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.portraitContentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>{t('focusTime')}</Text>
        <Text style={styles.sub}>{t('focusSub')}</Text>

        {/* Progress Circle Container */}
        <View style={styles.circleWrap}>
          <TouchableOpacity
            style={styles.circleContainer}
            activeOpacity={isActive ? 1 : 0.85}
            onPress={() => {
              if (!isActive) {
                setIsSelectingTime(true);
                setIsEnteringCustom(false);
              }
            }}
          >
            <Svg width={256} height={256} style={styles.svg}>
              <Circle
                cx={128}
                cy={128}
                r={120}
                stroke="rgba(228, 227, 219, 0.5)"
                strokeWidth={8}
                fill="none"
              />
              <Circle
                cx={128}
                cy={128}
                r={120}
                stroke={colors.primary}
                strokeWidth={8}
                fill="none"
                strokeDasharray="754"
                strokeDashoffset={754 * (1 - progress / 100)}
                strokeLinecap="round"
                transform="rotate(-90 128 128)"
              />
            </Svg>

            <View style={styles.timerContent}>
              <Text style={styles.timerText}>{mins}:{secs}</Text>
              <View style={styles.tapEditBadge}>
                {isActive ? (
                  <Text style={styles.badgeText}>{t('active')}</Text>
                ) : (
                  <View style={styles.badgeRow}>
                    <Clock size={14} color={colors.outline} />
                    <Text style={styles.badgeText}>{t('tapToEdit')}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Control Buttons */}
        {isAlarmPlaying ? (
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={stopEndSound}
              style={styles.stopAlarmBtn}
              activeOpacity={0.8}
            >
              <Volume2 size={24} color="#fff" strokeWidth={2.5} />
              <Text style={styles.stopAlarmText}>{t('stopAlarm')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={resetTimer}
              style={styles.resetBtn}
              activeOpacity={0.85}
            >
              <RotateCcw size={36} color={colors.onSurfaceVariant} strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleTimer}
              style={[
                styles.startBtn,
                { backgroundColor: isActive ? colors.error : '#e36060' }
              ]}
              activeOpacity={0.85}
            >
              {isActive ? (
                <Pause size={36} color="#fff" strokeWidth={2.5} />
              ) : (
                <Play size={36} color="#fff" strokeWidth={2.5} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsSelectingSound(true)}
              style={styles.soundBtn}
              activeOpacity={0.85}
            >
              {isSoundEnabled ? (
                <Volume2 size={36} color={colors.onSurfaceVariant} strokeWidth={2.5} />
              ) : (
                <VolumeX size={36} color={colors.outline} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Timer Selection Modal */}
      <Modal
        visible={isSelectingTime}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSelectingTime(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsSelectingTime(false)} />
        <View style={styles.centeredModalOverlay} pointerEvents="box-none">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center' }}
            pointerEvents="box-none"
          >
            <View style={styles.centeredModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEnteringCustom ? t('customTimer') : t('selectTimer')}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsSelectingTime(false)}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <X size={20} color={colors.outline} strokeWidth={3} />
                </TouchableOpacity>
              </View>

              {isEnteringCustom ? (
                <View style={styles.customContainer}>
                  <Text style={styles.customSubTitle}>{t('enterDuration')}</Text>
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={styles.customInput}
                      value={customMinutes}
                      onChangeText={(val) => setCustomMinutes(val.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="25"
                      placeholderTextColor={colors.outlineVariant}
                      autoFocus
                    />
                    <Text style={styles.customLabel}>{t('custom').toLowerCase()}</Text>
                  </View>

                  <View style={styles.customButtons}>
                    <TouchableOpacity
                      style={styles.customBtnCancel}
                      onPress={() => setIsEnteringCustom(false)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.customBtnCancelText}>{t('back')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.customBtnConfirm}
                      onPress={() => {
                        const minsVal = parseInt(customMinutes, 10);
                        if (minsVal > 0) {
                          handleTimeSelect(minsVal);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.customBtnConfirmText}>{t('setTimer')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.presetsGrid} showsVerticalScrollIndicator={false}>
                  {timeOptions.map((option) => {
                    const isSelected = option === 'custom'
                      ? isCustomSelected
                      : initialTime === option * 60;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => {
                          if (option === 'custom') {
                            setIsEnteringCustom(true);
                            setCustomMinutes(Math.floor(initialTime / 60).toString());
                          } else {
                            handleTimeSelect(option);
                          }
                        }}
                        style={[
                          styles.presetCard,
                          isSelected ? styles.presetCardActive : styles.presetCardDefault
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.presetCardText,
                            isSelected ? styles.presetCardTextActive : styles.presetCardTextDefault
                          ]}
                        >
                          {option === 'custom' ? t('custom') : `${option}m`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Sound Selection Modal */}
      <Modal
        visible={isSelectingSound}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSelectingSound(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsSelectingSound(false)} />
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View style={styles.modalCard}>
            <View style={styles.pickerHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectEndSound')}</Text>
              <TouchableOpacity
                onPress={() => setIsSelectingSound(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.outline} strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {/* Sound Toggle Switch */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>{t('enableSound')}</Text>
                <Text style={styles.toggleSub}>{t('soundSub')}</Text>
              </View>
              <LiquidToggle value={isSoundEnabled} onValueChange={handleToggleSound} colors={colors} styles={styles} />
            </View>

            <ScrollView contentContainerStyle={styles.soundsList} showsVerticalScrollIndicator={false}>
              {(['austria', 'alarm', 'danger'] as const).map((soundKey) => {
                const isSelected = selectedSound === soundKey;
                return (
                  <View key={soundKey} style={[styles.soundRow, !isSoundEnabled && { opacity: 0.5 }]}>
                    <TouchableOpacity
                      onPress={() => isSoundEnabled && handleSoundSelect(soundKey)}
                      disabled={!isSoundEnabled}
                      style={[
                        styles.soundCard,
                        isSelected && isSoundEnabled ? styles.soundCardActive : styles.soundCardDefault
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.soundInfo}>
                        <Music size={20} color={isSelected && isSoundEnabled ? colors.primary : colors.onSurfaceVariant} />
                        <Text
                          style={[
                            styles.soundCardText,
                            isSelected && isSoundEnabled ? styles.soundCardTextActive : styles.soundCardTextDefault
                          ]}
                        >
                          {getSoundName(soundKey, t)}
                        </Text>
                      </View>
                      
                      {isSelected && isSoundEnabled && (
                        <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => isSoundEnabled && previewSound(soundKey)}
                      disabled={!isSoundEnabled}
                      style={styles.previewBtn}
                      activeOpacity={0.7}
                    >
                      <Volume2 size={20} color={isSoundEnabled ? colors.primary : colors.outlineVariant} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
  },
  portraitContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 28,
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: 8,
  },
  sub: {
    fontFamily: 'Quicksand-Medium',
    color: colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 40,
  },
  circleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  circleContainer: {
    position: 'relative',
    width: 256,
    height: 256,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 56,
    color: colors.onSurface,
    letterSpacing: -1,
  },
  tapEditBadge: {
    marginTop: 8,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 13,
    color: colors.outline,
    textTransform: 'uppercase',
  },
  controls: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetBtn: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainer,
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
  startBtn: {
    width: 80,
    height: 80,
    borderRadius: 28,
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 28, 23, 0.4)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  centeredModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    maxHeight: '80%',
  },
  centeredModalCard: {
    width: '90%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 8,
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
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 12,
    justifyContent: 'flex-start',
  },
  presetCard: {
    width: '30%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  presetCardDefault: {
    backgroundColor: colors.surfaceContainer,
    borderColor: 'transparent',
  },
  presetCardActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: 'rgba(0, 103, 128, 0.2)',
  },
  presetCardText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
  },
  presetCardTextDefault: {
    color: colors.onSurface,
  },
  presetCardTextActive: {
    color: colors.onPrimaryContainer,
  },
  customContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  customSubTitle: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  customInput: {
    width: 120,
    height: 64,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    textAlign: 'center',
    fontFamily: 'Quicksand-Bold',
    fontSize: 32,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainer,
  },
  customLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    color: colors.onSurfaceVariant,
  },
  customButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  customBtnCancel: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  customBtnCancelText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  customBtnConfirm: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  customBtnConfirmText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  soundBtn: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainer,
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
  stopAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#e36060',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#e36060',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  stopAlarmText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    color: '#ffffff',
  },
  soundsList: {
    paddingVertical: 12,
  },
  soundRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  soundCard: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  soundCardDefault: {
    backgroundColor: colors.surfaceContainer,
    borderColor: 'transparent',
  },
  soundCardActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: 'rgba(0, 103, 128, 0.2)',
  },
  soundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soundCardText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
  },
  soundCardTextDefault: {
    color: colors.onSurface,
  },
  soundCardTextActive: {
    color: colors.onPrimaryContainer,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  toggleSub: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 12,
    color: colors.outline,
    marginTop: 2,
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceVariant,
    padding: 3,
  },
  toggleTrackActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
}));
