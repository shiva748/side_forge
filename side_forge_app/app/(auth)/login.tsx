import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Lock, Mail } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { useSafeNavigation } from '@/utils/navigationGuard';
import {
  AppButton,
  AppInput,
  type AppInputHandle,
  FeedbackBanner,
  ScreenContainer,
  SurfaceCard,
} from '@/components/ui';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { navigateTo } = useSafeNavigation();

  const login = useAuthWorkspaceStore((s) => s.login);
  const authError = useAuthWorkspaceStore((s) => s.authError);
  const clearAuthError = useAuthWorkspaceStore((s) => s.clearAuthError);

  const [submitting, setSubmitting] = useState(false);
  const passwordInputRef = useRef<AppInputHandle>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    if (submitting) return;
    clearAuthError();
    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
    } catch {
      // Error state is populated in useAuthWorkspaceStore.authError
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      keyboardAware
      edges={['top', 'bottom', 'left', 'right']}
      contentContainerStyle={styles.container}
    >
      <View style={[styles.brandHeader, { marginBottom: spacing.xl }]}>
        <View
          style={[
            styles.logoMark,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primarySoftBorder,
              borderRadius: radius.lg,
              marginBottom: spacing.sm,
            },
          ]}
        >
          <Building2 size={iconSizes.lg} color={colors.primary} />
        </View>
        <Text
          style={{
            color: colors.primaryText,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.bold,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          Side Forge
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.xxl,
            fontWeight: typography.fontWeights.bold,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          Sign in to your account
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            marginTop: spacing.xs,
            textAlign: 'center',
            lineHeight: typography.lineHeights.sm,
          }}
        >
          Access your school workspace for Parents, Teachers, and School Administration.
        </Text>
      </View>

      {authError ? (
        <FeedbackBanner
          tone="danger"
          title="Unable to sign in"
          message={authError}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}
      <SurfaceCard style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Email Address"
                placeholder="you@school.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                value={value}
                onBlur={() => {
                  onChange(value.trim());
                  onBlur();
                }}
                onChangeText={(text) => {
                  if (authError) clearAuthError();
                  onChange(text);
                }}
                errorText={errors.email?.message}
                leftIcon={<Mail size={iconSizes.sm} color={colors.textMuted} />}
              />
            )}
          />

          <View>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <AppInput
                  ref={passwordInputRef}
                  label="Password"
                  placeholder="Enter your password"
                  isPassword
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void handleSubmit(onSubmit)();
                  }}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={(text) => {
                    if (authError) clearAuthError();
                    onChange(text);
                  }}
                  errorText={errors.password?.message}
                  leftIcon={
                    <Lock size={iconSizes.sm} color={colors.textMuted} />
                  }
                />
              )}
            />

            <View style={[styles.forgotRow, { marginTop: spacing.xs }]}>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigateTo('/(auth)/forgot-password')}
              >
                <Text
                  style={{
                    color: colors.primaryText,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  Need help signing in?
                </Text>
              </Pressable>
            </View>
          </View>

          <AppButton
            label="Sign In"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </SurfaceCard>

      <View style={styles.secondaryActions}>
        <View style={styles.registerPromptRow}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.sm,
            }}
          >
            Don&apos;t have an account?{' '}
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => navigateTo('/(auth)/register')}
          >
            <Text
              style={{
                color: colors.primaryText,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Create Account
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center' },
  brandHeader: { alignItems: 'center' },
  logoMark: {
    width: 52,
    height: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  secondaryActions: { alignItems: 'center' },
  registerPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});

