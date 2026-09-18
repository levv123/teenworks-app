/**
 * Post a Request — the form behind the white CTA on the Hire home screen.
 *
 * Same discipline as PostServiceScreen: one typed form object, every error
 * derived from it, so the footer CTA, the inline messages and the submitted
 * draft can never disagree with each other.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, R, S } from '../../design/tokens';
import { CATEGORIES } from '../../data/mock';
import type { Category, CategoryId, RequestDraft } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { formatMoney } from '../../utils/format';
import { AppText, PrimaryButton, Screen, ScreenHeader, TextField } from '../../ui';

type PickableCategory = Category & { id: Exclude<CategoryId, 'all'> };
type FieldKey = 'title' | 'category' | 'budget' | 'when' | 'description';
type Errors = Partial<Record<FieldKey, string>>;

const WHEN_OPTIONS = ['Today', 'Tomorrow', 'This week', 'Flexible'] as const;
type WhenOption = (typeof WHEN_OPTIONS)[number];

interface FormState {
  title: string;
  category: Exclude<CategoryId, 'all'> | null;
  budget: string;
  when: WhenOption | null;
  description: string;
}

/** 'all' is a filter value, never something a real request can be filed under. */
const PICKABLE: PickableCategory[] = CATEGORIES.filter(
  (category): category is PickableCategory => category.id !== 'all',
);

const TITLE_MIN = 4;
const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 400;
const BUDGET_MAX = 2000;

function validate(form: FormState): Errors {
  const errors: Errors = {};

  if (form.title.trim().length < TITLE_MIN) {
    errors.title = `Use at least ${TITLE_MIN} characters.`;
  }

  if (form.category === null) {
    errors.category = 'Pick a category.';
  }

  const budget = Number(form.budget);
  if (form.budget.trim().length === 0) {
    errors.budget = 'Enter a budget.';
  } else if (!Number.isFinite(budget) || budget <= 0) {
    errors.budget = 'Enter a number above 0.';
  } else if (budget > BUDGET_MAX) {
    errors.budget = `Keep it at ${formatMoney(BUDGET_MAX)} or under.`;
  }

  if (form.when === null) {
    errors.when = 'Pick when you need this done.';
  }

  if (form.description.trim().length < DESCRIPTION_MIN) {
    errors.description = `Use at least ${DESCRIPTION_MIN} characters so workers know what they are taking on.`;
  }

  return errors;
}

export function PostRequestScreen() {
  const nav = useNavigation<Nav>();
  const { postRequest } = useApp();

  const [form, setForm] = useState<FormState>({
    title: '',
    category: null,
    budget: '',
    when: null,
    description: '',
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

  const setText = (key: 'title' | 'budget' | 'description', next: string) => {
    setForm((prev) => ({ ...prev, [key]: next }));
    touch(key);
  };

  const selectCategory = (id: Exclude<CategoryId, 'all'>) => {
    setForm((prev) => ({ ...prev, category: id }));
    touch('category');
  };

  const selectWhen = (when: WhenOption) => {
    setForm((prev) => ({ ...prev, when }));
    touch('when');
  };

  const submit = () => {
    setSubmitted(true);
    if (!valid || form.category === null || form.when === null) return;

    const draft: RequestDraft = {
      title: form.title.trim(),
      category: form.category,
      budget: Number(form.budget),
      when: form.when,
      description: form.description.trim(),
    };

    postRequest(draft);
    nav.goBack();
  };

  const categoryError = errorFor('category');
  const whenError = errorFor('when');

  return (
    <Screen
      header={<ScreenHeader title="Post a Request" onBack={() => nav.goBack()} />}
      footer={
        <PrimaryButton label="Post Request" onPress={submit} disabled={!valid} />
      }
    >
      <TextField
        label="Title"
        value={form.title}
        onChangeText={(next) => setText('title', next)}
        placeholder="Wash and vacuum my car"
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
        label="Budget"
        value={form.budget}
        onChangeText={(next) => setText('budget', next)}
        placeholder="45"
        prefix="$"
        keyboardType="numeric"
        error={errorFor('budget')}
        style={styles.block}
      />

      <View style={styles.block}>
        <AppText variant="small" color={C.textMuted} style={styles.blockLabel}>
          When
        </AppText>
        <View style={styles.chipGrid}>
          {WHEN_OPTIONS.map((option) => {
            const selected = form.when === option;
            return (
              <Pressable
                key={option}
                onPress={() => selectWhen(option)}
                accessibilityRole="radio"
                accessibilityLabel={option}
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.chip,
                  selected ? styles.chipSelected : styles.chipIdle,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="small" color={selected ? C.onLight : C.text}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {whenError ? (
          <AppText variant="tiny" color={C.danger} style={styles.blockError}>
            {whenError}
          </AppText>
        ) : null}
      </View>

      <TextField
        label="Description"
        value={form.description}
        onChangeText={(next) => setText('description', next)}
        placeholder="What needs doing, what is already on site, how long it should take."
        multiline
        numberOfLines={4}
        maxLength={DESCRIPTION_MAX}
        error={errorFor('description')}
        style={styles.block}
      />
      <AppText variant="tiny" color={C.textSubtle} style={styles.counter}>
        {`${form.description.length}/${DESCRIPTION_MAX}`}
      </AppText>
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
  counter: {
    marginTop: S.xs + 2,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.6,
  },
});
