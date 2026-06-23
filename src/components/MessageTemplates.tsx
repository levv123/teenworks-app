import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../utils/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CLIENT_TEMPLATES = [
  "Can you complete this by Friday?",
  "I'd like to move forward with your proposal.",
  "Can you make the following revisions?",
  "Could you provide an update on the progress?",
  "This looks great — I'm happy with the work so far.",
  "I have a few changes I'd like to discuss.",
  "When do you expect to have this ready?",
  "Please let me know if you need any additional information.",
];

const WORKER_TEMPLATES = [
  "I've completed the first draft — please review when you get a chance.",
  "The project is ready for your review.",
  "I have a question regarding the requirements.",
  "I'm currently working on this and will update you shortly.",
  "I've made the requested revisions — please take a look.",
  "Could you clarify the details on this part of the job?",
  "Everything is on track and I'm on schedule.",
  "I'm ready to begin — just let me know when to start.",
];

interface Props {
  isClient: boolean;
  onSelect: (text: string) => void;
}

export function MessageTemplates({ isClient, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const templates = isClient ? CLIENT_TEMPLATES : WORKER_TEMPLATES;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.wrapper}>
      {/* Toggle row */}
      <TouchableOpacity style={styles.toggleRow} onPress={toggle} activeOpacity={0.7}>
        <Ionicons name="sparkles-outline" size={14} color={Colors.primary} />
        <Text style={styles.toggleText}>Message templates</Text>
        <Ionicons
          name={open ? 'chevron-down' : 'chevron-forward'}
          size={14}
          color={Colors.muted}
          style={styles.chevron}
        />
      </TouchableOpacity>

      {/* Template chips */}
      {open && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {templates.map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.chip}
              onPress={() => { onSelect(t); setOpen(false); }}
              activeOpacity={0.75}
            >
              <Text style={styles.chipText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  chevron: { marginLeft: 'auto' },
  chipRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 260,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  chipText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
});
