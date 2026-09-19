import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../../hooks/useAuth';
import {
  createService,
  updateService,
  pickServiceImage,
  uploadServiceImage,
} from '../../../api/services';
import { getCategories } from '../../../api/requests';
import { getPortfolioForUser } from '../../../api/portfolio';
import { Category, PortfolioItem, ServicesStackParamList } from '../../../types';

import { FlowHeader, TOTAL_STEPS } from './FlowHeader';
import { CategoryStep } from './CategoryStep';
import { DetailsStep } from './DetailsStep';
import { PreviewStep } from './PreviewStep';
import { PrimaryButton } from './ui';
import {
  PostServiceForm,
  StepErrors,
  buildServicePayload,
  hasErrors,
  initialForm,
  validateCategoryStep,
  validateDetailsStep,
} from './formState';
import { MAX_IMAGES } from './constants';
import { Dark, S, GUTTER } from './theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'CreateEditService'>;

/** Lazily required so the web bundle never touches expo-location's stub. */
function reverseGeocode(): Promise<string | null> {
  if (Platform.OS === 'web') return Promise.resolve(null);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExpoLocation = require('expo-location') as typeof import('expo-location');

  return (async () => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });
    const [geo] = await ExpoLocation.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    if (!geo) return null;
    return [geo.city, geo.region].filter(Boolean).join(', ') || null;
  })();
}

export function PostServiceFlow({ route, navigation }: Props) {
  const { user } = useAuth();
  const existing = route.params?.service;
  const isEdit = !!existing;
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PostServiceForm>(() => initialForm(existing));
  const [errors, setErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [locating, setLocating] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;
  // Guards every setState that can land after the screen unmounts.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  /* ── Data ─────────────────────────────────────────────────── */

  const loadCategories = useCallback(() => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    getCategories()
      .then((rows) => {
        if (!alive.current) return;
        setCategories(rows ?? []);
      })
      .catch(() => {
        if (alive.current) setCategoriesError(true);
      })
      .finally(() => {
        if (alive.current) setCategoriesLoading(false);
      });
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => {
    if (!user?.id) return;
    getPortfolioForUser(user.id)
      .then((items) => { if (alive.current) setPortfolioItems(items ?? []); })
      .catch(() => {});
  }, [user?.id]);

  /* ── Form ─────────────────────────────────────────────────── */

  const update = useCallback(
    <K extends keyof PostServiceForm>(key: K, value: PostServiceForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      // Clear a field's error as soon as the user edits it.
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    },
    [],
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.categoryId) ?? null,
    [categories, form.categoryId],
  );

  /* ── Step transitions ─────────────────────────────────────── */

  const goToStep = useCallback(
    (next: number, direction: 1 | -1) => {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 110, useNativeDriver: true }),
        Animated.timing(slide, { toValue: -12 * direction, duration: 110, useNativeDriver: true }),
      ]).start(() => {
        if (!alive.current) return;
        setStep(next);
        setErrors({});
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        slide.setValue(12 * direction);
        Animated.parallel([
          Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(slide, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start();
      });
    },
    [fade, slide],
  );

  const handleBack = useCallback(() => {
    if (step === 0) navigation.goBack();
    else goToStep(step - 1, -1);
  }, [step, navigation, goToStep]);

  const handleContinue = useCallback(() => {
    const stepErrors = step === 0 ? validateCategoryStep(form) : validateDetailsStep(form);
    if (hasErrors(stepErrors)) {
      setErrors(stepErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    goToStep(step + 1, 1);
  }, [step, form, goToStep]);

  /* ── Photos ───────────────────────────────────────────────── */

  const handleAddPhoto = useCallback(async () => {
    if (form.images.length >= MAX_IMAGES || !user?.id) return;
    try {
      const uri = await pickServiceImage();
      if (!uri) return;
      setUploadingImage(true);
      const url = await uploadServiceImage(uri, user.id);
      if (alive.current) setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
    } catch {
      Alert.alert('Upload failed', 'Could not add that photo. Please try again.');
    } finally {
      if (alive.current) setUploadingImage(false);
    }
  }, [form.images.length, user?.id]);

  const handleRemovePhoto = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }, []);

  /* ── Location ─────────────────────────────────────────────── */

  const handleUseCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      const label = await reverseGeocode();
      if (!alive.current) return;
      if (label) update('locationText', label);
      else Alert.alert('Location unavailable', 'Enter your area manually instead.');
    } catch {
      Alert.alert('Location unavailable', 'Enter your area manually instead.');
    } finally {
      if (alive.current) setLocating(false);
    }
  }, [update]);

  /* ── Publish ──────────────────────────────────────────────── */

  const handlePublish = useCallback(async () => {
    const stepErrors = validateDetailsStep(form);
    if (hasErrors(stepErrors)) {
      setErrors(stepErrors);
      goToStep(1, -1);
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    try {
      const payload = buildServicePayload(form);

      let savedService;
      if (isEdit && existing) {
        await updateService(existing.id, payload);
        savedService = { ...existing, ...payload };
      } else {
        savedService = await createService({
          ...payload,
          provider_id: user.id,
          is_active: true,
        });
      }
      // Existing post-save behaviour, unchanged.
      navigation.replace('ServiceAnalysis', { service: savedService });
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Could not save your service. Please try again.';
      Alert.alert('Could not post', message);
    } finally {
      if (alive.current) setSaving(false);
    }
  }, [form, user?.id, isEdit, existing, navigation, goToStep]);

  /* ── Bottom CTA ───────────────────────────────────────────── */

  const ctaDisabled =
    step === 0 ? !form.categoryId : step === 1 ? !form.title.trim() || !form.price.trim() : false;

  const ctaLabel =
    step === 0 ? 'Continue' : step === 1 ? 'Preview' : isEdit ? 'Save Changes' : 'Post Service';

  const ctaIcon: keyof typeof Ionicons.glyphMap | undefined =
    step === TOTAL_STEPS - 1 ? undefined : 'arrow-forward';

  // Inside a tab navigator the tab bar already reserves the bottom inset, so
  // only pad when this screen is presented without one.
  const bottomPad = Math.max(insets.bottom, S.base);
  // react-native's SafeAreaView is a no-op on Android and web, where a dark
  // header would otherwise sit under the status bar.
  const topPad = Platform.OS === 'ios' ? 0 : insets.top;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Dark.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: topPad }}>
          <FlowHeader step={step} onBack={handleBack} />
        </View>

        <Animated.View
          style={[styles.flex, { opacity: fade, transform: [{ translateX: slide }] }]}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 0 && (
              <CategoryStep
                title={isEdit ? 'Edit Service' : 'Post a Service'}
                subtitle={isEdit ? 'Update what you offer.' : 'Turn your skills into income.'}
                categories={categories}
                loading={categoriesLoading}
                error={categoriesError}
                onRetry={loadCategories}
                selectedId={form.categoryId}
                onSelect={(id) => update('categoryId', id)}
              />
            )}

            {step === 1 && (
              <DetailsStep
                form={form}
                errors={errors}
                update={update}
                portfolioItems={portfolioItems}
                uploadingImage={uploadingImage}
                onAddPhoto={handleAddPhoto}
                onRemovePhoto={handleRemovePhoto}
                onUseCurrentLocation={handleUseCurrentLocation}
                locatingLocation={locating}
              />
            )}

            {step === 2 && (
              <PreviewStep
                form={form}
                category={selectedCategory}
                onEditPhotos={() => goToStep(1, -1)}
              />
            )}

            {step === 0 && errors.categoryId ? (
              <Text style={styles.stepError}>{errors.categoryId}</Text>
            ) : null}
          </ScrollView>
        </Animated.View>

        {/* Bottom CTA */}
        <View style={[styles.footer, { paddingBottom: bottomPad }]}>
          <PrimaryButton
            label={ctaLabel}
            icon={ctaIcon}
            onPress={step === TOTAL_STEPS - 1 ? handlePublish : handleContinue}
            disabled={ctaDisabled}
            loading={saving}
          />

          {step === TOTAL_STEPS - 1 && (
            <View style={styles.reassure}>
              <Ionicons name="shield-checkmark-outline" size={14} color={Dark.textMuted} />
              <Text style={styles.reassureText}>You can edit or delete this anytime.</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Dark.bg },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: S.xl,
  },
  stepError: { fontSize: 13, color: Dark.danger, paddingTop: S.md },
  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: S.md,
    gap: S.md,
    backgroundColor: Dark.bg,
    borderTopWidth: 1,
    borderTopColor: Dark.border,
  },
  reassure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reassureText: { fontSize: 12, color: Dark.textMuted },
});
