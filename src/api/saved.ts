import { supabase } from './supabase';
import { ProviderService } from '../types';

export async function getSavedServices(userId: string): Promise<ProviderService[]> {
  const { data, error } = await supabase
    .from('saved_services')
    .select('created_at, service:provider_services(*, category:categories(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []).map((r: any) => r.service).filter(Boolean)) as ProviderService[];
}

export async function getSavedServiceIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_services')
    .select('service_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.service_id);
}

export async function saveService(userId: string, serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_services')
    .insert({ user_id: userId, service_id: serviceId });
  if (error && error.code !== '23505') throw error; // ignore duplicate
}

export async function unsaveService(userId: string, serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_services')
    .delete()
    .eq('user_id', userId)
    .eq('service_id', serviceId);
  if (error) throw error;
}

export async function isServiceSaved(userId: string, serviceId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('saved_services')
    .select('id')
    .eq('user_id', userId)
    .eq('service_id', serviceId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
