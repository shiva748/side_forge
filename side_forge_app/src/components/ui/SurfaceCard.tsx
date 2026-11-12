import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { getElevationStyle, useAppTheme } from '@/theme';

export interface SurfaceCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevation?: 'none' | 'subtle' | 'card' | 'sheet';
  onPress?: () => void;
}

export function SurfaceCard({
  children,
  style,
  padded = true,
  elevation = 'card',
  onPress,
}: SurfaceCardProps) {
  const { colors, radius, spacing, mode } = useAppTheme();
  const elevationStyle = getElevationStyle(mode, elevation);

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed
              ? colors.surfaceInteractivePressed
              : colors.surface,
            borderRadius: radius.lg,
            borderColor: colors.border,
            padding: padded ? spacing.md : 0,
          },
          elevationStyle,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderColor: colors.border,
          padding: padded ? spacing.md : 0,
        },
        elevationStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface ListItemRowProps {
  title: string;
  subtitle?: string;
  metaText?: string;
  leftIcon?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  showDivider?: boolean;
}

export function ListItemRow({
  title,
  subtitle,
  metaText,
  leftIcon,
  rightAdornment,
  showChevron = false,
  onPress,
  showDivider = false,
}: ListItemRowProps) {
  const { colors, spacing, typography, iconSizes, touchTargets } = useAppTheme();

  const inner = (
    <View
      style={[
        styles.row,
        {
          minHeight: touchTargets.minHeight + 12,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderBottomWidth: showDivider ? 1 : 0,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      {leftIcon ? (
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.surfaceMuted,
              marginRight: spacing.sm,
            },
          ]}
        >
          {leftIcon}
        </View>
      ) : null}

      <View style={styles.rowTextWrap}>
        <Text
          numberOfLines={1}
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.base,
            fontWeight: typography.fontWeights.semibold,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
        {metaText ? (
          <Text
            numberOfLines={1}
            style={{
              color: colors.textMuted,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
            }}
          >
            {metaText}
          </Text>
        ) : null}
      </View>

      {rightAdornment ? (
        <View style={{ marginLeft: spacing.xs }}>{rightAdornment}</View>
      ) : null}

      {showChevron ? (
        <View style={{ marginLeft: spacing.xs }}>
          <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? colors.surfaceInteractivePressed
          : 'transparent',
      })}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
  },
});
