import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Shadow, Spacing } from '../../utils/colors';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { getServiceRequestsForProvider } from '../../api/requests';
import {
  acceptServiceRequest,
  declineServiceRequest,
  sendCustomOffer,
} from '../../api/bookings';
import { timeAgo } from '../../utils/helpers';
import { ServiceRequest, ServicesStackParamList } from '../../types';

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServiceRequests'>;
type Filter = 'pending' | 'all';

export function ServiceRequestsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');

  // Custom offer sheet state
  const [offerSheet, setOfferSheet] = useState<ServiceRequest | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDays, setOfferDays] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const load = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (!isRefresh) setLoading(true);
    try {
      const data = await getServiceRequestsForProvider(user.id);
      setRequests(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const filtered = requests.filter((r) =>
    filter === 'pending' ? r.status === 'open' : true,
  );

  const pendingCount = requests.filter((r) => r.status === 'open').length;

  // ── Actions ────────────────────────────────────────────────

  const handleAccept = (req: ServiceRequest) => {
    Alert.alert(
      'Accept Request',
      `Accept ${req.client?.full_name ?? 'this client'}'s request for $${req.budget ?? 'TBD'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              if (!user?.id) return;
              const booking = await acceptServiceRequest(req, user.id);
              setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'accepted' } : r));
              Alert.alert('Accepted!', 'Booking created. Head to the booking to start work.', [
                { text: 'View Booking', onPress: () => navigation.navigate('Booking', { bookingId: booking.id }) },
                { text: 'Done' },
              ]);
            } catch {
              Alert.alert('Error', 'Could not accept request.');
            }
          },
        },
      ],
    );
  };

  const handleDecline = (req: ServiceRequest) => {
    Alert.alert(
      'Decline Request',
      "Decline this request? The client will be notified.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineServiceRequest(req.id);
              setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'cancelled' } : r));
            } catch {
              Alert.alert('Error', 'Could not decline request.');
            }
          },
        },
      ],
    );
  };

  const openOfferSheet = (req: ServiceRequest) => {
    setOfferSheet(req);
    setOfferPrice(req.budget ? String(req.budget) : '');
    setOfferDays('');
    setOfferNote('');
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeOfferSheet = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }).start(() =>
      setOfferSheet(null),
    );
  };

  const handleSendOffer = async () => {
    if (!offerSheet || !user?.id) return;
    const price = parseFloat(offerPrice);
    const days = parseInt(offerDays, 10);
    if (!price || price <= 0) { Alert.alert('Required', 'Enter a valid offer price.'); return; }
    if (!days || days < 1) { Alert.alert('Required', 'Enter delivery days.'); return; }
    setSendingOffer(true);
    try {
      const booking = await sendCustomOffer(offerSheet, user.id, price, days, offerNote.trim());
      setRequests((prev) => prev.map((r) => r.id === offerSheet.id ? { ...r, status: 'accepted' } : r));
      closeOfferSheet();
      Alert.alert('Offer Sent!', 'Your custom offer has been sent. The client will review it.', [
        { text: 'View Booking', onPress: () => navigation.navigate('Booking', { bookingId: booking.id }) },
        { text: 'Done' },
      ]);
    } catch {
      Alert.alert('Error', 'Could not send offer.');
    } finally {
      setSendingOffer(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => navigation.goBack()} pendingCount={pendingCount} />
        <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={() => navigation.goBack()} pendingCount={pendingCount} />

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['pending', 'all'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'pending' ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onAccept={() => handleAccept(item)}
            onDecline={() => handleDecline(item)}
            onOffer={() => openOfferSheet(item)}
            onViewBooking={(id) => navigation.navigate('Booking', { bookingId: id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState filter={filter} />
        }
        ListFooterComponent={<View style={{ height: Spacing.xxl }} />}
      />

      {/* ── Custom Offer Sheet ────────────────────────────── */}
      <Modal visible={!!offerSheet} transparent animationType="none" onRequestClose={closeOfferSheet}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeOfferSheet} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Send Custom Offer</Text>

            {offerSheet && (
              <View style={styles.sheetClientRow}>
                <Avatar
                  uri={offerSheet.client?.avatar_url ?? null}
                  name={offerSheet.client?.full_name ?? '?'}
                  size={36}
                />
                <View style={styles.sheetClientInfo}>
                  <Text style={styles.sheetClientName}>{offerSheet.client?.full_name ?? 'Client'}</Text>
                  <Text style={styles.sheetClientReq} numberOfLines={1}>{offerSheet.title}</Text>
                </View>
              </View>
            )}

            <View style={styles.offerRow}>
              <View style={styles.offerField}>
                <Text style={styles.offerLabel}>Your Price</Text>
                <View style={styles.prefixInput}>
                  <Text style={styles.prefix}>$</Text>
                  <TextInput
                    style={styles.prefixTextInput}
                    value={offerPrice}
                    onChangeText={setOfferPrice}
                    placeholder="0"
                    placeholderTextColor={Colors.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={styles.offerField}>
                <Text style={styles.offerLabel}>Delivery</Text>
                <View style={styles.suffixInput}>
                  <TextInput
                    style={styles.suffixTextInput}
                    value={offerDays}
                    onChangeText={setOfferDays}
                    placeholder="3"
                    placeholderTextColor={Colors.muted}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.suffix}>days</Text>
                </View>
              </View>
            </View>

            <View style={styles.offerNoteWrap}>
              <Text style={styles.offerLabel}>Message to Client <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.offerNoteInput}
                value={offerNote}
                onChangeText={setOfferNote}
                placeholder="Explain your offer, scope, or any questions you have…"
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={3}
                maxLength={400}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.sendOfferBtn, sendingOffer && styles.sendOfferBtnDisabled]}
              onPress={handleSendOffer}
              disabled={sendingOffer}
            >
              {sendingOffer ? (
                <ActivityIndicator color={Colors.card} />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color={Colors.card} />
                  <Text style={styles.sendOfferBtnText}>
                    Send Offer{offerPrice ? ` · $${offerPrice}` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.sheetDisclaimer}>
              The client will receive your offer and can accept or decline. No payment until they confirm.
            </Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Header({ onBack, pendingCount }: { onBack: () => void; pendingCount: number }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
        <Ionicons name="chevron-back" size={24} color={Colors.text} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Service Requests</Text>
        {pendingCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.headerBtn} />
    </View>
  );
}

function RequestCard({
  request,
  onAccept,
  onDecline,
  onOffer,
  onViewBooking,
}: {
  request: ServiceRequest;
  onAccept: () => void;
  onDecline: () => void;
  onOffer: () => void;
  onViewBooking: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = request.status === 'open';

  const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
    open:       { label: 'Pending',   color: Colors.warning, bg: Colors.warning + '18' },
    accepted:   { label: 'Accepted',  color: Colors.success, bg: Colors.success + '18' },
    cancelled:  { label: 'Declined',  color: Colors.error,   bg: Colors.error   + '18' },
    in_progress:{ label: 'Active',    color: Colors.primary, bg: Colors.primary + '18' },
    completed:  { label: 'Done',      color: Colors.muted,   bg: Colors.border           },
  };
  const status = statusMeta[request.status] ?? statusMeta.open;

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <Avatar
          uri={request.client?.avatar_url ?? null}
          name={request.client?.full_name ?? '?'}
          size={44}
        />
        <View style={styles.cardClientInfo}>
          <Text style={styles.cardClientName}>{request.client?.full_name ?? 'Client'}</Text>
          <Text style={styles.cardService} numberOfLines={1}>
            {(request as any).service?.title ?? request.title}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(request.created_at)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {request.budget != null && (
          <View style={styles.metaItem}>
            <Ionicons name="pricetag-outline" size={13} color={Colors.muted} />
            <Text style={styles.metaText}>${request.budget}</Text>
          </View>
        )}
        {request.deadline_date && (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={Colors.muted} />
            <Text style={styles.metaText}>
              Due {new Date(request.deadline_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}
        {request.attachments?.length > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="attach-outline" size={13} color={Colors.muted} />
            <Text style={styles.metaText}>{request.attachments.length} file{request.attachments.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Description */}
      {request.description ? (
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.85}>
          <Text style={styles.description} numberOfLines={expanded ? undefined : 3}>
            {request.description}
          </Text>
          {(request.description?.length ?? 0) > 120 && (
            <Text style={styles.expandText}>{expanded ? 'Show less' : 'Show more'}</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {/* Attachment thumbnails */}
      {request.attachments?.length > 0 && (
        <View style={styles.attachRow}>
          {request.attachments.slice(0, 3).map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.attachThumb} />
          ))}
        </View>
      )}

      {/* Action buttons — only shown for pending requests */}
      {isPending && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
            <Ionicons name="close" size={16} color={Colors.error} />
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.offerBtn} onPress={onOffer}>
            <Ionicons name="swap-horizontal-outline" size={16} color={Colors.primary} />
            <Text style={styles.offerBtnText}>Custom Offer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Ionicons name="checkmark" size={16} color={Colors.card} />
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="mail-open-outline" size={44} color={Colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === 'pending' ? 'No pending requests' : 'No requests yet'}
      </Text>
      <Text style={styles.emptySub}>
        {filter === 'pending'
          ? "You're all caught up. New requests will appear here."
          : 'When clients request your services, you\'ll see them here.'}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  headerBadge: {
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.card },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterTabActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  filterTabText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  filterTabTextActive: { color: Colors.card },

  listContent: { padding: Spacing.md, gap: Spacing.md },
  emptyContainer: { flex: 1, padding: Spacing.md },

  // Request card
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardClientInfo: { flex: 1, gap: 2 },
  cardClientName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardService: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  cardTime: { fontSize: 11, color: Colors.muted },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.muted, fontWeight: '500' },

  description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  expandText: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },

  attachRow: { flexDirection: 'row', gap: Spacing.xs },
  attachThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.error + '66',
  },
  declineBtnText: { fontSize: 13, fontWeight: '700', color: Colors.error },
  offerBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  offerBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: Colors.card },

  // Empty state
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 21 },

  // Custom offer sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.lg,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  sheetClientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm },
  sheetClientInfo: { flex: 1 },
  sheetClientName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sheetClientReq: { fontSize: 12, color: Colors.muted },

  offerRow: { flexDirection: 'row', gap: Spacing.sm },
  offerField: { flex: 1, gap: 6 },
  offerLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  optional: { fontWeight: '400', color: Colors.muted },
  prefixInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingLeft: Spacing.sm,
  },
  prefix: { fontSize: 15, fontWeight: '600', color: Colors.muted },
  prefixTextInput: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: 4, fontSize: 15, color: Colors.text },
  suffixInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingRight: Spacing.sm,
  },
  suffixTextInput: { flex: 1, paddingVertical: Spacing.sm, paddingLeft: Spacing.sm, fontSize: 15, color: Colors.text },
  suffix: { fontSize: 12, color: Colors.muted, fontWeight: '500' },
  offerNoteWrap: { gap: 6 },
  offerNoteInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
  },
  sendOfferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    ...Shadow.md,
  },
  sendOfferBtnDisabled: { opacity: 0.6 },
  sendOfferBtnText: { fontSize: 16, fontWeight: '700', color: Colors.card },
  sheetDisclaimer: { fontSize: 11, color: Colors.muted, textAlign: 'center', lineHeight: 16 },
});
