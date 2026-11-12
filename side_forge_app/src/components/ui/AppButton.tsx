import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}: AppButtonProps) {
  const { colors, radius, typography, touchTargets, spacing } = useAppTheme();
  const isDisabled = disabled || loading;

  const height =
    size === 'sm'
      ? touchTargets.buttonHeightSm
      : size === 'lg'
      ? touchTargets.buttonHeightLg
      : touchTargets.buttonHeightMd;

  const getColors = (pressed: boolean) => {
    if (isDisabled) {
      return {
        bg: variant === 'ghost' ? 'transparent' : colors.disabledBackground,
        border: variant === 'outline' ? colors.border : 'transparent',
        text: colors.disabledText,
      };
    }
    switch (variant) {
      case 'primary':
        return {
          bg: pressed ? colors.primaryPressed : colors.primary,
          border: 'transparent',
          text: '#FFFFFF',
        };
      case 'secondary':
        return {
          bg: pressed ? colors.secondarySurfacePressed : colors.secondarySurface,
          border: colors.secondaryBorder,
          text: colors.secondaryText,
        };
      case 'outline':
        return {
          bg: pressed ? colors.surfaceInteractivePressed : 'transparent',
          border: colors.border,
          text: colors.textPrimary,
        };
      case 'ghost':
        return {
          bg: pressed ? colors.surfaceInteractivePressed : 'transparent',
          border: 'transparent',
          text: colors.primaryText,
        };
      case 'destructive':
      case 'danger':
        return {
          bg: pressed ? colors.dangerPressed : colors.danger,
          border: 'transparent',
          text: '#FFFFFF',
        };
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => {
        const c = getColors(pressed);
        return [
          styles.base,
          {
            minHeight: height,
            borderRadius: radius.md,
            backgroundColor: c.bg,
            borderColor: c.border,
            borderWidth: c.border === 'transparent' ? 0 : 1,
            paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
            alignSelf: fullWidth ? 'stretch' : 'auto',
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const c = getColors(pressed);
        return (
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={c.text}
                style={{ marginRight: spacing.xs }}
              />
            ) : leftIcon ? (
              <View style={{ marginRight: spacing.xs }}>{leftIcon}</View>
            ) : null}
            <Text
              numberOfLines={1}
              style={{
                color: c.text,
                fontSize:
                  size === 'sm'
                    ? typography.fontSizes.sm
                    : typography.fontSizes.base,
                fontWeight: typography.fontWeights.semibold,
              }}
            >
              {label}
            </Text>
            {!loading && rightIcon ? (
              <View style={{ marginLeft: spacing.xs }}>{rightIcon}</View>
            ) : null}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
