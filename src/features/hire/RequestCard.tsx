/**
 * A request the user posted, as it appears in "Your requests" (spec 6.1).
 *
 * Unlike the borderless gig rows this one is a Card: a request is something the
 * user owns and comes back to, so it gets its own surface.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, TABULAR } from '../../design/tokens';
import { CATEGORY_BY_ID } from '../../data/mock';
import type { HireRequest, RequestStatus } from '../../data/types';
import { formatMoney, timeAgo } from '../../utils/format';
import { AppText, Card, Pill } from '../../ui';
import type { PillTone } from '../../ui';

/** Only an open request is worth calling out in colour; the rest are done with. */
const STATUS: Record<RequestStatus, { label: string; tone: PillTone }> = {
  open: { label: 'Open', tone: 'success' },
  hired: { label: 'Hired', tone: 'neutral' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export interface RequestCardProps {
  request: HireRequest;
  onPress?: () => void;
}

export function RequestCard({ request, onPress }: RequestCardProps) {
  const category = CATEGORY_BY_ID[request.category];
  const status = STATUS[request.status];
  const applicants = Number.isFinite(request.applicants)
    ? Math.max(0, Math.round(request.applicants))
    : 0;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${request.title}, ${formatMoney(request.budget)}, ${status.label}, ${applicants} applicants`}
    >
      <View style={styles.titleRow}>
        <AppText variant="h3" numberOfLines={2} style={styles.title}>
          {request.title}
        </AppText>
        <AppText variant="h3" numberOfLines={1} style={[styles.budget, TABULAR]}>
          {formatMoney(request.budget)}
        </AppText>
      </View>

      <View style={styles.pills}>
        <Pill label={category.label} icon={category.icon} style={styles.pill} />
        <Pill label={status.label} tone={status.tone} />
      </View>

      <View style={styles.whenRow}>
        <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
        <AppText
          variant="small"
          color={C.textMuted}
          numberOfLines={1}
          style={styles.whenText}
        >
          {request.when}
        </AppText>
      </View>

      <View style={styles.footer}>
        <AppText variant="tiny" color={C.textMuted} numberOfLines={1} style={styles.applicants}>
          {`${applicants} ${applicants === 1 ? 'applicant' : 'applicants'}`}
        </AppText>
        <AppText variant="tiny" color={C.textSubtle} numberOfLines={1}>
          {timeAgo(request.postedMinutesAgo)}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  budget: {
    marginLeft: S.md,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  pill: {
    marginRight: S.sm - 2,
  },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.md,
  },
  whenText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.xs + 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.md,
  },
  applicants: {
    flex: 1,
    minWidth: 0,
    marginRight: S.md,
  },
});
