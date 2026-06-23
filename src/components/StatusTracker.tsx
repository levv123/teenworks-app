import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../utils/colors';

interface Step {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface StatusTrackerProps {
  steps: Step[];
  currentStep: number; // 0-based index
}

export function StatusTracker({ steps, currentStep }: StatusTrackerProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.label}>
            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.circle,
                  isDone && styles.circleDone,
                  isActive && styles.circleActive,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Ionicons
                    name={step.icon}
                    size={14}
                    color={isActive ? '#fff' : Colors.muted}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  isDone && styles.labelDone,
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {!isLast && (
              <View style={[styles.line, isDone && styles.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  stepWrapper: {
    alignItems: 'center',
    gap: 6,
    minWidth: 60,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: Colors.success },
  circleActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 10, color: Colors.muted, textAlign: 'center', fontWeight: '500' },
  labelDone: { color: Colors.success },
  labelActive: { color: Colors.primary, fontWeight: '700' },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: 15,
    marginHorizontal: -4,
  },
  lineDone: { backgroundColor: Colors.success },
});
