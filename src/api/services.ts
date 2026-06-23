import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
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

export async function createService(
  service: Omit<ProviderService, 'id' | 'rating' | 'review_count' | 'created_at' | 'updated_at' | 'category'>,
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
    'title' | 'description' | 'starting_price' | 'delivery_days' | 'is_active' | 'category_id' | 'images' | 'faq' | 'packages' | 'portfolio_examples'
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

export async function pickServiceImage(): Promise<string | null> {
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
  const name = uri.split('/').pop() ?? 'image.jpg';
  const storagePath = `service-images/${userId}/${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from('portfolio')
    .upload(storagePath, binary, { contentType: 'image/jpeg', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('portfolio').getPublicUrl(storagePath);
  return data.publicUrl;
}
