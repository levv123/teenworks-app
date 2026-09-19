/** Dark search input with a leading magnifier and a clear button once there is text. */
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, HIT_SLOP, R, S, T } from '../design/tokens';
import { AppText } from './AppText';

export interface SearchFieldProps {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  onSubmit,
  label,
  style,
}: SearchFieldProps) {
  return (
    <View style={style}>
      {label ? (
        <AppText variant="small" color={C.textMuted} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.field}>
        <Ionicons name="search" size={16} color={C.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textSubtle}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel={label ?? placeholder}
          style={styles.input}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Ionicons name="close-circle" size={18} color={C.textSubtle} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: S.sm - 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: S.md,
  },
  input: {
    flex: 1,
    marginHorizontal: S.sm,
    padding: 0,
    color: C.text,
    fontSize: T.body.fontSize,
    fontWeight: T.body.fontWeight,
    lineHeight: T.body.lineHeight,
  },
  pressed: {
    opacity: 0.6,
  },
});
