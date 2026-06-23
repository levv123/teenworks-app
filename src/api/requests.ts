import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { ProviderService, ServiceRequest, PostRequestFormData } from '../types';

// ── Service-specific request APIs (Part 9) ─────────────────────

export interface ServiceRequestFormData {
  description: string;
  budget: string;
  deadlineDate: string | null;  // ISO date string or null
  attachmentUris: string[];     // local URIs before upload
}

export async function uploadRequestAttachment(uri: string, userId: string): Promise<string> {
  const name = uri.split('/').pop() ?? 'attachment.jpg';
  const storagePath = `request-attachments/${userId}/${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const { error } = await supabase.storage.from('portfolio').upload(storagePath, binary, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('portfolio').getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function createServiceRequest(
  clientId: string,
  service: ProviderService,
  formData: ServiceRequestFormData,
  attachmentUrls: string[],
): Promise<ServiceRequest> {
  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      client_id: clientId,
      category_id: service.category_id,
      title: `Request: ${service.title}`,
      description: formData.description,
      budget: formData.budget ? parseFloat(formData.budget) : service.starting_price,
      status: 'open',
      service_id: service.id,
      target_provider_id: service.provider_id,
      deadline_date: formData.deadlineDate ?? null,
      attachments: attachmentUrls,
    })
    .select('*, category:categories(*), client:profiles!service_requests_client_id_fkey(*)')
    .single();
  if (error) throw error;
  return data as ServiceRequest;
}

export async function getServiceRequestsForProvider(providerId: string): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      category:categories(*),
      client:profiles!service_requests_client_id_fkey(*),
      service:provider_services(id, title, images, starting_price, category_id)
    `)
    .eq('target_provider_id', providerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ServiceRequest[];
}

export async function getClientServiceRequests(clientId: string): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      category:categories(*),
      service:provider_services(id, title, images, starting_price, category_id)
    `)
    .eq('client_id', clientId)
    .not('service_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ServiceRequest[];
}

export async function getOpenRequests(limit = 20) {
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      category:categories(*),
      client:profiles!service_requests_client_id_fkey(*)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ServiceRequest[];
}

export async function getRequestsByCategory(categoryId: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      category:categories(*),
      client:profiles!service_requests_client_id_fkey(*)
    `)
    .eq('category_id', categoryId)
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ServiceRequest[];
}

export async function getMyRequests(clientId: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      category:categories(*),
      client:profiles!service_requests_client_id_fkey(*)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ServiceRequest[];
}

export async function getRequestById(id: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      *,
      category:categories(*),
      client:profiles!service_requests_client_id_fkey(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ServiceRequest;
}

export async function createRequest(
  clientId: string,
  formData: PostRequestFormData,
) {
  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      client_id: clientId,
      category_id: formData.categoryId,
      title: formData.title,
      description: formData.description,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      address: formData.address,
      location_lat: formData.location_lat,
      location_lng: formData.location_lng,
      scheduled_at: formData.scheduled_at?.toISOString() ?? null,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw error;
  return data as ServiceRequest;
}

export async function updateRequestStatus(id: string, status: ServiceRequest['status']) {
  const { data, error } = await supabase
    .from('service_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ServiceRequest;
}

export async function cancelRequest(id: string) {
  return updateRequestStatus(id, 'cancelled');
}

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}
