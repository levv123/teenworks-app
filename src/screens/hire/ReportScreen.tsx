/**
 * Report — flag a worker, booking or need. Reasons lead with the behaviors that
 * matter most on a marketplace connecting adults and teens (inappropriate
 * contact, pressure to move off-app, requests for personal info or photos).
 * Optionally blocks the person in the same step.
 */
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C, R, S } from '../../design/tokens';
import type { ReportReason } from '../../data/types';
import type { Nav, Route } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { errorMessage } from '../../services/marketplace';
import {
  AppText,
  ErrorBanner,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TextField,
} from '../../ui';

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'inappropriate', label: 'Inappropriate messages or behavior' },
  { id: 'off-platform', label: 'Pushed to meet or talk outside TeenWorks' },
  { id: 'personal-info', label: 'Asked for personal info or photos' },
  { id: 'unsafe-job', label: 'Unsafe, illegal or not as described' },
  { id: 'no-show', label: "Didn't show up or didn't finish" },
  { id: 'payment', label: 'Payment problem' },
  { id: 'other', label: 'Something else' },
];

export function ReportScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route<'Report'>>();
  const { submitReport, blockedWorkerIds } = useApp();

  const alreadyBlocked = params.workerId ? blockedWorkerIds.includes(params.workerId) : true;

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const needsDetails = reason === 'other' && details.trim().length < 10;
  const valid = reason !== null && !needsDetails;

  const submit = async () => {
    if (!valid || reason === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      await submitReport({
        targetType: params.targetType,
        targetId: params.targetId,
        reason,
        details,
        block: block && params.workerId ? params.workerId : null,
      });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const emergency = (
    <Pressable
      onPress={() => void Linking.openURL('tel:911').catch(() => undefined)}
      accessibilityRole="button"
      accessibilityLabel="In danger right now? Call 911"
      style={({ pressed }) => [styles.emergency, pressed && styles.pressed]}
    >
      <Ionicons name="call" size={18} color={C.danger} />
      <AppText variant="bodyBold" color={C.danger} style={styles.emergencyText}>
        In danger right now? Call 911
      </AppText>
    </Pressable>
  );

  if (sent) {
    return (
      <Screen
        header={<ScreenHeader title="Report" onBack={() => nav.goBack()} />}
        footer={<PrimaryButton label="Done" onPress={() => nav.goBack()} />}
      >
        <View style={styles.doneIcon}>
          <Ionicons name="shield-checkmark" size={30} color={C.onLight} />
        </View>
        <AppText variant="h1" style={styles.center}>
          Report submitted
        </AppText>
        <AppText variant="body" color={C.textMuted} style={[styles.center, styles.doneSub]}>
          {block
            ? `It's saved on this device and you've blocked them. They won't appear in your results.`
            : `It's saved on this device. You can also block them from their profile at any time.`}
        </AppText>
        {emergency}
      </Screen>
    );
  }

  return (
    <Screen
      header={<ScreenHeader title="Report" subtitle={params.name} onBack={() => nav.goBack()} />}
      footer={
        <PrimaryButton
          label={busy ? 'Sending…' : 'Submit report'}
          onPress={submit}
          loading={busy}
          disabled={!valid || busy}
        />
      }
    >
      {emergency}

      <AppText variant="h3" style={styles.section}>
        What happened?
      </AppText>
      {REASONS.map((option) => {
        const selected = reason === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => setReason(option.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [styles.reason, selected && styles.reasonOn, pressed && styles.pressed]}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selected ? C.text : C.textSubtle}
            />
            <AppText variant="body" style={styles.reasonText}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}

      <TextField
        label={reason === 'other' ? 'Details (required)' : 'Details (optional)'}
        value={details}
        onChangeText={setDetails}
        placeholder="What happened, and when?"
        multiline
        numberOfLines={4}
        maxLength={600}
        error={reason === 'other' && details.length > 0 && needsDetails ? 'Add at least 10 characters.' : undefined}
        style={styles.section}
      />

      {!alreadyBlocked ? (
        <Pressable
          onPress={() => setBlock((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: block }}
          accessibilityLabel="Also block this person"
          style={({ pressed }) => [styles.blockRow, pressed && styles.pressed]}
        >
          <Ionicons name={block ? 'checkbox' : 'square-outline'} size={22} color={block ? C.text : C.textMuted} />
          <View style={styles.blockText}>
            <AppText variant="bodyBold">Also block this person</AppText>
            <AppText variant="small" color={C.textMuted}>
              They'll be hidden from your results and you won't be able to book them.
            </AppText>
          </View>
        </Pressable>
      ) : null}

      <ErrorBanner message={error} onRetry={submit} style={styles.section} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S.md,
    paddingVertical: S.md,
    borderRadius: R.lg,
    backgroundColor: C.dangerBg,
  },
  emergencyText: {
    marginLeft: S.sm,
  },
  section: {
    marginTop: S.xl,
    marginBottom: S.sm,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S.md,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    marginBottom: S.xs,
  },
  reasonOn: {
    backgroundColor: C.surface,
  },
  reasonText: {
    flex: 1,
    marginLeft: S.md,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: S.lg,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  blockText: {
    flex: 1,
    marginLeft: S.md,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: S.huge,
    marginBottom: S.lg,
  },
  center: {
    textAlign: 'center',
  },
  doneSub: {
    marginTop: S.sm,
    marginBottom: S.xl,
  },
  pressed: {
    opacity: 0.6,
  },
});
