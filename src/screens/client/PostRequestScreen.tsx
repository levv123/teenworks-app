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
import { HomeStackParamList, Category, PostRequestFormData } from '../../types';
import { Colors, Spacing, Radius, Shadow } from '../../utils/colors';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { getCategoryIcon } from '../../components/CategoryBadge';
import { useAuth } from '../../hooks/useAuth';
import { createRequest } from '../../api/requests';

type Props = NativeStackScreenProps<HomeStackParamList, 'PostRequest'>;

const STEP_COUNT = 4;

const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Cleaning', icon: 'sparkles', description: null, color: '#6C47FF', created_at: '' },
  { id: 'c2', name: 'Plumbing', icon: 'water', description: null, color: '#3B82F6', created_at: '' },
  { id: 'c3', name: 'Electrical', icon: 'flash', description: null, color: '#F59E0B', created_at: '' },
  { id: 'c4', name: 'Moving', icon: 'cube', description: null, color: '#10B981', created_at: '' },
  { id: 'c5', name: 'Handyman', icon: 'hammer', description: null, color: '#FF6B35', created_at: '' },
  { id: 'c6', name: 'Delivery', icon: 'bicycle', description: null, color: '#EC4899', created_at: '' },
  { id: 'c7', name: 'Tutoring', icon: 'book', description: null, color: '#8B5CF6', created_at: '' },
  { id: 'c8', name: 'Pet Care', icon: 'paw', description: null, color: '#14B8A6', created_at: '' },
];

export function PostRequestScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(route.params?.categoryId ? 1 : 0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<PostRequestFormData>({
    categoryId: route.params?.categoryId ?? '',
    title: '',
    description: '',
    budget: '',
    address: '',
    location_lat: null,
    location_lng: null,
    scheduled_at: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCategory = MOCK_CATEGORIES.find((c) => c.id === form.categoryId);

  const updateForm = (key: keyof PostRequestFormData, value: PostRequestFormData[typeof key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0 && !form.categoryId) e.categoryId = 'Please select a category';
    if (step === 1) {
      if (!form.title.trim()) e.title = 'Title is required';
      if (!form.description.trim()) e.description = 'Please describe what you need';
    }
    if (step === 2 && !form.address.trim()) e.address = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    if (step < STEP_COUNT - 1) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const req = await createRequest(user.id, form);
      navigation.replace('RequestDetail', { requestId: req.id });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to post request');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['Choose category', 'Describe your need', 'Location & schedule', 'Review & post'];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : setStep(step - 1)}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{stepTitles[step]}</Text>
            <Text style={styles.stepCounter}>Step {step + 1} of {STEP_COUNT}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color={Colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: `${((step + 1) / STEP_COUNT) * 100}%` }]} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Step 0: Category */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepSubtitle}>What type of service do you need?</Text>
              <View style={styles.categoriesGrid}>
                {MOCK_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catCard,
                      { borderColor: form.categoryId === cat.id ? cat.color : Colors.border },
                      form.categoryId === cat.id && { backgroundColor: cat.color + '10' },
                    ]}
                    onPress={() => updateForm('categoryId', cat.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                      <Ionicons name={getCategoryIcon(cat.icon)} size={24} color={cat.color} />
                    </View>
                    <Text style={[styles.catName, form.categoryId === cat.id && { color: cat.color }]}>
                      {cat.name}
                    </Text>
                    {form.categoryId === cat.id && (
                      <View style={[styles.catCheck, { backgroundColor: cat.color }]}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {errors.categoryId && <Text style={styles.error}>{errors.categoryId}</Text>}
            </View>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepSubtitle}>Tell providers what you need</Text>
              <Input
                label="Request title"
                value={form.title}
                onChangeText={(v) => updateForm('title', v)}
                placeholder="e.g. Deep cleaning for 2-bed apartment"
                leftIcon="create-outline"
                error={errors.title}
              />
              <Input
                label="Description"
                value={form.description}
                onChangeText={(v) => updateForm('description', v)}
                placeholder="Describe in detail what you need, any special requirements..."
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                leftIcon="document-text-outline"
                error={errors.description}
                style={{ height: 120, paddingTop: 12 }}
              />
              <Input
                label="Budget (optional)"
                value={form.budget}
                onChangeText={(v) => updateForm('budget', v)}
                placeholder="e.g. 80"
                keyboardType="decimal-pad"
                leftIcon="cash-outline"
                hint="Leave blank if you'd like providers to suggest a price"
              />
            </View>
          )}

          {/* Step 2: Location & Schedule */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepSubtitle}>Where and when do you need help?</Text>
              <Input
                label="Address"
                value={form.address}
                onChangeText={(v) => updateForm('address', v)}
                placeholder="123 Main St, New York, NY"
                leftIcon="location-outline"
                error={errors.address}
              />

              {/* Use current location button */}
              <TouchableOpacity style={styles.locationBtn}>
                <Ionicons name="locate-outline" size={18} color={Colors.primary} />
                <Text style={styles.locationBtnText}>Use my current location</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>When do you need this?</Text>
              <View style={styles.scheduleOptions}>
                {['ASAP', 'Today', 'Tomorrow', 'This week', 'Flexible'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.scheduleChip, form.scheduled_at === null && opt === 'ASAP' && styles.scheduleChipActive]}
                  >
                    <Text style={[styles.scheduleChipText, form.scheduled_at === null && opt === 'ASAP' && styles.scheduleChipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepSubtitle}>Review your request before posting</Text>

              <View style={styles.reviewCard}>
                {selectedCategory && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Category</Text>
                    <View style={styles.reviewCatBadge}>
                      <Ionicons name={getCategoryIcon(selectedCategory.icon)} size={14} color={selectedCategory.color} />
                      <Text style={[styles.reviewCatText, { color: selectedCategory.color }]}>{selectedCategory.name}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Title</Text>
                  <Text style={styles.reviewValue}>{form.title}</Text>
                </View>
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRowStack}>
                  <Text style={styles.reviewLabel}>Description</Text>
                  <Text style={styles.reviewValue}>{form.description}</Text>
                </View>
                {form.budget ? (
                  <>
                    <View style={styles.reviewDivider} />
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Budget</Text>
                      <Text style={styles.reviewValueGreen}>${form.budget}</Text>
                    </View>
                  </>
                ) : null}
                <View style={styles.reviewDivider} />
                <View style={styles.reviewRowStack}>
                  <Text style={styles.reviewLabel}>Address</Text>
                  <Text style={styles.reviewValue}>{form.address || 'Not specified'}</Text>
                </View>
              </View>

              <View style={styles.tipBox}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
                <Text style={styles.tipText}>
                  Your request will be visible to nearby providers. You'll receive offers within minutes.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom button */}
        <View style={styles.bottom}>
          {step < STEP_COUNT - 1 ? (
            <Button title="Continue" onPress={nextStep} fullWidth size="lg" />
          ) : (
            <Button title="Post Request" onPress={handleSubmit} loading={submitting} fullWidth size="lg" />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  stepCounter: { fontSize: 12, color: Colors.muted },
  progressBar: { height: 3, backgroundColor: Colors.border, marginHorizontal: 0 },
  progress: { height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  stepContent: { paddingTop: Spacing.lg, gap: Spacing.md },
  stepSubtitle: { fontSize: 15, color: Colors.muted, marginBottom: 4 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    width: '46%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    ...Shadow.sm,
    position: 'relative',
  },
  catIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  catCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  error: { color: Colors.error, fontSize: 12 },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
  },
  locationBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  scheduleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scheduleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  scheduleChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  scheduleChipText: { fontSize: 13, color: Colors.muted, fontWeight: '500' },
  scheduleChipTextActive: { color: Colors.primary },
  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  reviewRowStack: { paddingVertical: 10, gap: 4 },
  reviewDivider: { height: 1, backgroundColor: Colors.border },
  reviewLabel: { fontSize: 13, color: Colors.muted, fontWeight: '500' },
  reviewValue: { fontSize: 14, color: Colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  reviewValueGreen: { fontSize: 15, color: Colors.success, fontWeight: '700' },
  reviewCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewCatText: { fontSize: 13, fontWeight: '600' },
  tipBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.infoLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 18 },
  bottom: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: 12, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});
