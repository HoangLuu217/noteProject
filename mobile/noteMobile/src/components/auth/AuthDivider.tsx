import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function AuthDivider({ label = 'hoặc' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: colors.outlineVariant }]} />
      <Text style={[styles.label, { color: colors.outline }]}>{label}</Text>
      <View style={[styles.line, { backgroundColor: colors.outlineVariant }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, opacity: 0.5 },
  label: { fontSize: 14, fontFamily: 'Quicksand-Medium' },
});
