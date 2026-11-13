import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Bell,
  Calendar,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Paperclip,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import {
  parentPortalApi,
  type AuthorizedAttachmentDownloadResult,
} from '@/api/parentPortalApi';
import type {
  AnnouncementResponse,
  LinkedChildSummaryResponse,
  StoredFileResponse,
} from '@/types/parentPortal';
import {
  AppButton,
  AppInput,
  type BadgeTone,
  EmptyState,
  FeedbackBanner,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export type AnnouncementScopeFilter =
  | 'ALL'
  | 'IMPORTANT'
  | 'SCHOOL_WIDE'
  | `CHILD_${number}`;

export interface AnnouncementChildContextInfo {
  scopeBadgeLabel: string;
  scopeBadgeTone: BadgeTone;
  appliesToLabel: string;
  matchedChildIds: number[];
  matchedChildNames: string[];
  matchedClassNames: string[];
  isSchoolWide: boolean;
}

export function formatAnnouncementDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const normalized = dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatAttachmentSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function resolveAnnouncementChildContext(
  ann: AnnouncementResponse,
  childrenList: LinkedChildSummaryResponse[]
): AnnouncementChildContextInfo {
  const audience = (ann.targetAudience || 'ALL').toUpperCase();
  const allChildIds = childrenList.map((c) => c.studentId);
  const allChildNames = childrenList.map(
    (c) => `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}`
  );

  if (audience === 'ALL') {
    return {
      scopeBadgeLabel: 'School-Wide',
      scopeBadgeTone: 'primary',
      appliesToLabel:
        allChildNames.length > 0
          ? `All school families (${allChildNames.join(', ')})`
          : 'All students, parents & staff',
      matchedChildIds: allChildIds,
      matchedChildNames: allChildNames,
      matchedClassNames: [],
      isSchoolWide: true,
    };
  }

  if (audience === 'PARENTS') {
    return {
      scopeBadgeLabel: 'All Parents',
      scopeBadgeTone: 'info',
      appliesToLabel:
        allChildNames.length > 0
          ? `Parents of ${allChildNames.join(', ')}`
          : 'All parents & guardians',
      matchedChildIds: allChildIds,
      matchedChildNames: allChildNames,
      matchedClassNames: [],
      isSchoolWide: true,
    };
  }

  if (audience === 'STUDENTS') {
    return {
      scopeBadgeLabel: 'All Students',
      scopeBadgeTone: 'info',
      appliesToLabel:
        allChildNames.length > 0
          ? `All students (${allChildNames.join(', ')})`
          : 'All enrolled students',
      matchedChildIds: allChildIds,
      matchedChildNames: allChildNames,
      matchedClassNames: [],
      isSchoolWide: true,
    };
  }

  if (audience === 'SPECIFIC_CLASSES') {
    const targetClasses = new Set<number>(ann.targetClassIds ?? []);
    const matchedChildren = childrenList.filter(
      (c) => c.classId !== null && targetClasses.has(c.classId)
    );
    const effectiveChildren =
      matchedChildren.length > 0 ? matchedChildren : childrenList;
    const childNames = effectiveChildren.map(
      (c) =>
        `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}${
          c.className ? ` (${c.className})` : ''
        }`
    );
    const classNames = Array.from(
      new Set(
        effectiveChildren
          .map((c) => c.className)
          .filter((n): n is string => Boolean(n))
      )
    );

    return {
      scopeBadgeLabel:
        classNames.length === 1 ? classNames[0] : 'Class Circular',
      scopeBadgeTone: 'success',
      appliesToLabel:
        childNames.length > 0
          ? `Relevant to ${childNames.join(', ')}`
          : 'Targeted class announcement',
      matchedChildIds: effectiveChildren.map((c) => c.studentId),
      matchedChildNames: effectiveChildren.map(
        (c) => `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}`
      ),
      matchedClassNames: classNames,
      isSchoolWide: false,
    };
  }

  if (audience === 'SPECIFIC_STUDENTS') {
    const targetStudents = new Set<number>(ann.targetStudentIds ?? []);
    const matchedChildren = childrenList.filter((c) =>
      targetStudents.has(c.studentId)
    );
    const effectiveChildren =
      matchedChildren.length > 0 ? matchedChildren : childrenList;
    const names = effectiveChildren.map(
      (c) => `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}`
    );

    return {
      scopeBadgeLabel:
        names.length === 1 ? `For ${names[0]}` : 'Student Notice',
      scopeBadgeTone: 'warning',
      appliesToLabel:
        names.length > 0
          ? `Direct notice for ${names.join(', ')}`
          : 'Targeted student notice',
      matchedChildIds: effectiveChildren.map((c) => c.studentId),
      matchedChildNames: names,
      matchedClassNames: [],
      isSchoolWide: false,
    };
  }

  return {
    scopeBadgeLabel: 'School Notice',
    scopeBadgeTone: 'neutral',
    appliesToLabel: 'School announcement',
    matchedChildIds: allChildIds,
    matchedChildNames: allChildNames,
    matchedClassNames: [],
    isSchoolWide: true,
  };
}

export function ParentAnnouncementsFilterBar({
  announcements,
  childrenList,
  activeScopeFilter,
  onSelectScopeFilter,
  searchQuery,
  onChangeSearchQuery,
  onResetFilters,
}: {
  announcements: AnnouncementResponse[];
  childrenList: LinkedChildSummaryResponse[];
  activeScopeFilter: AnnouncementScopeFilter;
  onSelectScopeFilter: (filter: AnnouncementScopeFilter) => void;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  onResetFilters: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const filterChips = useMemo(() => {
    const importantCount = announcements.filter((a) => a.important).length;
    const schoolWideCount = announcements.filter((a) =>
      resolveAnnouncementChildContext(a, childrenList).isSchoolWide
    ).length;

    const base: Array<{
      key: AnnouncementScopeFilter;
      label: string;
      count: number;
    }> = [
      { key: 'ALL', label: 'All', count: announcements.length },
      { key: 'IMPORTANT', label: 'Important', count: importantCount },
      { key: 'SCHOOL_WIDE', label: 'School-Wide', count: schoolWideCount },
    ];

    if (childrenList.length > 1) {
      for (const child of childrenList) {
        const count = announcements.filter((a) =>
          resolveAnnouncementChildContext(
            a,
            childrenList
          ).matchedChildIds.includes(child.studentId)
        ).length;
        base.push({
          key: `CHILD_${child.studentId}`,
          label: child.firstName,
          count,
        });
      }
    }

    return base;
  }, [announcements, childrenList]);

  const hasActiveFilters =
    activeScopeFilter !== 'ALL' || searchQuery.trim().length > 0;

  return (
    <SurfaceCard elevation="subtle" style={{ marginBottom: spacing.md }}>
      <AppInput
        label="Search Announcements"
        placeholder="Search by title, subject, or keyword..."
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
        leftIcon={<Search size={iconSizes.sm} color={colors.textMuted} />}
        containerStyle={{ marginBottom: spacing.sm }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterChipsRow, { gap: spacing.xs }]}
      >
        {filterChips.map((chip) => {
          const isSelected = activeScopeFilter === chip.key;
          return (
            <Pressable
              key={chip.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${chip.label}: ${chip.count} announcements`}
              onPress={() => onSelectScopeFilter(chip.key)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.surfaceMuted,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radius.full,
                  paddingVertical: 7,
                  paddingHorizontal: spacing.sm + 2,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: isSelected
                    ? colors.textOnPrimary
                    : colors.textPrimary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: isSelected
                    ? typography.fontWeights.bold
                    : typography.fontWeights.semibold,
                }}
              >
                {chip.label}
              </Text>
              <View
                style={[
                  styles.filterChipCountBadge,
                  {
                    backgroundColor: isSelected
                      ? colors.primarySoft
                      : colors.surface,
                    borderColor: isSelected
                      ? 'transparent'
                      : colors.borderSubtle,
                    borderRadius: radius.full,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    marginLeft: 6,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isSelected
                      ? colors.primaryText
                      : colors.textSecondary,
                    fontSize: 11,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {chip.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {hasActiveFilters ? (
        <View
          style={[
            styles.activeFilterFooter,
            {
              borderTopColor: colors.borderSubtle,
              marginTop: spacing.sm,
              paddingTop: spacing.xs + 2,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              flex: 1,
            }}
          >
            Filtered announcements
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onResetFilters}
            style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              paddingVertical: 4,
              paddingHorizontal: spacing.xs,
            })}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              Reset
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

export function ParentAnnouncementCard({
  announcement,
  childrenList,
  onSelectAnnouncement,
}: {
  announcement: AnnouncementResponse;
  childrenList: LinkedChildSummaryResponse[];
  onSelectAnnouncement: (ann: AnnouncementResponse) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const contextInfo = useMemo(
    () => resolveAnnouncementChildContext(announcement, childrenList),
    [announcement, childrenList]
  );

  const attachmentCount = (announcement.attachments ?? []).length;

  return (
    <SurfaceCard
      elevation="subtle"
      onPress={() => onSelectAnnouncement(announcement)}
      style={
        announcement.important
          ? {
              marginBottom: spacing.sm,
              borderColor: colors.warningBorder,
              borderWidth: 1.5,
            }
          : { marginBottom: spacing.sm }
      }
    >
      <View style={[styles.rowBetweenWrap, { gap: 6 }]}>
        <View
          style={[
            styles.rowCenterWrap,
            { gap: 6, flexShrink: 1, minWidth: 0 },
          ]}
        >
          {announcement.important ? (
            <StatusBadge label="Important" tone="warning" />
          ) : null}
          <StatusBadge
            label={contextInfo.scopeBadgeLabel}
            tone={contextInfo.scopeBadgeTone}
          />
          {attachmentCount > 0 ? (
            <View
              style={[
                styles.attachmentPill,
                {
                  backgroundColor: colors.backgroundSubtle,
                  borderColor: colors.border,
                  borderRadius: radius.full,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                },
              ]}
            >
              <Paperclip size={11} color={colors.textSecondary} />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: typography.fontWeights.semibold,
                  marginLeft: 4,
                }}
              >
                {attachmentCount} {attachmentCount === 1 ? 'file' : 'files'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.rowCenter, { flexShrink: 0 }]}>
          <Calendar size={iconSizes.xs} color={colors.textMuted} />
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.fontSizes.xs,
              marginLeft: 4,
            }}
          >
            {formatAnnouncementDate(announcement.publicationDate)}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={2}
        style={{
          color: colors.textPrimary,
          fontSize: typography.fontSizes.base,
          fontWeight: typography.fontWeights.bold,
          marginTop: spacing.xs + 2,
        }}
      >
        {announcement.title}
      </Text>

      <Text
        numberOfLines={3}
        style={{
          color: colors.textSecondary,
          fontSize: typography.fontSizes.sm,
          lineHeight: typography.lineHeights.sm,
          marginTop: 4,
        }}
      >
        {announcement.description}
      </Text>

      <View
        style={[
          styles.cardFooterRow,
          {
            borderTopColor: colors.borderSubtle,
            marginTop: spacing.sm,
            paddingTop: spacing.xs + 2,
            gap: 8,
          },
        ]}
      >
        <View
          style={[
            styles.rowCenter,
            { flex: 1, minWidth: 0, marginRight: spacing.xs },
          ]}
        >
          <Users size={iconSizes.xs} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginLeft: 5,
              flex: 1,
            }}
          >
            {contextInfo.appliesToLabel}
          </Text>
        </View>

        <View style={[styles.rowCenter, { flexShrink: 0 }]}>
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSizes.xs,
              fontWeight: typography.fontWeights.bold,
            }}
          >
            Read More
          </Text>
          <ChevronRight size={iconSizes.sm} color={colors.primary} />
        </View>
      </View>
    </SurfaceCard>
  );
}

export function ParentAnnouncementsListSection({
  items,
  totalOriginalCount,
  childrenList,
  activeScopeFilter,
  hasSearchQuery,
  onSelectAnnouncement,
  onResetFilters,
}: {
  items: AnnouncementResponse[];
  totalOriginalCount: number;
  childrenList: LinkedChildSummaryResponse[];
  activeScopeFilter: AnnouncementScopeFilter;
  hasSearchQuery: boolean;
  onSelectAnnouncement: (ann: AnnouncementResponse) => void;
  onResetFilters: () => void;
}) {
  const { colors, iconSizes } = useAppTheme();

  if (totalOriginalCount === 0) {
    return (
      <EmptyState
        icon={<Bell size={iconSizes.xl} color={colors.primary} />}
        title="No Announcements Yet"
        description="Published school notices, circulars, and class updates will appear here."
      />
    );
  }

  if (items.length === 0) {
    const emptyTitle = hasSearchQuery
      ? 'No Matching Announcements'
      : activeScopeFilter === 'IMPORTANT'
      ? 'No Important Announcements'
      : 'No Announcements Found';
    const emptyDesc = hasSearchQuery
      ? 'No announcements match your search query or active filter.'
      : activeScopeFilter === 'IMPORTANT'
      ? 'There are no high-priority announcements right now.'
      : 'No announcements match the selected filter.';

    return (
      <EmptyState
        icon={<Bell size={iconSizes.xl} color={colors.primary} />}
        title={emptyTitle}
        description={emptyDesc}
        actionLabel="Show All"
        onActionPress={onResetFilters}
      />
    );
  }

  return (
    <View>
      {items.map((ann) => (
        <ParentAnnouncementCard
          key={ann.id}
          announcement={ann}
          childrenList={childrenList}
          onSelectAnnouncement={onSelectAnnouncement}
        />
      ))}
    </View>
  );
}

async function saveOrShareDownloadedBlob(
  result: AuthorizedAttachmentDownloadResult
): Promise<string> {
  if (Platform.OS === 'web') {
    if (result.blob && typeof document !== 'undefined') {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || 'announcement-attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return `Downloaded ${result.filename}`;
    }
    throw new Error('Browser file download is not available.');
  }

  const safeName = (result.filename || 'attachment').replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );
  const targetUri = `${FileSystem.cacheDirectory ?? ''}${Date.now()}_${safeName}`;
  const downloadRes = await FileSystem.downloadAsync(
    result.authorizedSource.uri,
    targetUri,
    { headers: result.authorizedSource.headers }
  );

  try {
    await Share.share({
      title: result.filename,
      url: downloadRes.uri,
      message: result.filename,
    });
    return `Opened ${result.filename}`;
  } catch {
    return `Saved to ${downloadRes.uri}`;
  }
}

export function ParentAnnouncementDetailModal({
  visible,
  organizationId,
  organizationName,
  announcement,
  childrenList,
  onClose,
}: {
  visible: boolean;
  organizationId: number;
  organizationName?: string | null;
  announcement: AnnouncementResponse | null;
  childrenList: LinkedChildSummaryResponse[];
  onClose: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(
    null
  );
  const [previewFile, setPreviewFile] = useState<{
    file: StoredFileResponse;
    result: AuthorizedAttachmentDownloadResult;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: 'success' | 'danger';
    message: string;
  } | null>(null);

  if (!announcement) return null;

  const contextInfo = resolveAnnouncementChildContext(
    announcement,
    childrenList
  );
  const attachments = announcement.attachments ?? [];

  const handleOpenOrDownloadAttachment = async (
    file: StoredFileResponse,
    mode: 'PREVIEW' | 'DOWNLOAD'
  ) => {
    setActionFeedback(null);
    setDownloadingFileId(file.id);
    try {
      const result =
        await parentPortalApi.downloadParentAnnouncementAttachment(
          organizationId,
          announcement.id,
          file.id,
          file.originalFilename || `attachment-${file.id}`,
          file.contentType || 'application/octet-stream'
        );

      const isImage = (result.contentType || '').startsWith('image/');
      const hasText = Boolean(result.textPreview);

      if (mode === 'PREVIEW' && (isImage || hasText)) {
        setPreviewFile({ file, result });
      } else {
        const msg = await saveOrShareDownloadedBlob(result);
        setActionFeedback({ tone: 'success', message: msg });
      }
    } catch (err) {
      setActionFeedback({
        tone: 'danger',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to open or download attachment.',
      });
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleClose = () => {
    setPreviewFile(null);
    setActionFeedback(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.modalOverlay,
          { backgroundColor: colors.overlayScrim, padding: spacing.md },
        ]}
      >
        <SurfaceCard
          style={{
            ...styles.modalSheet,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          }}
        >
          <View style={[styles.rowBetweenWrap, { marginBottom: spacing.sm }]}>
            <View
              style={[
                styles.rowCenterWrap,
                { gap: 6, flex: 1, minWidth: 0, marginRight: spacing.xs },
              ]}
            >
              {announcement.important ? (
                <StatusBadge label="Important" tone="warning" />
              ) : null}
              <StatusBadge
                label={contextInfo.scopeBadgeLabel}
                tone={contextInfo.scopeBadgeTone}
              />
              {organizationName ? (
                <StatusBadge label={organizationName} tone="neutral" />
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close announcement details"
              hitSlop={8}
              onPress={handleClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.full,
                  padding: 6,
                },
              ]}
            >
              <X size={iconSizes.sm} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {announcement.title}
            </Text>

            <View
              style={[
                styles.metaBox,
                {
                  backgroundColor: colors.backgroundSubtle,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  marginTop: spacing.sm,
                  gap: 4,
                },
              ]}
            >
              <View style={[styles.rowBetweenWrap, { gap: 6 }]}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  Published:{' '}
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    {formatAnnouncementDate(announcement.publicationDate)}
                  </Text>
                </Text>
                {announcement.expiryDate ? (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: typography.fontSizes.xs,
                    }}
                  >
                    Valid until {formatAnnouncementDate(announcement.expiryDate)}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.rowCenter, { marginTop: 2 }]}>
                <Users size={iconSizes.xs} color={colors.primary} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginLeft: 5,
                    flex: 1,
                  }}
                >
                  {contextInfo.appliesToLabel}
                </Text>
              </View>
            </View>

            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.fontSizes.sm,
                lineHeight: typography.lineHeights.base,
                marginTop: spacing.md,
              }}
            >
              {announcement.description}
            </Text>

            {actionFeedback ? (
              <FeedbackBanner
                tone={actionFeedback.tone}
                message={actionFeedback.message}
                style={{ marginTop: spacing.md }}
              />
            ) : null}

            {previewFile ? (
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: colors.backgroundSubtle,
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    padding: spacing.sm,
                    marginTop: spacing.md,
                  },
                ]}
              >
                <View
                  style={[styles.rowBetweenWrap, { marginBottom: spacing.xs }]}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.bold,
                      flex: 1,
                      marginRight: 8,
                    }}
                  >
                    Preview: {previewFile.file.originalFilename}
                  </Text>
                  <Pressable onPress={() => setPreviewFile(null)}>
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: typography.fontSizes.xs,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      Close Preview
                    </Text>
                  </Pressable>
                </View>
                {(previewFile.result.contentType || '').startsWith('image/') ? (
                  <Image
                    source={previewFile.result.authorizedSource}
                    resizeMode="contain"
                    style={styles.previewImage}
                  />
                ) : previewFile.result.textPreview ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                    }}
                  >
                    {previewFile.result.textPreview}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {attachments.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.bold,
                    marginBottom: spacing.xs,
                  }}
                >
                  Attachments ({attachments.length})
                </Text>
                <View style={{ gap: spacing.xs }}>
                  {attachments.map((att) => {
                    const isBusy = downloadingFileId === att.id;
                    const canInlinePreview =
                      (att.contentType || '').startsWith('image/') ||
                      (att.contentType || '').startsWith('text/') ||
                      (att.contentType || '').includes('csv');
                    const sizeText = formatAttachmentSize(att.sizeBytes);

                    return (
                      <View
                        key={att.id}
                        style={[
                          styles.attachmentRow,
                          {
                            backgroundColor: colors.backgroundSubtle,
                            borderColor: colors.border,
                            borderRadius: radius.md,
                            padding: spacing.sm,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.rowCenter,
                            { flex: 1, minWidth: 0, marginRight: spacing.xs },
                          ]}
                        >
                          <FileText
                            size={iconSizes.sm}
                            color={colors.primary}
                          />
                          <View
                            style={{
                              marginLeft: spacing.xs,
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <Text
                              numberOfLines={1}
                              style={{
                                color: colors.textPrimary,
                                fontSize: typography.fontSizes.xs,
                                fontWeight: typography.fontWeights.semibold,
                              }}
                            >
                              {att.originalFilename}
                            </Text>
                            {sizeText ? (
                              <Text
                                style={{
                                  color: colors.textMuted,
                                  fontSize: 11,
                                  marginTop: 1,
                                }}
                              >
                                {sizeText}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        {isBusy ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.primary}
                          />
                        ) : (
                          <View style={[styles.rowCenter, { gap: 6 }]}>
                            {canInlinePreview ? (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Preview ${att.originalFilename}`}
                                onPress={() =>
                                  void handleOpenOrDownloadAttachment(
                                    att,
                                    'PREVIEW'
                                  )
                                }
                                style={[
                                  styles.attActionBtn,
                                  {
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                    borderRadius: radius.sm,
                                    paddingHorizontal: 8,
                                    paddingVertical: 5,
                                  },
                                ]}
                              >
                                <Eye size={13} color={colors.textPrimary} />
                              </Pressable>
                            ) : null}
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Download ${att.originalFilename}`}
                              onPress={() =>
                                void handleOpenOrDownloadAttachment(
                                  att,
                                  'DOWNLOAD'
                                )
                              }
                              style={[
                                styles.attActionBtn,
                                {
                                  backgroundColor: colors.primarySoft,
                                  borderColor: colors.primarySoftBorder,
                                  borderRadius: radius.sm,
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                },
                              ]}
                            >
                              <Download
                                size={13}
                                color={colors.primaryText}
                              />
                              <Text
                                style={{
                                  color: colors.primaryText,
                                  fontSize: 11,
                                  fontWeight: typography.fontWeights.bold,
                                  marginLeft: 4,
                                }}
                              >
                                Open
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={{ marginTop: spacing.md }}>
            <AppButton
              label="Close"
              variant="secondary"
              fullWidth
              onPress={handleClose}
            />
          </View>
        </SurfaceCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowCenterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rowBetweenWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 36,
  },
  filterChipCountBadge: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  activeFilterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    borderWidth: 1,
  },
  modalScroll: {
    maxHeight: 460,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBox: {
    borderWidth: 1,
  },
  previewBox: {
    borderWidth: 1,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  attActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});




