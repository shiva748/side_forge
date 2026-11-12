import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Menu } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useSafeNavigation } from '@/utils/navigationGuard';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onBack?: () => void;
  showMenuButton?: boolean;
  onMenuPress?: () => void;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  onBack,
  showMenuButton = false,
  onMenuPress,
  rightAction,
}: ScreenHeaderProps) {
  const handleBack = onBackPress ?? onBack;
  const shouldShowBack = showBack || Boolean(handleBack);
  const { goBackOrFallback } = useSafeNavigation();
  const { colors, spacing, typography, iconSizes, radius } = useAppTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.headerBackground,
          borderBottomColor: colors.headerBorder,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <View style={styles.topRow}>
        {showMenuButton && onMenuPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            hitSlop={10}
            onPress={onMenuPress}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: pressed
                  ? colors.surfaceInteractivePressed
                  : colors.surfaceMuted,
                borderRadius: radius.sm,
                marginRight: spacing.sm,
              },
            ]}
          >
            <Menu size={iconSizes.md} color={colors.textPrimary} />
          </Pressable>
        ) : shouldShowBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={() => {
              if (handleBack) handleBack();
              else goBackOrFallback('/');
            }}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: pressed
                  ? colors.surfaceInteractivePressed
                  : colors.surfaceMuted,
                borderRadius: radius.sm,
                marginRight: spacing.sm,
              },
            ]}
          >
            <ArrowLeft size={iconSizes.md} color={colors.textPrimary} />
          </Pressable>
        ) : null}

        <View style={styles.titleBlock}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightAction ? (
          <View style={styles.actionsRow}>{rightAction}</View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  titleBlock: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

