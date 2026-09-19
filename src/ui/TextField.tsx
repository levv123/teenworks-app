/** Labelled dark input with focus + error states and an optional "$" prefix. */
import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { C, R, S, T } from '../design/tokens';
import { AppText } from './AppText';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  /** Rendered inside the field ahead of the input, e.g. '$'. */
  prefix?: string;
  maxLength?: number;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  editable?: boolean;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
}

const LINE_HEIGHT = T.body.lineHeight ?? 21;

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 4,
  keyboardType,
  error,
  prefix,
  maxLength,
  autoCapitalize = 'sentences',
  editable = true,
  onSubmitEditing,
  style,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? C.danger : focused ? C.borderStrong : C.border;

  return (
    <View style={style}>
      <AppText variant="small" color={C.textMuted} style={styles.label}>
        {label}
      </AppText>

      <View
        style={[
          styles.field,
          { borderColor },
          multiline && { minHeight: numberOfLines * LINE_HEIGHT + S.xl },
        ]}
      >
        {prefix ? (
          <AppText variant="body" color={C.textMuted} style={styles.prefix}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textSubtle}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
      </View>

      {error ? (
        <AppText variant="tiny" color={C.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
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
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  prefix: {
    marginRight: S.xs,
  },
  input: {
    flex: 1,
    padding: 0,
    color: C.text,
    fontSize: T.body.fontSize,
    fontWeight: T.body.fontWeight,
    lineHeight: LINE_HEIGHT,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    alignSelf: 'stretch',
  },
  error: {
    marginTop: S.xs + 2,
  },
});
