import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../../constants/colors';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function AuthInput({ label, error, style, ...props }: AuthInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  error: { marginTop: 6, fontSize: 13, color: colors.error },
});
