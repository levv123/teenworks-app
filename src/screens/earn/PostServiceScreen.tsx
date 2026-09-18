/**
 * Post a Service — the form behind the white "Post a Service" CTA on Home.
 *
 * The whole form lives in one typed object and every error is derived from it,
 * so the footer CTA, the inline messages and the submitted draft can never
 * disagree with each other.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, R, S } from '../../design/tokens';
import { CATEGORIES } from '../../data/mock';
import type { Category, CategoryId, ServiceDraft } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { formatMoney } from '../../utils/format';
import { AppText, PrimaryButton, Screen, ScreenHeader, TextField } from '../../ui';

type PickableCategory = Category & { id: Exclude<CategoryId, 'all'> };
type RateType = 'fixed' | 'hourly';
type Day = (typeof DAYS)[number];
type FieldKey = 'title' | 'category' | 'rate' | 'description' | 'availability';
type Errors = Partial<Record<FieldKey, string>>;

interface FormState {
  title: string;
  category: Exclude<CategoryId, 'all'> | null;
  rate: string;
  rateType: RateType;
  description: string;
  availability: string[];
  place: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** 'all' is a filter value, never something a real service can be filed under. */
const PICKABLE: PickableCategory[] = CATEGORIES.filter(
  (category): category is PickableCategory => category.id !== 'all',
);

const RATE_TYPES: { id: RateType; label: string }[] = [
  { id: 'hourly', label: 'Hourly' },
  { id: 'fixed', label: 'Fixed' },
];

const TITLE_MIN = 4;
const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 400;
const RATE_MAX = 500;

function validate(form: FormState): Errors {
  const errors: Errors = {};

  if (form.title.trim().length < TITLE_MIN) {
    errors.title = `Use at least ${TITLE_MIN} characters.`;
  }

  if (form.category === null) {
    errors.category = 'Pick a category.';
  }

  const rate = Number(form.rate);
  if (form.rate.trim().length === 0) {
    errors.rate = 'Enter your rate.';
  } else if (!Number.isFinite(rate) || rate <= 0) {
    errors.rate = 'Enter a number above 0.';
  } else if (rate > RATE_MAX) {
    errors.rate = `Keep it at ${formatMoney(RATE_MAX)} or under.`;
  }

  if (form.description.trim().length < DESCRIPTION_MIN) {
    errors.description = `Use at least ${DESCRIPTION_MIN} characters so people know what they get.`;
  }

  if (form.availability.length === 0) {
    errors.availability = 'Pick at least one day.';
  }

  return errors;
}

export function PostServiceScreen() {
  const nav = useNavigation<Nav>();
  const { location, postService } = useApp();

  const [form, setForm] = useState<FormState>({
    title: '',
    category: null,
    rate: '',
    rateType: 'hourly',
    description: '',
    availability: [],
    place: location.label,
  });
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validate(form), [form]);
  const valid = Object.keys(errors).length === 0;

  const errorFor = (key: FieldKey): string | undefined =>
    submitted || touched[key] === true ? errors[key] : undefined;

  const touch = (key: FieldKey) => {
    setTouched((prev) => (prev[key] === true ? prev : { ...prev, [key]: true }));
  };

  const setText = (key: 'title' | 'rate' | 'description' | 'place', next: string) => {
    setForm((prev) => ({ ...prev, [key]: next }));
    if (key !== 'place') touch(key);
  };

  const selectCategory = (id: Exclude<CategoryId, 'all'>) => {
    setForm((prev) => ({ ...prev, category: id }));
    touch('category');
  };

  const toggleDay = (day: Day) => {
    setForm((prev) => ({
      ...prev,
      // Rebuilt from DAYS so the stored days always read Mon -> Sun.
      availability: prev.availability.includes(day)
        ? prev.availability.filter((d) => d !== day)
        : DAYS.filter((d) => d === day || prev.availability.includes(d)),
    }));
    touch('availability');
  };

  const submit = () => {
    setSubmitted(true);
    if (!valid || form.category === null) return;

    const draft: ServiceDraft = {
      title: form.title.trim(),
      category: form.category,
      rate: Number(form.rate),
      rateType: form.rateType,
      description: form.description.trim(),
      availability: form.availability,
      place: form.place.trim().length > 0 ? form.place.trim() : location.label,
    };

    postService(draft);
    nav.goBack();
  };

  const categoryError = errorFor('category');
  const availabilityError = errorFor('availability');

  return (
    <Screen
      header={<ScreenHeader title="Post a Service" onBack={() => nav.goBack()} />}
      footer={
        <PrimaryButton
          label="Post Service"
          onPress={submit}
          disabled={!valid}
        />
      }
    >
      <TextField
        label="Title"
        value={form.title}
        onChangeText={(next) => setText('title', next)}
        placeholder="Lawn Mowing & Edging"
        error={errorFor('title')}
      />

      <View style={styles.block}>
        <AppText variant="small" color={C.textMuted} style={styles.blockLabel}>
          Category
        </AppText>
        <View style={styles.chipGrid}>
          {PICKABLE.map((category) => {
            const selected = form.category === category.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => selectCategory(category.id)}
                accessibilityRole="radio"
                accessibilityLabel={category.label}
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.chip,
                  selected ? styles.chipSelected : styles.chipIdle,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={category.icon}
                  size={15}
                  color={selected ? C.onLight : category.color}
                  style={styles.chipIcon}
                />
                <AppText variant="small" color={selected ? C.onLight : C.text}>
                  {category.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {categoryError ? (
          <AppText variant="tiny" color={C.danger} style={styles.blockError}>
            {categoryError}
          </AppText>
        ) : null}
      </View>

      <TextField
        label="Rate"
        value={form.rate}
        onChangeText={(next) => setText('rate', next)}
        placeholder="25"
        prefix="$"
        keyboardType="numeric"
        error={errorFor('rate')}
        style={styles.block}
      />

      <View style={styles.segmented} accessibilityRole="radiogroup">
        {RATE_TYPES.map((option) => {
          const selected = form.rateType === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setForm((prev) => ({ ...prev, rateType: option.id }))}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} rate`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant="small"
                color={selected ? C.onLight : C.textMuted}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label="Description"
        value={form.description}
        onChangeText={(next) => setText('description', next)}
        placeholder="What you do, what you bring, how long it takes."
        multiline
        numberOfLines={4}
        maxLength={DESCRIPTION_MAX}
        error={errorFor('description')}
        style={styles.block}
      />
      <AppText variant="tiny" color={C.textSubtle} style={styles.counter}>
        {`${form.description.length}/${DESCRIPTION_MAX}`}
      </AppText>

      <View style={styles.block}>
        <AppText variant="small" color={C.textMuted} style={styles.blockLabel}>
          Availability
        </AppText>
        <View style={styles.dayRow}>
          {DAYS.map((day) => {
            const selected = form.availability.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                accessibilityRole="checkbox"
                accessibilityLabel={day}
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [
                  styles.day,
                  selected ? styles.chipSelected : styles.chipIdle,
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
        {availabilityError ? (
          <AppText variant="tiny" color={C.danger} style={styles.blockError}>
            {availabilityError}
          </AppText>
        ) : null}
      </View>

      <TextField
        label="Location"
        value={form.place}
        onChangeText={(next) => setText('place', next)}
        placeholder={location.label}
        style={styles.block}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: S.lg,
  },
  blockLabel: {
    marginBottom: S.sm - 2,
  },
  blockError: {
    marginTop: S.xs + 2,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: R.full,
    paddingVertical: S.sm + 2,
    paddingHorizontal: 14,
    marginRight: S.sm,
    marginBottom: S.sm,
  },
  chipIdle: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipSelected: {
    backgroundColor: C.text,
    borderWidth: 1,
    borderColor: C.text,
  },
  chipIcon: {
    marginRight: S.xs + 2,
  },
  segmented: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.full,
    padding: 3,
    marginTop: S.md,
  },
  segment: {
    paddingVertical: S.sm,
    paddingHorizontal: S.lg,
    borderRadius: R.full,
  },
  segmentSelected: {
    backgroundColor: C.text,
  },
  counter: {
    marginTop: S.xs + 2,
    textAlign: 'right',
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
    borderRadius: R.md,
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.sm,
    marginRight: S.sm - 2,
    marginBottom: S.sm - 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
