import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { ProviderService, ServiceAnalysis, ServiceFAQ, ServiceFilters, ServiceSortOrder } from '../types';

const SERVICE_SELECT = '*, category:categories(*), provider_profile:provider_profiles!fk_ps_provider_profile(trust_score, trust_level, rating, review_count, is_available)';

/**
 * Reads a local file as base64 on native.
 *
 * expo-file-system@56 moved the legacy file APIs behind the `/legacy` subpath —
 * the root export's `readAsStringAsync` is a stub whose body is a bare `throw`,
 * on every platform. This is required rather than imported because the package
 * ships TypeScript source that expects a newer expo-modules-core than this SDK
 * pins (expo 51 + expo-file-system 56), so importing it would typecheck the
 * library's own source and fail. The runtime path is unaffected.
 */
function readFileAsBase64(uri: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Legacy = require('expo-file-system/legacy') as {
    readAsStringAsync: (uri: string, options: { encoding: string }) => Promise<string>;
    EncodingType: { Base64: string };
  };
  return Legacy.readAsStringAsync(uri, { encoding: Legacy.EncodingType.Base64 });
}

/**
 * Columns added by migration 017. If that migration has not been applied to the
 * target Supabase project yet, PostgREST rejects the whole write. Rather than
 * breaking service posting outright, we strip these fields and retry — the
 * listing saves, the four extras just don't persist until the migration runs.
 */
const MIGRATION_017_FIELDS = [
  'rate_type',
  'duration_hours',
  'location_text',
  'availability_days',
] as const;

/** True when PostgREST/Postgres rejected the write because a column is missing. */
function isUnknownColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // PGRST204: column not found in schema cache. 42703: undefined_column.
  if (error.code === 'PGRST204' || error.code === '42703') return true;
  const msg = error.message ?? '';
  return MIGRATION_017_FIELDS.some(
    (f) => msg.includes(`'${f}'`) || msg.includes(`"${f}"`) || msg.includes(` ${f} `),
  );
}

function withoutMigration017Fields<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const copy: Record<string, unknown> = { ...payload };
  for (const field of MIGRATION_017_FIELDS) delete copy[field];
  return copy as Partial<T>;
}

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

export async function createService(
  service: Omit<ProviderService, 'id' | 'rating' | 'review_count' | 'created_at' | 'updated_at' | 'category'>,
): Promise<ProviderService> {
  const insert = (payload: Record<string, unknown>) =>
    supabase.from('provider_services').insert(payload).select(SERVICE_SELECT).single();

  let { data, error } = await insert(service as Record<string, unknown>);

  if (error && isUnknownColumnError(error)) {
    ({ data, error } = await insert(withoutMigration017Fields(service as Record<string, unknown>)));
  }

  if (error) throw error;
  return data;
}

export async function updateService(
  id: string,
  updates: Partial<Pick<
    ProviderService,
    'title' | 'description' | 'starting_price' | 'delivery_days' | 'is_active' | 'category_id' | 'images' | 'faq' | 'packages' | 'portfolio_examples'
    // Migration 017 — must stay in lockstep with createService, otherwise these
    // save on create and are silently dropped on every edit.
    | 'rate_type' | 'duration_hours' | 'location_text' | 'availability_days'
  >>,
): Promise<void> {
  const payload = { ...updates, updated_at: new Date().toISOString() };

  const run = (body: Record<string, unknown>) =>
    supabase.from('provider_services').update(body).eq('id', id);

  let { error } = await run(payload as Record<string, unknown>);

  if (error && isUnknownColumnError(error)) {
    ({ error } = await run(withoutMigration017Fields(payload as Record<string, unknown>)));
  }

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
 * Opens the photo picker and returns a local URI, or null if the user cancelled
 * or denied permission.
 *
 * On web, expo-image-picker is stubbed to an empty module by metro.config.js
 * (it calls createPermissionHook at import time and crashes the web bundle), so
 * we fall back to a plain file input and return a blob: URL.
 */
export async function pickServiceImage(): Promise<string | null> {
  if (Platform.OS === 'web') return pickImageOnWeb();

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

function pickImageOnWeb(): Promise<string | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      finish(file ? URL.createObjectURL(file) : null);
    };
    // Fires when the picker is dismissed without choosing a file.
    input.oncancel = () => finish(null);
    // Safety net for browsers that don't emit 'cancel'.
    window.addEventListener('focus', () => setTimeout(() => finish(null), 1000), { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

export async function analyzeService(service: ProviderService): Promise<ServiceAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze-service', {
    body: { service },
  });
  if (error) throw error;
  return data as ServiceAnalysis;
}

export async function uploadServiceImage(uri: string, userId: string): Promise<string> {
  const name = uri.split('/').pop() ?? 'image.jpg';
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `service-images/${userId}/${Date.now()}_${safeName}`;

  // Web hands us a blob:/data: URL, which fetch can read directly into a Blob.
  // Native hands us a file:// URI, which needs the legacy base64 reader.
  let body: Blob | Uint8Array;
  let contentType = 'image/jpeg';

  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((r) => r.blob());
    if (blob.type) contentType = blob.type;
    body = blob;
  } else {
    const base64 = await readFileAsBase64(uri);
    body = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  const { error } = await supabase.storage
    .from('portfolio')
    .upload(storagePath, body, { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('portfolio').getPublicUrl(storagePath);
  return data.publicUrl;
}
