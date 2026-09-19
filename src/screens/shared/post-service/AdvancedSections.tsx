import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PortfolioItem, ServiceFAQ } from '../../../types';
import { Collapsible, DarkInput, DarkTextArea } from './ui';
import { PackageDraft } from './formState';
import { Dark, S, R, TOUCH } from './theme';

/* ────────────────────────────────────────────────────────────────
   Packages — Basic / Standard / Premium tiers.
   Ported from the previous form so existing listings keep their tiers.
   ──────────────────────────────────────────────────────────────── */

function PackageEditor({
  pkg,
  onToggle,
  onChange,
  onAddFeature,
  onUpdateFeature,
  onRemoveFeature,
}: {
  pkg: PackageDraft;
  onToggle: () => void;
  onChange: (patch: Partial<PackageDraft>) => void;
  onAddFeature: () => void;
  onUpdateFeature: (idx: number, val: string) => void;
  onRemoveFeature: (idx: number) => void;
}) {
  return (
    <View style={[styles.pkgCard, pkg.enabled && styles.pkgCardOn]}>
      <View style={styles.pkgHead}>
        <Text style={styles.pkgTier}>{pkg.name}</Text>
        <Switch
          value={pkg.enabled}
          onValueChange={onToggle}
          trackColor={{ false: Dark.surfaceActive, true: Dark.text }}
          thumbColor={pkg.enabled ? Dark.ctaText : Dark.textMuted}
          ios_backgroundColor={Dark.surfaceActive}
          accessibilityLabel={`Enable ${pkg.name} package`}
        />
      </View>

      {pkg.enabled && (
        <>
          <View style={styles.pkgRow}>
            <DarkInput
              style={styles.pkgInput}
              value={pkg.price}
              onChangeText={(v) => onChange({ price: v.replace(/[^0-9.]/g, '') })}
              placeholder="Price"
              keyboardType="decimal-pad"
              accessibilityLabel={`${pkg.name} price`}
            />
            <DarkInput
              style={styles.pkgInput}
              value={pkg.deliveryDays}
              onChangeText={(v) => onChange({ deliveryDays: v.replace(/[^0-9]/g, '') })}
              placeholder="Days"
              keyboardType="number-pad"
              accessibilityLabel={`${pkg.name} delivery days`}
            />
          </View>

          {pkg.features.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <DarkInput
                style={styles.featureInput}
                value={feature}
                onChangeText={(v) => onUpdateFeature(i, v)}
                placeholder="What's included…"
                accessibilityLabel={`${pkg.name} feature ${i + 1}`}
              />
              <TouchableOpacity
                onPress={() => onRemoveFeature(i)}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove feature ${i + 1}`}
              >
                <Ionicons name="close" size={18} color={Dark.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={onAddFeature} style={styles.addRow} accessibilityRole="button">
            <Ionicons name="add" size={16} color={Dark.textSecondary} />
            <Text style={styles.addText}>Add feature</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export function PackagesSection({
  packages,
  expanded,
  onToggleExpanded,
  onChange,
  error,
}: {
  packages: PackageDraft[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (next: PackageDraft[]) => void;
  error?: string | null;
}) {
  const enabledCount = packages.filter((p) => p.enabled).length;

  const patch = (idx: number, next: Partial<PackageDraft>) =>
    onChange(packages.map((p, i) => (i === idx ? { ...p, ...next } : p)));

  return (
    <View style={styles.sectionWrap}>
      <Collapsible
        icon="layers-outline"
        title="Packages"
        subtitle={
          enabledCount > 0
            ? `${enabledCount} tier${enabledCount === 1 ? '' : 's'} on · cheapest becomes your price`
            : 'Optional — offer Basic / Standard / Premium'
        }
        expanded={expanded}
        onToggle={onToggleExpanded}
      >
        {packages.map((pkg, idx) => (
          <PackageEditor
            key={pkg.name}
            pkg={pkg}
            onToggle={() => patch(idx, { enabled: !pkg.enabled })}
            onChange={(p) => patch(idx, p)}
            onAddFeature={() => patch(idx, { features: [...pkg.features, ''] })}
            onUpdateFeature={(fi, val) =>
              patch(idx, { features: pkg.features.map((f, j) => (j === fi ? val : f)) })
            }
            onRemoveFeature={(fi) =>
              patch(idx, { features: pkg.features.filter((_, j) => j !== fi) })
            }
          />
        ))}
      </Collapsible>
      {error ? <Text style={styles.sectionError}>{error}</Text> : null}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────
   FAQ
   ──────────────────────────────────────────────────────────────── */

export function FaqSection({
  faq,
  expanded,
  onToggleExpanded,
  onChange,
  error,
}: {
  faq: ServiceFAQ[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (next: ServiceFAQ[]) => void;
  error?: string | null;
}) {
  return (
    <View style={styles.sectionWrap}>
      <Collapsible
        icon="help-circle-outline"
        title="FAQ"
        subtitle={
          faq.length > 0
            ? `${faq.length} question${faq.length === 1 ? '' : 's'}`
            : 'Optional — answer common questions'
        }
        expanded={expanded}
        onToggle={onToggleExpanded}
      >
        {faq.map((item, idx) => (
          <View key={idx} style={styles.faqItem}>
            <View style={styles.faqHead}>
              <Text style={styles.faqNum}>Q{idx + 1}</Text>
              <TouchableOpacity
                onPress={() => onChange(faq.filter((_, i) => i !== idx))}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove question ${idx + 1}`}
              >
                <Ionicons name="trash-outline" size={16} color={Dark.textMuted} />
              </TouchableOpacity>
            </View>
            <DarkInput
              value={item.question}
              onChangeText={(v) =>
                onChange(faq.map((f, i) => (i === idx ? { ...f, question: v } : f)))
              }
              placeholder="Question clients often ask…"
              maxLength={150}
              accessibilityLabel={`Question ${idx + 1}`}
            />
            <DarkTextArea
              style={styles.faqAnswer}
              value={item.answer}
              onChangeText={(v) =>
                onChange(faq.map((f, i) => (i === idx ? { ...f, answer: v } : f)))
              }
              placeholder="Your answer…"
              maxLength={400}
              accessibilityLabel={`Answer ${idx + 1}`}
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={() => onChange([...faq, { question: '', answer: '' }])}
          style={styles.addRow}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={16} color={Dark.textSecondary} />
          <Text style={styles.addText}>Add question</Text>
        </TouchableOpacity>
      </Collapsible>
      {error ? <Text style={styles.sectionError}>{error}</Text> : null}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────
   Portfolio examples
   ──────────────────────────────────────────────────────────────── */

export function PortfolioSection({
  items,
  selected,
  expanded,
  onToggleExpanded,
  onChange,
}: {
  items: PortfolioItem[];
  selected: string[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (next: string[]) => void;
}) {
  if (items.length === 0) return null;

  return (
    <Collapsible
      icon="briefcase-outline"
      title="Portfolio examples"
      subtitle={
        selected.length > 0 ? `${selected.length} selected` : 'Optional — link relevant work'
      }
      expanded={expanded}
      onToggle={onToggleExpanded}
    >
      <View style={styles.portfolioGrid}>
        {items.map((item) => {
          const isOn = selected.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.portfolioTile, isOn && styles.portfolioTileOn]}
              onPress={() =>
                onChange(isOn ? selected.filter((x) => x !== item.id) : [...selected, item.id])
              }
              activeOpacity={0.85}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={item.title}
            >
              {item.thumbnail_url ? (
                <Image source={{ uri: item.thumbnail_url }} style={styles.portfolioImg} />
              ) : (
                <View style={[styles.portfolioImg, styles.portfolioPlaceholder]}>
                  <Ionicons
                    name={item.file_type === 'pdf' ? 'document-outline' : 'image-outline'}
                    size={18}
                    color={Dark.textMuted}
                  />
                </View>
              )}
              {isOn && (
                <View style={styles.portfolioCheck}>
                  <Ionicons name="checkmark" size={12} color={Dark.ctaText} />
                </View>
              )}
              <Text style={styles.portfolioTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  sectionWrap: { gap: S.sm },
  sectionError: { fontSize: 12, color: Dark.danger, paddingHorizontal: S.xs },

  pkgCard: {
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: Dark.border,
    backgroundColor: Dark.surfaceRaised,
    padding: S.md,
    gap: S.md,
  },
  pkgCardOn: { borderColor: Dark.borderStrong },
  pkgHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pkgTier: { fontSize: 15, fontWeight: '700', color: Dark.text },
  pkgRow: { flexDirection: 'row', gap: S.sm },
  pkgInput: { flex: 1, minHeight: TOUCH, fontSize: 15 },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  featureInput: { flex: 1, minHeight: TOUCH, fontSize: 15 },
  iconBtn: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TOUCH },
  addText: { fontSize: 14, fontWeight: '600', color: Dark.textSecondary },

  faqItem: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.md,
    backgroundColor: Dark.surfaceRaised,
    borderWidth: 1,
    borderColor: Dark.border,
  },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqNum: { fontSize: 12, fontWeight: '700', color: Dark.textMuted, letterSpacing: 0.5 },
  faqAnswer: { minHeight: 88 },

  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  portfolioTile: {
    width: 88,
    gap: 6,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: Dark.border,
    padding: 6,
    backgroundColor: Dark.surfaceRaised,
  },
  portfolioTileOn: { borderColor: Dark.borderSelected },
  portfolioImg: { width: '100%', height: 58, borderRadius: R.sm, backgroundColor: Dark.surfaceActive },
  portfolioPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  portfolioCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: R.full,
    backgroundColor: Dark.ctaBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioTitle: { fontSize: 11, color: Dark.textSecondary },
});
