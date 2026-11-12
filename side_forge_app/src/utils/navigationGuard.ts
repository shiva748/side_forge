import { useCallback } from 'react';
import {
  useGlobalSearchParams,
  usePathname,
  useRouter,
  type Href,
} from 'expo-router';
import type { MobileRoleExperience } from '@/types/auth';
import {
  useAuthWorkspaceStore,
  type ParentAcademicSection,
} from '@/store/useAuthWorkspaceStore';

/**
 * Strips route group segments like `/(admin)` or `/(auth)` so paths can be
 * compared reliably against `usePathname()`.
 */
export function normalizeRoutePath(href: string): string {
  const withoutQuery = href.split('?')[0] ?? '';
  const stripped = withoutQuery
    .replace(/\/\([^/]+\)/g, '')
    .replace(/\/index$/, '')
    .replace(/\/+$/, '');
  return stripped.length === 0 ? '/' : stripped;
}

export function getWorkspaceHomeHref(
  experience: MobileRoleExperience
): '/(parent)' | '/(teacher)' | '/(admin)' {
  if (experience === 'PARENT') return '/(parent)';
  if (experience === 'TEACHER') return '/(teacher)';
  return '/(admin)';
}

/**
 * Navigation helper that prevents pushing duplicate instances of the current
 * route or creating recursive Settings / Profile / Workspace navigation stacks.
 */
export function useSafeNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ section?: string }>();
  const parentAcademicSection = useAuthWorkspaceStore(
    (s) => s.parentAcademicSection
  );
  const setParentAcademicSection = useAuthWorkspaceStore(
    (s) => s.setParentAcademicSection
  );

  const urlSection =
    typeof globalParams.section === 'string' && globalParams.section.length > 0
      ? globalParams.section
      : null;

  const currentNormalizedPath = normalizeRoutePath(pathname || '/');
  const currentSection =
    currentNormalizedPath === '/academics'
      ? parentAcademicSection || urlSection
      : urlSection;

  const navigateTo = useCallback(
    (
      href: string,
      options?: { replace?: boolean; params?: Record<string, string> }
    ) => {
      let resolvedHref = href;
      let resolvedParams = options?.params ? { ...options.params } : undefined;

      const rawNormalized = normalizeRoutePath(href);

      // Map direct /(parent)/homework and /(parent)/exams routes to the visible
      // /(parent)/academics tab while synchronizing parentAcademicSection in Zustand
      // so tab switching works 100% reliably across Expo Router & React Navigation.
      if (rawNormalized === '/homework') {
        resolvedHref = '/(parent)/academics';
        resolvedParams = { ...resolvedParams, section: 'homework' };
      } else if (rawNormalized === '/exams') {
        resolvedHref = '/(parent)/academics';
        resolvedParams = { ...resolvedParams, section: 'exams' };
      }

      const targetNormalized = normalizeRoutePath(resolvedHref);
      const currentNormalized = normalizeRoutePath(pathname || '/');
      const targetSection = resolvedParams?.section ?? null;

      if (
        targetNormalized === '/academics' &&
        (targetSection === 'homework' ||
          targetSection === 'exams' ||
          targetSection === 'timetable' ||
          targetSection === 'attendance')
      ) {
        setParentAcademicSection(targetSection as ParentAcademicSection);
      }

      // Prevent duplicate navigation when already on the exact same route and section
      if (
        targetNormalized === currentNormalized &&
        targetSection === currentSection
      ) {
        return;
      }

      // When navigating to /(parent)/academics, parentAcademicSection in Zustand
      // is the reactive source of truth for the active sub-module (homework, exams,
      // timetable, attendance). Navigating with the plain string '/(parent)/academics'
      // guarantees BottomTabNavigator switches tabs reliably across all platforms.
      if (resolvedHref === '/(parent)/academics') {
        if (options?.replace) {
          router.replace('/(parent)/academics');
        } else {
          router.navigate('/(parent)/academics');
        }
        return;
      }

      // When navigating to a base route (no section param) from a sectioned state
      // on the same path, explicitly clear `section` so the screen updates.
      const effectiveParams =
        resolvedParams ??
        (targetNormalized === currentNormalized && currentSection
          ? { section: '' }
          : undefined);

      const fullHref = (
        effectiveParams
          ? { pathname: resolvedHref as string, params: effectiveParams }
          : resolvedHref
      ) as Href;

      if (options?.replace) {
        router.replace(fullHref);
        return;
      }

      // If navigating to /settings while already inside a /settings/* sub-screen,
      // pop back to Settings Overview instead of stacking duplicate screens.
      if (
        targetNormalized === '/settings' &&
        currentNormalized.startsWith('/settings/')
      ) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/settings');
        }
        return;
      }

      // Avoid stacking utility screens (/profile, /settings, /workspace-select)
      // endlessly on top of each other when switching between them from the drawer.
      const isTargetUtility =
        targetNormalized === '/profile' ||
        targetNormalized.startsWith('/settings') ||
        targetNormalized === '/workspace-select';
      const isCurrentUtility =
        currentNormalized === '/profile' ||
        currentNormalized.startsWith('/settings') ||
        currentNormalized === '/workspace-select';

      if (
        isTargetUtility &&
        isCurrentUtility &&
        !(
          currentNormalized === '/settings' &&
          targetNormalized.startsWith('/settings/')
        )
      ) {
        router.replace(fullHref);
        return;
      }

      // Use router.navigate for tab/group routes so switching between tabs
      // inside /(parent), /(teacher), or /(admin) works reliably in Expo Router.
      if (
        resolvedHref.startsWith('/(parent)') ||
        resolvedHref.startsWith('/(teacher)') ||
        resolvedHref.startsWith('/(admin)')
      ) {
        router.navigate(fullHref);
        return;
      }

      router.push(fullHref);
    },
    [pathname, currentSection, router, setParentAcademicSection]
  );

  const goBackOrFallback = useCallback(
    (fallbackHref: Href = '/') => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(fallbackHref);
      }
    },
    [router]
  );

  const resetToWorkspaceHome = useCallback(
    (experience: MobileRoleExperience) => {
      try {
        if (router.canDismiss()) {
          router.dismissAll();
        }
      } catch {
        // Ignore if no stack to dismiss
      }
      router.replace(getWorkspaceHomeHref(experience));
    },
    [router]
  );

  const resetToLogin = useCallback(() => {
    try {
      if (router.canDismiss()) {
        router.dismissAll();
      }
    } catch {
      // Ignore if no stack to dismiss
    }
    router.replace('/(auth)/login');
  }, [router]);

  return {
    pathname,
    currentSection,
    navigateTo,
    goBackOrFallback,
    resetToWorkspaceHome,
    resetToLogin,
  };
}

