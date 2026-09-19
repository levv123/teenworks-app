import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PortfolioItem } from '../../../types';
import { StepHeading } from './FlowHeader';
import { Field, DarkInput, DarkTextArea, Segmented, Pill } from './ui';
import { PackagesSection, FaqSection, PortfolioSection } from './AdvancedSections';
import { PostServiceForm, StepErrors } from './formState';
import {
  DURATION_OPTIONS,
  MAX_DESCRIPTION,
  MAX_IMAGES,
  MAX_TITLE,
  RATE_TYPES,
  WEEKDAYS,
  Weekday,
  durationLabel,
} from './constants';
import { Dark, S, R, TOUCH, FIELD_HEIGHT, GUTTER } from './theme';

/* ────────────────────────────────────────────────────────────────
   Photos
   ──────────────────────────────────────────────────────────────── */

function PhotoStrip({
  images,
  uploading,
  onAdd,
  onRemove,
}: {
  images: string[];
  uploading: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const canAdd = images.length < MAX_IMAGES;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photoRow}
      keyboardShouldPersistTaps="handled"
    >
      {canAdd && (
        <TouchableOpacity
          style={styles.addPhoto}
          onPress={onAdd}
          disabled={uploading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Add photos. ${images.length} of ${MAX_IMAGES} added.`}
        >
          {uploading ? (
            <ActivityIndicator color={Dark.textSecondary} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={22} color={Dark.text} />
              <Text style={styles.addPhotoText}>Add Photos</Text>
              <Text style={styles.addPhotoHint}>{images.length}/{MAX_IMAGES}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {images.map((uri, idx) => (
        <View key={`${uri}-${idx}`} style={styles.photoTile}>
          <Image source={{ uri }} style={styles.photoImg} resizeMode="cover" />
          <TouchableOpacity
            style={styles.photoRemove}
            onPress={() => onRemove(idx)}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${idx + 1}`}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={14} color={Dark.text} />
          </TouchableOpacity>
          {idx === 0 && (
            <View style={styles.coverBadge}>
              <Text style={styles.coverText}>Cover</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

/* ────────────────────────────────────────────────────────────────
   Duration select — compact field that opens a sheet of options.
   React Native has no native <select>, so this is the closest
   equivalent that stays one line tall.
   ──────────────────────────────────────────────────────────────── */

function DurationSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (hours: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = durationLabel(value);

  return (
    <>
      <TouchableOpacity
        style={styles.select}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`How long does it usually take? ${label ?? 'Not set'}`}
      >
        <Ionicons name="time-outline" size={18} color={Dark.textSecondary} />
        <Text style={[styles.selectText, !label && styles.selectPlaceholder]}>
          {label ?? 'Select a typical length'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Dark.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>How long does it usually take?</Text>
            {DURATION_OPTIONS.map((opt) => {
              const active = value === opt.hours;
              return (
                <TouchableOpacity
                  key={opt.hours}
                  style={styles.sheetRow}
                  onPress={() => {
                    onChange(opt.hours);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sheetRowText, active && styles.sheetRowTextOn]}>
                    {opt.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={Dark.text} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   Step 2
   ──────────────────────────────────────────────────────────────── */

export function DetailsStep({
  form,
  errors,
  update,
  portfolioItems,
  uploadingImage,
  onAddPhoto,
  onRemovePhoto,
  onUseCurrentLocation,
  locatingLocation,
}: {
  form: PostServiceForm;
  errors: StepErrors;
  update: <K extends keyof PostServiceForm>(key: K, value: PostServiceForm[K]) => void;
  portfolioItems: PortfolioItem[];
  uploadingImage: boolean;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  onUseCurrentLocation: () => void;
  locatingLocation: boolean;
}) {
  const [showPackages, setShowPackages] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);

  const toggleDay = (day: Weekday) => {
    const on = form.availabilityDays.includes(day);
    update(
      'availabilityDays',
      on ? form.availabilityDays.filter((d) => d !== day) : [...form.availabilityDays, day],
    );
  };

  return (
    <View style={styles.wrap}>
      <StepHeading title="Service Details" subtitle="Tell people what you do." />

      {/* Photos */}
      <Field label="Photos" hint={`Optional · ${form.images.length}/${MAX_IMAGES}`}>
        <PhotoStrip
          images={form.images}
          uploading={uploadingImage}
          onAdd={onAddPhoto}
          onRemove={onRemovePhoto}
        />
      </Field>

      {/* Title */}
      <Field label="Title" error={errors.title} hint={`${form.title.length}/${MAX_TITLE}`}>
        <DarkInput
          value={form.title}
          onChangeText={(v) => update('title', v)}
          placeholder="Lawn Mowing & Edging"
          maxLength={MAX_TITLE}
          invalid={!!errors.title}
          returnKeyType="next"
          accessibilityLabel="Service title"
        />
      </Field>

      {/* Description */}
      <Field
        label="Description"
        error={errors.description}
        hint={`${form.description.length}/${MAX_DESCRIPTION}`}
      >
        <DarkTextArea
          value={form.description}
          onChangeText={(v) => update('description', v)}
          placeholder="I'll mow your lawn, edge, and clean up. I bring my own equipment and make sure it looks clean and professional."
          maxLength={MAX_DESCRIPTION}
          invalid={!!errors.description}
          accessibilityLabel="Service description"
        />
      </Field>

      {/* Rate */}
      <Field label="Rate" error={errors.price}>
        <View style={styles.rateRow}>
          <View style={[styles.priceWrap, !!errors.price && styles.priceWrapInvalid]}>
            <Text style={styles.priceSymbol}>$</Text>
            <DarkInput
              style={styles.priceInput}
              value={form.price}
              onChangeText={(v) => update('price', v.replace(/[^0-9.]/g, ''))}
              placeholder="25"
              keyboardType="decimal-pad"
              accessibilityLabel="Rate amount in dollars"
            />
          </View>
          <Segmented
            style={styles.rateSegmented}
            options={RATE_TYPES}
            value={form.rateType}
            onChange={(v) => update('rateType', v)}
          />
        </View>
      </Field>

      {/* Duration */}
      <Field label="How long does it usually take?">
        <DurationSelect
          value={form.durationHours}
          onChange={(hours) => update('durationHours', hours)}
        />
      </Field>

      {/* Location */}
      <Field label="Location" error={errors.locationText}>
        <View style={[styles.locationWrap, !!errors.locationText && styles.locationInvalid]}>
          <Ionicons name="location-outline" size={18} color={Dark.textSecondary} />
          <DarkInput
            style={styles.locationInput}
            value={form.locationText}
            onChangeText={(v) => update('locationText', v)}
            placeholder="Surfside, FL"
            accessibilityLabel="Service location"
          />
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              onPress={onUseCurrentLocation}
              disabled={locatingLocation}
              style={styles.locateBtn}
              accessibilityRole="button"
              accessibilityLabel="Use my current location"
            >
              {locatingLocation ? (
                <ActivityIndicator size="small" color={Dark.textSecondary} />
              ) : (
                <Ionicons name="navigate-outline" size={18} color={Dark.text} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </Field>

      {/* Availability */}
      <Field label="Availability" hint="Optional">
        <View style={styles.dayRow}>
          {WEEKDAYS.map((day) => (
            <Pill
              key={day}
              label={day}
              selected={form.availabilityDays.includes(day)}
              onPress={() => toggleDay(day)}
              style={styles.dayPill}
            />
          ))}
        </View>
      </Field>

      {/* Preserved from the previous form — collapsed by default so step 2
          stays short, but fully functional and never silently dropped. */}
      <View style={styles.advanced}>
        <Text style={styles.advancedLabel}>More options</Text>

        <PackagesSection
          packages={form.packages}
          expanded={showPackages}
          onToggleExpanded={() => setShowPackages((v) => !v)}
          onChange={(next) => update('packages', next)}
          error={errors.packages}
        />

        <FaqSection
          faq={form.faq}
          expanded={showFaq}
          onToggleExpanded={() => setShowFaq((v) => !v)}
          onChange={(next) => update('faq', next)}
          error={errors.faq}
        />

        <PortfolioSection
          items={portfolioItems}
          selected={form.portfolioExamples}
          expanded={showPortfolio}
          onToggleExpanded={() => setShowPortfolio((v) => !v)}
          onChange={(next) => update('portfolioExamples', next)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.lg },

  photoRow: { gap: S.md, paddingRight: S.base },
  addPhoto: {
    width: 104,
    height: 104,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: Dark.borderStrong,
    borderStyle: 'dashed',
    backgroundColor: Dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: { fontSize: 13, fontWeight: '600', color: Dark.text },
  addPhotoHint: { fontSize: 11, color: Dark.textMuted },
  photoTile: { width: 104, height: 104, borderRadius: R.md, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%', backgroundColor: Dark.surface },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  coverText: { fontSize: 10, fontWeight: '700', color: Dark.text },

  rateRow: { flexDirection: 'row', gap: S.md, alignItems: 'center' },
  priceWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: FIELD_HEIGHT,
    borderRadius: R.input,
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
    paddingLeft: S.base,
  },
  priceWrapInvalid: { borderColor: Dark.danger },
  priceSymbol: { fontSize: 17, fontWeight: '600', color: Dark.textSecondary },
  priceInput: {
    flex: 1,
    minHeight: FIELD_HEIGHT - 2,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: S.sm,
  },
  rateSegmented: { flex: 1.15 },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    height: FIELD_HEIGHT,
    paddingHorizontal: S.base,
    borderRadius: R.input,
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
  },
  selectText: { flex: 1, fontSize: 16, color: Dark.text },
  selectPlaceholder: { color: Dark.textMuted },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Dark.surface,
    borderTopLeftRadius: R.lg,
    borderTopRightRadius: R.lg,
    borderTopWidth: 1,
    borderColor: Dark.borderStrong,
    paddingHorizontal: GUTTER,
    paddingTop: S.lg,
    paddingBottom: S.xxl,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Dark.text,
    marginBottom: S.sm,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH + 6,
  },
  sheetRowText: { fontSize: 16, color: Dark.textSecondary },
  sheetRowTextOn: { color: Dark.text, fontWeight: '600' },

  locationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: FIELD_HEIGHT,
    borderRadius: R.input,
    backgroundColor: Dark.surface,
    borderWidth: 1,
    borderColor: Dark.border,
    paddingLeft: S.base,
    paddingRight: S.xs,
  },
  locationInvalid: { borderColor: Dark.danger },
  locationInput: {
    flex: 1,
    minHeight: FIELD_HEIGHT - 2,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: S.md,
  },
  locateBtn: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Seven days on one row at 320px and up. The pills keep the full 44px touch
  // HEIGHT and simply narrow horizontally rather than wrapping.
  dayRow: { flexDirection: 'row', gap: 4 },
  // Rounded rect rather than the Pill default's full radius, so the weekday
  // row reads the same here as it does on the step 3 preview.
  dayPill: { flex: 1, minWidth: 0, paddingHorizontal: 2, borderRadius: R.md },

  advanced: { gap: S.md, paddingTop: S.sm },
  advancedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
