import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { BottomSheetModal } from './BottomSheetModal';

export interface SelectOption<T extends string | number = string> {
  label: string;
  value: T;
  subtitle?: string;
}

export interface SegmentedSelectorProps<T extends string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: ViewStyle;
}

export function SegmentedSelector<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedSelectorProps<T>) {
  const { colors, radius, spacing, typography } = useAppTheme();

  return (
    <View
      style={[
        styles.segmentedContainer,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.md,
          borderColor: colors.border,
          padding: 4,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segmentBtn,
              {
                borderRadius: radius.sm,
                backgroundColor: selected ? colors.surface : 'transparent',
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.xs,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? colors.textPrimary : colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                fontWeight: selected
                  ? typography.fontWeights.semibold
                  : typography.fontWeights.medium,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface PickerFieldProps<T extends string | number> {
  label?: string;
  placeholder?: string;
  options: SelectOption<T>[];
  value: T | null;
  onChange: (next: T) => void;
  containerStyle?: ViewStyle;
}

export function PickerField<T extends string | number>({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  containerStyle,
}: PickerFieldProps<T>) {
  const { colors, radius, spacing, typography, touchTargets, iconSizes } =
    useAppTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={containerStyle}>
      {label ? (
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing.xs,
          }}
        >
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[
          styles.pickerTrigger,
          {
            minHeight: touchTargets.inputHeight,
            borderRadius: radius.md,
            borderColor: colors.inputBorder,
            backgroundColor: colors.inputBackground,
            paddingHorizontal: spacing.sm,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: selected ? colors.textPrimary : colors.inputPlaceholder,
            fontSize: typography.fontSizes.base,
          }}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={iconSizes.sm} color={colors.textMuted} />
      </Pressable>

      <BottomSheetModal
        visible={open}
        title={label || 'Select Option'}
        onClose={() => setOpen(false)}
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              accessibilityRole="button"
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={[
                styles.optionRow,
                {
                  backgroundColor: isSelected ? colors.primarySoft : 'transparent',
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  marginBottom: spacing.xxs,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: isSelected ? colors.primaryText : colors.textPrimary,
                    fontSize: typography.fontSizes.base,
                    fontWeight: isSelected
                      ? typography.fontWeights.semibold
                      : typography.fontWeights.regular,
                  }}
                >
                  {opt.label}
                </Text>
                {opt.subtitle ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                    }}
                  >
                    {opt.subtitle}
                  </Text>
                ) : null}
              </View>
              {isSelected ? (
                <Check size={iconSizes.sm} color={colors.primaryText} />
              ) : null}
            </Pressable>
          );
        })}
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentedContainer: { flexDirection: 'row', borderWidth: 1 },
  segmentBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  optionRow: { flexDirection: 'row', alignItems: 'center' },
});
