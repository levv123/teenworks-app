/**
 * The standing safety reminder on booking and need screens. TeenWorks connects
 * adults with teen workers, so these rules are shown, not buried in the terms.
 */
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../../design/tokens';
import { AppText } from '../../ui';

const RULES = [
  "Don't ask a worker for their phone number, social media or photos.",
  'Share your exact address only once a booking is confirmed.',
  "An adult should be home or reachable during the job.",
  'No driving, ladders or roofs, power tools or harsh chemicals.',
];

export function SafetyNote({ style, compact = false }: { style?: StyleProp<ViewStyle>; compact?: boolean }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.head}>
        <Ionicons name="shield-checkmark-outline" size={16} color={C.text} />
        <AppText variant="bodyBold" style={styles.title}>
          Safety first
        </AppText>
      </View>
      {(compact ? RULES.slice(0, 2) : RULES).map((rule) => (
        <View key={rule} style={styles.rule}>
          <View style={styles.dot} />
          <AppText variant="small" color={C.textMuted} style={styles.ruleText}>
            {rule}
          </AppText>
        </View>
      ))}
      <AppText variant="tiny" color={C.textSubtle} style={styles.emergency}>
        If anyone is in danger, call 911 first.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: S.base,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.xs,
  },
  title: {
    marginLeft: S.sm,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.sm - 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.textMuted,
    marginTop: 7,
    marginRight: S.sm,
  },
  ruleText: {
    flex: 1,
    minWidth: 0,
  },
  emergency: {
    marginTop: S.md,
  },
});
