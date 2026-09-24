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

/**
 * Web: an image-only file input, returning a blob: URL. metro.config.js swaps
 * expo-image-picker for an empty module on web (it crashes on import there), so
 * the picker API is simply not present in a web build.
 */
function pickImageOnWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    let settled = false;
    const finish = (uri: string | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(uri);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      finish(file ? URL.createObjectURL(file) : null);
    });
    // Fired by current browsers when the dialog is dismissed without a choice.
    input.addEventListener('cancel', () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

export async function pickServiceImage(): Promise<string | null> {
  if (Platform.OS === 'web') return pickImageOnWeb();

  // Required here, not at the top of the file: the installed expo-image-picker
  // targets a newer Expo SDK and throws while loading, so a top-level import
  // would take down every screen that imports this module.
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
    // /legacy because the installed expo-file-system (v56) throws from its main
    // entry's readAsStringAsync; required lazily for the same reason as above.
    // Typed by hand: `typeof import(...)` would pull the package's TS source
    // into the typecheck, and that source doesn't compile against this Expo SDK.
    const FileSystem: {
      readAsStringAsync: (uri: string, options: { encoding: 'base64' }) => Promise<string>;
    } = require('expo-file-system/legacy');
    name = uri.split('/').pop() ?? 'image.jpg';
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  const storagePath = `service-images/${userId}/${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { error } = await supabase.storage
    .from('portfolio')
    .upload(storagePath, binary, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('portfolio').getPublicUrl(storagePath);
  return data.publicUrl;
}
