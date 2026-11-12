import { useCallback } from 'react';
import {
  useGlobalSearchParams,
  usePathname,
  useRouter,
  type Href,
} from 'expo-router';
import type { MobileRoleExperience } from '@/types/auth';

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
  const currentSection =
    typeof globalParams.section === 'string' && globalParams.section.length > 0
      ? globalParams.section
      : null;

  const navigateTo = useCallback(
    (
      href: string,
      options?: { replace?: boolean; params?: Record<string, string> }
    ) => {
      const targetNormalized = normalizeRoutePath(href);
      const currentNormalized = normalizeRoutePath(pathname || '/');
      const targetSection = options?.params?.section ?? null;

      // Prevent duplicate navigation when already on the exact same route and section
      if (
        targetNormalized === currentNormalized &&
        targetSection === currentSection
      ) {
        return;
      }

      // When navigating to a base route (no section param) from a sectioned state
      // on the same path, explicitly clear `section` so the screen updates.
      const effectiveParams =
        options?.params ??
        (targetNormalized === currentNormalized && currentSection
          ? { section: '' }
          : undefined);

      const fullHref = (
        effectiveParams
          ? { pathname: href as string, params: effectiveParams }
          : href
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
        href.startsWith('/(parent)') ||
        href.startsWith('/(teacher)') ||
        href.startsWith('/(admin)')
      ) {
        router.navigate(fullHref);
        return;
      }

      router.push(fullHref);
    },
    [pathname, currentSection, router]
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

