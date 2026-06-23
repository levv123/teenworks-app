import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Shadow, Spacing } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';
import {
  createServiceRequest,
  uploadRequestAttachment,
} from '../../api/requests';
import { ServicesStackParamList } from '../../types';

type Props = NativeStackScreenProps<ServicesStackParamList, 'RequestService'>;

const MAX_ATTACHMENTS = 3;

const DEADLINE_PRESETS = [
  { label: 'ASAP',    days: 0  },
  { label: '1 week',  days: 7  },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

function daysFromNow(days: number): string {
  if (days === 0) return new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function RequestServiceScreen({ route, navigation }: Props) {
  const { service } = route.params;
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(String(service.starting_price));
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null); // index into DEADLINE_PRESETS
  const [attachmentUris, setAttachmentUris] = useState<string[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const deadlineDate = selectedPreset !== null
    ? daysFromNow(DEADLINE_PRESETS[selectedPreset].days)
    : null;

  const isValid = description.trim().length > 0 && Number(budget) > 0;

  const handlePickAttachment = async () => {
    if (attachmentUris.length >= MAX_ATTACHMENTS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setAttachmentUris((prev) => [...prev, result.assets[0].uri]);
  };

  const removeAttachment = (idx: number) => {
    setAttachmentUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user?.id || !isValid) return;
    setSubmitting(true);
    try {
      // Upload attachments first
      setUploadingAttachment(true);
      const uploadedUrls: string[] = [];
      for (const uri of attachmentUris) {
        const url = await uploadRequestAttachment(uri, user.id);
        uploadedUrls.push(url);
      }
      setUploadingAttachment(false);

      const req = await createServiceRequest(
        user.id,
        service,
        { description: description.trim(), budget, deadlineDate, attachmentUris: [] },
        uploadedUrls,
      );

      Alert.alert(
        'Request Sent! ✓',
        `Your request has been sent to the worker. They'll respond within 24 hours.`,
        [
          {
            text: 'View Request',
            onPress: () => navigation.navigate('Booking', { bookingId: '' }), // navigate to requests list
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch {
      Alert.alert('Error', 'Could not send request. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadingAttachment(false);
    }
  };

  const heroImage = service.images?.[0] ?? null;

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
          <Text style={styles.headerTitle}>Request Service</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Service Card ───────────────────────────────────── */}
          <View style={styles.serviceCard}>
            <View style={styles.serviceThumb}>
              {heroImage ? (
                <Image source={{ uri: heroImage }} style={styles.serviceThumbImg} />
              ) : (
                <View style={styles.serviceThumbPlaceholder}>
                  <Ionicons name="briefcase-outline" size={24} color={Colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTitle} numberOfLines={2}>{service.title}</Text>
              {service.category && (
                <Text style={styles.serviceCategory}>
                  {service.category.icon} {service.category.name}
                </Text>
              )}
              <Text style={styles.servicePrice}>Starting at ${service.starting_price}</Text>
            </View>
          </View>

          {/* ── Project Description ────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Project Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder={
                "Describe your project in detail:\n• What do you need?\n• What's the context or goal?\n• Any special requirements?"
              }
              placeholderTextColor={Colors.muted}
              multiline
              numberOfLines={6}
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>
          </View>

          {/* ── Budget ────────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Your Budget <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.prefixInput}>
              <Text style={styles.prefix}>$</Text>
              <TextInput
                style={styles.prefixTextInput}
                value={budget}
                onChangeText={setBudget}
                placeholder="0"
                placeholderTextColor={Colors.muted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.prefixSuffix}>USD</Text>
            </View>
            <Text style={styles.hint}>
              Worker may counter with a custom offer if their price differs.
            </Text>
          </View>

          {/* ── Deadline ─────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>Deadline <Text style={styles.optional}>(optional)</Text></Text>
            <View style={styles.presetRow}>
              {DEADLINE_PRESETS.map((p, idx) => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.preset, selectedPreset === idx && styles.presetSelected]}
                  onPress={() => setSelectedPreset(selectedPreset === idx ? null : idx)}
                >
                  <Text style={[styles.presetText, selectedPreset === idx && styles.presetTextSelected]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {deadlineDate && (
              <View style={styles.deadlinePill}>
                <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
                <Text style={styles.deadlinePillText}>
                  Due by {new Date(deadlineDate + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
                <TouchableOpacity onPress={() => setSelectedPreset(null)}>
                  <Ionicons name="close" size={14} color={Colors.muted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Attachments ──────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>Attachments <Text style={styles.optional}>(optional)</Text></Text>
            <Text style={styles.hint}>Share mockups, references, or examples ({attachmentUris.length}/{MAX_ATTACHMENTS})</Text>
            <View style={styles.attachRow}>
              {attachmentUris.map((uri, idx) => (
                <View key={idx} style={styles.attachTile}>
                  <Image source={{ uri }} style={styles.attachImg} />
                  <TouchableOpacity style={styles.attachRemove} onPress={() => removeAttachment(idx)}>
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {attachmentUris.length < MAX_ATTACHMENTS && (
                <TouchableOpacity
                  style={styles.attachAdd}
                  onPress={handlePickAttachment}
                  disabled={uploadingAttachment}
                >
                  {uploadingAttachment ? (
                    <ActivityIndicator color={Colors.primary} size="small" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={22} color={Colors.primary} />
                      <Text style={styles.attachAddText}>Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── What happens next ─────────────────────────────── */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <View style={styles.infoSteps}>
              <InfoStep num={1} text="Worker reviews your request and responds within 24 hours" />
              <InfoStep num={2} text="They can accept, decline, or send a custom offer" />
              <InfoStep num={3} text="You confirm and work begins — no payment until you approve" />
            </View>
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>

        {/* ── Submit button ─────────────────────────────────── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.card} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color={Colors.card} />
                <Text style={styles.submitBtnText}>Send Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoStep({ num, text }: { num: number; text: string }) {
  return (
    <View style={styles.infoStep}>
      <View style={styles.infoStepNum}>
        <Text style={styles.infoStepNumText}>{num}</Text>
      </View>
      <Text style={styles.infoStepText}>{text}</Text>
    </View>
  );
}

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
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  content: { padding: Spacing.md, gap: Spacing.lg },

  // Service card
  serviceCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadow.sm,
  },
  serviceThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  serviceThumbImg: { width: '100%', height: '100%' },
  serviceThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryLight + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: { flex: 1, gap: 3 },
  serviceTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, lineHeight: 20 },
  serviceCategory: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  servicePrice: { fontSize: 12, color: Colors.muted },

  // Fields
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.text },
  required: { color: Colors.error },
  optional: { fontSize: 12, fontWeight: '400', color: Colors.muted },
  hint: { fontSize: 12, color: Colors.muted, lineHeight: 17 },
  charCount: { fontSize: 11, color: Colors.muted, textAlign: 'right' },

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
  multiline: { minHeight: 140, paddingTop: Spacing.sm + 2 },

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
  prefixTextInput: { flex: 1, paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.xs, fontSize: 15, color: Colors.text },
  prefixSuffix: { fontSize: 12, color: Colors.muted, paddingRight: Spacing.md, fontWeight: '500' },

  presetRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  preset: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  presetSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  presetText: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  presetTextSelected: { color: Colors.card },
  deadlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight + '33',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  deadlinePillText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  // Attachments
  attachRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  attachTile: { width: 80, height: 80, borderRadius: Radius.md, overflow: 'visible' },
  attachImg: { width: 80, height: 80, borderRadius: Radius.md, backgroundColor: Colors.border },
  attachRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: Colors.card, borderRadius: Radius.full },
  attachAdd: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight + '11',
  },
  attachAddText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  // Info box
  infoBox: {
    backgroundColor: Colors.primaryLight + '22',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  infoSteps: { gap: Spacing.sm },
  infoStep: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  infoStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  infoStepNumText: { fontSize: 11, fontWeight: '800', color: Colors.card },
  infoStepText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  // Footer
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    ...Shadow.md,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.card },
});
