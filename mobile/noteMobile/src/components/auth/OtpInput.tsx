import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  length?: number;
};

export function OtpInput({ value, onChange, error, length = 6 }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.outlineVariant,
            color: colors.onSurface,
          },
        ]}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        placeholder={'0'.repeat(length)}
        placeholderTextColor={colors.outlineVariant}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  input: {
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: 'Quicksand-Bold',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  error: { marginTop: 8, fontSize: 13, fontFamily: 'Quicksand-Medium', marginLeft: 8 },
});
