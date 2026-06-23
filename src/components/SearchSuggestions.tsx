import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';
import { Suggestion } from '../utils/searchUtils';

interface Props {
  suggestions: Suggestion[];
  onSelect: (label: string) => void;
}

export function SearchSuggestions({ suggestions, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      {suggestions.map((s, i) => (
        <TouchableOpacity
          key={s.label}
          style={[styles.row, i < suggestions.length - 1 && styles.rowBorder]}
          onPress={() => onSelect(s.label)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{s.icon}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 999,
    marginTop: 4,
    ...Shadow.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  icon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
});
