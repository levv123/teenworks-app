/**
 * A nearby worker row on the Hire side (spec 6.1).
 *
 * Borderless like GigCard so the avatar and the type carry the row. The Hire
 * button sits outside the pressable, so tapping it is its own action rather
 * than a second way to trip the row press.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, TABULAR } from '../../design/tokens';
import type { Worker } from '../../data/types';
import { formatDistance, formatMoney, formatRating } from '../../utils/format';
import { AppText, Avatar, SecondaryButton, Stars } from '../../ui';

const AVATAR = 56;

export interface WorkerCardProps {
  worker: Worker;
  onPress: () => void;
  onHire: () => void;
}

export function WorkerCard({ worker, onPress, onHire }: WorkerCardProps) {
  const jobs = Number.isFinite(worker.jobs) ? Math.max(0, Math.round(worker.jobs)) : 0;
  const meta = `${formatRating(worker.rating)} · ${jobs} ${jobs === 1 ? 'job' : 'jobs'} · ${formatDistance(worker.distanceMi)}`;
  const startingAt = `from ${formatMoney(worker.startingPrice)}`;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${worker.name}, ${worker.headline}, ${meta}, ${startingAt}`}
        style={({ pressed }) => [styles.press, pressed && styles.pressed]}
      >
        <Avatar name={worker.name} uri={worker.avatarUrl} size={AVATAR} />

        <View style={styles.main}>
          <View style={styles.nameRow}>
            <AppText variant="h3" numberOfLines={1} style={styles.name}>
              {worker.name}
            </AppText>
            {worker.verified ? (
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={C.success}
                style={styles.badge}
                accessibilityRole="image"
                accessibilityLabel="Verified worker"
              />
            ) : null}
          </View>

          <AppText variant="small" color={C.textMuted} numberOfLines={1}>
            {worker.headline}
          </AppText>

          <View style={styles.meta}>
            <Stars rating={worker.rating} size={12} />
            <AppText
              variant="tiny"
              color={C.textMuted}
              numberOfLines={1}
              style={[styles.metaText, TABULAR]}
            >
              {meta}
            </AppText>
          </View>
        </View>
      </Pressable>

      <View style={styles.side}>
        <AppText variant="bodyBold" numberOfLines={1} style={TABULAR}>
          {startingAt}
        </AppText>
        <SecondaryButton
          label="Hire"
          size="sm"
          onPress={onHire}
          style={styles.hire}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  press: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flexShrink: 1,
    minWidth: 0,
  },
  badge: {
    marginLeft: S.xs + 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.xs + 2,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.sm - 2,
  },
  side: {
    marginLeft: S.md,
    alignItems: 'flex-end',
  },
  hire: {
    marginTop: S.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
