import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../types';
import { Button } from '../../components/Button';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useLocation } from '../../hooks/useLocation';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile } from '../../api/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const { location, address, loading: locLoading, requestPermission } = useLocation();
  const [locationGranted, setLocationGranted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLocationPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      setLocationGranted(true);
    } else {
      Alert.alert(
        'Location Access',
        'Location helps us find nearby providers. You can enable it later in Settings.',
      );
    }
  };

  const handleContinue = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (location && user.id) {
        await updateProfile(user.id, {
          location_lat: location.latitude,
          location_lng: location.longitude,
        });
      }
      await refreshUser();
    } catch (err) {
      console.error('Onboarding error:', err);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      icon: 'location' as const,
      color: Colors.primary,
      bg: Colors.primaryLight,
      title: 'Your location',
      desc: 'Allow location access to see nearby providers and get accurate matches.',
      actionLabel: locationGranted ? 'Location enabled ✓' : 'Enable Location',
      done: locationGranted,
      onAction: handleLocationPermission,
    },
    {
      icon: 'notifications' as const,
      color: Colors.secondary,
      bg: Colors.secondaryLight,
      title: 'Stay notified',
      desc: 'Get instant alerts when providers respond to your requests.',
      actionLabel: 'Enable Notifications',
      done: false,
      onAction: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ionicons name="flash" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Almost there!</Text>
          <Text style={styles.subtitle}>
            Set up a few permissions to get the most out of LastMinute
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.steps}>
          {steps.map((step, i) => (
            <View key={step.title} style={[styles.stepCard, step.done && styles.stepCardDone]}>
              <View style={styles.stepLeft}>
                <View style={[styles.stepIcon, { backgroundColor: step.bg }]}>
                  <Ionicons name={step.icon} size={24} color={step.color} />
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
              {step.done ? (
                <View style={styles.doneBadge}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: step.bg }]}
                  onPress={step.onAction}
                >
                  <Text style={[styles.stepBtnText, { color: step.color }]}>
                    Enable
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Profile completion hint */}
        <View style={styles.profileHint}>
          <Ionicons name="person-circle-outline" size={32} color={Colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hintTitle}>Complete your profile</Text>
            <Text style={styles.hintDesc}>Add a photo and phone number to build trust with providers</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </View>

        <View style={styles.bottom}>
          <Button
            title="Get Started"
            onPress={handleContinue}
            loading={saving}
            fullWidth
            size="lg"
          />
          <TouchableOpacity onPress={handleContinue}>
            <Text style={styles.skip}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: { alignItems: 'center', gap: 10, marginBottom: Spacing.xl },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  steps: { gap: Spacing.md, marginBottom: Spacing.lg },
  stepCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepCardDone: { borderColor: Colors.success, backgroundColor: Colors.successLight + '30' },
  stepLeft: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepInfo: { flex: 1, gap: 3 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  stepDesc: { fontSize: 13, color: Colors.muted, lineHeight: 18 },
  stepBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    flexShrink: 0,
  },
  stepBtnText: { fontSize: 12, fontWeight: '700' },
  doneBadge: {},
  profileHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  hintTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  hintDesc: { fontSize: 12, color: Colors.muted, lineHeight: 16 },
  bottom: { gap: 12, marginTop: 'auto', paddingBottom: Spacing.lg },
  skip: { textAlign: 'center', color: Colors.muted, fontSize: 14, fontWeight: '500' },
});
