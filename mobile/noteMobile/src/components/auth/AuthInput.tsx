import { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../ThemeProvider';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function AuthInput({ label, error, style, secureTextEntry, ...props }: AuthInputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  useEffect(() => {
    setIsSecure(secureTextEntry);
  }, [secureTextEntry]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : isFocused ? colors.primary : colors.outlineVariant,
            borderWidth: isFocused || error ? 1.8 : 1,
          }
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.onSurface,
            },
            style,
          ]}
          secureTextEntry={isSecure}
          placeholderTextColor={colors.outlineVariant}
          autoCapitalize="none"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setIsSecure(!isSecure)}
            activeOpacity={0.7}
          >
            {isSecure ? (
              <EyeOff size={20} color={colors.outline} />
            ) : (
              <Eye size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: 'Quicksand-Bold', marginBottom: 6, marginLeft: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 24,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingLeft: 20,
    paddingRight: 8,
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
  },
  eyeButton: {
    padding: 8,
  },
  error: { marginTop: 6, fontSize: 13, fontFamily: 'Quicksand-Medium', marginLeft: 8 },
});
