import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../types';
import { Button } from '../../components/Button';
import { Colors, Spacing, Radius } from '../../utils/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');

const features = [
  { icon: 'flash' as const, label: 'Instant matching', color: '#F59E0B' },
  { icon: 'location' as const, label: 'Nearby providers', color: Colors.secondary },
  { icon: 'shield-checkmark' as const, label: 'Verified pros', color: Colors.success },
];

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Hero section */}
      <View style={styles.hero}>
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Ionicons name="flash" size={36} color={Colors.primary} />
          </View>
        </View>

        <Text style={styles.headline}>Last-minute help,</Text>
        <Text style={styles.headlineAccent}>instantly.</Text>
        <Text style={styles.subtitle}>
          Connect with trusted local providers{'\n'}for any task, any time.
        </Text>

        {/* Features row */}
        <View style={styles.features}>
          {features.map((f) => (
            <View key={f.label} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '25' }]}>
                <Ionicons name={f.icon} size={18} color={f.color} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA section */}
      <View style={styles.cta}>
        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>2,400+</Text>
            <Text style={styles.statLabel}>Providers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>4.9★</Text>
            <Text style={styles.statLabel}>Avg rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>&lt;15min</Text>
            <Text style={styles.statLabel}>Response</Text>
          </View>
        </View>

        <Button
          title="Get Started"
          onPress={() => navigation.navigate('Register')}
          fullWidth
          size="lg"
          style={styles.btnPrimary}
        />
        <Button
          title="I already have an account"
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
          fullWidth
          size="lg"
        />

        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 40,
    left: -50,
  },
  circle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,107,53,0.2)',
    top: 60,
    left: 30,
  },
  logoWrap: { marginBottom: Spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  headline: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headlineAccent: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFD580',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  features: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  featureItem: { alignItems: 'center', gap: 8 },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '500', textAlign: 'center' },
  cta: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginBottom: 4,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 17, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  btnPrimary: {},
  terms: {
    fontSize: 11,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: { color: Colors.primary, fontWeight: '500' },
});
