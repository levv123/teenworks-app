/**
 * Upload a Need — the customer describes a job and nearby workers respond.
 *
 * Three short steps (what → when & budget → review), one typed form object and
 * every error derived from it, so the step buttons, the inline messages and the
 * submitted draft can never disagree. Submission goes through the async
 * marketplace seam, so it has a real loading state and a real failure path.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { C, R, S, TABULAR } from '../../design/tokens';
import { CATEGORIES, CATEGORY_BY_ID } from '../../data/mock';
import type { Category, CategoryId, HireRequest, RequestDraft } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { NEED_LIMITS, errorMessage } from '../../services/marketplace';
import { formatMoney } from '../../utils/format';
import {
  AppText,
  ChoiceChip,
  ErrorBanner,
  PrimaryButton,
  ProgressBar,
  Screen,
  ScreenHeader,
  SecondaryButton,
  TextField,
} from '../../ui';

type PickableCategory = Category & { id: Exclude<CategoryId, 'all'> };
type FieldKey = 'title' | 'category' | 'description' | 'budget' | 'when' | 'safe';
type Errors = Partial<Record<FieldKey, string>>;

const WHEN_OPTIONS = ['Today', 'Tomorrow', 'This weekend', 'This week', 'Flexible'] as const;
type WhenOption = (typeof WHEN_OPTIONS)[number];

const STEP_FIELDS: FieldKey[][] = [
  ['title', 'category', 'description'],
  ['budget', 'when'],
  ['safe'],
];
const STEP_TITLES = ['What do you need?', 'When, where and budget', 'Review and post'];

interface FormState {
  title: string;
  category: Exclude<CategoryId, 'all'> | null;
  description: string;
  budget: string;
  when: WhenOption | null;
  safe: boolean;
}

const PICKABLE: PickableCategory[] = CATEGORIES.filter(
  (category): category is PickableCategory => category.id !== 'all',
);

/** Words that usually mean a job a teen shouldn't take on. Advisory only. */
const HAZARD_WORDS = [
  'ladder', 'roof', 'chainsaw', 'power tool', 'drive', 'driving', 'car keys',
  'mower', 'pressure wash', 'bleach', 'pesticide', 'saw', 'electrical', 'gutters',
];

function validate(form: FormState): Errors {
  const errors: Errors = {};
  const title = form.title.trim();
  if (title.length < NEED_LIMITS.titleMin) errors.title = `Use at least ${NEED_LIMITS.titleMin} characters.`;
  else if (title.length > NEED_LIMITS.titleMax) errors.title = `Keep it under ${NEED_LIMITS.titleMax} characters.`;
  if (form.category === null) errors.category = 'Pick a category.';
  if (form.description.trim().length < NEED_LIMITS.descriptionMin) {
    errors.description = `Use at least ${NEED_LIMITS.descriptionMin} characters so workers know what they're taking on.`;
  }
  const budget = Number(form.budget);
  if (form.budget.trim().length === 0) errors.budget = 'Enter a budget.';
  else if (!/^\d+$/.test(form.budget.trim())) errors.budget = 'Whole dollars only, e.g. 45.';
  else if (budget < NEED_LIMITS.budgetMin) errors.budget = `The minimum is ${formatMoney(NEED_LIMITS.budgetMin)}.`;
  else if (budget > NEED_LIMITS.budgetMax) errors.budget = `Keep it at ${formatMoney(NEED_LIMITS.budgetMax)} or under.`;
  if (form.when === null) errors.when = 'Pick when you need this done.';
  if (!form.safe) errors.safe = 'Confirm the job is safe for a teen worker to post it.';
  return errors;
}

export function PostRequestScreen() {
  const nav = useNavigation<Nav>();
  const { postRequest, location } = useApp();

  const [form, setForm] = useState<FormState>({
    title: '',
    category: null,
    description: '',
    budget: '',
    when: null,
    safe: false,
  });
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<boolean[]>([false, false, false]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [posted, setPosted] = useState<HireRequest | null>(null);

  const errors = useMemo(() => validate(form), [form]);
  const stepValid = (i: number) => STEP_FIELDS[i]!.every((k) => errors[k] === undefined);
  const errorFor = (key: FieldKey): string | undefined => {
    const owner = STEP_FIELDS.findIndex((fields) => fields.includes(key));
    return attempted[owner] ? errors[key] : undefined;
  };

  const hazard = useMemo(() => {
    const text = `${form.title} ${form.description}`.toLowerCase();
    return HAZARD_WORDS.find((w) => text.includes(w)) ?? null;
  }, [form.title, form.description]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const markAttempted = (i: number) =>
    setAttempted((prev) => prev.map((v, j) => (j === i ? true : v)));

  const next = () => {
    markAttempted(step);
    if (stepValid(step)) setStep((s) => Math.min(2, s + 1));
  };

  const back = () => {
    if (step === 0) nav.goBack();
    else setStep((s) => s - 1);
  };

  const submit = async () => {
    markAttempted(2);
    if (Object.keys(errors).length > 0 || form.category === null || form.when === null || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const draft: RequestDraft = {
      title: form.title.trim(),
      category: form.category,
      budget: Number(form.budget),
      when: form.when,
      description: form.description.trim(),
      place: location.label,
    };
    try {
      setPosted(await postRequest(draft));
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success ──────────────────────────────────────────────────────────────
  if (posted !== null) {
    return (
      <Screen
        header={<ScreenHeader title="Need posted" onBack={() => nav.goBack()} />}
        footer={
          <View>
            <PrimaryButton
              label="View your need"
              onPress={() => nav.replace('NeedDetail', { requestId: posted.id })}
            />
            <SecondaryButton
              label="Back to Hire"
              onPress={() => nav.navigate('Tabs', { screen: 'Hire' })}
              style={styles.secondary}
            />
          </View>
        }
      >
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={34} color={C.onLight} />
        </View>
        <AppText variant="h1" style={styles.center}>
          Your need is live
        </AppText>
        <AppText variant="body" color={C.textMuted} style={[styles.center, styles.successSub]}>
          {`"${posted.title}" · ${formatMoney(posted.budget)} · ${posted.when}`}
        </AppText>
        <AppText variant="body" color={C.textMuted} style={[styles.center, styles.successSub]}>
          Nearby workers can now apply. Their offers show up under Bookings → Needs.
        </AppText>
      </Screen>
    );
  }

  const category = form.category ? CATEGORY_BY_ID[form.category] : null;

  return (
    <Screen
      header={
        <View>
          <ScreenHeader
            title="Upload a Need"
            subtitle={`Step ${step + 1} of 3 · ${STEP_TITLES[step]}`}
            onBack={back}
          />
          <ProgressBar value={(step + 1) / 3} style={styles.progress} />
        </View>
      }
      footer={
        step < 2 ? (
          <PrimaryButton label="Continue" onPress={next} />
        ) : (
          <PrimaryButton
            label={submitting ? 'Posting…' : 'Post Need'}
            onPress={submit}
            loading={submitting}
            disabled={submitting}
          />
        )
      }
    >
      {step === 0 ? (
        <>
          <TextField
            label="Title"
            value={form.title}
            onChangeText={(v) => set('title', v)}
            placeholder="e.g. Walk my dog on weekday mornings"
            maxLength={NEED_LIMITS.titleMax + 10}
            error={errorFor('title')}
            style={styles.first}
          />

          <AppText variant="small" color={C.textMuted} style={styles.label}>
            Category
          </AppText>
          <View style={styles.wrap}>
            {PICKABLE.map((c) => (
              <ChoiceChip
                key={c.id}
                label={c.label}
                icon={c.icon}
                iconColor={c.color}
                selected={form.category === c.id}
                onPress={() => set('category', c.id)}
              />
            ))}
          </View>
          {errorFor('category') ? (
            <AppText variant="tiny" color={C.danger}>
              {errorFor('category')}
            </AppText>
          ) : null}

          <TextField
            label="Describe the job"
            value={form.description}
            onChangeText={(v) => set('description', v)}
            placeholder="What needs doing, what's already on site, and roughly how long it should take."
            multiline
            numberOfLines={5}
            maxLength={NEED_LIMITS.descriptionMax}
            error={errorFor('description')}
            style={styles.block}
          />
          <AppText variant="tiny" color={C.textSubtle} style={styles.counter}>
            {`${form.description.length}/${NEED_LIMITS.descriptionMax}`}
          </AppText>
          <AppText variant="tiny" color={C.textSubtle}>
            Don't include your street address, phone number or other contact details here.
          </AppText>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <TextField
            label="Budget"
            value={form.budget}
            onChangeText={(v) => set('budget', v.replace(/[^0-9]/g, ''))}
            placeholder="45"
            prefix="$"
            keyboardType="number-pad"
            error={errorFor('budget')}
            style={styles.first}
          />
          <AppText variant="tiny" color={C.textSubtle} style={styles.hint}>
            What you'd pay for the whole job. Workers see it before they apply.
          </AppText>

          <AppText variant="small" color={C.textMuted} style={styles.label}>
            When
          </AppText>
          <View style={styles.wrap}>
            {WHEN_OPTIONS.map((option) => (
              <ChoiceChip
                key={option}
                label={option}
                selected={form.when === option}
                onPress={() => set('when', option)}
              />
            ))}
          </View>
          {errorFor('when') ? (
            <AppText variant="tiny" color={C.danger}>
              {errorFor('when')}
            </AppText>
          ) : null}

          <AppText variant="small" color={C.textMuted} style={styles.label}>
            Area
          </AppText>
          <View style={styles.where}>
            <Ionicons name="location-outline" size={16} color={C.text} />
            <AppText variant="body" style={styles.whereText}>
              {location.label}
            </AppText>
            <Pressable
              onPress={() => nav.navigate('LocationPicker')}
              accessibilityRole="button"
              accessibilityLabel="Change area"
              hitSlop={8}
            >
              <AppText variant="small" style={styles.underline}>
                Change
              </AppText>
            </Pressable>
          </View>
          <AppText variant="tiny" color={C.textSubtle} style={styles.hint}>
            Only the city is shown publicly. Share your street address after you hire someone.
          </AppText>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <View style={styles.review}>
            <View style={styles.reviewTop}>
              <AppText variant="h2" style={styles.reviewTitle}>
                {form.title.trim()}
              </AppText>
              <AppText variant="h2" style={TABULAR}>
                {formatMoney(Number(form.budget) || 0)}
              </AppText>
            </View>
            <AppText variant="small" color={C.textMuted} style={styles.reviewMeta}>
              {[category?.label, form.when, location.label].filter(Boolean).join(' · ')}
            </AppText>
            <AppText variant="body" color={C.textMuted} style={styles.reviewBody}>
              {form.description.trim()}
            </AppText>
            <View style={styles.editRow}>
              <Pressable onPress={() => setStep(0)} accessibilityRole="button" accessibilityLabel="Edit details" hitSlop={8}>
                <AppText variant="small" style={styles.underline}>
                  Edit details
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => setStep(1)}
                accessibilityRole="button"
                accessibilityLabel="Edit budget and timing"
                hitSlop={8}
                style={styles.editGap}
              >
                <AppText variant="small" style={styles.underline}>
                  Edit budget & timing
                </AppText>
              </Pressable>
            </View>
          </View>

          {hazard !== null ? (
            <View style={styles.warn}>
              <Ionicons name="warning-outline" size={18} color={C.star} />
              <AppText variant="small" style={styles.warnText}>
                {`Your description mentions "${hazard}". Teens can't legally do some jobs involving power equipment, heights, chemicals or driving. Make sure this one doesn't need any of that.`}
              </AppText>
            </View>
          ) : null}

          <Pressable
            onPress={() => set('safe', !form.safe)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.safe }}
            accessibilityLabel="I confirm this job is safe and legal for a teen worker"
            style={({ pressed }) => [
              styles.agree,
              errorFor('safe') !== undefined && styles.agreeError,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={form.safe ? 'checkbox' : 'square-outline'}
              size={22}
              color={form.safe ? C.text : C.textMuted}
            />
            <AppText variant="small" color={C.textMuted} style={styles.agreeText}>
              This job is safe and legal for a teen worker. It doesn't involve driving, ladders or
              roofs, power tools or mowers, or harsh chemicals, and an adult will be home or
              reachable.
            </AppText>
          </Pressable>
          {errorFor('safe') ? (
            <AppText variant="tiny" color={C.danger} style={styles.hint}>
              {errorFor('safe')}
            </AppText>
          ) : null}

          <ErrorBanner message={submitError} onRetry={submit} style={styles.block} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    marginTop: S.sm,
    marginBottom: S.sm,
  },
  first: {
    marginTop: S.base,
  },
  block: {
    marginTop: S.lg,
  },
  label: {
    marginTop: S.lg,
    marginBottom: S.sm - 2,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  counter: {
    marginTop: S.xs + 2,
    textAlign: 'right',
  },
  hint: {
    marginTop: S.sm - 2,
  },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.md,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  whereText: {
    flex: 1,
    marginLeft: S.sm,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  review: {
    marginTop: S.base,
    padding: S.base,
    borderRadius: R.lg,
    backgroundColor: C.surface,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reviewTitle: {
    flex: 1,
    minWidth: 0,
    marginRight: S.md,
  },
  reviewMeta: {
    marginTop: S.xs,
  },
  reviewBody: {
    marginTop: S.md,
  },
  editRow: {
    flexDirection: 'row',
    marginTop: S.base,
  },
  editGap: {
    marginLeft: S.lg,
  },
  warn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.lg,
    padding: S.md,
    borderRadius: R.lg,
    backgroundColor: C.starBg,
  },
  warnText: {
    flex: 1,
    marginLeft: S.sm,
  },
  agree: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.lg,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  agreeError: {
    borderColor: C.danger,
  },
  agreeText: {
    flex: 1,
    marginLeft: S.md,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: S.huge,
    marginBottom: S.lg,
  },
  center: {
    textAlign: 'center',
  },
  successSub: {
    marginTop: S.sm,
  },
  secondary: {
    marginTop: S.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
