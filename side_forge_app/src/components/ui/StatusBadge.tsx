import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/theme';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle;
}

export function StatusBadge({
  label,
  tone = 'neutral',
  style,
}: StatusBadgeProps) {
  const { colors, radius, spacing, typography } = useAppTheme();

  const palette = (() => {
    switch (tone) {
      case 'primary':
        return {
          bg: colors.primarySoft,
          border: colors.primarySoftBorder,
          text: colors.primaryText,
        };
      case 'success':
        return {
          bg: colors.successSoft,
          border: colors.successBorder,
          text: colors.successText,
        };
      case 'warning':
        return {
          bg: colors.warningSoft,
          border: colors.warningBorder,
          text: colors.warningText,
        };
      case 'danger':
        return {
          bg: colors.dangerSoft,
          border: colors.dangerBorder,
          text: colors.dangerText,
        };
      case 'info':
        return {
          bg: colors.infoSoft,
          border: colors.infoBorder,
          text: colors.infoText,
        };
      case 'neutral':
      default:
        return {
          bg: colors.surfaceMuted,
          border: colors.border,
          text: colors.textSecondary,
        };
    }
  })();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: radius.full,
          paddingHorizontal: spacing.xs + 2,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          color: palette.text,
          fontSize: typography.fontSizes.xs,
          fontWeight: typography.fontWeights.semibold,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
