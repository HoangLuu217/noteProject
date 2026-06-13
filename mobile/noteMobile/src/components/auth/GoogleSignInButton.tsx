import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
      <Image
        source={require('../../../assets/google.jpg')}
        style={styles.googleIcon}
      />
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
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  label: { fontSize: 16, fontFamily: 'Quicksand-Bold' },
});
