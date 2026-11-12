import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, FileSpreadsheet, GraduationCap } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import {
  useAuthWorkspaceStore,
  type ParentAcademicSection,
} from '@/store/useAuthWorkspaceStore';
import { useSafeNavigation } from '@/utils/navigationGuard';

const ACADEMIC_SECTIONS: Array<{
  key: ParentAcademicSection;
  label: string;
  Icon: typeof FileSpreadsheet;
}> = [
  {
    key: 'homework',
    label: 'Homework',
    Icon: FileSpreadsheet,
  },
  {
    key: 'exams',
    label: 'Exams & Results',
    Icon: GraduationCap,
  },
  {
    key: 'timetable',
    label: 'Timetable',
    Icon: Calendar,
  },
];

export function ParentAcademicSubNavBar({
  activeSection,
}: {
  activeSection: ParentAcademicSection;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const { navigateTo } = useSafeNavigation();
  const setParentAcademicSection = useAuthWorkspaceStore(
    (s) => s.setParentAcademicSection
  );

  return (
    <View
      style={[
        styles.barContainer,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: 4,
          marginBottom: spacing.md,
          gap: 4,
        },
      ]}
    >
      {ACADEMIC_SECTIONS.map(({ key, label, Icon }) => {
        const isSelected = activeSection === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={label}
            onPress={() => {
              setParentAcademicSection(key);
              navigateTo('/(parent)/academics', {
                params: { section: key },
              });
            }}
            style={({ pressed }) => [
              styles.pillTab,
              {
                backgroundColor: isSelected ? colors.surface : 'transparent',
                borderColor: isSelected ? colors.primary : 'transparent',
                borderRadius: radius.sm,
                paddingVertical: spacing.xs + 2,
                paddingHorizontal: spacing.xs,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Icon
              size={iconSizes.xs}
              color={isSelected ? colors.primary : colors.textSecondary}
              style={{ marginRight: 5 }}
            />
            <Text
              numberOfLines={1}
              style={{
                color: isSelected ? colors.primary : colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                fontWeight: isSelected
                  ? typography.fontWeights.bold
                  : typography.fontWeights.medium,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  pillTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
