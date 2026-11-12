import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, CheckCircle2 } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { notificationApi } from '@/api/notificationApi';
import { registerForPushNotificationsAsync } from '@/services/pushNotifications';
import type { CategoryPreferenceState } from '@/types/notification';
import {
  AppButton,
  FeedbackBanner,
  LoadingStateView,
  ScreenContainer,
  ScreenHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui';

export default function NotificationPreferencesScreen() {
  const { colors, spacing, typography, radius, iconSizes } = useAppTheme();

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
    notificationApi
      .getMyNotificationPreferences()
      .then((res) => {
        if (active) setPreferences(res.preferences ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
      const updated = await notificationApi.updateMyNotificationPreferences({
        preferences: preferences.map((p) => ({
          category: p.category,
          enabled: p.enabled,
          channels: p.enabledChannels,
        })),
      });
      setPreferences(updated.preferences ?? []);
      setFeedback({
        tone: 'success',
        message: 'Notification preferences saved.',
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
    if (result.granted) {
      setPushStatus('Device notifications are enabled for Side Forge.');
    } else {
      setPushStatus(result.reason ?? 'Device notification permission not granted.');
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
            'Verify whether your device allows push alerts for school updates.'}
        </Text>
        <AppButton
          label="Check Device Permission"
          variant="secondary"
          size="sm"
          onPress={handleCheckDeviceNotifications}
        />
      </SurfaceCard>

      {loading ? (
        <LoadingStateView message="Loading notification categories..." />
      ) : preferences.length > 0 ? (
        <SurfaceCard>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.semibold,
              marginBottom: spacing.sm,
            }}
          >
            Alert Categories
          </Text>
          <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
            {preferences.map((pref, idx) => (
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
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    {pref.category.replace(/_/g, ' ')}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      marginTop: 2,
                    }}
                  >
                    Channels: {(pref.enabledChannels ?? ['IN_APP']).join(', ')}
                  </Text>
                </View>
                <StatusBadge
                  label={pref.enabled ? 'Enabled' : 'Muted'}
                  tone={pref.enabled ? 'success' : 'neutral'}
                />
              </Pressable>
            ))}
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
});
