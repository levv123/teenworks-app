import { supabase } from './supabase';
import { Booking, BookingStatus, ConversationContextType, ConversationSummary, Message, ProjectEvent, ProviderService, ServiceRequest } from '../types';

export async function createDirectBookingForService(
  service: ProviderService,
  clientId: string,
  note: string,
  packageName?: string,
  packagePrice?: number,
): Promise<Booking> {
  const price = packagePrice ?? service.starting_price;
  const title = packageName
    ? `Hired: ${service.title} (${packageName})`
    : `Hired: ${service.title}`;

  // 1. Create a service request on the client's behalf
  const { data: req, error: reqErr } = await supabase
    .from('service_requests')
    .insert({
      client_id: clientId,
      category_id: service.category_id,
      title,
      description: note || null,
      budget: price,
      status: 'accepted',
    })
    .select()
    .single();
  if (reqErr) throw reqErr;

  // 2. Create the booking linked to that request and the service
  const { data: booking, error: bookErr } = await supabase
    .from('bookings')
    .insert({
      request_id: req.id,
      service_id: service.id,
      provider_id: service.provider_id,
      client_id: clientId,
      price,
      notes: note || null,
      status: 'pending',
    })
    .select()
    .single();
  if (bookErr) throw bookErr;

  return booking as Booking;
}

// ── Service-request response actions (Part 9) ─────────────────

export async function acceptServiceRequest(
  request: ServiceRequest,
  providerId: string,
): Promise<Booking> {
  // Mark request accepted
  await supabase
    .from('service_requests')
    .update({ status: 'accepted' })
    .eq('id', request.id);

  // Create booking with client's stated budget, status=accepted (work begins)
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      request_id: request.id,
      service_id: request.service_id ?? null,
      provider_id: providerId,
      client_id: request.client_id,
      price: request.budget,
      notes: request.description,
      status: 'accepted',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function declineServiceRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('service_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);
  if (error) throw error;
}

export async function sendCustomOffer(
  request: ServiceRequest,
  providerId: string,
  offeredPrice: number,
  deliveryDays: number,
  note: string,
): Promise<Booking> {
  // Move request to accepted so provider inbox clears it; booking stays pending for client to confirm
  await supabase
    .from('service_requests')
    .update({ status: 'accepted' })
    .eq('id', request.id);

  const offerNote = [
    `Custom offer: $${offeredPrice} · ${deliveryDays} day${deliveryDays !== 1 ? 's' : ''} delivery`,
    note.trim() || null,
  ].filter(Boolean).join('\n\n');

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      request_id: request.id,
      service_id: request.service_id ?? null,
      provider_id: providerId,
      client_id: request.client_id,
      price: offeredPrice,
      notes: offerNote,
      status: 'pending',  // client must confirm
    })
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function createBooking(
  requestId: string,
  providerId: string,
  clientId: string,
  price: number,
  notes?: string,
) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      request_id: requestId,
      provider_id: providerId,
      client_id: clientId,
      price,
      notes,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function getBookingById(id: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      request:service_requests(*, category:categories(*)),
      provider:profiles!bookings_provider_id_fkey(*),
      client:profiles!bookings_client_id_fkey(*),
      provider_profile:provider_profiles!bookings_provider_id_fkey(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function getBookingsForRequest(requestId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      provider:profiles!bookings_provider_id_fkey(*),
      provider_profile:provider_profiles!bookings_provider_id_fkey(*)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Booking[];
}

export async function getMyBookingsAsClient(clientId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      request:service_requests(*, category:categories(*)),
      provider:profiles!bookings_provider_id_fkey(*),
      provider_profile:provider_profiles!bookings_provider_id_fkey(*)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Booking[];
}

export async function getMyBookingsAsProvider(providerId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      request:service_requests(*, category:categories(*)),
      client:profiles!bookings_client_id_fkey(*)
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Booking[];
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function acceptBooking(bookingId: string, requestId: string) {
  // Accept this booking and reject others for the same request
  const { error: rejectError } = await supabase
    .from('bookings')
    .update({ status: 'rejected' })
    .eq('request_id', requestId)
    .neq('id', bookingId);
  if (rejectError) throw rejectError;

  // Accept the chosen booking
  const booking = await updateBookingStatus(bookingId, 'accepted');

  // Update request status
  await supabase
    .from('service_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  return booking;
}

// Messages
export async function getMessages(bookingId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(`*, sender:profiles!messages_sender_id_fkey(*)`)
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(
  bookingId: string,
  senderId: string,
  body: string,
  contextType?: ConversationContextType,
  contextLabel?: string,
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      booking_id: bookingId,
      sender_id: senderId,
      body,
      ...(contextType ? { context_type: contextType } : {}),
      ...(contextLabel ? { context_label: contextLabel } : {}),
    })
    .select(`*, sender:profiles!messages_sender_id_fkey(*)`)
    .single();
  if (error) throw error;
  return data as Message;
}

/** Insert a system event message (automated, not user-authored). */
export async function sendSystemMessage(
  bookingId: string,
  senderId: string,
  body: string,
  contextType: ConversationContextType,
  contextLabel: string,
  systemIcon = 'information-circle-outline',
) {
  const { error } = await supabase
    .from('messages')
    .insert({
      booking_id: bookingId,
      sender_id: senderId,
      body,
      context_type: contextType,
      context_label: contextLabel,
      is_system: true,
      system_icon: systemIcon,
    });
  if (error) throw error;
}

// ── Client action helpers ──────────────────────────────────────

/** Extend the deadline on a service request. */
export async function extendDeadline(requestId: string, newDate: string): Promise<void> {
  const { error } = await supabase
    .from('service_requests')
    .update({ deadline_date: newDate })
    .eq('id', requestId);
  if (error) throw error;
}

/**
 * Approve all submitted/under-review deliverables for a booking,
 * then mark the booking completed.
 * DB triggers will auto-advance project_status → completed
 * and inject a system message.
 */
export async function approveAndComplete(bookingId: string, _requestId: string): Promise<Booking> {
  // 1. Approve all pending deliverables (triggers set project_status → completed via deliverable trigger)
  await supabase
    .from('deliverables')
    .update({ status: 'approved' })
    .eq('booking_id', bookingId)
    .in('status', ['submitted', 'under_review']);

  // 2. Complete the booking (trigger emits "Project Completed" system message)
  return updateBookingStatus(bookingId, 'completed');
}

/**
 * Request revision on all submitted deliverables for a booking.
 * DB trigger on deliverables sets project_status → in_progress and emits system msg.
 */
export async function requestRevisionOnDeliverables(
  bookingId: string,
  userId: string,
  note: string,
): Promise<void> {
  // Mark submitted deliverables as revision_requested
  await supabase
    .from('deliverables')
    .update({ status: 'revision_requested', notes: note || null })
    .eq('booking_id', bookingId)
    .in('status', ['submitted', 'under_review']);

  // Send the note as a chat message so context is clear
  if (note.trim()) {
    await sendSystemMessage(
      bookingId, userId,
      `Revision requested: ${note.trim()}`,
      'project_started', '',
      'refresh-outline',
    );
  }
}

/**
 * Provider accepts an offer — moves booking to accepted.
 * DB trigger advances project_status → accepted and emits system message.
 */
export async function acceptOffer(bookingId: string): Promise<Booking> {
  return updateBookingStatus(bookingId, 'accepted');
}

/**
 * Provider submits completed work.
 * Directly sets project_status → review_requested without needing a deliverable upload.
 * The AFTER UPDATE trigger emits the system message automatically.
 */
export async function submitWork(
  bookingId: string,
  userId: string,
  summary: string,
): Promise<void> {
  // Update project_status directly — trigger will emit system message
  await setProjectStatus(bookingId, 'review_requested');
  // Also post the provider's work summary as a regular message so context is clear
  if (summary.trim()) {
    await sendMessage(bookingId, userId, `📤 Work submitted: ${summary.trim()}`);
  }
}

/**
 * Directly update project_status on a booking.
 * The trg_emit_project_status_message AFTER UPDATE trigger fires automatically,
 * injecting a system message when the status changes.
 */
export async function setProjectStatus(
  bookingId: string,
  status: import('../types').ProjectStatus,
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ project_status: status })
    .eq('id', bookingId);
  if (error) throw error;
}

/**
 * Send a formal offer from a booking in inquiry/offer_sent state.
 * Updates the booking price and moves status to pending.
 */
export async function formalizeOffer(
  bookingId: string,
  price: number,
  note: string,
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .update({ price, notes: note || null, status: 'pending' })
    .eq('id', bookingId)
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
}

/** Fetch the full chronological event log for a project. */
export async function getProjectTimeline(bookingId: string): Promise<ProjectEvent[]> {
  const { data, error } = await supabase
    .from('project_events')
    .select('*, actor:profiles!project_events_actor_id_fkey(*)')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectEvent[];
}

/** Fetch all conversations for the current user (from the conversations view). */
export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`provider_id.eq.${userId},client_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ConversationSummary[];
}
