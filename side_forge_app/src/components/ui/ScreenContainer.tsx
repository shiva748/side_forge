import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  keyboardAware?: boolean;
  keyboardAvoiding?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentContainerStyle?: ViewStyle;
  header?: React.ReactNode;
}

export function ScreenContainer({
  children,
  scroll = true,
  keyboardAware = false,
  keyboardAvoiding = false,
  refreshing = false,
  onRefresh,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
  header,
}: ScreenContainerProps) {
  const isKeyboardAware = keyboardAware || keyboardAvoiding;
  const { colors } = useAppTheme();
  const { horizontalPadding, verticalPadding, contentMaxWidth, isTablet } =
    useResponsiveLayout();

  const responsiveWrapperStyle: ViewStyle = {
    width: '100%',
    maxWidth: isTablet ? contentMaxWidth : undefined,
    alignSelf: 'center',
    paddingHorizontal: horizontalPadding,
    paddingTop: verticalPadding,
    paddingBottom: verticalPadding + 20,
  };

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
      contentContainerStyle={[
        styles.scrollContent,
        responsiveWrapperStyle,
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, responsiveWrapperStyle, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      {header}
      {isKeyboardAware ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
