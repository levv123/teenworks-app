/**
 * Step 2 of Post a Service: photos first, then the few fields a listing needs.
 *
 * Fully controlled. The screen owns the form and decides which errors are
 * showing, so nothing typed here is lost when the user steps back and forth.
 * Inputs are the app's TextField; chips, segments and day toggles use the same
 * surfaces the previous form did.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { C, R, S } from '../../design/tokens';
import { AppText, TextField } from '../../ui';
import {
  DAYS,
  DESCRIPTION_MAX,
  DURATIONS,
  RATE_TYPES,
  TITLE_MAX,
} from './constants';
import type { Day } from './constants';
import type { FieldKey, PostServiceForm } from './form';
import { PhotoStrip } from './PhotoStrip';

/** The input's own height: 14 + 21 + 14 of padding and line, plus its 1px border. */
const FIELD_HEIGHT = 51;

/**
 * Whole dollars as digits: every price in the app is shown without cents.
 * Cents are cut rather than merged ("25.00" is 25, not 2500), symbols and
 * separators dropped ("$1,200" is 1200), and length capped only after that, so
 * a pasted "$125" isn't clipped to "12" first. Four digits is enough for the
 * over-the-limit message to show.
 */
function wholeDollars(text: string): string {
  return text.split('.')[0].replace(/[^0-9]/g, '').slice(0, 4);
}

export interface ServiceDetailsFormProps {
  form: PostServiceForm;
  errorFor: (key: FieldKey) => string | undefined;
  /** Applies a patch; `field` marks that field as touched so its error may show. */
  onChange: (patch: Partial<PostServiceForm>, field?: FieldKey) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  placePlaceholder: string;
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <AppText variant="tiny" color={C.danger} style={styles.error}>
      {message}
    </AppText>
  );
}

function Label({ children }: { children: string }) {
  return (
    <AppText variant="small" color={C.textMuted} style={styles.label}>
      {children}
    </AppText>
  );
}

export function ServiceDetailsForm({
  form,
  errorFor,
  onChange,
  onAddPhoto,
  onRemovePhoto,
  placePlaceholder,
}: ServiceDetailsFormProps) {
  const toggleDay = (day: Day) => {
    const next = form.availability.includes(day)
      ? form.availability.filter((d) => d !== day)
      : // Rebuilt from DAYS so the stored days always read Mon -> Sun.
        DAYS.filter((d) => d === day || form.availability.includes(d));
    onChange({ availability: next }, 'availability');
  };

  return (
    <View>
      <Label>Photos</Label>
      <PhotoStrip photos={form.photos} onAdd={onAddPhoto} onRemove={onRemovePhoto} />

      <TextField
        label="Title"
        value={form.title}
        onChangeText={(title) => onChange({ title }, 'title')}
        placeholder="Lawn Mowing & Edging"
        maxLength={TITLE_MAX}
        autoCapitalize="words"
        error={errorFor('title')}
        style={styles.block}
      />

      <TextField
        label="Description"
        value={form.description}
        onChangeText={(description) => onChange({ description }, 'description')}
        placeholder="I'll mow your lawn, edge, and clean up. I bring my own equipment and make sure it looks clean and professional."
        multiline
        numberOfLines={4}
        maxLength={DESCRIPTION_MAX}
        error={errorFor('description')}
        style={styles.block}
      />
      <AppText variant="tiny" color={C.textSubtle} style={styles.counter}>
        {`${form.description.length}/${DESCRIPTION_MAX}`}
      </AppText>

      <View style={[styles.priceRow, styles.block]}>
        <TextField
          label="Price"
          value={form.rate}
          onChangeText={(next) => onChange({ rate: wholeDollars(next) }, 'rate')}
          placeholder="25"
          prefix="$"
          keyboardType="number-pad"
          error={errorFor('rate')}
          style={styles.priceField}
        />
        <View style={styles.rateTypeColumn}>
          <Label>Pricing</Label>
          <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel="Pricing">
            {RATE_TYPES.map((option) => {
              const selected = form.rateType === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onChange({ rateType: option.id }, 'rateType')}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: selected }}
                  // react-native-web drops accessibilityState; this reaches the DOM.
                  aria-checked={selected}
                  style={({ pressed }) => [
                    styles.segment,
                    selected && styles.segmentSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText variant="small" color={selected ? C.onLight : C.textMuted}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <FieldError message={errorFor('rateType')} />
        </View>
      </View>

      <View style={styles.block}>
        <Label>Duration</Label>
        <View style={styles.chipRow} accessibilityRole="radiogroup" accessibilityLabel="Duration">
          {DURATIONS.map((option) => {
            const selected = form.duration === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => onChange({ duration: option.id }, 'duration')}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                style={({ pressed }) => [
                  styles.chip,
                  selected ? styles.optionSelected : styles.optionIdle,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="small" color={selected ? C.onLight : C.text}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <FieldError message={errorFor('duration')} />
      </View>

      <TextField
        label="Location"
        value={form.place}
        onChangeText={(place) => onChange({ place }, 'place')}
        placeholder={placePlaceholder}
        autoCapitalize="words"
        error={errorFor('place')}
        style={styles.block}
      />

      <View style={styles.block}>
        <Label>Availability</Label>
        <View style={styles.dayRow}>
          {DAYS.map((day, index) => {
            const selected = form.availability.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                accessibilityRole="checkbox"
                accessibilityLabel={day}
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                style={({ pressed }) => [
                  styles.day,
                  index < DAYS.length - 1 && styles.dayGap,
                  selected ? styles.optionSelected : styles.optionIdle,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="tiny" color={selected ? C.onLight : C.text}>
                  {day}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <FieldError message={errorFor('availability')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: S.lg,
  },
  label: {
    marginBottom: S.sm - 2,
  },
  error: {
    marginTop: S.xs + 2,
  },
  counter: {
    marginTop: S.xs + 2,
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  priceField: {
    flex: 1,
    minWidth: 0,
    marginRight: S.md,
  },
  rateTypeColumn: {
    flexShrink: 0,
  },
  segmented: {
    flexDirection: 'row',
    height: FIELD_HEIGHT,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.full,
    padding: 3,
  },
  segment: {
    justifyContent: 'center',
    paddingHorizontal: S.base,
    borderRadius: R.full,
  },
  segmentSelected: {
    backgroundColor: C.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Cancels the chips' bottom margin so the error sits under the last row.
    marginBottom: -S.sm,
  },
  chip: {
    borderRadius: R.full,
    paddingVertical: S.sm + 2,
    paddingHorizontal: 14,
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  optionIdle: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  optionSelected: {
    backgroundColor: C.text,
    borderWidth: 1,
    borderColor: C.text,
  },
  dayRow: {
    flexDirection: 'row',
  },
  day: {
    flex: 1,
    maxWidth: 64,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.md,
  },
  dayGap: {
    marginRight: S.sm - 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
