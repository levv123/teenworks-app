import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, ServiceRequest, Booking } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { getRequestById } from '../../api/requests';
import { getBookingsForRequest, acceptBooking } from '../../api/bookings';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { StarRating } from '../../components/StarRating';
import { CategoryBadge } from '../../components/CategoryBadge';
import { formatCurrency, formatDate, getRequestStatusLabel, getStatusColor, timeAgo } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<HomeStackParamList, 'RequestDetail'>;

export function RequestDetailScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const { user } = useAuth();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [req, bks] = await Promise.all([
          getRequestById(requestId),
          getBookingsForRequest(requestId),
        ]);
        setRequest(req);
        setBookings(bks);
      } catch (err) {
        console.error('RequestDetail load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestId]);

  const handleAccept = async (bookingId: string) => {
    Alert.alert('Accept Offer', 'Accept this offer and start the job?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setAccepting(bookingId);
          try {
            await acceptBooking(bookingId, requestId);
            navigation.navigate('Booking', { bookingId });
          } catch (err) {
            Alert.alert('Error', 'Failed to accept booking');
          } finally {
            setAccepting(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!request) return null;

  const isOwner = user?.id === request.client_id;
  const statusColor = getStatusColor(request.status);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          {isOwner && (
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{getRequestStatusLabel(request.status)}</Text>
          <Text style={styles.statusTime}>{timeAgo(request.created_at)}</Text>
        </View>

        {/* Request info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            {request.category && <CategoryBadge category={request.category} />}
            {request.budget && (
              <Text style={styles.budget}>{formatCurrency(request.budget)}</Text>
            )}
          </View>
          <Text style={styles.requestTitle}>{request.title}</Text>
          {request.description && (
            <Text style={styles.description}>{request.description}</Text>
          )}

          <View style={styles.metaList}>
            {request.address && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color={Colors.muted} />
                <Text style={styles.metaText}>{request.address}</Text>
              </View>
            )}
            {request.scheduled_at && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={Colors.muted} />
                <Text style={styles.metaText}>{formatDate(request.scheduled_at)}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={Colors.muted} />
              <Text style={styles.metaText}>Posted {timeAgo(request.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Client info */}
        {request.client && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Posted by</Text>
            <View style={styles.clientRow}>
              <Avatar uri={request.client.avatar_url} name={request.client.full_name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>{request.client.full_name}</Text>
                <Text style={styles.clientMeta}>Client · Member since {new Date(request.client.created_at).getFullYear()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Offers/Bookings section */}
        <View style={styles.offersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {bookings.length > 0 ? `Offers (${bookings.length})` : 'No offers yet'}
            </Text>
            {!isOwner && request.status === 'open' && (
              <Button
                title="Make Offer"
                size="sm"
                onPress={() => Alert.alert('Make Offer', 'Offer flow coming soon')}
              />
            )}
          </View>

          {bookings.map((booking) => (
            <View key={booking.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <Avatar
                  uri={booking.provider?.avatar_url}
                  name={booking.provider?.full_name}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.offerProviderName}>{booking.provider?.full_name ?? 'Provider'}</Text>
                  {booking.provider_profile && (
                    <View style={styles.ratingRow}>
                      <StarRating rating={booking.provider_profile.rating} size={12} />
                      <Text style={styles.ratingText}>
                        {booking.provider_profile.rating.toFixed(1)} ({booking.provider_profile.review_count})
                      </Text>
                    </View>
                  )}
                </View>
                {booking.price && (
                  <Text style={styles.offerPrice}>{formatCurrency(booking.price)}</Text>
                )}
              </View>

              {booking.notes && (
                <Text style={styles.offerNotes}>{booking.notes}</Text>
              )}

              {isOwner && booking.status === 'pending' && request.status === 'open' && (
                <View style={styles.offerActions}>
                  <Button
                    title="Decline"
                    variant="outline"
                    size="sm"
                    style={{ flex: 1 }}
                    onPress={() => Alert.alert('Decline', 'Declining offer...')}
                  />
                  <Button
                    title="Accept"
                    size="sm"
                    loading={accepting === booking.id}
                    style={{ flex: 1 }}
                    onPress={() => handleAccept(booking.id)}
                  />
                </View>
              )}

              {booking.status === 'accepted' && (
                <TouchableOpacity
                  style={styles.viewBookingBtn}
                  onPress={() => navigation.navigate('Booking', { bookingId: booking.id })}
                >
                  <Text style={styles.viewBookingText}>View Booking</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {bookings.length === 0 && request.status === 'open' && (
            <View style={styles.noOffers}>
              <Ionicons name="time-outline" size={32} color={Colors.muted} />
              <Text style={styles.noOffersTitle}>Waiting for offers</Text>
              <Text style={styles.noOffersDesc}>Nearby providers will see your request and send offers shortly.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.text },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700', flex: 1 },
  statusTime: { fontSize: 12, color: Colors.muted },
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 12,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budget: { fontSize: 18, fontWeight: '800', color: Colors.success },
  requestTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, lineHeight: 24 },
  description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  metaList: { gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: Colors.muted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  clientMeta: { fontSize: 12, color: Colors.muted },
  offersSection: {
    marginHorizontal: Spacing.lg,
    gap: 12,
  },
  offerCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 10,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offerProviderName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: Colors.muted },
  offerPrice: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  offerNotes: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, backgroundColor: Colors.background, borderRadius: Radius.sm, padding: 10 },
  offerActions: { flexDirection: 'row', gap: 10 },
  viewBookingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  viewBookingText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  noOffers: { alignItems: 'center', gap: 8, paddingVertical: Spacing.xl },
  noOffersTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  noOffersDesc: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 18 },
});
