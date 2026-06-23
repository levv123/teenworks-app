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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PortfolioItem, PortfolioFileType } from '../types';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';
import {
  PortfolioFile,
  MAX_FEATURED,
  pickPortfolioImageOrVideo,
  pickPortfolioPDF,
  uploadPortfolioFile,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  toggleFeatured,
} from '../api/portfolio';

const { width: SCREEN_W } = Dimensions.get('window');
const ITEM_W = (SCREEN_W - Spacing.lg * 2 - 10) / 2;

const CATEGORIES = [
  'Video Editing',
  'Graphic Design',
  'Photography',
  'Content Creation',
  'Tutoring',
  'Lawn Care',
  'Dog Walking',
  'Tech Help',
  'Writing',
  'Music',
  'Coding',
  'Cleaning',
  'Other',
];

const FILE_TYPE_META: Record<PortfolioFileType, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string }> = {
  image:  { icon: 'image-outline',         label: 'Image', color: Colors.primary, bg: Colors.primaryLight },
  video:  { icon: 'videocam-outline',       label: 'Video', color: '#8B5CF6',      bg: '#EDE9FE' },
  pdf:    { icon: 'document-text-outline',  label: 'PDF',   color: '#EF4444',      bg: '#FEE2E2' },
};

interface DraftState {
  title: string;
  description: string;
  category: string;
  file: PortfolioFile | null;
  existingUrl: string | null;
  fileType: PortfolioFileType;
}

const emptyDraft = (): DraftState => ({
  title: '',
  description: '',
  category: CATEGORIES[0],
  file: null,
  existingUrl: null,
  fileType: 'image',
});

interface Props {
  items: PortfolioItem[];
  userId: string;
  isOwner: boolean;
  ownerName: string;
  navigation: any;
  onItemsChange: (items: PortfolioItem[]) => void;
}

export function PortfolioGrid({ items, userId, isOwner, ownerName, navigation, onItemsChange }: Props) {
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [uploading, setUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // ── Filter + featured logic ───────────────────────────────────

  const featuredItems = items.filter((i) => i.is_featured);
  const usedCategories = CATEGORIES.filter((cat) => items.some((i) => i.category === cat));
  const filteredItems = activeFilter ? items.filter((i) => i.category === activeFilter) : items;

  // ── File picking ──────────────────────────────────────────────

  const handlePickFile = async (type: 'media' | 'pdf') => {
    const file = type === 'pdf'
      ? await pickPortfolioPDF()
      : await pickPortfolioImageOrVideo();
    if (!file) return;
    setDraft((d) => ({ ...d, file, fileType: file.fileType, existingUrl: null }));
  };

  // ── Open sheet ────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setSheetOpen(true);
  };

  const openEdit = (item: PortfolioItem) => {
    setEditing(item);
    setDraft({
      title: item.title,
      description: item.description ?? '',
      category: item.category,
      file: null,
      existingUrl: item.thumbnail_url,
      fileType: item.file_type,
    });
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setDraft(emptyDraft());
    setEditing(null);
  };

  // ── Save (create or update) ───────────────────────────────────

  const handleSave = async () => {
    if (!draft.title.trim()) {
      Alert.alert('Title required', 'Please enter a title for this item.');
      return;
    }
    if (!editing && !draft.file && !draft.existingUrl) {
      Alert.alert('File required', 'Please upload an image, video, or PDF.');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = draft.existingUrl;
      let fileType = draft.fileType;

      if (draft.file) {
        fileUrl = await uploadPortfolioFile(draft.file, userId);
        fileType = draft.file.fileType;
      }

      if (editing) {
        await updatePortfolioItem(editing.id, {
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          category: draft.category,
          thumbnail_url: fileUrl,
          file_type: fileType,
        });
        onItemsChange(
          items.map((i) =>
            i.id === editing.id
              ? { ...i, title: draft.title.trim(), description: draft.description.trim() || null, category: draft.category, thumbnail_url: fileUrl, file_type: fileType }
              : i,
          ),
        );
      } else {
        const newItem = await createPortfolioItem({
          user_id: userId,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          category: draft.category,
          thumbnail_url: fileUrl,
          file_type: fileType,
          is_featured: false,
          media_urls: fileUrl ? [fileUrl] : [],
          sort_order: items.length,
        });
        onItemsChange([newItem, ...items]);
      }

      closeSheet();
    } catch {
      Alert.alert('Error', 'Could not save portfolio item. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────

  const handleDelete = (item: PortfolioItem) => {
    Alert.alert('Remove item', `Remove "${item.title}" from your portfolio?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePortfolioItem(item.id, item.thumbnail_url);
            onItemsChange(items.filter((i) => i.id !== item.id));
          } catch {
            Alert.alert('Error', 'Could not remove item.');
          }
        },
      },
    ]);
  };

  // ── Feature toggle ────────────────────────────────────────────

  const handleToggleFeatured = async (item: PortfolioItem) => {
    try {
      await toggleFeatured(item, items);
      onItemsChange(
        items.map((i) => (i.id === item.id ? { ...i, is_featured: !i.is_featured } : i)),
      );
    } catch (err: any) {
      if (err?.message === 'MAX_FEATURED') {
        Alert.alert(
          'Featured limit reached',
          `You can feature up to ${MAX_FEATURED} items. Unfeature one to add another.`,
        );
      } else {
        Alert.alert('Error', 'Could not update featured status.');
      }
    }
  };

  // ── Helpers ───────────────────────────────────────────────────

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const filePreviewUri = draft.file?.uri ?? draft.existingUrl ?? null;
  const meta = FILE_TYPE_META[draft.fileType];

  return (
    <View style={styles.root}>
      {/* Add button */}
      {isOwner && (
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>Add Portfolio Item</Text>
        </TouchableOpacity>
      )}

      {/* ── Featured strip ──────────────────────────────────── */}
      {featuredItems.length > 0 && (
        <View style={styles.featuredSection}>
          <View style={styles.featuredHeader}>
            <Ionicons name="star" size={15} color="#F59E0B" />
            <Text style={styles.featuredHeaderText}>Featured Work</Text>
            {isOwner && (
              <Text style={styles.featuredHeaderSub}>
                {featuredItems.length}/{MAX_FEATURED} featured
              </Text>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredRow}
          >
            {featuredItems.map((item, idx) => {
              const fm = FILE_TYPE_META[item.file_type];
              const allIdx = items.findIndex((i) => i.id === item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.featuredCard}
                  onPress={() => navigation.navigate('PortfolioDetail', {
                    items: featuredItems,
                    initialIndex: idx,
                    ownerName,
                    ownerUserId: userId,
                  })}
                  activeOpacity={0.9}
                >
                  {/* Thumbnail */}
                  <View style={styles.featuredThumbWrap}>
                    {item.file_type === 'image' && item.thumbnail_url ? (
                      <Image source={{ uri: item.thumbnail_url }} style={styles.featuredThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.featuredThumb, styles.featuredThumbPlaceholder, { backgroundColor: fm.bg ?? Colors.primaryLight }]}>
                        <Ionicons name={fm.icon} size={28} color={fm.color} />
                      </View>
                    )}
                    {/* Star badge */}
                    <View style={styles.featuredStarBadge}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                    </View>
                    {/* Category pill */}
                    <View style={styles.featuredCategoryPill}>
                      <Text style={styles.featuredCategoryText} numberOfLines={1}>{item.category}</Text>
                    </View>
                  </View>

                  <View style={styles.featuredCardInfo}>
                    <Text style={styles.featuredCardTitle} numberOfLines={2}>{item.title}</Text>
                    {isOwner && (
                      <TouchableOpacity
                        style={styles.unfeatureBtn}
                        onPress={() => handleToggleFeatured(item)}
                        hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                      >
                        <Ionicons name="star" size={13} color="#F59E0B" />
                        <Text style={styles.unfeatureBtnText}>Unfeature</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Category filter bar — only when there are items with 2+ categories */}
      {items.length > 0 && usedCategories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {/* All pill */}
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === null && styles.filterChipActive]}
            onPress={() => setActiveFilter(null)}
          >
            <Text style={[styles.filterChipText, activeFilter === null && styles.filterChipTextActive]}>
              All
            </Text>
            <View style={[styles.filterCount, activeFilter === null && styles.filterCountActive]}>
              <Text style={[styles.filterCountText, activeFilter === null && styles.filterCountTextActive]}>
                {items.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* One chip per used category */}
          {usedCategories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            const isActive = activeFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(isActive ? null : cat)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{cat}</Text>
                <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Empty state — no items at all */}
      {items.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="images-outline" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {isOwner ? 'Showcase your work' : 'No portfolio items yet'}
          </Text>
          <Text style={styles.emptySub}>
            {isOwner
              ? 'Upload images, videos, or PDFs to show clients what you can do.'
              : "This worker hasn't added portfolio items yet."}
          </Text>
        </View>
      )}

      {/* Empty state — items exist but none match active filter */}
      {items.length > 0 && filteredItems.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="filter-outline" size={32} color={Colors.muted} />
          <Text style={styles.emptyTitle}>No {activeFilter} items</Text>
          <TouchableOpacity onPress={() => setActiveFilter(null)}>
            <Text style={styles.clearFilter}>Clear filter</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2-column grid */}
      {filteredItems.length > 0 && (
        <View style={styles.grid}>
          {filteredItems.map((item) => {
            const ft = FILE_TYPE_META[item.file_type];
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => navigation.navigate('PortfolioDetail', {
                  items: filteredItems,
                  initialIndex: filteredItems.findIndex((i) => i.id === item.id),
                  ownerName,
                  ownerUserId: userId,
                })}
                activeOpacity={0.9}
              >
                {/* Thumbnail */}
                <View style={styles.thumbWrap}>
                  {item.thumbnail_url && item.file_type === 'image' ? (
                    <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name={ft.icon} size={30} color={ft.color} />
                    </View>
                  )}

                  {/* File type badge */}
                  <View style={[styles.typeBadge, { backgroundColor: item.file_type === 'pdf' ? '#FEE2E2' : item.file_type === 'video' ? '#EDE9FE' : Colors.primaryLight }]}>
                    <Ionicons name={ft.icon} size={11} color={ft.color} />
                    <Text style={[styles.typeBadgeText, { color: ft.color }]}>{ft.label}</Text>
                  </View>

                  {/* Category pill */}
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText} numberOfLines={1}>{item.category}</Text>
                  </View>
                </View>

                {/* Card info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.cardMeta}>
                    <Ionicons name="calendar-outline" size={11} color={Colors.muted} />
                    <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                  </View>
                </View>

                {/* Owner action buttons */}
                {isOwner && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleToggleFeatured(item)}
                    >
                      <Ionicons
                        name={item.is_featured ? 'star' : 'star-outline'}
                        size={13}
                        color={item.is_featured ? '#F59E0B' : Colors.muted}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cardActionBtn} onPress={() => openEdit(item)}>
                      <Ionicons name="pencil-outline" size={13} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={13} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}


      {/* ── Add / Edit sheet ─────────────────────────────── */}
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
            <Text style={styles.modalHeaderTitle}>
              {editing ? 'Edit Item' : 'Add Portfolio Item'}
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
            {/* ── File upload area ── */}
            <View style={styles.uploadSection}>
              <Text style={styles.fieldLabel}>File *</Text>

              {/* Current file preview */}
              {filePreviewUri ? (
                <View style={styles.filePreviewWrap}>
                  {draft.fileType === 'image' ? (
                    <Image source={{ uri: filePreviewUri }} style={styles.filePreviewImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.filePreviewPlaceholder, { backgroundColor: draft.fileType === 'pdf' ? '#FEF2F2' : '#F5F3FF' }]}>
                      <Ionicons name={meta.icon} size={40} color={meta.color} />
                      <Text style={[styles.filePreviewLabel, { color: meta.color }]}>
                        {draft.file?.name ?? meta.label}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.filePreviewChange} onPress={() => setDraft((d) => ({ ...d, file: null, existingUrl: null }))}>
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadBtns}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePickFile('media')} activeOpacity={0.85}>
                    <View style={[styles.uploadBtnIcon, { backgroundColor: Colors.primaryLight }]}>
                      <Ionicons name="images-outline" size={22} color={Colors.primary} />
                    </View>
                    <Text style={styles.uploadBtnLabel}>Image / Video</Text>
                    <Text style={styles.uploadBtnSub}>JPG, PNG, MP4</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePickFile('pdf')} activeOpacity={0.85}>
                    <View style={[styles.uploadBtnIcon, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="document-text-outline" size={22} color="#EF4444" />
                    </View>
                    <Text style={styles.uploadBtnLabel}>PDF</Text>
                    <Text style={styles.uploadBtnSub}>Certificates, docs</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── Title ── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={draft.title}
                onChangeText={(t) => setDraft((d) => ({ ...d, title: t }))}
                placeholder="e.g. TikTok Video Edit for Brand"
                placeholderTextColor={Colors.muted}
                returnKeyType="next"
                maxLength={80}
              />
              <Text style={styles.charCount}>{draft.title.length}/80</Text>
            </View>

            {/* ── Category ── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, draft.category === cat && styles.catChipActive]}
                    onPress={() => setDraft((d) => ({ ...d, category: cat }))}
                  >
                    <Text style={[styles.catChipText, draft.category === cat && styles.catChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ── Description ── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={draft.description}
                onChangeText={(t) => setDraft((d) => ({ ...d, description: t }))}
                placeholder="Describe what you did, tools used, the outcome…"
                placeholderTextColor={Colors.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{draft.description.length}/500</Text>
            </View>

            {/* Editing: delete option */}
            {editing && (
              <TouchableOpacity style={styles.deleteOption} onPress={() => { closeSheet(); handleDelete(editing); }}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.deleteOptionText}>Remove this item</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.primaryLight,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Featured strip
  featuredSection: { gap: 12 },
  featuredHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredHeaderText: { fontSize: 14, fontWeight: '800', color: Colors.text, flex: 1 },
  featuredHeaderSub: { fontSize: 12, color: Colors.muted },
  featuredRow: { gap: 10, paddingBottom: 2 },
  featuredCard: {
    width: 180,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...Shadow.sm,
  },
  featuredThumbWrap: { width: '100%', height: 120, position: 'relative' },
  featuredThumb: { width: '100%', height: '100%' },
  featuredThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  featuredStarBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  featuredCategoryPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    maxWidth: 160,
  },
  featuredCategoryText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  featuredCardInfo: { padding: 10, gap: 6 },
  featuredCardTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, lineHeight: 18 },
  unfeatureBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unfeatureBtnText: { fontSize: 11, fontWeight: '600', color: '#92400E' },

  // Filter bar
  filterRow: { gap: 8, paddingBottom: 2 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  filterChipTextActive: { color: '#fff' },
  filterCount: {
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 11, fontWeight: '700', color: Colors.muted },
  filterCountTextActive: { color: '#fff' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.lg },
  clearFilter: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: ITEM_W,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  thumbWrap: { width: '100%', height: ITEM_W * 0.75, position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  typeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  categoryPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    maxWidth: ITEM_W - 16,
  },
  categoryPillText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  cardInfo: { padding: 10, gap: 4 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDate: { fontSize: 11, color: Colors.muted },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cardActionBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Shared modal chrome
  modalRoot: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 15, fontWeight: '700', color: Colors.text,
    textAlign: 'center', marginHorizontal: 8,
  },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  // Add/Edit sheet
  sheetContent: { padding: Spacing.lg, gap: 22, paddingBottom: 60 },

  uploadSection: { gap: 10 },
  uploadBtns: { flexDirection: 'row', gap: 10 },
  uploadBtn: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: 20,
  },
  uploadBtnIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  uploadBtnSub: { fontSize: 11, color: Colors.muted },

  filePreviewWrap: { borderRadius: Radius.lg, overflow: 'hidden', position: 'relative' },
  filePreviewImage: { width: '100%', height: 200, borderRadius: Radius.lg },
  filePreviewPlaceholder: {
    width: '100%', height: 140, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  filePreviewLabel: { fontSize: 13, fontWeight: '600' },
  filePreviewChange: { position: 'absolute', top: 8, right: 8 },

  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional: { fontWeight: '400', color: Colors.muted, textTransform: 'none', fontSize: 12 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontSize: 15, color: Colors.text,
  },
  textArea: { minHeight: 100, paddingTop: 13 },
  charCount: { fontSize: 11, color: Colors.muted, textAlign: 'right' },

  categoryRow: { gap: 8, paddingBottom: 2 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  catChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  catChipText: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  catChipTextActive: { color: Colors.primary },

  deleteOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginTop: Spacing.sm,
  },
  deleteOptionText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
