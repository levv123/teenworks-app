import { Platform } from 'react-native';
import { supabase } from './supabase';
import { ProviderService, ServiceAnalysis, ServiceFAQ, ServiceFilters, ServiceSortOrder } from '../types';

const SERVICE_SELECT = '*, category:categories(*), provider_profile:provider_profiles!fk_ps_provider_profile(trust_score, trust_level, rating, review_count, is_available)';

export async function browseServices(
  filters: ServiceFilters,
  sort: ServiceSortOrder,
  limit = 60,
): Promise<ProviderService[]> {
  let q = supabase
    .from('provider_services')
    .select(SERVICE_SELECT)
    .eq('is_active', true)
    .limit(limit);

  if (filters.categoryId)    q = q.eq('category_id', filters.categoryId);
  if (filters.minPrice)      q = q.gte('starting_price', parseFloat(filters.minPrice));
  if (filters.maxPrice)      q = q.lte('starting_price', parseFloat(filters.maxPrice));
  if (filters.minRating > 0) q = q.gte('rating', filters.minRating);
  if (filters.maxDeliveryDays > 0) q = q.lte('delivery_days', filters.maxDeliveryDays);

  switch (sort) {
    case 'highest_rated':  q = q.order('rating', { ascending: false }).order('review_count', { ascending: false }); break;
    case 'most_popular':   q = q.order('review_count', { ascending: false }); break;
    case 'newest':         q = q.order('created_at', { ascending: false }); break;
    default:               q = q.order('rating', { ascending: false }).order('review_count', { ascending: false }); break; // recommended: DB pre-sort by rating, client re-ranks with trust
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getMyServices(userId: string): Promise<ProviderService[]> {
  const { data, error } = await supabase
    .from('provider_services')
    .select(SERVICE_SELECT)
    .eq('provider_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getServicesForProvider(providerId: string): Promise<ProviderService[]> {
  const { data, error } = await supabase
    .from('provider_services')
    .select(SERVICE_SELECT)
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Columns added by migration 017. The database defaults them, so callers may leave them out. */
type PostServiceColumns = 'pricing_type' | 'duration_minutes' | 'location' | 'availability_days';

export async function createService(
  service: Omit<ProviderService, 'id' | 'rating' | 'review_count' | 'created_at' | 'updated_at' | 'category' | PostServiceColumns>
    & Partial<Pick<ProviderService, PostServiceColumns>>,
): Promise<ProviderService> {
  const { data, error } = await supabase
    .from('provider_services')
    .insert(service)
    .select(SERVICE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateService(
  id: string,
  updates: Partial<Pick<
    ProviderService,
    'title' | 'description' | 'starting_price' | 'delivery_days' | 'is_active' | 'category_id' | 'images' | 'faq' | 'packages' | 'portfolio_examples' | PostServiceColumns
  >>,
): Promise<void> {
  const { error } = await supabase
    .from('provider_services')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase
    .from('provider_services')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/** Longest side, in pixels, of a photo picked on web; see readPhotoOnWeb. */
const WEB_PHOTO_MAX_SIDE = 1024;
const WEB_PHOTO_QUALITY = 0.72;

/**
 * Reads a picked file as a JPEG data: URI, scaled down to WEB_PHOTO_MAX_SIDE.
 * A data: URI, unlike a blob: URL, still works after a reload, so a photo in
 * a service saved to the app's local store keeps showing. Scaling keeps five
 * of them to well under a megabyte in that store. Resolves null for a file
 * the browser can't decode as an image.
 */
function readPhotoOnWeb(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, WEB_PHOTO_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', WEB_PHOTO_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Web: an image-only file input. metro.config.js swaps expo-image-picker for
 * an empty module on web (it crashes on import there), so the picker API is
 * simply not present in a web build.
 */
function pickImagesOnWeb(limit: number): Promise<PickedPhotos> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = limit > 1;
    input.style.display = 'none';
    let settled = false;
    const finish = (picked: PickedPhotos) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(picked);
    };
    input.addEventListener('change', () => {
      const all = Array.from(input.files ?? []);
      const files = all.slice(0, limit);
      void Promise.all(files.map(readPhotoOnWeb)).then((read) => {
        const uris = read.filter((uri): uri is string => uri !== null);
        finish({ uris, skipped: files.length - uris.length, overLimit: all.length - files.length });
      });
    });
    // Fired by current browsers when the dialog is dismissed without a choice.
    input.addEventListener('cancel', () => finish(NOTHING_PICKED));
    document.body.appendChild(input);
    input.click();
  });
}

/** Thrown by pickServiceImages when the user has refused access to their photos. */
export class PhotoPermissionError extends Error {
  constructor() {
    super('Photo library permission was not granted.');
    this.name = 'PhotoPermissionError';
  }
}

export interface PickedPhotos {
  /** In the order picked: data: URIs on web, file: URIs on iOS and Android. */
  uris: string[];
  /** Files chosen that couldn't be read as an image (web only). */
  skipped: number;
  /** Photos chosen beyond `limit`, left out. */
  overLimit: number;
}

const NOTHING_PICKED: PickedPhotos = { uris: [], skipped: 0, overLimit: 0 };

/**
 * Lets the user pick up to `limit` photos. No URIs and nothing skipped means
 * they cancelled. Throws PhotoPermissionError if access was refused.
 */
export async function pickServiceImages(limit: number): Promise<PickedPhotos> {
  if (limit < 1) return NOTHING_PICKED;
  if (Platform.OS === 'web') return pickImagesOnWeb(limit);

  // Required here, not at the top of the file, so web builds (where the
  // module is an empty stub) never touch it.
  const ImagePicker: typeof import('expo-image-picker') = require('expo-image-picker');
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new PhotoPermissionError();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    // Cropping only works one photo at a time, so it's off to allow several.
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 0.8,
  });
  if (result.canceled) return NOTHING_PICKED;
  // Older Android photo pickers can ignore selectionLimit.
  return {
    uris: result.assets.slice(0, limit).map((asset) => asset.uri),
    skipped: 0,
    overLimit: Math.max(0, result.assets.length - limit),
  };
}

/** One cropped photo, for the older screens that add them one at a time. */
export async function pickServiceImage(): Promise<string | null> {
  if (Platform.OS === 'web') return (await pickImagesOnWeb(1)).uris[0] ?? null;

  const ImagePicker: typeof import('expo-image-picker') = require('expo-image-picker');
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export async function analyzeService(service: ProviderService): Promise<ServiceAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze-service', {
    body: { service },
  });
  if (error) throw error;
  return data as ServiceAnalysis;
}

export async function uploadServiceImage(uri: string, userId: string): Promise<string> {
  let binary: Uint8Array;
  let name: string;
  let contentType = 'image/jpeg';

  if (Platform.OS === 'web') {
    // On web the picker hands back a data: or blob: URI. expo-file-system can't
    // read those, and the last path segment of a data: URI is the whole base64
    // payload, so neither can be used as on native.
    const blob = await (await fetch(uri)).blob();
    binary = new Uint8Array(await blob.arrayBuffer());
    if (blob.type) contentType = blob.type;
    name = `image.${contentType.split('/')[1] ?? 'jpg'}`;
  } else {
    // React Native's fetch reads file: URIs, so this needs no expo-file-system
    // (the installed v56 is newer than this Expo SDK and isn't built into an
    // iOS app at all).
    const response = await fetch(uri);
    if (!response.ok && response.status !== 0) {
      throw new Error(`Could not read photo (${response.status}).`);
    }
    binary = new Uint8Array(await response.arrayBuffer());
    name = uri.split('?')[0].split('/').pop() || 'image.jpg';
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'heic' || ext === 'heif') contentType = `image/${ext}`;
    else if (ext === 'webp') contentType = 'image/webp';
  }

  const storagePath = `service-images/${userId}/${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { error } = await supabase.storage
    .from('portfolio')
    .upload(storagePath, binary, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('portfolio').getPublicUrl(storagePath);
  return data.publicUrl;
}
