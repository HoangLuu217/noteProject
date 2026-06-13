import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
  style?: ViewStyle;
}

export function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: AuthButtonProps) {
  const isDisabled = loading || disabled;

  return (
    <Pressable
      style={[
        styles.button,
        variant === 'danger' && styles.danger,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  danger: { backgroundColor: colors.error },
  disabled: { opacity: 0.7 },
  text: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
