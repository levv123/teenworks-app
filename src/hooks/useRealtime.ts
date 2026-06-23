import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: Record<string, unknown>) => void;
  onUpdate?: (payload: Record<string, unknown>) => void;
  onDelete?: (payload: Record<string, unknown>) => void;
}

export function useRealtime({ table, filter, onInsert, onUpdate, onDelete }: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channelName = `${table}-${filter ?? 'all'}-${Date.now()}`;
    let channel = supabase.channel(channelName);

    const config: Parameters<typeof channel.on>[1] = {
      event: '*',
      schema: 'public',
      table,
      ...(filter ? { filter } : {}),
    };

    channel = channel.on(
      'postgres_changes' as Parameters<typeof channel.on>[0],
      config,
      (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
        if (payload.eventType === 'INSERT' && onInsert) onInsert(payload.new);
        if (payload.eventType === 'UPDATE' && onUpdate) onUpdate(payload.new);
        if (payload.eventType === 'DELETE' && onDelete) onDelete(payload.old);
      },
    );

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, onInsert, onUpdate, onDelete]);

  return channelRef;
}

export function useRealtimeMessages(
  bookingId: string,
  onNewMessage: (message: Record<string, unknown>) => void,
) {
  return useRealtime({
    table: 'messages',
    filter: `booking_id=eq.${bookingId}`,
    onInsert: onNewMessage,
  });
}

export function useRealtimeNotifications(
  userId: string,
  onNewNotification: (notification: Record<string, unknown>) => void,
) {
  return useRealtime({
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
    onInsert: onNewNotification,
  });
}
