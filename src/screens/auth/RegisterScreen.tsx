import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList, UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const roles: Array<{ value: UserRole; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }> = [
  {
    value: 'client',
    label: 'I need help',
    desc: 'Find providers for any task',
    icon: 'search-outline',
  },
  {
    value: 'provider',
    label: 'I provide services',
    desc: 'Earn money with your skills',
    icon: 'briefcase-outline',
  },
];

export function RegisterScreen({ navigation }: Props) {
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'At least 8 characters required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register({ fullName: name.trim(), email: email.trim(), password, role });
      navigation.navigate('Onboarding');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      Alert.alert('Registration Failed', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join thousands of people using LastMinute</Text>
          </View>

          {/* Role picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>I am joining as...</Text>
            <View style={styles.roleRow}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.roleCard, role === r.value && styles.roleCardActive]}
                  onPress={() => setRole(r.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.roleIcon, role === r.value && styles.roleIconActive]}>
                    <Ionicons
                      name={r.icon}
                      size={22}
                      color={role === r.value ? '#fff' : Colors.primary}
                    />
                  </View>
                  <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>
                    {r.label}
                  </Text>
                  <Text style={[styles.roleDesc, role === r.value && styles.roleDescActive]}>
                    {r.desc}
                  </Text>
                  {role === r.value && (
                    <View style={styles.roleCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              leftIcon="person-outline"
              placeholder="Your full name"
              error={errors.name}
            />
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              placeholder="you@example.com"
              error={errors.email}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon="lock-closed-outline"
              placeholder="Min. 8 characters"
              error={errors.password}
              hint="Use a strong password with letters, numbers, and symbols"
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.submitBtn}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.terms}>
            By creating an account you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  back: { marginTop: Spacing.md, marginBottom: Spacing.sm, width: 40, height: 40, justifyContent: 'center' },
  header: { marginBottom: Spacing.lg, gap: 6 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: Colors.muted },
  section: { marginBottom: Spacing.lg, gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  roleRow: { flexDirection: 'row', gap: Spacing.md },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadow.sm,
    position: 'relative',
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  roleIconActive: { backgroundColor: Colors.primary },
  roleLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  roleLabelActive: { color: Colors.primary },
  roleDesc: { fontSize: 12, color: Colors.muted, lineHeight: 16 },
  roleDescActive: { color: Colors.primary + 'AA' },
  roleCheck: { position: 'absolute', top: 8, right: 8 },
  form: { gap: Spacing.md },
  submitBtn: { marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { fontSize: 14, color: Colors.muted },
  footerLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  terms: { fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: Spacing.md, lineHeight: 16 },
  termsLink: { color: Colors.primary },
});
