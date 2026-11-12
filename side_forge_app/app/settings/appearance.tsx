import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Monitor, Moon, Sun } from 'lucide-react-native';
import { useAppTheme, type ThemePreference } from '@/theme';
import {
  ScreenContainer,
  ScreenHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export default function AppearanceSettingsScreen() {
  const {
    colors,
    spacing,
    typography,
    radius,
    iconSizes,
    preference,
    mode,
    setThemePreference,
  } = useAppTheme();

  const options: {
    value: ThemePreference;
    title: string;
    description: string;
    Icon: typeof Sun;
  }[] = [
    {
      value: 'system',
      title: 'System Default',
      description: 'Automatically match your device display settings.',
      Icon: Monitor,
    },
    {
      value: 'light',
      title: 'Light Mode',
      description: 'Clean high-contrast daylight appearance.',
      Icon: Sun,
    },
    {
      value: 'dark',
      title: 'Dark Mode',
      description: 'Reduced glare for low-light environments.',
      Icon: Moon,
    },
  ];

  return (
    <ScreenContainer
      header={
        <ScreenHeader
          title="Theme Appearance"
          subtitle="Choose how Side Forge looks on this device"
          showBack
        />
      }
    >
      <SurfaceCard style={{ marginBottom: spacing.md }}>
        <View style={styles.statusRow}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.sm,
            }}
          >
            Active Color Scheme
          </Text>
          <StatusBadge
            label={mode === 'dark' ? 'Dark Active' : 'Light Active'}
            tone="primary"
          />
        </View>
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        {options.map((opt) => {
          const isSelected = preference === opt.value;
          const IconComp = opt.Icon;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => setThemePreference(opt.value)}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: isSelected
                    ? colors.primarySoft
                    : pressed
                    ? colors.surfaceInteractivePressed
                    : colors.surface,
                  borderColor: isSelected
                    ? colors.primarySoftBorder
                    : colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isSelected
                      ? colors.surface
                      : colors.surfaceMuted,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <IconComp
                  size={iconSizes.md}
                  color={isSelected ? colors.primaryText : colors.textSecondary}
                />
              </View>

              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.base,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {opt.title}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 2,
                  }}
                >
                  {opt.description}
                </Text>
              </View>

              {isSelected ? (
                <CheckCircle2 size={iconSizes.md} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
