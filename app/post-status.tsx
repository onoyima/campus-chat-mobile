
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiClient } from '../lib/api';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';

export default function PostStatusScreen() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      // @ts-ignore
      formData.append('file', { uri, name: filename, type });

      const res = await apiClient.post('/api/upload', formData);
      return res.data;
    },
  });

  const createStatus = useMutation({
    mutationFn: (data: { content: string; mediaUrl?: string }) => api.createStatusUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-updates'] });
      Alert.alert('Success', 'Status updated successfully');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to post status');
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !image) {
      Alert.alert('Error', 'Please add some content or an image');
      return;
    }

    try {
      let mediaUrl = undefined;
      if (image) {
        const { url } = await uploadMutation.mutateAsync(image.uri);
        mediaUrl = url;
      }

      await createStatus.mutateAsync({
        content,
        mediaUrl,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const isPending = uploadMutation.isPending || createStatus.isPending;

  return (
    <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ 
        title: 'Update Status',
        headerRight: () => (
          <TouchableOpacity onPress={handlePost} disabled={isPending}>
            {isPending ? <ActivityIndicator size="small" color="#25a25a" /> : <Text style={styles.postBtn}>Post</Text>}
          </TouchableOpacity>
        )
      }} />

      <View style={styles.content}>
        <View style={styles.inputArea}>
            <Image 
                source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${user?.username || 'Me'}` }} 
                style={styles.avatar} 
            />
            <TextInput
                style={styles.input}
                placeholder="What's on your mind?"
                multiline
                value={content}
                onChangeText={setContent}
                autoFocus
            />
        </View>

        {image && (
            <View style={styles.imagePreview}>
                <Image source={{ uri: image.uri }} style={styles.preview} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
                    <Ionicons name="close-circle" size={24} color="#f44336" />
                </TouchableOpacity>
            </View>
        )}

        <View style={styles.footer}>
            <TouchableOpacity style={styles.toolBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color="#25a25a" />
                <Text style={styles.toolText}>Photo</Text>
            </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 16 },
  inputArea: { flexDirection: 'row', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  input: { flex: 1, fontSize: 18, minHeight: 100, textAlignVertical: 'top', paddingTop: 8 },
  imagePreview: { marginTop: 20, position: 'relative', borderRadius: 12, overflow: 'hidden' },
  preview: { width: '100%', aspectRatio: 16/9 },
  removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 12 },
  footer: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16, marginTop: 'auto' },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolText: { fontSize: 16, color: '#666' },
  postBtn: { color: '#25a25a', fontSize: 16, fontWeight: 'bold' },
});
