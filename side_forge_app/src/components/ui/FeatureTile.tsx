import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { getElevationStyle, useAppTheme } from '@/theme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export interface FeatureTileItem {
  key: string;
  title: string;
  description?: string;
  Icon: LucideIcon;
  onPress: () => void;
  tone?: 'primary' | 'info' | 'success' | 'warning';
}

export function FeatureTile({
  title,
  description,
  Icon,
  onPress,
  tone = 'primary',
  style,
}: Omit<FeatureTileItem, 'key'> & { style?: ViewStyle }) {
  const { colors, radius, spacing, typography, iconSizes, mode } = useAppTheme();
  const elevationStyle = getElevationStyle(mode, 'subtle');

  const iconPalette = (() => {
    switch (tone) {
      case 'info':
        return { bg: colors.infoSoft, fg: colors.infoText };
      case 'success':
        return { bg: colors.successSoft, fg: colors.successText };
      case 'warning':
        return { bg: colors.warningSoft, fg: colors.warningText };
      case 'primary':
      default:
        return { bg: colors.primarySoft, fg: colors.primaryText };
    }
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed
            ? colors.surfaceInteractivePressed
            : colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
        elevationStyle,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: iconPalette.bg,
              borderRadius: radius.md,
            },
          ]}
        >
          <Icon size={iconSizes.md} color={iconPalette.fg} />
        </View>
        <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
      </View>

      <Text
        numberOfLines={2}
        style={{
          color: colors.textPrimary,
          fontSize: typography.fontSizes.base,
          fontWeight: typography.fontWeights.semibold,
          marginTop: spacing.sm,
          lineHeight: typography.lineHeights.sm,
        }}
      >
        {title}
      </Text>

      {description ? (
        <Text
          numberOfLines={2}
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            marginTop: 4,
            lineHeight: typography.lineHeights.xs,
          }}
        >
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function FeatureTileGrid({
  tiles,
  style,
}: {
  tiles: FeatureTileItem[];
  style?: ViewStyle;
}) {
  const { spacing } = useAppTheme();
  const { tileColumns } = useResponsiveLayout();

  if (tileColumns === 1) {
    return (
      <View style={[{ gap: spacing.sm }, style]}>
        {tiles.map(({ key, ...tileProps }) => (
          <FeatureTile key={key} {...tileProps} />
        ))}
      </View>
    );
  }

  const rows: FeatureTileItem[][] = [];
  for (let i = 0; i < tiles.length; i += 2) {
    rows.push(tiles.slice(i, i + 2));
  }

  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {rows.map((row, rowIndex) => (
        <View
          key={row[0]?.key ?? `row-${rowIndex}`}
          style={[styles.row, { gap: spacing.sm }]}
        >
          {row.map(({ key, ...tileProps }) => (
            <FeatureTile
              key={key}
              {...tileProps}
              style={styles.halfTile}
            />
          ))}
          {row.length === 1 ? <View style={styles.halfPlaceholder} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    minHeight: 112,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  halfTile: {
    flex: 1,
  },
  halfPlaceholder: {
    flex: 1,
  },
});
