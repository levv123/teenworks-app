import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProofItem, ProofType } from '../types';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';
import {
  pickProofImage,
  uploadProofImage,
  createProofItem,
  updateProofItem,
  deleteProofItem,
} from '../api/proof';

// ── Config ────────────────────────────────────────────────────

type ProofTypeMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  placeholder: string;
  bodyPlaceholder: string;
  metricPlaceholder: string;
};

const PROOF_TYPES: Record<ProofType, ProofTypeMeta> = {
  testimonial: {
    label: 'Client Testimonial',
    icon: 'chatbubble-ellipses',
    color: Colors.primary,
    bg: Colors.primaryLight,
    placeholder: 'What did the client say?',
    bodyPlaceholder: '"Great work, super professional and on time!"',
    metricPlaceholder: 'e.g. 5-star review',
  },
  screenshot: {
    label: 'Screenshot',
    icon: 'phone-portrait-outline',
    color: '#8B5CF6',
    bg: '#EDE9FE',
    placeholder: 'What does this screenshot show?',
    bodyPlaceholder: 'Analytics, app review, message thread…',
    metricPlaceholder: 'e.g. 50,000 views',
  },
  certificate: {
    label: 'Certificate',
    icon: 'ribbon',
    color: '#D97706',
    bg: '#FEF3C7',
    placeholder: 'Certificate or credential name',
    bodyPlaceholder: 'Issued by, course name, completion date…',
    metricPlaceholder: 'e.g. Completed June 2025',
  },
  award: {
    label: 'Award',
    icon: 'trophy',
    color: '#F59E0B',
    bg: '#FFFBEB',
    placeholder: 'Award name or recognition',
    bodyPlaceholder: 'What was this award for?',
    metricPlaceholder: 'e.g. Top 10% on platform',
  },
  before_after: {
    label: 'Before & After',
    icon: 'git-compare-outline',
    color: Colors.success,
    bg: Colors.successLight,
    placeholder: 'Describe the transformation',
    bodyPlaceholder: 'Before: overgrown yard  →  After: pristine lawn',
    metricPlaceholder: 'e.g. 3 hours, $80',
  },
  result: {
    label: 'Project Result',
    icon: 'stats-chart',
    color: '#0EA5E9',
    bg: '#E0F2FE',
    placeholder: 'What result did you achieve?',
    bodyPlaceholder: 'Student improved from C to A in 4 weeks',
    metricPlaceholder: 'e.g. 4 weeks · Grade A',
  },
};

const TYPE_ORDER: ProofType[] = ['result', 'testimonial', 'screenshot', 'certificate', 'award', 'before_after'];

// ── Draft ─────────────────────────────────────────────────────

interface DraftState {
  proof_type: ProofType;
  headline: string;
  body: string;
  metric: string;
  imageUri: string | null;
  existingImageUrl: string | null;
}

const emptyDraft = (): DraftState => ({
  proof_type: 'result',
  headline: '',
  body: '',
  metric: '',
  imageUri: null,
  existingImageUrl: null,
});

// ── Component ─────────────────────────────────────────────────

interface Props {
  items: ProofItem[];
  userId: string;
  isOwner: boolean;
  onItemsChange: (items: ProofItem[]) => void;
}

export function ProofWall({ items, userId, isOwner, onItemsChange }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProofItem | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [uploading, setUploading] = useState(false);

  // ── Sheet open/close ──────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setSheetOpen(true);
  };

  const openEdit = (item: ProofItem) => {
    setEditing(item);
    setDraft({
      proof_type: item.proof_type,
      headline: item.headline,
      body: item.body ?? '',
      metric: item.metric ?? '',
      imageUri: null,
      existingImageUrl: item.image_url,
    });
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setDraft(emptyDraft());
    setEditing(null);
  };

  // ── Image pick ────────────────────────────────────────────────

  const handlePickImage = async () => {
    const picked = await pickProofImage();
    if (picked) setDraft((d) => ({ ...d, imageUri: picked.uri, existingImageUrl: null }));
  };

  // ── Save ──────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!draft.headline.trim()) {
      Alert.alert('Headline required', 'Please enter a headline for this proof item.');
      return;
    }
    setUploading(true);
    try {
      let imageUrl = draft.existingImageUrl;
      if (draft.imageUri) {
        imageUrl = await uploadProofImage(draft.imageUri, userId);
      }

      const payload = {
        proof_type: draft.proof_type,
        headline: draft.headline.trim(),
        body: draft.body.trim() || null,
        metric: draft.metric.trim() || null,
        image_url: imageUrl,
      };

      if (editing) {
        await updateProofItem(editing.id, payload);
        onItemsChange(items.map((i) => (i.id === editing.id ? { ...i, ...payload } : i)));
      } else {
        const newItem = await createProofItem({
          user_id: userId,
          sort_order: items.length,
          ...payload,
        });
        onItemsChange([newItem, ...items]);
      }
      closeSheet();
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────

  const handleDelete = (item: ProofItem) => {
    Alert.alert('Remove proof item', `Remove "${item.headline}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProofItem(item.id, item.image_url);
            onItemsChange(items.filter((i) => i.id !== item.id));
          } catch {
            Alert.alert('Error', 'Could not remove item.');
          }
        },
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────

  const meta = PROOF_TYPES[draft.proof_type];
  const imagePreviewUri = draft.imageUri ?? draft.existingImageUrl ?? null;

  return (
    <View style={styles.root}>
      {/* Section header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
          <Text style={styles.headerTitle}>Proof Wall</Text>
          {items.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{items.length}</Text>
            </View>
          )}
        </View>
        {isOwner && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={15} color={Colors.primary} />
            <Text style={styles.addBtnText}>Add Proof</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty state */}
      {items.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="shield-checkmark-outline" size={30} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {isOwner ? 'Build trust with proof' : 'No proof items yet'}
          </Text>
          <Text style={styles.emptySub}>
            {isOwner
              ? 'Add testimonials, results, certificates, and more to show clients you deliver.'
              : 'This worker hasn\'t added proof items yet.'}
          </Text>
        </View>
      )}

      {/* Proof cards — masonry-style vertical stack */}
      {items.map((item) => {
        const m = PROOF_TYPES[item.proof_type];
        return (
          <View key={item.id} style={[styles.card, { borderLeftColor: m.color }]}>
            {/* Type badge */}
            <View style={styles.cardTop}>
              <View style={[styles.typeBadge, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon} size={12} color={m.color} />
                <Text style={[styles.typeBadgeText, { color: m.color }]}>{m.label}</Text>
              </View>

              {isOwner && (
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                    <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Image */}
            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
            )}

            {/* Metric highlight */}
            {item.metric && (
              <View style={[styles.metricBadge, { backgroundColor: m.bg }]}>
                <Ionicons name="trending-up" size={13} color={m.color} />
                <Text style={[styles.metricText, { color: m.color }]}>{item.metric}</Text>
              </View>
            )}

            {/* Headline */}
            <Text style={[
              styles.headline,
              item.proof_type === 'testimonial' && styles.headlineQuote,
            ]}>
              {item.proof_type === 'testimonial' ? `"${item.headline}"` : item.headline}
            </Text>

            {/* Body */}
            {item.body && (
              <Text style={styles.body}>{item.body}</Text>
            )}
          </View>
        );
      })}

      {/* ── Add / Edit Sheet ──────────────────────────────── */}
      <Modal
        visible={sheetOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeSheet} style={styles.modalIconBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editing ? 'Edit Proof Item' : 'Add Proof Item'}
            </Text>
            <TouchableOpacity
              style={[styles.saveBtn, uploading && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.saveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Type picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeGrid}>
                {TYPE_ORDER.map((type) => {
                  const tm = PROOF_TYPES[type];
                  const active = draft.proof_type === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeChip, active && { backgroundColor: tm.bg, borderColor: tm.color }]}
                      onPress={() => setDraft((d) => ({ ...d, proof_type: type }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={tm.icon} size={14} color={active ? tm.color : Colors.muted} />
                      <Text style={[styles.typeChipText, active && { color: tm.color }]}>{tm.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Headline */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {draft.proof_type === 'testimonial' ? 'Quote *' : 'Headline *'}
              </Text>
              <TextInput
                style={styles.input}
                value={draft.headline}
                onChangeText={(t) => setDraft((d) => ({ ...d, headline: t }))}
                placeholder={meta.placeholder}
                placeholderTextColor={Colors.muted}
                maxLength={120}
              />
              <Text style={styles.charCount}>{draft.headline.length}/120</Text>
            </View>

            {/* Metric */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Key Result <Text style={styles.optional}>(optional)</Text>
              </Text>
              <View style={styles.metricInput}>
                <Ionicons name="trending-up" size={16} color={Colors.muted} style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.metricInputText}
                  value={draft.metric}
                  onChangeText={(t) => setDraft((d) => ({ ...d, metric: t }))}
                  placeholder={meta.metricPlaceholder}
                  placeholderTextColor={Colors.muted}
                  maxLength={60}
                />
              </View>
            </View>

            {/* Body */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Details <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={draft.body}
                onChangeText={(t) => setDraft((d) => ({ ...d, body: t }))}
                placeholder={meta.bodyPlaceholder}
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={styles.charCount}>{draft.body.length}/300</Text>
            </View>

            {/* Image */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Image <Text style={styles.optional}>(optional)</Text>
              </Text>
              {imagePreviewUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: imagePreviewUri }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.imageClear}
                    onPress={() => setDraft((d) => ({ ...d, imageUri: null, existingImageUrl: null }))}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePickBtn} onPress={handlePickImage} activeOpacity={0.85}>
                  <Ionicons name="camera-outline" size={22} color={Colors.primary} />
                  <Text style={styles.imagePickBtnText}>Add Screenshot or Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Delete */}
            {editing && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => { closeSheet(); handleDelete(editing); }}
              >
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Remove this item</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },

  // Section header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  countBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.success },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 8 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.md },

  // Proof card
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    gap: 10,
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cardImage: {
    width: '100%', height: 180,
    borderRadius: Radius.md,
  },
  metricBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  metricText: { fontSize: 13, fontWeight: '800' },
  headline: { fontSize: 16, fontWeight: '700', color: Colors.text, lineHeight: 22 },
  headlineQuote: { fontStyle: 'italic', fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  body: { fontSize: 13, color: Colors.muted, lineHeight: 19 },

  // Modal
  modalRoot: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  modalTitle: {
    flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text,
    textAlign: 'center', marginHorizontal: 8,
  },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  // Sheet form
  sheetContent: { padding: Spacing.lg, gap: 20, paddingBottom: 60 },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.text,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  optional: { fontWeight: '400', color: Colors.muted, textTransform: 'none', fontSize: 12 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontSize: 15, color: Colors.text,
  },
  textArea: { minHeight: 88, paddingTop: 13 },
  charCount: { fontSize: 11, color: Colors.muted, textAlign: 'right' },

  // Type grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  typeChipText: { fontSize: 12, fontWeight: '600', color: Colors.muted },

  // Metric input
  metricInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
  },
  metricInputText: { flex: 1, fontSize: 15, color: Colors.text },

  // Image
  imagePickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: 20,
  },
  imagePickBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  imagePreviewWrap: { borderRadius: Radius.lg, overflow: 'hidden', position: 'relative' },
  imagePreview: { width: '100%', height: 180, borderRadius: Radius.lg },
  imageClear: { position: 'absolute', top: 8, right: 8 },

  // Delete
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2', marginTop: Spacing.sm,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
