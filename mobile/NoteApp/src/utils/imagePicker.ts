import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickedImage = {
  uri: string;
  mimeType: string;
};

export const pickImageFromLibrary = async (): Promise<PickedImage | null> => {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Cho phép NoteApp truy cập thư viện ảnh để chọn avatar.');
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
};
