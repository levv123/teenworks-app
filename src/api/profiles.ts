import { supabase } from './supabase';
import { PublicProfile, Review } from '../types';

export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, provider_profile:provider_profiles(*)')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return data as PublicProfile | null;
}

export async function getProfileById(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, provider_profile:provider_profiles(*)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as PublicProfile | null;
}

export async function updateUsername(userId: string, username: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('user_id', userId);
  if (error) throw error;
}

/** Derives a URL-safe slug from a full name, used as default username suggestion. */
export function slugifyName(fullName: string): string {
  return fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
