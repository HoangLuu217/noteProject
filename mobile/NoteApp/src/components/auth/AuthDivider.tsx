import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export function AuthDivider({ label = 'hoặc' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  label: { fontSize: 14, color: colors.textSecondary },
});
