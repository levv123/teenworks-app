import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { ProofItem } from '../types';

export async function getProofItemsForUser(userId: string): Promise<ProofItem[]> {
  const { data, error } = await supabase
    .from('proof_items')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function pickProofImage(): Promise<{ uri: string; name: string } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.uri.split('/').pop() ?? 'proof.jpg' };
}

export async function uploadProofImage(uri: string, userId: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const storagePath = `${userId}/${Date.now()}_proof.${ext}`;

  const { error } = await supabase.storage
    .from('proof')
    .upload(storagePath, binary, { contentType: `image/${ext}`, upsert: false });

  if (error) throw error;
  const { data } = supabase.storage.from('proof').getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function createProofItem(
  item: Omit<ProofItem, 'id' | 'created_at' | 'updated_at'>,
): Promise<ProofItem> {
  const { data, error } = await supabase
    .from('proof_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProofItem(
  id: string,
  updates: Partial<Pick<ProofItem, 'proof_type' | 'headline' | 'body' | 'metric' | 'image_url'>>,
): Promise<void> {
  const { error } = await supabase
    .from('proof_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteProofItem(id: string, imageUrl: string | null): Promise<void> {
  if (imageUrl) {
    const match = imageUrl.match(/\/proof\/(.+)$/);
    if (match?.[1]) await supabase.storage.from('proof').remove([match[1]]);
  }
  const { error } = await supabase.from('proof_items').delete().eq('id', id);
  if (error) throw error;
}
