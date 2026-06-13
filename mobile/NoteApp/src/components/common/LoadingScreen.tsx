import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export function LoadingScreen({ message = 'Đang tải...' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 12 },
  text: { color: colors.textSecondary, fontSize: 15 },
});
