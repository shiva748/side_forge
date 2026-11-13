import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, Building2, CheckCircle2, Globe } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { notificationApi } from '@/api/notificationApi';
import {
  registerForPushNotificationsAsync,
  syncDeviceInstallationWithBackend,
} from '@/services/pushNotifications';
import type {
  CategoryPreferenceState,
  NotificationDeliveryChannel,
} from '@/types/notification';
import {
  AppButton,
  FeedbackBanner,
  LoadingStateView,
  ScreenContainer,
  ScreenHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

const CATEGORY_METADATA: Record<
  string,
  { title: string; description: string }
> = {
  ANNOUNCEMENT: {
    title: 'School Announcements & Circulars',
    description: 'School-wide notices, urgent circulars, and class updates',
  },
  ATTENDANCE: {
    title: 'Student Attendance Alerts',
    description: 'Daily absent alerts and attendance record corrections',
  },
  HOMEWORK: {
    title: 'Homework & Assignments',
    description: 'Newly assigned homework and teacher evaluation feedback',
  },
  EXAMINATION: {
    title: 'Examinations & Report Cards',
    description: 'Exam schedules and published report card results',
  },
  EXAM: {
    title: 'Examinations & Report Cards',
    description: 'Exam schedules and published report card results',
  },
  FEES: {
    title: 'Fees & Payment Receipts',
    description: 'Fee demands, recorded payments, and official receipts',
  },
  TIMETABLE: {
    title: 'Class Timetable Updates',
    description: 'Published class and section timetable revisions',
  },
  ACADEMIC: {
    title: 'General Academic Updates',
    description: 'Academic session, class, and enrollment updates',
  },
  INVITATION: {
    title: 'School Membership & Invitations',
    description: 'School invitations and role assignment notifications',
  },
};

export default function NotificationPreferencesScreen() {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const organizationId = activeWorkspace?.organizationId ?? 0;

  const [scope, setScope] = useState<'SCHOOL' | 'GLOBAL'>(() =>
    organizationId > 0 ? 'SCHOOL' : 'GLOBAL'
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<CategoryPreferenceState[]>([]);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'danger';
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFeedback(null);

    const requestPromise =
      scope === 'SCHOOL' && organizationId > 0
        ? notificationApi.getOrganizationNotificationPreferences(organizationId)
        : notificationApi.getMyNotificationPreferences();

    requestPromise
      .then((res) => {
        if (active) setPreferences(res.preferences ?? []);
      })
      .catch((err) => {
        if (active) {
          setFeedback({
            tone: 'danger',
            message:
              err instanceof Error
                ? err.message
                : 'Unable to load notification preferences.',
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [scope, organizationId]);

  const toggleCategory = (index: number) => {
    setPreferences((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleSave = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      const payload = {
        preferences: preferences.map((p) => {
          const defaultChannels: NotificationDeliveryChannel[] = [
            'IN_APP',
            'PUSH',
          ];
          const mergedChannels: NotificationDeliveryChannel[] = p.enabled
            ? Array.from(
                new Set<NotificationDeliveryChannel>([
                  ...(p.enabledChannels ?? []),
                  ...defaultChannels,
                ])
              )
            : [];
          return {
            category: p.category,
            enabled: p.enabled,
            channels: mergedChannels,
          };
        }),
      };
      const updated =
        scope === 'SCHOOL' && organizationId > 0
          ? await notificationApi.updateOrganizationNotificationPreferences(
              organizationId,
              payload
            )
          : await notificationApi.updateMyNotificationPreferences(payload);

      setPreferences(updated.preferences ?? []);
      setFeedback({
        tone: 'success',
        message:
          scope === 'SCHOOL' && activeWorkspace?.organizationName
            ? `Saved notification preferences for ${activeWorkspace.organizationName}.`
            : 'Saved account-wide notification preferences.',
      });
    } catch (err) {
      setFeedback({
        tone: 'danger',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to update notification preferences.',
      });
    } finally {
      setSaving(false);
    }
  };


  const handleCheckDeviceNotifications = async () => {
    const result = await registerForPushNotificationsAsync();
    await syncDeviceInstallationWithBackend({
      activeOrganizationId: organizationId > 0 ? organizationId : null,
      promptPermission: false,
    });
    if (result.granted) {
      setPushStatus(
        result.nativePushToken
          ? `Device push notifications enabled (${result.tokenProvider} token registered).`
          : 'Device notifications are enabled for Side Forge.'
      );
    } else {
      setPushStatus(
        result.reason ?? 'Device notification permission not granted.'
      );
    }
  };

  return (
    <ScreenContainer
      header={
        <ScreenHeader
          title="Notifications"
          subtitle="Manage alert categories & device permissions"
          showBack
        />
      }
    >
      {feedback ? (
        <FeedbackBanner
          tone={feedback.tone}
          message={feedback.message}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      <SurfaceCard style={{ marginBottom: spacing.md }}>
        <View style={[styles.rowCenter, { marginBottom: spacing.xs }]}>
          <Bell size={iconSizes.md} color={colors.primary} />
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.semibold,
              marginLeft: spacing.xs,
            }}
          >
            Device Push Notifications
          </Text>
        </View>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            marginBottom: spacing.sm,
          }}
        >
          {pushStatus ??
            'Controlled by your phone OS. Enable device push permissions to receive system banner alerts.'}
        </Text>
        <AppButton
          label="Check Device Permission"
          variant="secondary"
          size="sm"
          onPress={handleCheckDeviceNotifications}
        />
      </SurfaceCard>

      {organizationId > 0 ? (
        <View
          style={[
            styles.scopeBar,
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
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: scope === 'SCHOOL' }}
            onPress={() => setScope('SCHOOL')}
            style={[
              styles.scopeTab,
              {
                backgroundColor:
                  scope === 'SCHOOL' ? colors.surface : 'transparent',
                borderColor: scope === 'SCHOOL' ? colors.primary : 'transparent',
                borderRadius: radius.sm,
                paddingVertical: spacing.xs + 2,
                paddingHorizontal: spacing.xs,
              },
            ]}
          >
            <Building2
              size={iconSizes.xs}
              color={scope === 'SCHOOL' ? colors.primary : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={{
                color:
                  scope === 'SCHOOL' ? colors.primary : colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                fontWeight:
                  scope === 'SCHOOL'
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                marginLeft: 5,
              }}
            >
              {activeWorkspace?.organizationName ?? 'Current School'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: scope === 'GLOBAL' }}
            onPress={() => setScope('GLOBAL')}
            style={[
              styles.scopeTab,
              {
                backgroundColor:
                  scope === 'GLOBAL' ? colors.surface : 'transparent',
                borderColor: scope === 'GLOBAL' ? colors.primary : 'transparent',
                borderRadius: radius.sm,
                paddingVertical: spacing.xs + 2,
                paddingHorizontal: spacing.xs,
              },
            ]}
          >
            <Globe
              size={iconSizes.xs}
              color={scope === 'GLOBAL' ? colors.primary : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={{
                color:
                  scope === 'GLOBAL' ? colors.primary : colors.textSecondary,
                fontSize: typography.fontSizes.xs,
                fontWeight:
                  scope === 'GLOBAL'
                    ? typography.fontWeights.bold
                    : typography.fontWeights.medium,
                marginLeft: 5,
              }}
            >
              Account Defaults
            </Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <LoadingStateView message="Loading notification categories..." />
      ) : preferences.length > 0 ? (
        <SurfaceCard>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            In-App Alert Categories
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSizes.xs,
              marginTop: 2,
              marginBottom: spacing.sm,
            }}
          >
            Choose which school events generate notifications in your inbox.
          </Text>
          <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
            {preferences.map((pref, idx) => {
              const meta = CATEGORY_METADATA[pref.category] ?? {
                title: pref.category.replace(/_/g, ' '),
                description: `Channels: ${(
                  pref.enabledChannels ?? ['IN_APP']
                ).join(', ')}`,
              };

              return (
                <Pressable
                  key={pref.category}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: pref.enabled }}
                  onPress={() => toggleCategory(idx)}
                  style={[
                    styles.prefRow,
                    {
                      backgroundColor: colors.background,
                      borderColor: pref.enabled
                        ? colors.primarySoftBorder
                        : colors.border,
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.sm,
                    },
                  ]}
                >
                  <View
                    style={{ flex: 1, minWidth: 0, marginRight: spacing.xs }}
                  >
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.semibold,
                      }}
                    >
                      {meta.title}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.fontSizes.xs,
                        marginTop: 2,
                      }}
                    >
                      {meta.description}
                    </Text>
                  </View>
                  <StatusBadge
                    label={pref.enabled ? 'Enabled' : 'Muted'}
                    tone={pref.enabled ? 'success' : 'neutral'}
                  />
                </Pressable>
              );
            })}
          </View>
          <AppButton
            label="Save Notification Preferences"
            loading={saving}
            fullWidth
            leftIcon={
              <CheckCircle2 size={iconSizes.sm} color={colors.textOnPrimary} />
            }
            onPress={handleSave}
          />
        </SurfaceCard>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  prefRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  scopeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
