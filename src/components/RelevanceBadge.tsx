import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../utils/colors';
import { MatchType } from '../utils/searchUtils';

interface Props {
  label: string;
  percent: string;
  matchType: MatchType;
}

const TYPE_COLORS: Record<MatchType, { bg: string; text: string }> = {
  exact: { bg: Colors.successLight, text: Colors.success },
  related: { bg: Colors.primaryLight, text: Colors.primary },
  similar: { bg: Colors.warningLight, text: Colors.warning },
};

export function RelevanceBadge({ label, percent, matchType }: Props) {
  const { bg, text } = TYPE_COLORS[matchType];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>
        {label} • {percent}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
