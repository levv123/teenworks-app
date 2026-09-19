/** Black full-bleed screen container: safe-area top, optional scroll, header and pinned footer. */
import React, { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, GUTTER, S } from '../design/tokens';

export interface ScreenProps {
  children?: ReactNode;
  /** Wrap the children in a ScrollView. */
  scroll?: boolean;
  /** Apply the 20px horizontal gutter to header, content and footer. */
  padded?: boolean;
  /** Rendered above the scroll area so it stays put while the content moves. */
  header?: ReactNode;
  /** Pinned to the bottom, above the safe-area inset. */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  header,
  footer,
  contentStyle,
  style,
  refreshing,
  onRefresh,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const gutter = padded ? GUTTER : 0;
  const contentPadding: ViewStyle = {
    paddingHorizontal: gutter,
    // The tab bar is a sibling below the scene, not an overlay, so the scene
    // height already excludes it — adding it here would double-count.
    paddingBottom: S.xxl,
  };

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[contentPadding, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={C.text}
            colors={[C.text]}
            progressBackgroundColor={C.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentPadding, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }, style]}>
      {header ? <View style={{ paddingHorizontal: gutter }}>{header}</View> : null}
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingHorizontal: gutter, paddingBottom: insets.bottom + S.md },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  footer: {
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: S.md,
  },
});
