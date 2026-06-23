import { supabase } from './supabase';
import { TrustHistoryEvent } from '../types';

/**
 * Fetch a provider's trust history, newest first.
 * Limited to the most recent `limit` events (default 50).
 */
export async function getTrustHistory(
  providerId: string,
  limit = 50,
): Promise<TrustHistoryEvent[]> {
  const { data, error } = await supabase
    .from('trust_history')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Returns only milestone + level_up events for a provider.
 * Used in "Milestones" sections.
 */
export async function getTrustMilestones(
  providerId: string,
  limit = 20,
): Promise<TrustHistoryEvent[]> {
  const { data, error } = await supabase
    .from('trust_history')
    .select('*')
    .eq('provider_id', providerId)
    .in('event_type', ['milestone', 'level_up'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
