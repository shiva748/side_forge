import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Building2, KeyRound, UserPlus } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useSafeNavigation } from '@/utils/navigationGuard';
import {
  AppButton,
  ScreenContainer,
  ScreenHeader,
  SurfaceCard,
} from '@/components/ui';

export default function SignInHelpScreen() {
  const { colors, spacing, typography, iconSizes } = useAppTheme();
  const { navigateTo, goBackOrFallback } = useSafeNavigation();

  return (
    <ScreenContainer
      header={
        <ScreenHeader
          title="Sign-In Assistance"
          subtitle="Account recovery & registration guidance"
          showBack
          onBackPress={() => goBackOrFallback('/(auth)/login')}
        />
      }
    >
      <View style={{ gap: spacing.md }}>
        <SurfaceCard>
          <View style={[styles.row, { marginBottom: spacing.xs }]}>
            <KeyRound size={iconSizes.md} color={colors.primary} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.semibold,
                marginLeft: spacing.xs,
              }}
            >
              Forgot your password?
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              lineHeight: typography.lineHeights.sm,
            }}
          >
            For security, password resets for school accounts are managed by
            your School Administrator. Please contact your school office if you
            are locked out of your account. If you are already signed in on
            another device, you can update your password under Hamburger Menu →
            Settings → Change Password.
          </Text>
        </SurfaceCard>

        <SurfaceCard>
          <View style={[styles.row, { marginBottom: spacing.xs }]}>
            <UserPlus size={iconSizes.md} color={colors.primary} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.semibold,
                marginLeft: spacing.xs,
              }}
            >
              Need to create a new account?
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.sm,
              lineHeight: typography.lineHeights.sm,
              marginBottom: spacing.md,
            }}
          >
            Create a personal Side Forge account first, then sign in to access
            your account and manage school memberships.
          </Text>
          <AppButton
            label="Create Account"
            variant="outline"
            size="sm"
            onPress={() => navigateTo('/(auth)/register', { replace: true })}
          />
        </SurfaceCard>

        <AppButton
          label="Back to Sign In"
          variant="ghost"
          fullWidth
          leftIcon={<Building2 size={iconSizes.sm} color={colors.primaryText} />}
          onPress={() => goBackOrFallback('/(auth)/login')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});


