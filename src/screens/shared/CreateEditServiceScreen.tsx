import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import {
  createService,
  updateService,
  pickServiceImage,
  uploadServiceImage,
} from '../../api/services';
import { getCategories } from '../../api/requests';
import { getPortfolioForUser } from '../../api/portfolio';
import { Category, PortfolioItem, ServiceFAQ, ServicePackage, ServicesStackParamList } from '../../types';

type Props = NativeStackScreenProps<ServicesStackParamList, 'CreateEditService'>;

const DELIVERY_PRESETS = [
  { label: '1 day', value: 1 },
  { label: '3 days', value: 3 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: 'Custom', value: -1 },
];

const MAX_IMAGES = 5;

const PACKAGE_TIERS = ['Basic', 'Standard', 'Premium'] as const;

interface PackageDraft {
  enabled: boolean;
  name: string;
  price: string;
  deliveryDays: string;
  features: string[];
}

function makeDefaultPackages(existing?: ServicePackage[]): PackageDraft[] {
  return PACKAGE_TIERS.map((tier) => {
    const found = existing?.find((p) => p.name === tier);
    return found
      ? { enabled: true, name: tier, price: String(found.price), deliveryDays: String(found.delivery_days), features: [...found.features] }
      : { enabled: false, name: tier, price: '', deliveryDays: '', features: [] };
  });
}

export function CreateEditServiceScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const existing = route.params?.service;
  const isEdit = !!existing;

  // Required fields
  const [title, setTitle] = useState(existing?.title ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [price, setPrice] = useState(existing ? String(existing.starting_price) : '');
  const [deliveryDays, setDeliveryDays] = useState(existing?.delivery_days ?? 3);
  const [customDays, setCustomDays] = useState(
    existing && ![1, 3, 7, 14].includes(existing.delivery_days)
      ? String(existing.delivery_days)
      : '',
  );
  const selectedPreset =
    DELIVERY_PRESETS.find((p) => p.value === deliveryDays)?.value ?? -1;

  // Packages
  const [packages, setPackages] = useState<PackageDraft[]>(() =>
    makeDefaultPackages(existing?.packages),
  );
  const [showPackages, setShowPackages] = useState(
    (existing?.packages?.length ?? 0) > 0,
  );

  // Optional fields
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [faq, setFaq] = useState<ServiceFAQ[]>(existing?.faq ?? []);
  const [portfolioExamples, setPortfolioExamples] = useState<string[]>(
    existing?.portfolio_examples ?? [],
  );

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [portfolioModalVisible, setPortfolioModalVisible] = useState(false);

  // Collapsible optional sections
  const [showImages, setShowImages] = useState((existing?.images?.length ?? 0) > 0);
  const [showPortfolio, setShowPortfolio] = useState(
    (existing?.portfolio_examples?.length ?? 0) > 0,
  );
  const [showFaq, setShowFaq] = useState((existing?.faq?.length ?? 0) > 0);

  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    if (user?.id) {
      getPortfolioForUser(user.id).then(setPortfolioItems).catch(() => {});
    }
  }, [user?.id]);

  // ── Delivery preset ────────────────────────────────────────────
  const handleDeliveryPreset = (value: number) => {
    if (value === -1) {
      setDeliveryDays(-1);
    } else {
      setDeliveryDays(value);
      setCustomDays('');
    }
  };

  const resolvedDays =
    deliveryDays === -1 ? (parseInt(customDays, 10) || 0) : deliveryDays;

  // ── Images ────────────────────────────────────────────────────
  const handleAddImage = async () => {
    if (images.length >= MAX_IMAGES) return;
    const uri = await pickServiceImage();
    if (!uri || !user?.id) return;
    setUploadingImage(true);
    try {
      const url = await uploadServiceImage(uri, user.id);
      setImages((prev) => [...prev, url]);
    } catch {
      Alert.alert('Error', 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── FAQ ───────────────────────────────────────────────────────
  const addFaq = () => setFaq((prev) => [...prev, { question: '', answer: '' }]);

  const updateFaq = (index: number, field: keyof ServiceFAQ, value: string) => {
    setFaq((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeFaq = (index: number) => {
    setFaq((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Packages ──────────────────────────────────────────────────
  const updatePackage = (idx: number, patch: Partial<PackageDraft>) => {
    setPackages((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const togglePackageEnabled = (idx: number) => {
    setPackages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, enabled: !p.enabled } : p)),
    );
  };

  const addPackageFeature = (idx: number) => {
    setPackages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, features: [...p.features, ''] } : p)),
    );
  };

  const updatePackageFeature = (pkgIdx: number, featIdx: number, val: string) => {
    setPackages((prev) =>
      prev.map((p, i) =>
        i === pkgIdx
          ? { ...p, features: p.features.map((f, j) => (j === featIdx ? val : f)) }
          : p,
      ),
    );
  };

  const removePackageFeature = (pkgIdx: number, featIdx: number) => {
    setPackages((prev) =>
      prev.map((p, i) =>
        i === pkgIdx ? { ...p, features: p.features.filter((_, j) => j !== featIdx) } : p,
      ),
    );
  };

  const builtPackages = (): ServicePackage[] =>
    packages
      .filter((p) => p.enabled && p.price && p.deliveryDays)
      .map((p) => ({
        name: p.name,
        price: Number(p.price),
        delivery_days: parseInt(p.deliveryDays, 10),
        features: p.features.filter((f) => f.trim()),
      }));

  // ── Portfolio examples ────────────────────────────────────────
  const togglePortfolioExample = (id: string) => {
    setPortfolioExamples((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // ── Validation & save ─────────────────────────────────────────
  const validate = (): string | null => {
    if (!title.trim()) return 'Service title is required.';
    if (!categoryId) return 'Please select a category.';
    if (!description.trim()) return 'Description is required.';
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0)
      return 'Enter a valid starting price.';
    if (resolvedDays < 1) return 'Enter a valid delivery time.';
    const incompleteFaq = faq.find((f) => !f.question.trim() || !f.answer.trim());
    if (incompleteFaq) return 'Complete all FAQ entries or remove empty ones.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('Required', err); return; }
    if (!user?.id) return;

    setSaving(true);
    try {
      const pkgs = builtPackages();
    // If packages defined, derive starting_price from cheapest package
    const effectivePrice = pkgs.length > 0
      ? Math.min(...pkgs.map((p) => p.price))
      : Number(price);
    const effectiveDays = pkgs.length > 0
      ? pkgs[0].delivery_days
      : resolvedDays;

    const payload = {
        title: title.trim(),
        category_id: categoryId,
        description: description.trim(),
        starting_price: effectivePrice,
        delivery_days: effectiveDays,
        images,
        faq: faq.filter((f) => f.question.trim() && f.answer.trim()),
        packages: pkgs,
        portfolio_examples: portfolioExamples,
      };

      let savedService;
      if (isEdit) {
        await updateService(existing.id, payload);
        savedService = { ...existing, ...payload };
      } else {
        savedService = await createService({ ...payload, provider_id: user.id, is_active: true });
      }
      navigation.replace('ServiceAnalysis', { service: savedService });
    } catch {
      Alert.alert('Error', 'Could not save service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Progress indicator ────────────────────────────────────────
  const filledRequired = [
    title.trim(),
    categoryId,
    description.trim(),
    price.trim() && Number(price) > 0,
    resolvedDays >= 1,
  ].filter(Boolean).length;
  const progress = filledRequired / 5;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.heading}>{isEdit ? 'Edit Service' : 'New Service'}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
          <View style={styles.headerActions}>
            {isEdit && existing && (
              <TouchableOpacity
                style={styles.analyzeBtn}
                onPress={() => navigation.navigate('ServiceAnalysis', { service: existing })}
              >
                <Ionicons name="sparkles" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.publishBtn, saving && styles.publishBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
            {saving ? (
              <ActivityIndicator color={Colors.card} size="small" />
            ) : (
              <Text style={styles.publishBtnText}>{isEdit ? 'Save' : 'Publish'}</Text>
            )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── REQUIRED SECTION ─────────────────────────────── */}
          <SectionLabel text="Required" />

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Service Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. TikTok Video Editing, Math Tutoring…"
              placeholderTextColor={Colors.muted}
              maxLength={80}
              returnKeyType="next"
            />
            <Text style={styles.hint}>{title.length}/80 · Be specific so clients find you</Text>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {categories.map((cat) => {
                const selected = categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <Text style={styles.chipIcon}>{cat.icon}</Text>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder={"What will you deliver?\nWhat's included?\nWhy should a client choose you?"}
              placeholderTextColor={Colors.muted}
              multiline
              numberOfLines={5}
              maxLength={800}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/800</Text>
          </View>

          {/* Price + Delivery */}
          <View style={styles.field}>
            <Text style={styles.label}>Starting Price</Text>
            <View style={styles.prefixInput}>
              <Text style={styles.prefix}>$</Text>
              <TextInput
                style={styles.prefixTextInput}
                value={price}
                onChangeText={setPrice}
                placeholder="25"
                placeholderTextColor={Colors.muted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.prefixSuffix}>USD</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Delivery Time</Text>
            <View style={styles.presetRow}>
              {DELIVERY_PRESETS.map((p) => {
                const isSelected =
                  p.value === -1
                    ? selectedPreset === -1
                    : deliveryDays === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.preset, isSelected && styles.presetSelected]}
                    onPress={() => handleDeliveryPreset(p.value)}
                  >
                    <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {deliveryDays === -1 && (
              <View style={styles.suffixInput}>
                <TextInput
                  style={styles.suffixTextInput}
                  value={customDays}
                  onChangeText={setCustomDays}
                  placeholder="e.g. 10"
                  placeholderTextColor={Colors.muted}
                  keyboardType="number-pad"
                  autoFocus
                />
                <Text style={styles.suffix}>days</Text>
              </View>
            )}
          </View>

          {/* ── PACKAGES ─────────────────────────────────────── */}
          <CollapsibleSection
            icon="layers-outline"
            title="Service Packages"
            subtitle={
              packages.filter((p) => p.enabled).length > 0
                ? `${packages.filter((p) => p.enabled).length} tier${packages.filter((p) => p.enabled).length !== 1 ? 's' : ''} enabled`
                : 'Offer Basic / Standard / Premium tiers'
            }
            expanded={showPackages}
            onToggle={() => setShowPackages((v) => !v)}
          >
            <Text style={styles.pkgHint}>
              Enable tiers to let clients choose their budget. The cheapest enabled tier becomes your starting price.
            </Text>
            {packages.map((pkg, idx) => (
              <PackageEditor
                key={pkg.name}
                pkg={pkg}
                onToggle={() => togglePackageEnabled(idx)}
                onChange={(patch) => updatePackage(idx, patch)}
                onAddFeature={() => addPackageFeature(idx)}
                onUpdateFeature={(fi, val) => updatePackageFeature(idx, fi, val)}
                onRemoveFeature={(fi) => removePackageFeature(idx, fi)}
              />
            ))}
          </CollapsibleSection>

          {/* ── OPTIONAL SECTION ─────────────────────────────── */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Optional — adds credibility</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Service Images */}
          <CollapsibleSection
            icon="images-outline"
            title="Service Images"
            subtitle={`${images.length}/${MAX_IMAGES} added`}
            expanded={showImages}
            onToggle={() => setShowImages((v) => !v)}
          >
            <View style={styles.imageRow}>
              {images.map((url, idx) => (
                <View key={idx} style={styles.imageTile}>
                  <Image source={{ uri: url }} style={styles.imageTileImg} />
                  <TouchableOpacity
                    style={styles.imageRemoveBtn}
                    onPress={() => handleRemoveImage(idx)}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < MAX_IMAGES && (
                <TouchableOpacity
                  style={styles.imageAddTile}
                  onPress={handleAddImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                      <Text style={styles.imageAddText}>Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.hint}>Show your best work — listings with images get 3× more views</Text>
          </CollapsibleSection>

          {/* Portfolio Examples */}
          {portfolioItems.length > 0 && (
            <CollapsibleSection
              icon="briefcase-outline"
              title="Portfolio Examples"
              subtitle={
                portfolioExamples.length > 0
                  ? `${portfolioExamples.length} selected`
                  : 'Link relevant projects'
              }
              expanded={showPortfolio}
              onToggle={() => setShowPortfolio((v) => !v)}
            >
              <View style={styles.portfolioGrid}>
                {portfolioItems.map((item) => {
                  const selected = portfolioExamples.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.portfolioTile, selected && styles.portfolioTileSelected]}
                      onPress={() => togglePortfolioExample(item.id)}
                    >
                      {item.thumbnail_url ? (
                        <Image
                          source={{ uri: item.thumbnail_url }}
                          style={styles.portfolioTileImg}
                        />
                      ) : (
                        <View style={[styles.portfolioTileImg, styles.portfolioTilePlaceholder]}>
                          <Ionicons
                            name={item.file_type === 'pdf' ? 'document-outline' : 'image-outline'}
                            size={20}
                            color={Colors.muted}
                          />
                        </View>
                      )}
                      {selected && (
                        <View style={styles.portfolioCheck}>
                          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                        </View>
                      )}
                      <Text style={styles.portfolioTileTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </CollapsibleSection>
          )}

          {/* FAQ */}
          <CollapsibleSection
            icon="help-circle-outline"
            title="FAQ"
            subtitle={faq.length > 0 ? `${faq.length} question${faq.length !== 1 ? 's' : ''}` : 'Answer common questions'}
            expanded={showFaq}
            onToggle={() => setShowFaq((v) => !v)}
          >
            {faq.map((item, idx) => (
              <View key={idx} style={styles.faqItem}>
                <View style={styles.faqHeader}>
                  <Text style={styles.faqNum}>Q{idx + 1}</Text>
                  <TouchableOpacity onPress={() => removeFaq(idx)} style={styles.faqRemoveBtn}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.faqInput}
                  value={item.question}
                  onChangeText={(v) => updateFaq(idx, 'question', v)}
                  placeholder="Question clients often ask…"
                  placeholderTextColor={Colors.muted}
                  maxLength={150}
                />
                <TextInput
                  style={[styles.faqInput, styles.faqAnswer]}
                  value={item.answer}
                  onChangeText={(v) => updateFaq(idx, 'answer', v)}
                  placeholder="Your answer…"
                  placeholderTextColor={Colors.muted}
                  multiline
                  numberOfLines={3}
                  maxLength={400}
                  textAlignVertical="top"
                />
              </View>
            ))}
            <TouchableOpacity style={styles.addFaqBtn} onPress={addFaq}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addFaqText}>Add Question</Text>
            </TouchableOpacity>
          </CollapsibleSection>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{text}</Text>
    </View>
  );
}

function CollapsibleSection({
  icon,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.collapsible}>
      <TouchableOpacity style={styles.collapsibleHeader} onPress={onToggle}>
        <View style={styles.collapsibleLeft}>
          <View style={styles.collapsibleIconWrap}>
            <Ionicons name={icon} size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.collapsibleTitle}>{title}</Text>
            <Text style={styles.collapsibleSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.muted}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.collapsibleBody}>{children}</View>}
    </View>
  );
}

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
  const TIER_COLORS: Record<string, string> = {
    Basic: '#6B7280',
    Standard: Colors.primary,
    Premium: '#F59E0B',
  };
  const color = TIER_COLORS[pkg.name] ?? Colors.primary;

  return (
    <View style={[styles.pkgCard, pkg.enabled && { borderColor: color }]}>
      {/* Header row */}
      <TouchableOpacity style={styles.pkgHeader} onPress={onToggle} activeOpacity={0.8}>
        <View style={[styles.pkgTierBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.pkgTierText, { color }]}>{pkg.name}</Text>
        </View>
        <View style={styles.pkgToggle}>
          <Text style={[styles.pkgToggleText, pkg.enabled && { color }]}>
            {pkg.enabled ? 'Enabled' : 'Off'}
          </Text>
          <View style={[styles.pkgToggleTrack, pkg.enabled && { backgroundColor: color }]}>
            <View style={[styles.pkgToggleThumb, pkg.enabled && styles.pkgToggleThumbOn]} />
          </View>
        </View>
      </TouchableOpacity>

      {pkg.enabled && (
        <View style={styles.pkgBody}>
          {/* Price + Delivery row */}
          <View style={styles.pkgRow}>
            <View style={styles.pkgField}>
              <Text style={styles.pkgFieldLabel}>Price (USD)</Text>
              <View style={styles.pkgPrefixInput}>
                <Text style={styles.pkgPrefix}>$</Text>
                <TextInput
                  style={styles.pkgTextInput}
                  value={pkg.price}
                  onChangeText={(v) => onChange({ price: v })}
                  placeholder="50"
                  placeholderTextColor={Colors.muted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.pkgField}>
              <Text style={styles.pkgFieldLabel}>Delivery (days)</Text>
              <View style={styles.pkgPrefixInput}>
                <TextInput
                  style={[styles.pkgTextInput, { paddingLeft: Spacing.sm }]}
                  value={pkg.deliveryDays}
                  onChangeText={(v) => onChange({ deliveryDays: v })}
                  placeholder="3"
                  placeholderTextColor={Colors.muted}
                  keyboardType="number-pad"
                />
                <Text style={styles.pkgSuffix}>days</Text>
              </View>
            </View>
          </View>

          {/* Features */}
          <Text style={styles.pkgFieldLabel}>What's included</Text>
          {pkg.features.map((feat, fi) => (
            <View key={fi} style={styles.pkgFeatureRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={color} />
              <TextInput
                style={styles.pkgFeatureInput}
                value={feat}
                onChangeText={(v) => onUpdateFeature(fi, v)}
                placeholder="e.g. 1 revision, HD delivery…"
                placeholderTextColor={Colors.muted}
                maxLength={80}
              />
              <TouchableOpacity onPress={() => onRemoveFeature(fi)}>
                <Ionicons name="close-circle-outline" size={18} color={Colors.muted} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.pkgAddFeature} onPress={onAddFeature}>
            <Ionicons name="add-circle-outline" size={16} color={color} />
            <Text style={[styles.pkgAddFeatureText, { color }]}>Add feature</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
    gap: Spacing.sm,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, gap: 4 },
  heading: { fontSize: 17, fontWeight: '700', color: Colors.text },
  progressBar: {
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  analyzeBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    minWidth: 72,
    alignItems: 'center',
  },
  publishBtnDisabled: { opacity: 0.6 },
  publishBtnText: { color: Colors.card, fontWeight: '700', fontSize: 14 },

  form: { padding: Spacing.md, gap: Spacing.md },

  sectionLabel: { marginTop: Spacing.xs },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
    color: Colors.text,
    ...Shadow.sm,
  },
  multiline: { minHeight: 120, paddingTop: Spacing.sm + 2 },
  hint: { fontSize: 11, color: Colors.muted },
  charCount: { fontSize: 11, color: Colors.muted, textAlign: 'right' },

  chipRow: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '33',
  },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 13, color: Colors.muted, fontWeight: '500' },
  chipTextSelected: { color: Colors.primary, fontWeight: '700' },

  prefixInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingLeft: Spacing.md,
    ...Shadow.sm,
  },
  prefix: { fontSize: 16, fontWeight: '600', color: Colors.muted },
  prefixTextInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    fontSize: 15,
    color: Colors.text,
  },
  prefixSuffix: {
    fontSize: 12,
    color: Colors.muted,
    paddingRight: Spacing.md,
    fontWeight: '500',
  },

  presetRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  preset: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  presetSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  presetText: { fontSize: 13, color: Colors.muted, fontWeight: '500' },
  presetTextSelected: { color: Colors.card, fontWeight: '700' },
  suffixInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingRight: Spacing.md,
    marginTop: Spacing.xs,
    ...Shadow.sm,
  },
  suffixTextInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingLeft: Spacing.md,
    fontSize: 15,
    color: Colors.text,
  },
  suffix: { fontSize: 13, color: Colors.muted, fontWeight: '500' },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 11, color: Colors.muted, fontWeight: '600' },

  collapsible: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  collapsibleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  collapsibleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsibleTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  collapsibleSubtitle: { fontSize: 12, color: Colors.muted, marginTop: 1 },
  collapsibleBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },

  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  imageTile: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    overflow: 'visible',
  },
  imageTileImg: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    backgroundColor: Colors.border,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
  },
  imageAddTile: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: Colors.primaryLight + '11',
  },
  imageAddText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  portfolioTile: {
    width: 90,
    gap: 4,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'visible',
    padding: 2,
  },
  portfolioTileSelected: { borderColor: Colors.primary },
  portfolioTileImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
  },
  portfolioTilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
  },
  portfolioTileTitle: {
    fontSize: 10,
    color: Colors.text,
    fontWeight: '500',
    paddingHorizontal: 2,
    paddingBottom: 2,
  },

  faqItem: {
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqNum: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  faqRemoveBtn: { padding: 4 },
  faqInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    fontSize: 14,
    color: Colors.text,
  },
  faqAnswer: { minHeight: 72, paddingTop: Spacing.xs + 2 },
  addFaqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
  },
  addFaqText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  // Packages
  pkgHint: { fontSize: 12, color: Colors.muted, lineHeight: 17, marginBottom: Spacing.xs },
  pkgCard: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  pkgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm + 2,
  },
  pkgTierBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pkgTierText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  pkgToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  pkgToggleText: { fontSize: 12, fontWeight: '600', color: Colors.muted },
  pkgToggleTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  pkgToggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.card,
    alignSelf: 'flex-start',
  },
  pkgToggleThumbOn: { alignSelf: 'flex-end' },
  pkgBody: {
    paddingHorizontal: Spacing.sm + 2,
    paddingBottom: Spacing.sm + 2,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  pkgRow: { flexDirection: 'row', gap: Spacing.sm },
  pkgField: { flex: 1, gap: 4 },
  pkgFieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  pkgPrefixInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  pkgPrefix: { fontSize: 14, fontWeight: '600', color: Colors.muted, paddingLeft: Spacing.xs + 2 },
  pkgSuffix: { fontSize: 12, color: Colors.muted, paddingRight: Spacing.xs + 2, fontWeight: '500' },
  pkgTextInput: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: 4,
    fontSize: 14,
    color: Colors.text,
  },
  pkgFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pkgFeatureInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    paddingVertical: Spacing.xs,
  },
  pkgAddFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  pkgAddFeatureText: { fontSize: 13, fontWeight: '600' },
});
