/** Bottom-sheet single-select built on RN Modal so it works on web as well as native. */
import React from 'react';
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, R, S } from '../design/tokens';
import type { IoniconName } from '../data/types';
import { AppText } from './AppText';

export interface SheetOption<Id extends string> {
  id: Id;
  label: string;
  icon?: IoniconName;
}

export interface OptionSheetProps<Id extends string> {
  visible: boolean;
  title: string;
  options: SheetOption<Id>[];
  selectedId: Id;
  onSelect: (id: Id) => void;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}

/** The scrim has no token because it dims the whole screen rather than painting a surface. */
const BACKDROP = 'rgba(0,0,0,0.6)';

export function OptionSheet<Id extends string>({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  style,
}: OptionSheetProps<Id>) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.md }, style]}>
          <View style={styles.handle} />
          <AppText variant="h3" style={styles.title}>
            {title}
          </AppText>

          {options.map((option) => {
            const selected = option.id === selectedId;
            return (
              <Pressable
                key={option.id}
                onPress={() => onSelect(option.id)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                {option.icon ? (
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={selected ? C.text : C.textMuted}
                    style={styles.rowIcon}
                  />
                ) : null}
                <AppText
                  variant="body"
                  color={selected ? C.text : C.textMuted}
                  style={styles.rowLabel}
                  numberOfLines={1}
                >
                  {option.label}
                </AppText>
                {selected ? (
                  <Ionicons name="checkmark" size={18} color={C.text} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKDROP,
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: S.lg,
    paddingTop: S.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.surfaceHigh,
    alignSelf: 'center',
  },
  title: {
    marginTop: S.base,
    marginBottom: S.sm,
  },
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: S.md,
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.6,
  },
});
