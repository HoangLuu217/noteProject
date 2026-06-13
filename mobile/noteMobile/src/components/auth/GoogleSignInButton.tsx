import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

interface Props {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function GoogleSignInButton({
  onPress,
  loading = false,
  disabled = false,
  label = 'Đăng nhập bằng Google',
}: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
        },
        (loading || disabled) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      <View style={[styles.icon, { borderColor: colors.outlineVariant }]}>
        <Text style={styles.iconText}>G</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 24,
    paddingVertical: 14,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  disabled: { opacity: 0.7 },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 14, fontWeight: '800', color: '#4285F4' },
  label: { fontSize: 16, fontFamily: 'Quicksand-Bold' },
});
