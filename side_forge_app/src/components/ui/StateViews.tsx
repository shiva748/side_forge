import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  ShieldAlert,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { AppButton } from './AppButton';
import { SurfaceCard } from './SurfaceCard';

export function LoadingStateView({
  message = 'Loading...',
}: {
  message?: string;
}) {
  const { colors, spacing, typography } = useAppTheme();
  return (
    <View style={[styles.centered, { padding: spacing.xl }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.fontSizes.sm,
          marginTop: spacing.sm,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
    </View>
  );
}

export interface EmptyStateViewProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyStateView({
  title,
  description,
  icon,
  actionLabel,
  onActionPress,
  onAction,
  style,
}: EmptyStateViewProps) {
  const { colors, spacing, typography, iconSizes } = useAppTheme();
  const handleAction = onActionPress ?? onAction;

  return (
    <SurfaceCard style={style}>
      <View style={[styles.centered, { paddingVertical: spacing.md }]}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.surfaceMuted,
              marginBottom: spacing.sm,
            },
          ]}
        >
          {icon ?? <Inbox size={iconSizes.lg} color={colors.textMuted} />}
        </View>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.semibold,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            textAlign: 'center',
            marginTop: spacing.xs,
            lineHeight: typography.lineHeights.sm,
          }}
        >
          {description}
        </Text>
        {actionLabel && handleAction ? (
          <AppButton
            label={actionLabel}
            onPress={handleAction}
            variant="secondary"
            size="sm"
            style={{ marginTop: spacing.md }}
          />
        ) : null}
      </View>
    </SurfaceCard>
  );
}

export const EmptyState = EmptyStateView;

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  tone?: 'danger' | 'warning' | 'success' | 'info';
  style?: ViewStyle;
}

export function FeedbackBanner({
  title,
  message,
  onRetry,
  tone = 'danger',
  style,
}: ErrorBannerProps) {
  const { colors, radius, spacing, typography, iconSizes } = useAppTheme();

  const palette =
    tone === 'success'
      ? {
          bg: colors.successSoft,
          border: colors.successBorder,
          text: colors.successText,
          Icon: CheckCircle2,
        }
      : tone === 'info'
      ? {
          bg: colors.infoSoft,
          border: colors.infoBorder,
          text: colors.infoText,
          Icon: CheckCircle2,
        }
      : tone === 'warning'
      ? {
          bg: colors.warningSoft,
          border: colors.warningBorder,
          text: colors.warningText,
          Icon: ShieldAlert,
        }
      : {
          bg: colors.dangerSoft,
          border: colors.dangerBorder,
          text: colors.dangerText,
          Icon: AlertCircle,
        };

  const IconComp = palette.Icon;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: radius.md,
          padding: spacing.sm,
        },
        style,
      ]}
    >
      <View style={styles.bannerRow}>
        <IconComp size={iconSizes.md} color={palette.text} />
        <View style={{ flex: 1, marginLeft: spacing.xs }}>
          {title ? (
            <Text
              style={{
                color: palette.text,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.semibold,
                marginBottom: 2,
              }}
            >
              {title}
            </Text>
          ) : null}
          <Text
            style={{
              color: palette.text,
              fontSize: typography.fontSizes.sm,
              lineHeight: typography.lineHeights.sm,
            }}
          >
            {message}
          </Text>
        </View>
      </View>
      {onRetry ? (
        <View style={{ marginTop: spacing.xs, alignSelf: 'flex-start' }}>
          <AppButton
            label="Retry"
            size="sm"
            variant="outline"
            onPress={onRetry}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    borderWidth: 1,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
