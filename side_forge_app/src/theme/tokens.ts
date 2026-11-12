import { Platform, ViewStyle } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  backgroundSubtle: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  surfaceInteractivePressed: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textOnPrimary: string;

  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primarySoftBorder: string;
  primaryText: string;

  secondarySurface: string;
  secondarySurfacePressed: string;
  secondaryBorder: string;
  secondaryText: string;

  border: string;
  borderSubtle: string;
  borderFocus: string;
  separator: string;

  inputBackground: string;
  inputDisabledBackground: string;
  inputBorder: string;
  inputPlaceholder: string;

  success: string;
  successSoft: string;
  successBorder: string;
  successText: string;

  warning: string;
  warningSoft: string;
  warningBorder: string;
  warningText: string;

  danger: string;
  dangerPressed: string;
  dangerSoft: string;
  dangerBorder: string;
  dangerText: string;

  info: string;
  infoSoft: string;
  infoBorder: string;
  infoText: string;

  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  headerBackground: string;
  headerBorder: string;
  overlayScrim: string;
  sheetHandle: string;

  disabledBackground: string;
  disabledText: string;
}

export const LIGHT_COLORS: ThemeColors = {
  background: '#F8FAFC',
  backgroundSubtle: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  surfaceInteractivePressed: '#F1F5F9',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  primary: '#3730A3',
  primaryPressed: '#312E81',
  primarySoft: '#EEF2FF',
  primarySoftBorder: '#C7D2FE',
  primaryText: '#3730A3',

  secondarySurface: '#FFFFFF',
  secondarySurfacePressed: '#F8FAFC',
  secondaryBorder: '#CBD5E1',
  secondaryText: '#1E293B',

  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderFocus: '#4F46E5',
  separator: '#E2E8F0',

  inputBackground: '#FFFFFF',
  inputDisabledBackground: '#F1F5F9',
  inputBorder: '#CBD5E1',
  inputPlaceholder: '#94A3B8',

  success: '#059669',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',
  successText: '#065F46',

  warning: '#D97706',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',

  danger: '#DC2626',
  dangerPressed: '#B91C1C',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#991B1B',

  info: '#2563EB',
  infoSoft: '#EFF6FF',
  infoBorder: '#BFDBFE',
  infoText: '#1E40AF',

  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#3730A3',
  tabBarInactive: '#64748B',
  headerBackground: '#FFFFFF',
  headerBorder: '#E2E8F0',
  overlayScrim: 'rgba(15, 23, 42, 0.45)',
  sheetHandle: '#CBD5E1',

  disabledBackground: '#E2E8F0',
  disabledText: '#94A3B8',
};

export const DARK_COLORS: ThemeColors = {
  background: '#0B1120',
  backgroundSubtle: '#111827',
  surface: '#151F32',
  surfaceElevated: '#1E293B',
  surfaceMuted: '#1E293B',
  surfaceInteractivePressed: '#263449',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#0F172A',
  textOnPrimary: '#FFFFFF',

  primary: '#6366F1',
  primaryPressed: '#4F46E5',
  primarySoft: 'rgba(99, 102, 241, 0.16)',
  primarySoftBorder: 'rgba(129, 140, 248, 0.32)',
  primaryText: '#A5B4FC',

  secondarySurface: '#1E293B',
  secondarySurfacePressed: '#263449',
  secondaryBorder: '#334155',
  secondaryText: '#F1F5F9',

  border: '#1E293B',
  borderSubtle: '#162032',
  borderFocus: '#818CF8',
  separator: '#1E293B',

  inputBackground: '#111827',
  inputDisabledBackground: '#1E293B',
  inputBorder: '#334155',
  inputPlaceholder: '#64748B',

  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.14)',
  successBorder: 'rgba(52, 211, 153, 0.30)',
  successText: '#6EE7B7',

  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  warningBorder: 'rgba(251, 191, 36, 0.30)',
  warningText: '#FCD34D',

  danger: '#EF4444',
  dangerPressed: '#DC2626',
  dangerSoft: 'rgba(239, 68, 68, 0.14)',
  dangerBorder: 'rgba(248, 113, 113, 0.30)',
  dangerText: '#FCA5A5',

  info: '#3B82F6',
  infoSoft: 'rgba(59, 130, 246, 0.14)',
  infoBorder: 'rgba(96, 165, 250, 0.30)',
  infoText: '#93C5FD',

  tabBarBackground: '#111827',
  tabBarBorder: '#1E293B',
  tabBarActive: '#818CF8',
  tabBarInactive: '#94A3B8',
  headerBackground: '#111827',
  headerBorder: '#1E293B',
  overlayScrim: 'rgba(2, 6, 23, 0.72)',
  sheetHandle: '#475569',

  disabledBackground: '#1E293B',
  disabledText: '#64748B',
};


export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const TYPOGRAPHY = {
  fontSizes: {
    xs: 12,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 26,
  },
  lineHeights: {
    xs: 16,
    sm: 18,
    base: 22,
    md: 24,
    lg: 26,
    xl: 30,
    xxl: 34,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const TOUCH_TARGETS = {
  minHeight: 44,
  inputHeight: 48,
  buttonHeightSm: 38,
  buttonHeightMd: 46,
  buttonHeightLg: 52,
} as const;

export function getElevationStyle(
  mode: ResolvedThemeMode,
  level: 'none' | 'subtle' | 'card' | 'sheet' = 'card'
): ViewStyle {
  if (level === 'none') {
    return {};
  }
  if (mode === 'dark') {
    return {
      borderWidth: 1,
      borderColor: level === 'sheet' ? '#334155' : '#1E293B',
    };
  }
  if (level === 'subtle') {
    return (
      Platform.select<ViewStyle>({
        ios: {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
        },
        android: {
          elevation: 1,
        },
        default: {},
      }) ?? {}
    );
  }
  if (level === 'sheet') {
    return (
      Platform.select<ViewStyle>({
        ios: {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
        default: {},
      }) ?? {}
    );
  }
  return (
    Platform.select<ViewStyle>({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }) ?? {}
  );
}

export interface AppTheme {
  mode: ResolvedThemeMode;
  preference: ThemePreference;
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  typography: typeof TYPOGRAPHY;
  iconSizes: typeof ICON_SIZES;
  touchTargets: typeof TOUCH_TARGETS;
}
