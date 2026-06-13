import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButton } from '../../src/components/auth/AuthButton';
import { AuthInput } from '../../src/components/auth/AuthInput';
import { colors } from '../../src/constants/colors';
import { uploadAvatarImage } from '../../src/services/uploadService';
import { useAuthStore } from '../../src/stores/authStore';
import { pickImageFromLibrary } from '../../src/utils/imagePicker';

export const options = { title: 'Hồ sơ' };

export default function ProfileScreen() {
  const router = useRouter();
  const { user, accessToken, updateProfile, logout, loadProfile, isLoading } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setAvatar(user?.avatar ?? '');
  }, [user]);

  const handlePickAvatar = async () => {
    if (!accessToken) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để cập nhật ảnh');
      return;
    }

    const picked = await pickImageFromLibrary();
    if (!picked) return;

    setUploadingAvatar(true);
    try {
      const uploaded = await uploadAvatarImage(accessToken, picked.uri, picked.mimeType);
      setAvatar(uploaded.url);
      await updateProfile({ avatar: uploaded.url });
      Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện');
    } catch (error) {
      Alert.alert('Tải ảnh thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Họ tên không được để trống');
      return;
    }
    try {
      await updateProfile({ fullName: fullName.trim(), avatar: avatar.trim() });
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ');
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Cập nhật thất bại');
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.avatarSection}>
            <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar || isLoading}>
              <View style={styles.avatarWrapper}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.initial}>{(user?.fullName || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                {uploadingAvatar ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                ) : null}
              </View>
            </Pressable>
            <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar || isLoading}>
              <Text style={styles.changePhoto}>Chọn ảnh từ máy</Text>
            </Pressable>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <AuthInput label="Họ và tên" value={fullName} onChangeText={setFullName} />

          <AuthButton title="Lưu thay đổi" onPress={handleSave} loading={isLoading} />
          <AuthButton title="Đăng xuất" onPress={handleLogout} variant="danger" style={styles.logout} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { padding: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { width: 96, height: 96, marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: colors.white, fontSize: 36, fontWeight: '700' },
  changePhoto: { color: colors.primary, fontWeight: '700', marginBottom: 8 },
  email: { fontSize: 16, fontWeight: '600', color: colors.text },
  logout: { marginTop: 16 },
});
