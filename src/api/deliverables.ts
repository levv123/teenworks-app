import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { Deliverable, DeliverableFileType, DeliverableStatus } from '../types';

// ── File type helpers ─────────────────────────────────────────

export function mimeToFileType(mimeType: string | null | undefined): DeliverableFileType {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') return 'zip';
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType === 'text/plain'
  ) return 'document';
  return 'other';
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Pickers ───────────────────────────────────────────────────

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string | undefined;
  size: number | undefined;
  fileType: DeliverableFileType;
}

export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? undefined,
    size: asset.size ?? undefined,
    fileType: mimeToFileType(asset.mimeType),
  };
}

export async function pickImageOrVideo(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const name = asset.uri.split('/').pop() ?? 'media';
  const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
  return {
    uri: asset.uri,
    name,
    mimeType,
    size: undefined,
    fileType: asset.type === 'video' ? 'video' : 'image',
  };
}

// ── Upload to Supabase Storage ─────────────────────────────────

export async function uploadDeliverable(
  file: PickedFile,
  bookingId: string,
  uploaderId: string,
): Promise<Deliverable> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const storagePath = `${bookingId}/${Date.now()}_${file.name}`;

  // Read as base64 then convert to ArrayBuffer for upload
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error: uploadError } = await supabase.storage
    .from('deliverables')
    .upload(storagePath, binary, {
      contentType: file.mimeType ?? 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('deliverables')
    .getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from('deliverables')
    .insert({
      booking_id: bookingId,
      uploader_id: uploaderId,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.fileType,
      file_size: file.size ?? null,
      status: 'submitted',
    })
    .select('*, uploader:profiles!deliverables_uploader_id_fkey(*)')
    .single();

  if (error) throw error;
  return data as Deliverable;
}

// ── CRUD ──────────────────────────────────────────────────────

export async function getDeliverables(bookingId: string): Promise<Deliverable[]> {
  const { data, error } = await supabase
    .from('deliverables')
    .select('*, uploader:profiles!deliverables_uploader_id_fkey(*)')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Deliverable[];
}

export async function updateDeliverableStatus(
  id: string,
  status: DeliverableStatus,
): Promise<Deliverable> {
  const { data, error } = await supabase
    .from('deliverables')
    .update({ status })
    .eq('id', id)
    .select('*, uploader:profiles!deliverables_uploader_id_fkey(*)')
    .single();
  if (error) throw error;
  return data as Deliverable;
}

export async function deleteDeliverable(id: string, fileUrl: string): Promise<void> {
  // Extract storage path from URL
  const parts = fileUrl.split('/deliverables/');
  if (parts[1]) {
    await supabase.storage.from('deliverables').remove([parts[1]]);
  }
  const { error } = await supabase.from('deliverables').delete().eq('id', id);
  if (error) throw error;
}
