import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../constants/colors';

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  length?: number;
};

export function OtpInput({ value, onChange, error, length = 6 }: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        placeholder={'0'.repeat(length)}
        placeholderTextColor={colors.textSecondary}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, marginTop: 8, fontSize: 13 },
});
