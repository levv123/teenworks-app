import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ActionSheetIOS,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Deliverable, DeliverableFileType, DeliverableStatus } from '../types';
import { Colors, Spacing, Radius, Shadow } from '../utils/colors';
import {
  getDeliverables,
  uploadDeliverable,
  updateDeliverableStatus,
  deleteDeliverable,
  pickDocument,
  pickImageOrVideo,
  formatFileSize,
} from '../api/deliverables';
import { timeAgo } from '../utils/helpers';

interface Props {
  bookingId: string;
  userId: string;
  isClient: boolean;
}

// ── Visual helpers ─────────────────────────────────────────────

const FILE_ICONS: Record<DeliverableFileType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  image:    { icon: 'image-outline',       color: '#6C47FF' },
  video:    { icon: 'videocam-outline',    color: '#EC4899' },
  pdf:      { icon: 'document-text-outline', color: '#EF4444' },
  document: { icon: 'document-outline',   color: '#3B82F6' },
  zip:      { icon: 'archive-outline',     color: '#F59E0B' },
  other:    { icon: 'attach-outline',      color: '#8E8EA0' },
};

const STATUS_META: Record<DeliverableStatus, { label: string; color: string; bg: string }> = {
  submitted:          { label: 'Submitted',         color: Colors.info,    bg: Colors.infoLight },
  under_review:       { label: 'Under Review',      color: Colors.warning, bg: Colors.warningLight },
  approved:           { label: 'Approved',           color: Colors.success, bg: Colors.successLight },
  revision_requested: { label: 'Revision Needed',   color: Colors.error,   bg: Colors.errorLight },
};

// ── Component ─────────────────────────────────────────────────

export function DeliverablesTab({ bookingId, userId, isClient }: Props) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getDeliverables(bookingId);
      setDeliverables(data);
    } catch (err) {
      console.error('Deliverables load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Photo or Video', 'Document / PDF / ZIP'],
          cancelButtonIndex: 0,
        },
        async (idx) => {
          if (idx === 1) await doUpload('media');
          if (idx === 2) await doUpload('document');
        },
      );
    } else {
      Alert.alert('Upload File', 'Choose file type', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Photo or Video', onPress: () => doUpload('media') },
        { text: 'Document / PDF / ZIP', onPress: () => doUpload('document') },
      ]);
    }
  };

  const doUpload = async (mode: 'media' | 'document') => {
    const picked = mode === 'media' ? await pickImageOrVideo() : await pickDocument();
    if (!picked) return;
    setUploading(true);
    try {
      const uploaded = await uploadDeliverable(picked, bookingId, userId);
      setDeliverables((prev) => [uploaded, ...prev]);
    } catch (err) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (item: Deliverable, status: DeliverableStatus) => {
    setActionLoading(item.id);
    try {
      const updated = await updateDeliverableStatus(item.id, status);
      setDeliverables((prev) => prev.map((d) => (d.id === item.id ? updated : d)));
    } catch (err) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (item: Deliverable) => {
    Alert.alert('Delete File', `Remove "${item.file_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(item.id);
          try {
            await deleteDeliverable(item.id, item.file_url);
            setDeliverables((prev) => prev.filter((d) => d.id !== item.id));
          } catch (err) {
            Alert.alert('Error', 'Failed to delete file');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const isOwner = (item: Deliverable) => item.uploader_id === userId;

  // Stats
  const approved = deliverables.filter((d) => d.status === 'approved').length;
  const total = deliverables.length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Deliverables</Text>
          {total > 0 && (
            <Text style={styles.subheading}>{approved}/{total} approved</Text>
          )}
        </View>
        {/* Only the provider (worker) can upload */}
        {!isClient && (
          <TouchableOpacity
            style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            )}
            <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : 'Upload File'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      {total > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(approved / total) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{Math.round((approved / total) * 100)}% approved</Text>
        </View>
      )}

      {/* Empty state */}
      {total === 0 && (
        <View style={styles.empty}>
          <Ionicons name="cloud-upload-outline" size={48} color={Colors.muted} />
          <Text style={styles.emptyTitle}>No files yet</Text>
          <Text style={styles.emptySub}>
            {isClient
              ? 'The worker will upload deliverables here once work begins.'
              : 'Upload your work files here so the client can review them.'}
          </Text>
          {!isClient && (
            <TouchableOpacity style={styles.emptyUploadBtn} onPress={handleUpload} disabled={uploading}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.emptyUploadText}>Upload First File</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* File list */}
      {deliverables.map((item) => {
        const { icon, color } = FILE_ICONS[item.file_type];
        const statusMeta = STATUS_META[item.status];
        const isActioning = actionLoading === item.id;

        return (
          <View key={item.id} style={styles.card}>
            {/* File header */}
            <View style={styles.cardTop}>
              {/* Thumbnail for images */}
              {item.file_type === 'image' ? (
                <Image source={{ uri: item.file_url }} style={styles.thumbnail} resizeMode="cover" />
              ) : (
                <View style={[styles.fileIcon, { backgroundColor: color + '18' }]}>
                  <Ionicons name={icon} size={24} color={color} />
                </View>
              )}

              <View style={styles.cardMeta}>
                <Text style={styles.fileName} numberOfLines={2}>{item.file_name}</Text>
                <View style={styles.cardMetaRow}>
                  {item.file_size && (
                    <Text style={styles.fileSize}>{formatFileSize(item.file_size)}</Text>
                  )}
                  <Text style={styles.fileTime}>{timeAgo(item.created_at)}</Text>
                </View>
                <Text style={styles.uploaderName}>
                  by {item.uploader?.full_name ?? 'Unknown'}
                </Text>
              </View>

              {/* Status badge */}
              <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
              {/* Client review actions */}
              {isClient && item.status === 'submitted' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnApprove]}
                    onPress={() => handleStatusChange(item, 'approved')}
                    disabled={isActioning}
                  >
                    {isActioning ? (
                      <ActivityIndicator size="small" color={Colors.success} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={15} color={Colors.success} />
                        <Text style={[styles.actionBtnText, { color: Colors.success }]}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnRevise]}
                    onPress={() => handleStatusChange(item, 'revision_requested')}
                    disabled={isActioning}
                  >
                    <Ionicons name="refresh-outline" size={15} color={Colors.error} />
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>Request Revision</Text>
                  </TouchableOpacity>
                </>
              )}

              {isClient && item.status === 'under_review' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnApprove]}
                  onPress={() => handleStatusChange(item, 'approved')}
                  disabled={isActioning}
                >
                  <Ionicons name="checkmark-circle-outline" size={15} color={Colors.success} />
                  <Text style={[styles.actionBtnText, { color: Colors.success }]}>Approve</Text>
                </TouchableOpacity>
              )}

              {/* Worker mark-under-review action */}
              {!isClient && item.status === 'submitted' && isOwner(item) && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.warningLight, borderColor: Colors.warning + '40' }]}
                  onPress={() => handleStatusChange(item, 'under_review')}
                  disabled={isActioning}
                >
                  <Ionicons name="eye-outline" size={15} color={Colors.warning} />
                  <Text style={[styles.actionBtnText, { color: Colors.warning }]}>Mark for Review</Text>
                </TouchableOpacity>
              )}

              {/* Delete (owner only, not approved) */}
              {isOwner(item) && item.status !== 'approved' && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                  disabled={isActioning}
                >
                  <Ionicons name="trash-outline" size={15} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>

            {/* Approved banner */}
            {item.status === 'approved' && (
              <View style={styles.approvedBanner}>
                <Ionicons name="shield-checkmark-outline" size={14} color={Colors.success} />
                <Text style={styles.approvedText}>Approved by client</Text>
              </View>
            )}

            {/* Revision needed banner */}
            {item.status === 'revision_requested' && (
              <View style={styles.revisionBanner}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
                <Text style={styles.revisionText}>Client requested a revision</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 17, fontWeight: '800', color: Colors.text },
  subheading: { fontSize: 12, color: Colors.muted, marginTop: 2 },

  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  uploadBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  progressRow: { gap: 6 },
  progressTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: Colors.success, borderRadius: 3 },
  progressLabel: { fontSize: 12, color: Colors.muted, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 18 },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  emptyUploadText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, gap: 12 },
  thumbnail: { width: 56, height: 56, borderRadius: Radius.sm, flexShrink: 0 },
  fileIcon: { width: 56, height: 56, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardMeta: { flex: 1, gap: 3 },
  fileName: { fontSize: 14, fontWeight: '700', color: Colors.text, lineHeight: 18 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileSize: { fontSize: 11, color: Colors.muted },
  fileTime: { fontSize: 11, color: Colors.muted },
  uploaderName: { fontSize: 11, color: Colors.muted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start', flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: '700' },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  actionBtnApprove: { backgroundColor: Colors.successLight, borderColor: Colors.success + '40' },
  actionBtnRevise: { backgroundColor: Colors.errorLight, borderColor: Colors.error + '40' },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },

  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.success + '30',
  },
  approvedText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  revisionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.error + '30',
  },
  revisionText: { fontSize: 12, fontWeight: '600', color: Colors.error },
});
