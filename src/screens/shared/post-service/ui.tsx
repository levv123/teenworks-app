import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dark, S, R, TOUCH, CTA_HEIGHT, FIELD_HEIGHT } from './theme';

/* ────────────────────────────────────────────────────────────────
   Primary CTA — white fill, black label, full width.
   ──────────────────────────────────────────────────────────────── */

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.cta, inactive && styles.ctaDisabled]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={Dark.ctaText} />
      ) : (
        <>
          <Text style={[styles.ctaText, inactive && styles.ctaTextDisabled]}>{label}</Text>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={inactive ? Dark.ctaDisabledText : Dark.ctaText}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

/* ────────────────────────────────────────────────────────────────
   Field wrapper — label, optional error, optional trailing counter.
   ──────────────────────────────────────────────────────────────── */

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {hint ? (
          <Text style={styles.fieldHint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={Dark.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────
   Text input — dark rounded field.
   ──────────────────────────────────────────────────────────────── */

export function DarkInput({
  invalid,
  style,
  ...props
}: TextInputProps & { invalid?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={Dark.textMuted}
      selectionColor={Dark.text}
      {...props}
      style={[styles.input, invalid && styles.inputInvalid, style]}
    />
  );
}

export function DarkTextArea({
  invalid,
  style,
  ...props
}: TextInputProps & { invalid?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={Dark.textMuted}
      selectionColor={Dark.text}
      multiline
      textAlignVertical="top"
      {...props}
      style={[styles.input, styles.textArea, invalid && styles.inputInvalid, style]}
    />
  );
}

/* ────────────────────────────────────────────────────────────────
   Segmented control (Hourly / Fixed).
   ──────────────────────────────────────────────────────────────── */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmented, style]} accessibilityRole="radiogroup">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────
   Selectable pill (weekday chips, duration chips).
   `checkmark` keeps selection legible without relying on colour alone.
   ──────────────────────────────────────────────────────────────── */

export function Pill({
  label,
  selected,
  onPress,
  style,
  showCheck,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  showCheck?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillSelected, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      {showCheck && selected && (
        <Ionicons name="checkmark" size={13} color={Dark.ctaText} style={styles.pillCheck} />
      )}
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ────────────────────────────────────────────────────────────────
   Collapsible section — used for the preserved Packages / FAQ /
   Portfolio editors so step 2 stays short by default.
   ──────────────────────────────────────────────────────────────── */

export function Collapsible({
  icon,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.collapsible}>
      <TouchableOpacity
        style={styles.collapsibleHead}
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${subtitle}`}
      >
        <View style={styles.collapsibleIcon}>
          <Ionicons name={icon} size={17} color={Dark.textSecondary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.collapsibleTitle}>{title}</Text>
          <Text style={styles.collapsibleSub}>{subtitle}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={17}
          color={Dark.textMuted}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.collapsibleBody}>{children}</View>}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────
   Styles
   ──────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  flex: { flex: 1 },

  cta: {
    height: CTA_HEIGHT,
    borderRadius: R.input,
    backgroundColor: Dark.ctaBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: S.sm,
  },
  ctaDisabled: { backgroundColor: Dark.ctaDisabledBg },
  ctaText: { fontSize: 16, fontWeight: '700', color: Dark.ctaText },
  ctaTextDisabled: { color: Dark.ctaDisabledText },

  field: { gap: S.sm },
  fieldHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: S.sm,
  },
  // The label keeps its full width; a long hint truncates rather than
  // colliding with it at narrow widths.
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Dark.textSecondary, flexShrink: 0 },
  fieldHint: { fontSize: 12, color: Dark.textMuted, flexShrink: 1, textAlign: 'right' },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: { fontSize: 12, color: Dark.danger },

  input: {
    minHeight: FIELD_HEIGHT,
    borderRadius: R.input,
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
    paddingHorizontal: S.base,
    paddingVertical: S.md,
    fontSize: 16,
    color: Dark.text,
  },
  inputInvalid: { borderColor: Dark.danger },
  textArea: { minHeight: 132, paddingTop: S.md },

  segmented: {
    flexDirection: 'row',
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
    borderRadius: R.input,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: TOUCH,
    borderRadius: R.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: S.md,
  },
  segmentActive: { backgroundColor: Dark.ctaBg },
  segmentText: { fontSize: 15, fontWeight: '600', color: Dark.textSecondary },
  segmentTextActive: { color: Dark.ctaText },

  pill: {
    minHeight: TOUCH,
    minWidth: TOUCH,
    paddingHorizontal: S.md,
    borderRadius: R.full,
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  pillSelected: { backgroundColor: Dark.ctaBg, borderColor: Dark.ctaBg },
  pillCheck: { marginLeft: -2 },
  pillText: { fontSize: 14, fontWeight: '600', color: Dark.textSecondary },
  pillTextSelected: { color: Dark.ctaText },

  collapsible: {
    borderRadius: R.card,
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
    overflow: 'hidden',
  },
  collapsibleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.base,
    minHeight: TOUCH + 12,
  },
  collapsibleIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm + 2,
    backgroundColor: Dark.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsibleTitle: { fontSize: 15, fontWeight: '600', color: Dark.text },
  collapsibleSub: { fontSize: 12, color: Dark.textMuted, marginTop: 1 },
  collapsibleBody: {
    paddingHorizontal: S.base,
    paddingBottom: S.base,
    gap: S.md,
    borderTopWidth: 1,
    borderTopColor: Dark.border,
    paddingTop: S.base,
  },
});
