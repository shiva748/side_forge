import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { getElevationStyle, useAppTheme } from '@/theme';

export interface BottomSheetModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheetModal({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: BottomSheetModalProps) {
  const { colors, radius, spacing, typography, iconSizes, mode } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.overlayScrim }]}>
        <Pressable style={styles.dismissZone} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xl,
            },
            getElevationStyle(mode, 'sheet'),
          ]}
        >
          <View
            style={[
              styles.handle,
              {
                backgroundColor: colors.sheetHandle,
                marginBottom: spacing.sm,
              },
            ]}
          />
          <View style={[styles.headerRow, { marginBottom: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.fontSizes.lg,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    marginTop: 2,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              hitSlop={10}
              onPress={onClose}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <X size={iconSizes.sm} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollArea}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissZone: {
    flex: 1,
  },
  sheet: {
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flexGrow: 0,
  },
});
