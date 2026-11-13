import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileSpreadsheet,
  GraduationCap,
  Ticket,
  Users,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import type {
  NotificationCategory,
  NotificationItem,
} from '@/types/notification';
import type { LinkedChildSummaryResponse } from '@/types/parentPortal';
import {
  AppButton,
  type BadgeTone,
  EmptyState,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export type NotificationReadFilter = 'ALL' | 'UNREAD' | 'READ';

export type NotificationCategoryFilter = 'ALL' | NotificationCategory;

export interface ResolvedNotificationDestination {
  kind:
    | 'OPEN_ANNOUNCEMENT'
    | 'SWITCH_TO_ANNOUNCEMENTS'
    | 'NAVIGATE'
    | 'NONE';
  href?: string;
  params?: Record<string, string>;
  announcementId?: number | null;
  matchedChildId?: number | null;
  matchedChildName?: string | null;
  actionLabel: string | null;
}

export const PARENT_NOTIFICATION_CATEGORIES: Array<{
  key: NotificationCategoryFilter;
  label: string;
}> = [
  { key: 'ALL', label: 'All Categories' },
  { key: 'ANNOUNCEMENT', label: 'Announcements' },
  { key: 'ATTENDANCE', label: 'Attendance' },
  { key: 'HOMEWORK', label: 'Homework' },
  { key: 'EXAMINATION', label: 'Exams' },
  { key: 'FEES', label: 'Fees' },
  { key: 'TIMETABLE', label: 'Timetable' },
  { key: 'INVITATION', label: 'Invitations' },
];

export function formatNotificationCategoryMeta(category?: string | null): {
  label: string;
  tone: BadgeTone;
  Icon: typeof Bell;
} {
  switch ((category || '').toUpperCase()) {
    case 'ANNOUNCEMENT':
      return { label: 'Announcement', tone: 'primary', Icon: Bell };
    case 'ATTENDANCE':
      return { label: 'Attendance', tone: 'warning', Icon: CalendarCheck };
    case 'HOMEWORK':
      return { label: 'Homework', tone: 'info', Icon: FileSpreadsheet };
    case 'EXAMINATION':
    case 'EXAM':
      return { label: 'Exams & Results', tone: 'success', Icon: GraduationCap };
    case 'FEES':
      return { label: 'Fees & Finance', tone: 'warning', Icon: CreditCard };
    case 'TIMETABLE':
      return { label: 'Timetable', tone: 'primary', Icon: Calendar };
    case 'INVITATION':
      return { label: 'Invitation', tone: 'info', Icon: Ticket };
    case 'ACADEMIC':
      return { label: 'Academic', tone: 'neutral', Icon: BookOpen };
    default:
      return { label: 'School Update', tone: 'neutral', Icon: Bell };
  }
}

export function formatNotificationTimestamp(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    const now = Date.now();
    const diffMs = now - dt.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins >= 0 && diffMins < 1) return 'Just now';
    if (diffMins >= 1 && diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours >= 1 && diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays >= 1 && diffDays < 7) return `${diffDays}d ago`;
    return dt.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function resolveParentNotificationDestination(
  item: NotificationItem,
  childrenList: LinkedChildSummaryResponse[]
): ResolvedNotificationDestination {
  let matchedChildId: number | null = null;
  let matchedChildName: string | null = null;

  const navUrl = item.navigationUrl || '';
  const studentUrlMatch = navUrl.match(/\/students\/(\d+)/i);
  if (studentUrlMatch && studentUrlMatch[1]) {
    const parsedId = Number(studentUrlMatch[1]);
    if (!Number.isNaN(parsedId) && parsedId > 0) {
      matchedChildId = parsedId;
      const found = childrenList.find((c) => c.studentId === parsedId);
      if (found) {
        matchedChildName = `${found.firstName}${
          found.lastName ? ` ${found.lastName}` : ''
        }`;
      }
    }
  }

  if (!matchedChildId && childrenList.length > 0) {
    const combinedText = `${item.title || ''} ${
      item.message || ''
    }`.toLowerCase();
    for (const child of childrenList) {
      const full = `${child.firstName}${
        child.lastName ? ` ${child.lastName}` : ''
      }`.toLowerCase();
      if (
        (full && combinedText.includes(full)) ||
        (child.firstName &&
          child.firstName.length >= 3 &&
          combinedText.includes(child.firstName.toLowerCase()))
      ) {
        matchedChildId = child.studentId;
        matchedChildName = `${child.firstName}${
          child.lastName ? ` ${child.lastName}` : ''
        }`;
        break;
      }
    }
  }

  const resType = (item.resourceType || '').toUpperCase();
  const cat = (item.category || '').toUpperCase();

  if (resType === 'ANNOUNCEMENT' && item.resourceId) {
    return {
      kind: 'OPEN_ANNOUNCEMENT',
      announcementId: item.resourceId,
      matchedChildId,
      matchedChildName,
      actionLabel: 'View Announcement',
    };
  }

  if (resType === 'SCHOOL_NOTICE' || cat === 'ANNOUNCEMENT') {
    return {
      kind: 'SWITCH_TO_ANNOUNCEMENTS',
      matchedChildId,
      matchedChildName,
      actionLabel: 'View Announcements',
    };
  }

  if (
    resType === 'HOMEWORK' ||
    resType === 'HOMEWORK_SUBMISSION' ||
    cat === 'HOMEWORK'
  ) {
    return {
      kind: 'NAVIGATE',
      href: '/(parent)/academics',
      params: { section: 'homework' },
      matchedChildId,
      matchedChildName,
      actionLabel: 'Open Homework',
    };
  }

  if (resType === 'EXAMINATION' || cat === 'EXAMINATION' || cat === 'EXAM') {
    return {
      kind: 'NAVIGATE',
      href: '/(parent)/academics',
      params: { section: 'exams' },
      matchedChildId,
      matchedChildName,
      actionLabel: 'Open Exams & Results',
    };
  }

  if (resType === 'TIMETABLE' || cat === 'TIMETABLE') {
    return {
      kind: 'NAVIGATE',
      href: '/(parent)/academics',
      params: { section: 'timetable' },
      matchedChildId,
      matchedChildName,
      actionLabel: 'Open Timetable',
    };
  }

  if (resType === 'STUDENT_ATTENDANCE' || cat === 'ATTENDANCE') {
    return {
      kind: 'NAVIGATE',
      href: '/(parent)/attendance',
      matchedChildId,
      matchedChildName,
      actionLabel: 'Open Attendance',
    };
  }

  if (
    resType === 'FEE_DEMAND' ||
    resType === 'FEE_PAYMENT' ||
    cat === 'FEES'
  ) {
    return {
      kind: 'NAVIGATE',
      href: '/(parent)/fees',
      matchedChildId,
      matchedChildName,
      actionLabel: 'Open Fees & Receipts',
    };
  }

  if (resType === 'INVITATION' || cat === 'INVITATION') {
    return {
      kind: 'NAVIGATE',
      href: '/invitations',
      matchedChildId,
      matchedChildName,
      actionLabel: 'Open Invitations',
    };
  }

  return {
    kind: 'NONE',
    matchedChildId,
    matchedChildName,
    actionLabel: null,
  };
}

export function ParentNotificationFilterBar({
  readFilter,
  onSelectReadFilter,
  categoryFilter,
  onSelectCategoryFilter,
  unreadCount,
  markingAllRead,
  onMarkAllRead,
}: {
  readFilter: NotificationReadFilter;
  onSelectReadFilter: (filter: NotificationReadFilter) => void;
  categoryFilter: NotificationCategoryFilter;
  onSelectCategoryFilter: (cat: NotificationCategoryFilter) => void;
  unreadCount: number;
  markingAllRead: boolean;
  onMarkAllRead: () => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

  const readOptions: Array<{
    key: NotificationReadFilter;
    label: string;
    badge?: number;
  }> = [
    { key: 'ALL', label: 'All' },
    { key: 'UNREAD', label: 'Unread', badge: unreadCount },
    { key: 'READ', label: 'Read' },
  ];

  return (
    <SurfaceCard elevation="subtle" style={{ marginBottom: spacing.md }}>
      <View
        style={[
          styles.rowBetweenWrap,
          { marginBottom: spacing.sm, gap: spacing.xs },
        ]}
      >
        <View style={[styles.rowCenterWrap, { gap: 6 }]}>
          {readOptions.map((opt) => {
            const isSelected = readFilter === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectReadFilter(opt.key)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surfaceMuted,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: radius.full,
                    paddingVertical: 6,
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
                  {opt.label}
                </Text>
                {typeof opt.badge === 'number' ? (
                  <View
                    style={[
                      styles.filterChipCountBadge,
                      {
                        backgroundColor: isSelected
                          ? colors.primarySoft
                          : opt.badge > 0
                          ? colors.warningSoft
                          : colors.surface,
                        borderColor: isSelected
                          ? 'transparent'
                          : opt.badge > 0
                          ? colors.warningBorder
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
                          : opt.badge > 0
                          ? colors.warningText
                          : colors.textSecondary,
                        fontSize: 11,
                        fontWeight: typography.fontWeights.bold,
                      }}
                    >
                      {opt.badge}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            disabled={markingAllRead}
            onPress={onMarkAllRead}
            style={({ pressed }) => [
              styles.markAllBtn,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primarySoftBorder,
                borderRadius: radius.full,
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
                opacity: markingAllRead ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {markingAllRead ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <CheckCircle2 size={iconSizes.xs} color={colors.primaryText} />
            )}
            <Text
              style={{
                color: colors.primaryText,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
                marginLeft: 5,
              }}
            >
              Mark All Read
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterChipsRow, { gap: 6 }]}
      >
        {PARENT_NOTIFICATION_CATEGORIES.map((cat) => {
          const isSelected = categoryFilter === cat.key;
          return (
            <Pressable
              key={cat.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectCategoryFilter(cat.key)}
              style={({ pressed }) => [
                styles.catChip,
                {
                  backgroundColor: isSelected
                    ? colors.primarySoft
                    : colors.backgroundSubtle,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 5,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: isSelected
                    ? colors.primaryText
                    : colors.textSecondary,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: isSelected
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                }}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SurfaceCard>
  );
}

export function ParentNotificationRow({
  item,
  childrenList,
  markingReadId,
  onMarkRead,
  onPressNotification,
}: {
  item: NotificationItem;
  childrenList: LinkedChildSummaryResponse[];
  markingReadId: number | null;
  onMarkRead: (id: number) => void;
  onPressNotification: (
    item: NotificationItem,
    destination: ResolvedNotificationDestination
  ) => void;
}) {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const catMeta = formatNotificationCategoryMeta(item.category);
  const CatIcon = catMeta.Icon;

  const destination = useMemo(
    () => resolveParentNotificationDestination(item, childrenList),
    [item, childrenList]
  );

  const isUnread = !item.read;
  const isMarking = markingReadId === item.id;
  const hasAction = destination.kind !== 'NONE';

  return (
    <SurfaceCard
      elevation="subtle"
      onPress={
        hasAction || isUnread
          ? () => onPressNotification(item, destination)
          : undefined
      }
      style={{
        marginBottom: spacing.sm,
        borderColor: isUnread ? colors.primary : colors.border,
        borderWidth: isUnread ? 1.5 : 1,
        backgroundColor: isUnread ? colors.surface : colors.backgroundSubtle,
      }}
    >
      <View style={styles.notifTopRow}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isUnread
                ? colors.primarySoft
                : colors.surfaceMuted,
              borderRadius: radius.md,
              marginRight: spacing.sm,
            },
          ]}
        >
          <CatIcon
            size={iconSizes.sm}
            color={isUnread ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[styles.rowBetweenWrap, { gap: 6 }]}>
            <View
              style={[
                styles.rowCenterWrap,
                { gap: 6, flexShrink: 1, minWidth: 0 },
              ]}
            >
              <StatusBadge label={catMeta.label} tone={catMeta.tone} />
              {destination.matchedChildName ? (
                <StatusBadge
                  label={destination.matchedChildName}
                  tone="neutral"
                />
              ) : null}
              {isUnread ? (
                <View style={styles.rowCenter}>
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 11,
                      fontWeight: typography.fontWeights.bold,
                      marginLeft: 4,
                    }}
                  >
                    Unread
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.rowCenter, { flexShrink: 0 }]}>
              <Clock size={11} color={colors.textMuted} />
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 11,
                  marginLeft: 3,
                }}
              >
                {formatNotificationTimestamp(item.createdAt)}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.sm,
              fontWeight: isUnread
                ? typography.fontWeights.bold
                : typography.fontWeights.semibold,
              marginTop: 6,
            }}
          >
            {item.title}
          </Text>

          <Text
            style={{
              color: isUnread ? colors.textPrimary : colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              lineHeight: typography.lineHeights.xs,
              marginTop: 3,
            }}
          >
            {item.message}
          </Text>

          {isUnread || hasAction ? (
            <View
              style={[
                styles.notifFooterRow,
                {
                  borderTopColor: colors.borderSubtle,
                  marginTop: spacing.xs + 4,
                  paddingTop: spacing.xs,
                  gap: 8,
                },
              ]}
            >
              {isUnread ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mark "${item.title}" as read`}
                  disabled={isMarking}
                  onPress={() => onMarkRead(item.id)}
                  style={({ pressed }) => [
                    styles.markReadBtn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                      borderRadius: radius.sm,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      opacity: isMarking ? 0.6 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  {isMarking ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <CheckCircle2 size={12} color={colors.primary} />
                  )}
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 11,
                      fontWeight: typography.fontWeights.semibold,
                      marginLeft: 4,
                    }}
                  >
                    Mark Read
                  </Text>
                </Pressable>
              ) : (
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                  }}
                >
                  Read{' '}
                  {item.readAt ? formatNotificationTimestamp(item.readAt) : ''}
                </Text>
              )}

              {hasAction && destination.actionLabel ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onPressNotification(item, destination)}
                  style={[styles.rowCenter, { marginLeft: 'auto' }]}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: typography.fontWeights.bold,
                    }}
                  >
                    {destination.actionLabel}
                  </Text>
                  <ChevronRight size={iconSizes.sm} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </SurfaceCard>
  );
}

export function ParentNotificationsListSection({
  items,
  childrenList,
  readFilter,
  categoryFilter,
  markingReadId,
  hasMorePages,
  loadingMore,
  onMarkRead,
  onPressNotification,
  onLoadMore,
  onResetFilters,
}: {
  items: NotificationItem[];
  childrenList: LinkedChildSummaryResponse[];
  readFilter: NotificationReadFilter;
  categoryFilter: NotificationCategoryFilter;
  markingReadId: number | null;
  hasMorePages: boolean;
  loadingMore: boolean;
  onMarkRead: (id: number) => void;
  onPressNotification: (
    item: NotificationItem,
    destination: ResolvedNotificationDestination
  ) => void;
  onLoadMore: () => void;
  onResetFilters: () => void;
}) {
  const { colors, spacing, iconSizes } = useAppTheme();
  const hasFilters = readFilter !== 'ALL' || categoryFilter !== 'ALL';

  if (items.length === 0) {
    const emptyMeta = (() => {
      if (readFilter === 'UNREAD' && categoryFilter === 'ALL') {
        return {
          title: 'All Caught Up',
          description: 'You have no unread notifications right now.',
        };
      }
      if (readFilter === 'READ' && categoryFilter === 'ALL') {
        return {
          title: 'No Read Notifications',
          description: 'Notifications you mark as read will appear here.',
        };
      }
      if (hasFilters) {
        return {
          title: 'No Matching Notifications',
          description: 'No notifications match your selected filter.',
        };
      }
      return {
        title: 'No Notifications Yet',
        description:
          'Alerts for announcements, attendance, homework, exams, and fees will appear here.',
      };
    })();

    return (
      <EmptyState
        icon={<Bell size={iconSizes.xl} color={colors.primary} />}
        title={emptyMeta.title}
        description={emptyMeta.description}
        actionLabel={hasFilters ? 'Show All Notifications' : undefined}
        onActionPress={hasFilters ? onResetFilters : undefined}
      />
    );
  }

  return (
    <View>
      {items.map((item) => (
        <ParentNotificationRow
          key={item.id}
          item={item}
          childrenList={childrenList}
          markingReadId={markingReadId}
          onMarkRead={onMarkRead}
          onPressNotification={onPressNotification}
        />
      ))}

      {hasMorePages ? (
        <View style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
          <AppButton
            label={loadingMore ? 'Loading More...' : 'Load Older Notifications'}
            variant="outline"
            fullWidth
            loading={loadingMore}
            onPress={onLoadMore}
          />
        </View>
      ) : null}
    </View>
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
    minHeight: 34,
  },
  filterChipCountBadge: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  catChip: {
    borderWidth: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  notifFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    borderTopWidth: 1,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});







