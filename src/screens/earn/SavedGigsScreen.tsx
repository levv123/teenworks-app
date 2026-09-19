/**
 * Saved Gigs (spec 6) — the bookmark list. Each row keeps its save button so a
 * second tap unsaves it and the row leaves the list on the spot.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { S } from '../../design/tokens';
import type { Nav } from '../../navigation/routes';
import { useSavedGigs } from '../../store/AppStore';
import { EmptyState, Screen, ScreenHeader } from '../../ui';
import { GigCard } from '../../features/gigs';

export function SavedGigsScreen() {
  const nav = useNavigation<Nav>();
  const gigs = useSavedGigs();

  return (
    <Screen header={<ScreenHeader title="Saved Gigs" onBack={() => nav.goBack()} />}>
      {gigs.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="Nothing saved yet"
          message="Tap the bookmark on any gig to keep it here for later."
          actionLabel="Browse gigs"
          onAction={() => nav.navigate('Gigs')}
        />
      ) : (
        gigs.map((gig, index) => (
          <View key={gig.id} style={index > 0 ? styles.rowGap : undefined}>
            <GigCard
              gig={gig}
              onPress={() => nav.navigate('GigDetail', { gigId: gig.id })}
              showSaveButton
            />
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** The 18px feed rhythm from spec 3, expressed in tokens. */
  rowGap: {
    marginTop: S.base + 2,
  },
});
