import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function CustomAlert({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  cancelText,
  confirmText,
  isDestructive = false,
  isLoading = false,
}: CustomAlertProps) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertContainer, { backgroundColor: colors.surfaceContainerHigh || colors.surface }]}>
          <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>{message}</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, { borderColor: colors.outline }]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, { color: colors.onSurfaceVariant }]}>
                {cancelText || (language === 'en' ? 'Cancel' : 'Hủy')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.button, 
                styles.confirmButton, 
                { backgroundColor: isDestructive ? colors.error : colors.primary }
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={isDestructive ? colors.onError : colors.onPrimary} />
              ) : (
                <Text style={[
                  styles.buttonText, 
                  styles.confirmButtonText, 
                  { color: isDestructive ? colors.onError : colors.onPrimary }
                ]}>
                  {confirmText || (language === 'en' ? 'Confirm' : 'Đồng ý')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 20,
    marginBottom: 12,
  },
  message: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmButton: {
    borderWidth: 0,
    minWidth: 80,
  },
  buttonText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 15,
  },
  confirmButtonText: {
  }
});
