import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing } from '../utils/colors';
import { ServiceRequest } from '../types';
import { formatCurrency, getRequestStatusLabel, getStatusColor, timeAgo } from '../utils/helpers';
import { CategoryBadge } from './CategoryBadge';

interface RequestCardProps {
  request: ServiceRequest;
  onPress?: () => void;
}

export function RequestCard({ request, onPress }: RequestCardProps) {
  const statusColor = getStatusColor(request.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        {request.category && (
          <CategoryBadge category={request.category} size="sm" />
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getRequestStatusLabel(request.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{request.title}</Text>

      {request.description && (
        <Text style={styles.description} numberOfLines={2}>{request.description}</Text>
      )}

      <View style={styles.footer}>
        {request.budget && (
          <View style={styles.footerItem}>
            <Ionicons name="cash-outline" size={14} color={Colors.success} />
            <Text style={styles.budget}>{formatCurrency(request.budget)}</Text>
          </View>
        )}
        {request.address && (
          <View style={styles.footerItem}>
            <Ionicons name="location-outline" size={14} color={Colors.muted} />
            <Text style={styles.location} numberOfLines={1}>{request.address}</Text>
          </View>
        )}
        <Text style={styles.time}>{timeAgo(request.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 8,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 21 },
  description: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  budget: { fontSize: 13, fontWeight: '700', color: Colors.success },
  location: { fontSize: 12, color: Colors.muted, flex: 1 },
  time: { fontSize: 12, color: Colors.muted, marginLeft: 'auto' },
});
