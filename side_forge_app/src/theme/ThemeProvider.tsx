import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { STORAGE_KEYS } from '@/constants/env';
import { secureStorage } from '@/utils/secureStorage';
import {
  useResponsiveLayout,
  type ResponsiveLayoutInfo,
} from '@/hooks/useResponsiveLayout';
import {
  AppTheme,
  DARK_COLORS,
  ICON_SIZES,
  LIGHT_COLORS,
  RADIUS,
  ResolvedThemeMode,
  SPACING,
  TOUCH_TARGETS,
  TYPOGRAPHY,
  ThemePreference,
} from './tokens';

interface ThemeContextValue extends AppTheme {
  resolvedScheme: ResolvedThemeMode;
  layout: ResponsiveLayoutInfo;
  isHydrated: boolean;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isValidThemePreference(val: string | null): val is ThemePreference {
  return val === 'system' || val === 'light' || val === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const layout = useResponsiveLayout();

  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const syncStored = secureStorage.getSync(STORAGE_KEYS.THEME_PREFERENCE);
    return isValidThemePreference(syncStored) ? syncStored : 'system';
  });
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    secureStorage
      .getAsync(STORAGE_KEYS.THEME_PREFERENCE)
      .then((stored) => {
        if (!mounted) return;
        if (isValidThemePreference(stored)) {
          setPreferenceState(stored);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsHydrated(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    if (preference === 'light') return 'light';
    if (preference === 'dark') return 'dark';
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }, [preference, systemColorScheme]);

  const colors = resolvedMode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {
      // Ignore if native system UI background cannot be updated in current environment
    });
  }, [colors.background]);

  const setThemePreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await secureStorage.setAsync(STORAGE_KEYS.THEME_PREFERENCE, next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: resolvedMode,
      resolvedScheme: resolvedMode,
      preference,
      isDark: resolvedMode === 'dark',
      colors,
      spacing: SPACING,
      radius: RADIUS,
      typography: TYPOGRAPHY,
      iconSizes: ICON_SIZES,
      touchTargets: TOUCH_TARGETS,
      layout,
      isHydrated,
      setThemePreference,
    }),
    [resolvedMode, preference, colors, layout, isHydrated, setThemePreference]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
