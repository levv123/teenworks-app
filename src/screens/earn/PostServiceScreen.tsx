/**
 * Post a Service — the three-step flow behind the white "Post a Service" CTA on
 * Home: 1 Category, 2 Details, 3 Preview & post.
 *
 * All three steps live on this one route with one form object, so stepping
 * back and forth (header back, Edit, the step dots, Android back, browser back
 * on web) never drops anything the user entered. Opened from My Services with
 * a serviceId, the same flow edits that service, starting at Details.
 *
 * Posting: signed in to Supabase, the service is saved through the
 * serviceDraft adapter with its photos uploaded, and also added to the store so
 * My Services lists it. Signed out, it is saved to the store only, as the app
 * has always done, and the preview says so before the user posts.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, S } from '../../design/tokens';
import type { Service, ServiceDraft } from '../../data/types';
import type { Nav, Route } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { PhotoPermissionError, pickServiceImages } from '../../api/services';
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
import {
  discardPhotoCopies,
  hasRoomForPhotos,
  keepPhotosOnDevice,
} from '../../features/postService/localPhotos';

const STORAGE_FULL =
  'Photo storage on this device is full. Remove a photo or use smaller images, then try again.';

/** Every photo a saved service uses. */
function photosInUse(services: Service[]): string[] {
  return services.flatMap((service) => service.images ?? []);
}

const TITLES: Record<Step, string> = {
  1: 'Post a Service',
  2: 'Service Details',
  3: 'Preview Your Service',
};

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
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Photos picked on a phone are copied into the app's folder. Leaving without
  // saving deletes the copies no saved service uses; a post still in flight
  // may be reading them, and cleans up after itself.
  const formRef = useRef(form);
  formRef.current = form;
  const servicesRef = useRef(services);
  servicesRef.current = services;
  const saved = useRef(false);
  useEffect(
    () => () => {
      if (!saved.current && !postingRef.current) {
        void discardPhotoCopies(formRef.current.photos, photosInUse(servicesRef.current));
      }
    },
    [],
  );

  useEffect(() => {
    void signedInUserId().then((id) => {
      if (mounted.current) setSignedIn(id !== null);
    });
  }, []);

  // ── Edit target arriving late ───────────────────────────────────────────────
  // The store loads saved services after the first render, so a reload on an
  // edit link can first see no service, or the seeded copy of it. Until the
  // user changes something, re-seed from whatever the store now has.

  const dirty = useRef(false);
  const seededFrom = useRef<Service | null>(editing);
  /** Set just before a navigation that should really leave the flow. */
  const leaving = useRef(false);
  useEffect(() => {
    if (editing === null || editing === seededFrom.current) return;
    if (dirty.current || leaving.current) return;
    seededFrom.current = editing;
    setForm(formFromService(editing));
    setStep(2);
  }, [editing]);

  const errors = useMemo(() => validate(form), [form]);
  const detailsValid = DETAIL_FIELDS.every((key) => errors[key] === undefined);

  const errorFor = (key: FieldKey): string | undefined => {
    const shown = key === 'category' ? attempted.category : attempted.details || touched[key] === true;
    return shown ? errors[key] : undefined;
  };

  const change = useCallback((patch: Partial<PostServiceForm>, field?: FieldKey) => {
    dirty.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
    if (field !== undefined) {
      setTouched((prev) => (prev[field] === true ? prev : { ...prev, [field]: true }));
    }
  }, []);

  // ── Leaving vs stepping back ────────────────────────────────────────────────

  /** Mirrors `posting` synchronously, so two taps in one frame can't both post. */
  const postingRef = useRef(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  const goToStep = useCallback((target: Step) => {
    // The post in flight saves the form as it was when Post was pressed.
    if (postingRef.current) return;
    setPostError(null);
    setStep(target);
  }, []);

  const stepBack = useCallback(() => {
    if (stepRef.current > 1) goToStep((stepRef.current - 1) as Step);
  }, [goToStep]);

  // Android's back button, browser back on web and any other goBack() take the
  // user one step back rather than out of the flow; only step 1 leaves. While a
  // post is in flight nothing leaves, so its result always reaches My Services.
  useEffect(
    () =>
      nav.addListener('beforeRemove', (event) => {
        if (leaving.current) return;
        const busy = postingRef.current;
        if (!busy && stepRef.current === 1) return;
        const type = event.data.action.type;
        // react-navigation turns the browser's back button into a RESET to the
        // previous page's state, after the address bar has already moved.
        const browserBack = Platform.OS === 'web' && type === 'RESET';
        if (!busy && !browserBack && type !== 'GO_BACK' && type !== 'POP') return;
        event.preventDefault();
        if (browserBack) window.history.forward();
        stepBack();
      }),
    [nav, stepBack],
  );

  // An iOS swipe can't be intercepted like that, so it's only allowed on step 1.
  useEffect(() => {
    nav.setOptions({ gestureEnabled: step === 1 && !posting });
  }, [nav, step, posting]);

  const onBack = () => {
    if (postingRef.current) return;
    if (stepRef.current > 1) stepBack();
    else nav.goBack();
  };

  // ── Step actions ────────────────────────────────────────────────────────────

  const continueFromCategory = () => {
    setAttempted((prev) => ({ ...prev, category: true }));
    if (errors.category === undefined) goToStep(2);
  };

  const continueToPreview = () => {
    setAttempted((prev) => ({ ...prev, details: true }));
    if (errors.category !== undefined) goToStep(1);
    else if (detailsValid) goToStep(3);
  };

  /** One picker at a time: a second tap while it's open does nothing. */
  const picking = useRef(false);

  const addPhoto = async () => {
    if (picking.current || form.photos.length >= MAX_PHOTOS) return;
    picking.current = true;
    try {
      const picked = await pickServiceImages(MAX_PHOTOS - form.photos.length);
      if (picked.skipped > 0) {
        showToast(
          picked.skipped === 1
            ? "A file couldn't be opened as a photo. Try a JPG or PNG."
            : `${picked.skipped} files couldn't be opened as photos. Try JPG or PNG.`,
        );
      } else if (picked.overLimit > 0) {
        showToast(
          `You can add up to ${MAX_PHOTOS} photos, so ${picked.overLimit} ${
            picked.overLimit === 1 ? 'was' : 'were'
          } left out`,
        );
      }
      if (picked.uris.length === 0) return;
      const uris = await keepPhotosOnDevice(picked.uris);
      if (!mounted.current) {
        void discardPhotoCopies(uris, photosInUse(servicesRef.current));
        return;
      }
      dirty.current = true;
      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...uris].slice(0, MAX_PHOTOS),
      }));
    } catch (err) {
      if (err instanceof PhotoPermissionError) {
        showToast('Allow photo access in Settings to add photos');
        return;
      }
      console.warn('[TeenWorks] Photo picker failed:', err);
      showToast("Couldn't open your photos");
    } finally {
      picking.current = false;
    }
  };

  const removePhoto = (index: number) => {
    if (postingRef.current) return;
    dirty.current = true;
    const removed = form.photos[index];
    const remaining = form.photos.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    if (removed !== undefined) {
      void discardPhotoCopies([removed], [...remaining, ...photosInUse(services)]);
    }
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

  // A service that only ever lived on this device stays there when edited.
  const syncs = editing === null || editing.remoteId !== undefined;

  const post = async () => {
    if (postingRef.current) return;
    if (Object.keys(errors).length > 0) {
      // Unreachable through the UI, which only shows step 3 for a valid form.
      setStep(errors.category !== undefined ? 1 : 2);
      return;
    }

    postingRef.current = true;
    setPosting(true);
    setPostError(null);
    const fail = (message: string) => {
      postingRef.current = false;
      if (!mounted.current) return;
      setPosting(false);
      setPostError(message);
    };

    try {
      const userId = await signedInUserId();
      if (userId === null && signedIn !== false) {
        // Signed out since the preview opened, or before its check came back:
        // say where this will be saved before saving it there.
        postingRef.current = false;
        if (mounted.current) {
          setPosting(false);
          setSignedIn(false);
        }
        return;
      }

      const picked = form.photos;
      const otherServices = services.filter((service) => service.id !== editing?.id);
      let draft: ServiceDraft = draftFromForm(form);
      if (userId !== null && syncs) {
        draft = await publishDraft(draft, userId, editing?.remoteId, (images) => {
          // A retry after a failed save reuses these instead of uploading again.
          if (mounted.current) setForm((prev) => ({ ...prev, photos: images }));
          // The uploaded photos' device copies aren't needed any more.
          void discardPhotoCopies(picked, [...images, ...photosInUse(services)]);
        });
      } else {
        // Nowhere to upload to, so the photos stay as picked: data: URIs on
        // web and file: URIs on a phone, both kept by the local store. On web
        // the new ones have to fit in localStorage first.
        const stored = new Set(photosInUse(services));
        const extra = (draft.images ?? [])
          .filter((uri) => !stored.has(uri))
          .reduce((chars, uri) => chars + uri.length, 0);
        if (!hasRoomForPhotos(extra)) {
          fail(STORAGE_FULL);
          return;
        }
      }

      // The store outlives this screen, so the saved service lands in My
      // Services even if the screen went away while the request was out.
      leaving.current = true;
      saved.current = true;
      // Copies the saved service no longer uses, e.g. photos removed in an edit.
      void discardPhotoCopies(
        [...picked, ...(editing?.images ?? [])],
        [...(draft.images ?? []), ...photosInUse(otherServices)],
      );
      if (editing) {
        updateService(editing.id, draft);
        showToast('Service updated');
        if (mounted.current) nav.goBack();
      } else {
        // postService raises its own "Service posted" toast.
        postService(draft);
        if (mounted.current) goToMyServices();
      }
    } catch (err) {
      console.error('[TeenWorks] Post a Service failed:', err);
      fail(
        editing
          ? "Couldn't save your changes. Check your connection and try again."
          : "Couldn't post your service. Check your connection and try again.",
      );
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const header = (
    <View>
      <ScreenHeader
        title={editing ? 'Edit Service' : TITLES[step]}
        subtitle={SUBTITLES[step]}
        onBack={onBack}
      />
      <StepIndicator current={step} onStepPress={goToStep} style={styles.steps} />
    </View>
  );

  const categoryError = errorFor('category');
  const missing = attempted.details && !detailsValid ? missingSummary(errors) : '';

  /** Where this save will go, when that isn't simply "your account". */
  let saveNote: string | null = null;
  if (signedIn === false) {
    const where = editing
      ? "You're not signed in, so changes are saved on this device only"
      : "You're not signed in, so this is saved to My Services on this device only";
    saveNote = `${where}.`;
  } else if (signedIn === true && !syncs) {
    saveNote = 'This service is saved on this device only, so changes stay here too.';
  }

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
            {`To preview, fix: ${missing}.`}
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
        {postError ? (
          <AppText variant="small" color={C.danger} style={styles.footerNote}>
            {postError}
          </AppText>
        ) : saveNote ? (
          <AppText variant="small" color={C.textMuted} style={styles.footerNote}>
            {saveNote}
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
