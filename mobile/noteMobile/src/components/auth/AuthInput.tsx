import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function AuthInput({ label, error, style, ...props }: AuthInputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.onSurface,
            borderColor: error ? colors.error : isFocused ? colors.primary : colors.outlineVariant,
            borderWidth: isFocused || error ? 1.8 : 1,
          },
          style,
        ]}
        placeholderTextColor={colors.outlineVariant}
        autoCapitalize="none"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: 'Quicksand-Bold', marginBottom: 6, marginLeft: 8 },
  input: {
    height: 60,
    borderRadius: 24,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
  },
  error: { marginTop: 6, fontSize: 13, fontFamily: 'Quicksand-Medium', marginLeft: 8 },
});
