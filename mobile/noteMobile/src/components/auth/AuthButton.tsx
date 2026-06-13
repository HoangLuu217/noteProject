import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';

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
  const { colors } = useTheme();
  const isDisabled = loading || disabled;

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: variant === 'danger' ? 'rgba(186, 26, 26, 0.1)' : colors.primaryContainer,
          borderColor: variant === 'danger' ? 'rgba(186, 26, 26, 0.2)' : 'rgba(0, 0, 0, 0.05)',
          borderBottomColor: variant === 'danger' ? 'rgba(186, 26, 26, 0.2)' : 'rgba(0, 103, 128, 0.2)',
          shadowColor: variant === 'danger' ? colors.error : colors.primary,
        },
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'danger' ? colors.error : colors.primary} />
      ) : (
        <Text style={[styles.text, { color: variant === 'danger' ? colors.error : colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderBottomWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabled: { opacity: 0.7 },
  text: { fontSize: 18, fontFamily: 'Quicksand-Bold' },
});
