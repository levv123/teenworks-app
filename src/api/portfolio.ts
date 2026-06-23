import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { PortfolioItem } from '../types';

export type PortfolioFileType = 'image' | 'video' | 'pdf';

export interface PortfolioFile {
  uri: string;
  name: string;
  mimeType: string;
  fileType: PortfolioFileType;
  size?: number;
}

// ── Pickers ───────────────────────────────────────────────────

export async function pickPortfolioImageOrVideo(): Promise<PortfolioFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsEditing: false,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const isVideo = asset.type === 'video';
  const name = asset.uri.split('/').pop() ?? (isVideo ? 'video.mp4' : 'image.jpg');
  return {
    uri: asset.uri,
    name,
    mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
    fileType: isVideo ? 'video' : 'image',
  };
}

export async function pickPortfolioPDF(): Promise<PortfolioFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: 'application/pdf',
    fileType: 'pdf',
    size: asset.size ?? undefined,
  };
}

// ── Upload ─────────────────────────────────────────────────────

export async function uploadPortfolioFile(
  file: PortfolioFile,
  userId: string,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const storagePath = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from('portfolio')
    .upload(storagePath, binary, { contentType: file.mimeType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('portfolio').getPublicUrl(storagePath);
  return data.publicUrl;
}

// ── CRUD ──────────────────────────────────────────────────────

export async function getPortfolioForUser(userId: string): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createPortfolioItem(
  item: Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at'>,
): Promise<PortfolioItem> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export const MAX_FEATURED = 3;

export async function toggleFeatured(
  item: PortfolioItem,
  allItems: PortfolioItem[],
): Promise<void> {
  if (!item.is_featured) {
    const currentCount = allItems.filter((i) => i.is_featured).length;
    if (currentCount >= MAX_FEATURED) {
      throw new Error(`MAX_FEATURED`);
    }
  }
  const { error } = await supabase
    .from('portfolio_items')
    .update({ is_featured: !item.is_featured, updated_at: new Date().toISOString() })
    .eq('id', item.id);
  if (error) throw error;
}

export async function updatePortfolioItem(
  id: string,
  updates: Partial<Pick<PortfolioItem, 'title' | 'description' | 'category' | 'thumbnail_url' | 'file_type' | 'sort_order'>>,
): Promise<void> {
  const { error } = await supabase
    .from('portfolio_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deletePortfolioItem(
  id: string,
  thumbnailUrl: string | null,
): Promise<void> {
  if (thumbnailUrl) {
    const match = thumbnailUrl.match(/\/portfolio\/(.+)$/);
    if (match?.[1]) {
      await supabase.storage.from('portfolio').remove([match[1]]);
    }
  }
  const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
  if (error) throw error;
}
