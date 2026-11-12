import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GraduationCap } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';

export interface ChildBannerOption {
  id: number;
  fullName: string;
  classLabel: string;
  admissionNumber: string;
}

export type LinkedChildSummary = ChildBannerOption;

export function ChildSwitcherBanner({
  childrenList = [],
  selectedChildId: propSelectedChildId,
  onSelectChild,
}: {
  childrenList?: ChildBannerOption[];
  selectedChildId?: number | null;
  onSelectChild?: (childId: number) => void;
}) {
  const { colors, radius, spacing, typography, iconSizes } = useAppTheme();
  const storeSelectedChildId = useAuthWorkspaceStore((s) => s.selectedChildId);
  const storeSetSelectedChildId = useAuthWorkspaceStore(
    (s) => s.setSelectedChildId
  );

  const selectedChildId = propSelectedChildId ?? storeSelectedChildId;
  const setSelectedChildId = onSelectChild ?? storeSetSelectedChildId;

  const activeId = selectedChildId ?? childrenList[0]?.id ?? null;

  if (childrenList.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: typography.fontSizes.xs,
          fontWeight: typography.fontWeights.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: spacing.xs,
        }}
      >
        Active Student Profile
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        {childrenList.map((child) => {
          const isSelected = child.id === activeId;
          return (
            <Pressable
              key={child.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedChildId(child.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? colors.primarySoft
                    : colors.surface,
                  borderColor: isSelected
                    ? colors.primarySoftBorder
                    : colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <GraduationCap
                size={iconSizes.sm}
                color={isSelected ? colors.primaryText : colors.textMuted}
              />
              <View style={{ marginLeft: spacing.xs }}>
                <Text
                  style={{
                    color: isSelected ? colors.primaryText : colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  {child.fullName}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  {child.classLabel}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
