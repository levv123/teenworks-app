/**
 * My Services — everything the user offers, with the pause/activate switch and
 * a shortcut to post another one.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, S, TABULAR } from '../../design/tokens';
import { CATEGORY_BY_ID } from '../../data/mock';
import type { Service } from '../../data/types';
import type { Nav } from '../../navigation/routes';
import { useApp } from '../../store/AppStore';
import { formatRate } from '../../utils/format';
import {
  AppText,
  Card,
  Divider,
  EmptyState,
  IconButton,
  Pill,
  Screen,
  ScreenHeader,
  SecondaryButton,
} from '../../ui';

/** "128 views · 4 requests" — keeps the singular case from reading "1 views". */
function statLine(service: Service): string {
  const views = Math.max(0, Math.round(service.views));
  const requests = Math.max(0, Math.round(service.requests));
  return `${views} ${views === 1 ? 'view' : 'views'} · ${requests} ${
    requests === 1 ? 'request' : 'requests'
  }`;
}

export function MyServicesScreen() {
  const nav = useNavigation<Nav>();
  const { services, toggleServiceActive, showToast } = useApp();

  const toggle = (service: Service) => {
    toggleServiceActive(service.id);
    showToast(service.active ? 'Service paused' : 'Service active');
  };

  return (
    <Screen
      header={
        <ScreenHeader
          title="My Services"
          onBack={() => nav.goBack()}
          right={
            <IconButton
              icon="add"
              accessibilityLabel="Post a service"
              variant="surface"
              onPress={() => nav.navigate('PostService')}
            />
          }
        />
      }
    >
      {services.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="No services yet"
          message="Post what you are good at and let people nearby come to you."
          actionLabel="Post a Service"
          onAction={() => nav.navigate('PostService')}
        />
      ) : (
        services.map((service, index) => (
          <Card key={service.id} style={index > 0 ? styles.cardGap : undefined}>
            <View style={styles.titleRow}>
              <AppText variant="h3" style={styles.title} numberOfLines={2}>
                {service.title}
              </AppText>
              <AppText variant="h3" style={styles.rate}>
                {formatRate(service.rate, service.rateType)}
              </AppText>
            </View>

            <Pill
              label={CATEGORY_BY_ID[service.category].label}
              style={styles.category}
            />

            <AppText
              variant="small"
              color={C.textMuted}
              numberOfLines={2}
              style={styles.description}
            >
              {service.description}
            </AppText>

            <View style={styles.days}>
              {service.availability.map((day) => (
                <Pill key={day} label={day} style={styles.day} />
              ))}
            </View>

            <AppText variant="tiny" color={C.textSubtle} style={styles.stats}>
              {statLine(service)}
            </AppText>

            <Divider style={styles.divider} />

            <View style={styles.footer}>
              <View style={styles.actions}>
                <SecondaryButton
                  label="Edit"
                  icon="create-outline"
                  size="sm"
                  onPress={() => nav.navigate('PostService', { serviceId: service.id })}
                  style={styles.action}
                />
                <SecondaryButton
                  label={service.active ? 'Pause' : 'Activate'}
                  icon={service.active ? 'pause' : 'play'}
                  size="sm"
                  onPress={() => toggle(service)}
                />
              </View>
              <Pill
                label={service.active ? 'Active' : 'Paused'}
                tone={service.active ? 'success' : 'neutral'}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardGap: {
    marginTop: S.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  rate: {
    ...TABULAR,
    marginLeft: S.md,
  },
  category: {
    marginTop: S.sm + 2,
  },
  description: {
    marginTop: S.sm + 2,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: S.md,
  },
  day: {
    marginRight: S.sm - 2,
    marginBottom: S.sm - 2,
  },
  stats: {
    marginTop: S.sm - 2,
  },
  divider: {
    marginVertical: S.base,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    marginRight: S.sm,
  },
});
