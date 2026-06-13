import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

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
  return (
    <Pressable
      style={[styles.button, (loading || disabled) && styles.disabled]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>G</Text>
      </View>
      <Text style={styles.label}>{loading ? 'Đang xử lý...' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 52,
  },
  disabled: { opacity: 0.7 },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 14, fontWeight: '800', color: '#4285F4' },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
});
