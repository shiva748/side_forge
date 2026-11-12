import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { authApi } from '@/api/authApi';
import { useSafeNavigation } from '@/utils/navigationGuard';
import {
  AppButton,
  AppInput,
  type AppInputHandle,
  FeedbackBanner,
  ScreenContainer,
  ScreenHeader,
  SurfaceCard,
} from '@/components/ui';

const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(100, 'First name cannot exceed 100 characters'),
    lastName: z
      .string()
      .trim()
      .max(100, 'Last name cannot exceed 100 characters')
      .optional()
      .or(z.literal('')),
    email: z
      .string()
      .trim()
      .min(1, 'Email address is required')
      .email('Enter a valid email address')
      .max(255, 'Email cannot exceed 255 characters'),
    phoneNumber: z
      .string()
      .trim()
      .regex(
        /^[6-9]\d{9}$/,
        'Enter a valid 10-digit Indian mobile number (starting with 6–9)'
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password cannot exceed 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { navigateTo, goBackOrFallback } = useSafeNavigation();

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registeredCredentials, setRegisteredCredentials] = useState<{
    email: string;
    firstName: string;
  } | null>(null);

  const lastNameRef = useRef<AppInputHandle>(null);
  const emailRef = useRef<AppInputHandle>(null);
  const phoneRef = useRef<AppInputHandle>(null);
  const passwordRef = useRef<AppInputHandle>(null);
  const confirmPasswordRef = useRef<AppInputHandle>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = watch('password', '');
  const passwordChecks = [
    {
      label: '8–72 characters',
      met: watchedPassword.length >= 8 && watchedPassword.length <= 72,
    },
    {
      label: 'Includes a letter',
      met: /[A-Za-z]/.test(watchedPassword),
    },
    {
      label: 'Includes a number',
      met: /\d/.test(watchedPassword),
    },
  ];

  const onSubmit = async (values: RegisterFormValues) => {
    if (submitting) return;
    setServerError(null);
    setSubmitting(true);
    const cleanedPhone = values.phoneNumber.replace(/\D/g, '').slice(-10);
    const normalizedEmail = values.email.trim().toLowerCase();
    try {
      await authApi.register({
        firstName: values.firstName.trim(),
        lastName: values.lastName?.trim() || undefined,
        email: normalizedEmail,
        phoneNumber: cleanedPhone,
        password: values.password,
      });
      setRegisteredCredentials({
        email: normalizedEmail,
        firstName: values.firstName.trim(),
      });
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Unable to create account right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      keyboardAware
      header={
        <ScreenHeader
          title="Create Account"
          subtitle="Register your personal Side Forge account"
          showBack
          onBackPress={() => goBackOrFallback('/(auth)/login')}
        />
      }
    >
      {registeredCredentials ? (
        <SurfaceCard>
          <View style={[styles.rowCenter, { marginBottom: spacing.xs }]}>
            <CheckCircle2 size={iconSizes.lg} color={colors.success} />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                marginLeft: spacing.xs,
              }}
            >
              Account Created
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
            Welcome, {registeredCredentials.firstName}! Your Side Forge account (
            {registeredCredentials.email}) has been created. Please sign in to
            access your account and any school memberships.
          </Text>
          <AppButton
            label="Proceed to Sign In"
            fullWidth
            onPress={() => navigateTo('/(auth)/login', { replace: true })}
          />
        </SurfaceCard>
      ) : (
        <>
          {serverError ? (
            <FeedbackBanner
              tone="danger"
              title="Registration error"
              message={serverError}
              style={{ marginBottom: spacing.md }}
            />
          ) : null}

          <SurfaceCard style={{ marginBottom: spacing.md }}>
            <View style={{ gap: spacing.md }}>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="First Name"
                    placeholder="Aarav"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => lastNameRef.current?.focus()}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    errorText={errors.firstName?.message}
                    leftIcon={
                      <User size={iconSizes.sm} color={colors.textMuted} />
                    }
                  />
                )}
              />

              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    ref={lastNameRef}
                    label="Last Name (Optional)"
                    placeholder="Sharma"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    errorText={errors.lastName?.message}
                    leftIcon={
                      <User size={iconSizes.sm} color={colors.textMuted} />
                    }
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    ref={emailRef}
                    label="Email Address"
                    placeholder="you@school.edu"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                    value={value}
                    onBlur={() => {
                      onChange(value.trim());
                      onBlur();
                    }}
                    onChangeText={onChange}
                    errorText={errors.email?.message}
                    leftIcon={
                      <Mail size={iconSizes.sm} color={colors.textMuted} />
                    }
                  />
                )}
              />

              <Controller
                control={control}
                name="phoneNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    ref={phoneRef}
                    label="Mobile Number (10 digits)"
                    placeholder="9876543210"
                    keyboardType="phone-pad"
                    maxLength={10}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(val) =>
                      onChange(val.replace(/\D/g, '').slice(0, 10))
                    }
                    errorText={errors.phoneNumber?.message}
                    leftIcon={
                      <Phone size={iconSizes.sm} color={colors.textMuted} />
                    }
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    ref={passwordRef}
                    label="Password"
                    placeholder="Minimum 8 characters"
                    isPassword
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    errorText={errors.password?.message}
                    leftIcon={
                      <Lock size={iconSizes.sm} color={colors.textMuted} />
                    }
                  />
                )}
              />

              <View
                style={[
                  styles.checksRow,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    gap: spacing.sm,
                  },
                ]}
              >
                {passwordChecks.map((chk) => (
                  <View key={chk.label} style={styles.rowCenter}>
                    <Check
                      size={iconSizes.xs}
                      color={chk.met ? colors.success : colors.textMuted}
                    />
                    <Text
                      style={{
                        color: chk.met
                          ? colors.successText
                          : colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        marginLeft: 4,
                      }}
                    >
                      {chk.label}
                    </Text>
                  </View>
                ))}
              </View>

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    ref={confirmPasswordRef}
                    label="Confirm Password"
                    placeholder="Re-enter your password"
                    isPassword
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      void handleSubmit(onSubmit)();
                    }}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    errorText={errors.confirmPassword?.message}
                    leftIcon={
                      <Lock size={iconSizes.sm} color={colors.textMuted} />
                    }
                  />
                )}
              />

              <AppButton
                label="Create Account"
                size="lg"
                fullWidth
                loading={submitting}
                onPress={handleSubmit(onSubmit)}
              />
            </View>
          </SurfaceCard>

          <View style={styles.footerRow}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.sm,
              }}
            >
              Already have an account?{' '}
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => goBackOrFallback('/(auth)/login')}
            >
              <Text
                style={{
                  color: colors.primaryText,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                Sign In
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  checksRow: { flexDirection: 'row', flexWrap: 'wrap' },
  inviteCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
