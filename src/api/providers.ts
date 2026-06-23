import { supabase } from './supabase';
import { ProviderWithProfile } from '../types';

export async function getProviders(limit = 20) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      provider_profile:provider_profiles(*)
    `)
    .eq('role', 'provider')
    .not('provider_profile', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // Sort by trust_score descending (highest-trust providers surface first)
  const providers = data as ProviderWithProfile[];
  return providers.sort((a, b) => {
    const ta = a.provider_profile?.trust_score ?? 0;
    const tb = b.provider_profile?.trust_score ?? 0;
    if (tb !== ta) return tb - ta;
    return (b.provider_profile?.rating ?? 0) - (a.provider_profile?.rating ?? 0);
  });
}

export async function getProvidersByCategory(categoryId: string) {
  // Get providers with matching skills based on category name
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .single();

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      provider_profile:provider_profiles(*)
    `)
    .eq('role', 'provider')
    .not('provider_profile', 'is', null);

  if (error) throw error;

  // Filter by skill matching category name (client-side for MVP)
  const providers = data as ProviderWithProfile[];
  if (category) {
    return providers.filter((p) =>
      p.provider_profile?.skills?.some((s) =>
        s.toLowerCase().includes(category.name.toLowerCase()),
      ),
    );
  }
  return providers;
}

export async function getProviderById(userId: string): Promise<ProviderWithProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      provider_profile:provider_profiles(*)
    `)
    .eq('user_id', userId)
    .eq('role', 'provider')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as ProviderWithProfile;
}

export async function getNearbyProviders(
  lat: number,
  lng: number,
  radiusKm = 20,
  limit = 10,
) {
  // For MVP: fetch all available providers and filter client-side
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      provider_profile:provider_profiles(*)
    `)
    .eq('role', 'provider')
    .not('provider_profile', 'is', null);

  if (error) throw error;

  const providers = data as ProviderWithProfile[];

  // Calculate distance and filter
  const nearby = providers
    .filter((p) => {
      if (!p.location_lat || !p.location_lng) return false;
      if (!p.provider_profile?.is_available) return false;
      const dLat = ((p.location_lat - lat) * Math.PI) / 180;
      const dLng = ((p.location_lng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((p.location_lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      p.distance_km = Math.round(distKm * 10) / 10;
      return distKm <= radiusKm;
    })
    .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
    .slice(0, limit);

  return nearby;
}

export async function toggleProviderAvailability(userId: string, isAvailable: boolean) {
  const { data, error } = await supabase
    .from('provider_profiles')
    .update({ is_available: isAvailable })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
