/**
 * Post a Service — the three-step flow behind the white "Post a Service" CTA on
 * Home: 1 Category, 2 Details, 3 Preview & post.
 *
 * All three steps live on this one route with one form object, so stepping
 * back and forth (header back, Edit, the step dots, Android back) never drops
 * anything the user entered. Opened from My Services with a serviceId, the same
 * flow edits that service, starting at Details.
 *
 * Posting: signed in to Supabase, the service is saved through the
 * serviceDraft adapter with its photos uploaded, and also added to the store so
 * My Services lists it. Signed out, it is saved to the store only, as the app
 * has always done, and the preview says so before the user posts.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, S } from '../../design/tokens';
import type { ServiceDraft } from '../../data/types';
import type { Nav, Route } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { pickServiceImage } from '../../api/services';
import { AppText, PrimaryButton, Screen, ScreenHeader, SecondaryButton } from '../../ui';
import {
  CategoryGrid,
  DETAIL_FIELDS,
  MAX_PHOTOS,
  ServiceDetailsForm,
  ServicePreview,
  StepIndicator,
  draftFromForm,
  emptyForm,
  formFromService,
  missingSummary,
  publishDraft,
  signedInUserId,
  validate,
} from '../../features/postService';
import type { FieldKey, PostServiceForm, Step } from '../../features/postService';

const SUBTITLES: Record<Step, string> = {
  1: 'Turn your skills into income.',
  2: 'Tell people what you do.',
  3: 'Make sure everything looks good.',
};

export function PostServiceScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'PostService'>>();
  const { location, postService, services, showToast, updateService, user } = useApp();

  // An id that no longer resolves falls through to a blank Post flow rather
  // than stranding the user on an empty screen.
  const editing = services.find((service) => service.id === params?.serviceId) ?? null;

  const [step, setStep] = useState<Step>(editing ? 2 : 1);
  const [form, setForm] = useState<PostServiceForm>(() =>
    editing ? formFromService(editing) : emptyForm(location.label),
  );
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  // Per step: has the user pressed its primary button yet? Until then only
  // fields they have touched show errors.
  const [attempted, setAttempted] = useState({ category: false, details: false });
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  /** null while the session check is still out. */
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  useEffect(() => {
    void signedInUserId().then((id) => {
      if (mounted.current) setSignedIn(id !== null);
    });
  }, []);

  const errors = useMemo(() => validate(form), [form]);
  const detailsValid = DETAIL_FIELDS.every((key) => errors[key] === undefined);

  const errorFor = (key: FieldKey): string | undefined => {
    const shown = key === 'category' ? attempted.category : attempted.details || touched[key] === true;
    return shown ? errors[key] : undefined;
  };

  const change = useCallback((patch: Partial<PostServiceForm>, field?: FieldKey) => {
    setForm((prev) => ({ ...prev, ...patch }));
    if (field !== undefined) {
      setTouched((prev) => (prev[field] === true ? prev : { ...prev, [field]: true }));
    }
  }, []);

  // ── Leaving vs stepping back ────────────────────────────────────────────────

  /** Set just before a navigation that should really leave the flow. */
  const leaving = useRef(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  const stepBack = useCallback(() => {
    setPostError(null);
    setStep((current) => (current > 1 ? ((current - 1) as Step) : current));
  }, []);

  // Android's back button and any other goBack() take the user one step back
  // rather than out of the flow; only step 1 leaves.
  useEffect(
    () =>
      nav.addListener('beforeRemove', (event) => {
        if (leaving.current || stepRef.current === 1) return;
        const type = event.data.action.type;
        if (type !== 'GO_BACK' && type !== 'POP') return;
        event.preventDefault();
        stepBack();
      }),
    [nav, stepBack],
  );

  // An iOS swipe can't be intercepted like that, so it's only allowed on step 1.
  useEffect(() => {
    nav.setOptions({ gestureEnabled: step === 1 });
  }, [nav, step]);

  const onBack = () => {
    if (step > 1) stepBack();
    else nav.goBack();
  };

  // ── Step actions ────────────────────────────────────────────────────────────

  const continueFromCategory = () => {
    setAttempted((prev) => ({ ...prev, category: true }));
    if (errors.category === undefined) setStep(2);
  };

  const continueToPreview = () => {
    setAttempted((prev) => ({ ...prev, details: true }));
    if (errors.category !== undefined) {
      setStep(1);
      return;
    }
    if (detailsValid) setStep(3);
  };

  const addPhoto = async () => {
    if (form.photos.length >= MAX_PHOTOS) return;
    try {
      const uri = await pickServiceImage();
      if (uri === null || !mounted.current) return;
      setForm((prev) =>
        prev.photos.length >= MAX_PHOTOS ? prev : { ...prev, photos: [...prev.photos, uri] },
      );
    } catch (err) {
      console.warn('[TeenWorks] Photo picker failed:', err);
      showToast("Couldn't open your photos");
    }
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  /** My Services is where a new service shows up; go back to it if it's already open. */
  const goToMyServices = () => {
    leaving.current = true;
    if (nav.getState().routes.some((route) => route.name === 'MyServices')) {
      nav.navigate('MyServices');
    } else {
      nav.replace('MyServices');
    }
  };

  const post = async () => {
    if (posting) return;
    if (Object.keys(errors).length > 0) {
      // Unreachable through the UI, which only shows step 3 for a valid form.
      setStep(errors.category !== undefined ? 1 : 2);
      return;
    }

    setPosting(true);
    setPostError(null);
    try {
      let saved: ServiceDraft = draftFromForm(form);
      const userId = await signedInUserId();
      // A service that only ever lived on this device stays there when edited.
      const syncs = editing === null || editing.remoteId !== undefined;
      if (userId !== null && syncs) {
        saved = await publishDraft(saved, userId, editing?.remoteId);
      }
      if (!mounted.current) return;

      if (editing) {
        updateService(editing.id, saved);
        showToast('Service updated');
        leaving.current = true;
        nav.goBack();
      } else {
        // postService raises its own "Service posted" toast.
        postService(saved);
        goToMyServices();
      }
    } catch (err) {
      console.error('[TeenWorks] Post a Service failed:', err);
      if (!mounted.current) return;
      setPosting(false);
      setPostError(
        editing
          ? "Couldn't save your changes. Check your connection and try again."
          : "Couldn't post your service. Check your connection and try again.",
      );
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const title =
    step === 1 ? (editing ? 'Edit Service' : 'Post a Service') : step === 2 ? 'Service Details' : 'Preview Your Service';

  const header = (
    <View>
      <ScreenHeader title={title} subtitle={SUBTITLES[step]} onBack={onBack} />
      <StepIndicator
        current={step}
        onStepPress={(target) => {
          setPostError(null);
          setStep(target);
        }}
        style={styles.steps}
      />
    </View>
  );

  const categoryError = errorFor('category');
  const missing = attempted.details && !detailsValid ? missingSummary(errors) : '';

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === 1) {
    body = (
      <>
        <CategoryGrid
          selected={form.category}
          onSelect={(category) => change({ category }, 'category')}
        />
        <AppText variant="small" color={C.textMuted} style={styles.hint}>
          Pick the one that fits best, or More if none do.
        </AppText>
      </>
    );
    footer = (
      <>
        {categoryError ? (
          <AppText variant="small" color={C.danger} style={styles.footerNote}>
            {categoryError}
          </AppText>
        ) : null}
        <PrimaryButton label="Continue →" onPress={continueFromCategory} />
      </>
    );
  } else if (step === 2) {
    body = (
      <ServiceDetailsForm
        form={form}
        errorFor={errorFor}
        onChange={change}
        onAddPhoto={() => void addPhoto()}
        onRemovePhoto={removePhoto}
        placePlaceholder={location.label}
      />
    );
    footer = (
      <>
        {missing ? (
          <AppText variant="small" color={C.danger} style={styles.footerNote}>
            {`Still needed: ${missing}.`}
          </AppText>
        ) : null}
        <PrimaryButton label="Preview →" onPress={continueToPreview} />
      </>
    );
  } else {
    // Step 3 is only reachable with a valid form, so these are all set.
    const draft = draftFromForm(form);
    body = (
      <>
        <View style={styles.caption}>
          <Ionicons name="eye-outline" size={14} color={C.textMuted} />
          <AppText variant="small" color={C.textMuted} style={styles.captionText}>
            This is how customers will see your listing.
          </AppText>
        </View>
        <ServicePreview
          category={draft.category}
          photos={form.photos}
          title={draft.title}
          description={draft.description}
          rate={draft.rate}
          rateType={draft.rateType}
          duration={form.duration ?? 'under1'}
          place={draft.place}
          availability={draft.availability}
          provider={{ name: user.name, handle: user.handle }}
        />
      </>
    );
    footer = (
      <>
        {signedIn === false && !postError ? (
          <AppText variant="small" color={C.textMuted} style={styles.footerNote}>
            {editing
              ? "You're not signed in, so changes are saved on this device only."
              : "You're not signed in, so this is saved to My Services on this device only."}
          </AppText>
        ) : null}
        {postError ? (
          <AppText variant="small" color={C.danger} style={styles.footerNote}>
            {postError}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          <SecondaryButton
            label="Edit"
            icon="create-outline"
            onPress={stepBack}
            disabled={posting}
            style={styles.edit}
          />
          <View style={styles.postWrap}>
            <PrimaryButton
              label={editing ? 'Save Changes' : 'Post Service'}
              onPress={() => void post()}
              loading={posting}
            />
          </View>
        </View>
      </>
    );
  }

  return (
    // Keyed by step so each step opens scrolled to the top.
    <Screen key={step} header={header} footer={footer}>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: {
    marginBottom: S.lg,
  },
  hint: {
    marginTop: S.base,
  },
  footerNote: {
    marginBottom: S.md,
    textAlign: 'center',
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.md,
  },
  captionText: {
    marginLeft: S.sm - 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  edit: {
    // Matches the white button's height so the pair reads as one bar.
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: S.lg,
  },
  postWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: S.md,
  },
});
