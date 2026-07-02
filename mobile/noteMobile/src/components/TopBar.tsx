import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';
import { useAuthStore } from '../stores/authStore';
import { Flame } from 'lucide-react-native';
import { theme, createThemedStyles } from '../theme';

interface TopBarProps {
  avatarUrl: any;
  profileName: string;
  onAvatarPress?: () => void;
}

export function TopBar({ avatarUrl, profileName, onAvatarPress }: TopBarProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const streak = useAuthStore((state) => state.streak);
  const styles = useStyles(colors);

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>ToDo</Text>
          <Text style={styles.welcomeText}>{t('welcomeUser', { name: profileName })}</Text>
        </View>
      </View>
      <View style={styles.right}>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Flame size={16} color="#FF6B6B" fill="#FF6B6B" />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
        <TouchableOpacity activeOpacity={0.8} onPress={onAvatarPress}>
          <View style={styles.avatarRing}>
            <Image
              source={typeof avatarUrl === 'string' ? { uri: avatarUrl } : avatarUrl}
              style={styles.avatar}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    zIndex: 40,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  titleContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 22,
    color: colors.primary,
    lineHeight: 26,
  },
  welcomeText: {
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 12,
    color: colors.outline,
    lineHeight: 14,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  streakText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 14,
    color: '#FF6B6B',
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    ...theme.clay.avatar,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
}));
