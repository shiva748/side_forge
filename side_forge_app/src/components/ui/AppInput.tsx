import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff, Search, X } from 'lucide-react-native';
import { useAppTheme } from '@/theme';

export type AppInputHandle = React.ComponentRef<typeof TextInput>;

export interface AppInputProps extends TextInputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  error?: string;
  isPassword?: boolean;
  isSearch?: boolean;
  onClearSearch?: () => void;
  leftAdornment?: React.ReactNode;
  leftIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const AppInput = forwardRef<AppInputHandle, AppInputProps>(function AppInput(
  {
    label,
    helperText,
    errorText,
    error,
    isPassword = false,
    isSearch = false,
    onClearSearch,
    leftAdornment,
    leftIcon,
    editable = true,
    multiline = false,
    containerStyle,
    value,
    ...rest
  },
  ref
) {
  const { colors, radius, spacing, typography, touchTargets, iconSizes } =
    useAppTheme();
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);

  const resolvedError = errorText ?? error;
  const resolvedLeftIcon = leftAdornment ?? leftIcon;
  const hasError = Boolean(resolvedError && resolvedError.trim().length > 0);
  const borderColor = hasError
    ? colors.danger
    : focused
    ? colors.borderFocus
    : colors.inputBorder;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            minHeight: multiline ? 96 : touchTargets.inputHeight,
            borderRadius: radius.md,
            borderColor,
            backgroundColor: editable
              ? colors.inputBackground
              : colors.inputDisabledBackground,
            paddingHorizontal: spacing.sm,
            alignItems: multiline ? 'flex-start' : 'center',
            paddingVertical: multiline ? spacing.xs : 0,
          },
        ]}
      >
        {isSearch ? (
          <View style={{ marginRight: spacing.xs }}>
            <Search size={iconSizes.sm} color={colors.textMuted} />
          </View>
        ) : resolvedLeftIcon ? (
          <View style={{ marginRight: spacing.xs }}>{resolvedLeftIcon}</View>
        ) : null}

        <TextInput
          ref={ref}
          value={value}
          editable={editable}
          multiline={multiline}
          secureTextEntry={isPassword && !secureVisible}
          placeholderTextColor={colors.inputPlaceholder}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: editable ? colors.textPrimary : colors.textMuted,
              fontSize: typography.fontSizes.base,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secureVisible ? 'Hide password' : 'Show password'}
            hitSlop={10}
            onPress={() => setSecureVisible((v) => !v)}
            style={styles.iconBtn}
          >
            {secureVisible ? (
              <EyeOff size={iconSizes.md} color={colors.textMuted} />
            ) : (
              <Eye size={iconSizes.md} color={colors.textMuted} />
            )}
          </Pressable>
        ) : null}

        {isSearch && value && value.length > 0 && onClearSearch ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={10}
            onPress={onClearSearch}
            style={styles.iconBtn}
          >
            <X size={iconSizes.sm} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {hasError ? (
        <Text
          style={{
            color: colors.dangerText,
            fontSize: typography.fontSizes.xs,
            marginTop: spacing.xxs,
          }}
        >
          {resolvedError}
        </Text>
      ) : helperText ? (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.fontSizes.xs,
            marginTop: spacing.xxs,
          }}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
  iconBtn: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

