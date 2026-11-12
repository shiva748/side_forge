import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle2, ChevronDown, GraduationCap } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { parentPortalApi } from '@/api/parentPortalApi';
import { BottomSheetModal, StatusBadge, SurfaceCard } from '@/components/ui';

export interface ChildBannerOption {
  id: number;
  studentId?: number;
  organizationId?: number;
  fullName: string;
  classLabel: string;
  className?: string | null;
  sectionName?: string | null;
  rollNumber?: string | null;
  admissionNumber: string;
  academicSessionName?: string | null;
  profilePhotoUrl?: string | null;
  relationshipType?: string | null;
}

export type LinkedChildSummary = ChildBannerOption;

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function ChildAvatar({
  child,
  size = 40,
  selected = false,
}: {
  child: ChildBannerOption;
  size?: number;
  selected?: boolean;
}) {
  const { colors, typography } = useAppTheme();
  const [imageError, setImageError] = useState(false);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const orgId = child.organizationId ?? activeWorkspace?.organizationId ?? 0;

  const photoSource =
    !imageError && orgId > 0 && child.profilePhotoUrl
      ? parentPortalApi.buildAuthorizedChildPhotoSource(
          orgId,
          child.profilePhotoUrl
        )
      : null;

  if (photoSource) {
    return (
      <Image
        source={photoSource}
        onError={() => setImageError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: colors.surfaceMuted,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: selected ? colors.primary : colors.primarySoft,
          borderColor: selected ? colors.primary : colors.primarySoftBorder,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.textOnPrimary : colors.primaryText,
          fontSize:
            size >= 40 ? typography.fontSizes.sm : typography.fontSizes.xs,
          fontWeight: typography.fontWeights.bold,
        }}
      >
        {getInitials(child.fullName)}
      </Text>
    </View>
  );
}

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
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedChildId = propSelectedChildId ?? storeSelectedChildId;
  const setSelectedChildId = onSelectChild ?? storeSetSelectedChildId;

  if (childrenList.length === 0) return null;

  const activeChild =
    childrenList.find((c) => c.id === selectedChildId) ?? childrenList[0];

  if (childrenList.length === 1 && activeChild) {
    return (
      <SurfaceCard
        elevation="subtle"
        style={{
          marginBottom: spacing.md,
          borderColor: colors.primarySoftBorder,
          backgroundColor: colors.surface,
        }}
      >
        <View style={styles.singleRow}>
          <ChildAvatar child={activeChild} size={44} selected />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <View style={[styles.rowWrap, { gap: spacing.xs }]}>
              <Text
                numberOfLines={1}
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.base,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {activeChild.fullName}
              </Text>
              {activeChild.academicSessionName ? (
                <StatusBadge
                  label={activeChild.academicSessionName}
                  tone="primary"
                />
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={{
                color: colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                marginTop: 2,
              }}
            >
              {activeChild.classLabel}
              {activeChild.rollNumber
                ? ` • Roll #${activeChild.rollNumber}`
                : ''}{' '}
              • {activeChild.admissionNumber}
            </Text>
          </View>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={[styles.headerRow, { marginBottom: spacing.xs }]}>
        <View style={styles.rowCenter}>
          <GraduationCap size={iconSizes.sm} color={colors.primary} />
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginLeft: 6,
            }}
          >
            Select Child ({childrenList.length})
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open child selector sheet"
          hitSlop={8}
          onPress={() => setSheetOpen(true)}
          style={styles.rowCenter}
        >
          <Text
            style={{
              color: colors.primaryText,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.semibold,
              marginRight: 2,
            }}
          >
            All Children
          </Text>
          <ChevronDown size={iconSizes.xs} color={colors.primaryText} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        {childrenList.map((child) => {
          const isSelected = child.id === activeChild?.id;
          return (
            <Pressable
              key={child.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedChildId(child.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? colors.primarySoft
                    : pressed
                    ? colors.surfaceInteractivePressed
                    : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs + 2,
                },
              ]}
            >
              <ChildAvatar child={child} size={36} selected={isSelected} />
              <View style={{ marginLeft: spacing.xs, maxWidth: 180 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: isSelected ? colors.primaryText : colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {child.fullName}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 1,
                  }}
                >
                  {child.classLabel}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <BottomSheetModal
        visible={sheetOpen}
        title="Select Student Profile"
        subtitle="Switch between your linked children"
        onClose={() => setSheetOpen(false)}
      >
        <View style={{ gap: spacing.xs }}>
          {childrenList.map((child) => {
            const isSelected = child.id === activeChild?.id;
            return (
              <Pressable
                key={child.id}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedChildId(child.id);
                  setSheetOpen(false);
                }}
                style={({ pressed }) => [
                  styles.sheetOption,
                  {
                    backgroundColor: isSelected
                      ? colors.primarySoft
                      : pressed
                      ? colors.surfaceInteractivePressed
                      : colors.background,
                    borderColor: isSelected
                      ? colors.primarySoftBorder
                      : colors.border,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                  },
                ]}
              >
                <ChildAvatar child={child} size={40} selected={isSelected} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.base,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    {child.fullName}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      marginTop: 2,
                    }}
                  >
                    {child.classLabel} • {child.admissionNumber}
                  </Text>
                </View>
                {isSelected ? (
                  <CheckCircle2 size={iconSizes.md} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarFallback: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleRow: { flexDirection: 'row', alignItems: 'center' },
  rowWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center' },
  sheetOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
});


