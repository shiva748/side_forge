import { useCallback } from 'react';
import { usePathname, useRouter, type Href } from 'expo-router';
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
 * route or creating recursive Settings <-> Sub-screen navigation stacks.
 */
export function useSafeNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = useCallback(
    (
      href: string,
      options?: { replace?: boolean; params?: Record<string, string> }
    ) => {
      const targetNormalized = normalizeRoutePath(href);
      const currentNormalized = normalizeRoutePath(pathname || '/');

      if (targetNormalized === currentNormalized && !options?.params) {
        return;
      }

      const fullHref = (
        options?.params
          ? { pathname: href as string, params: options.params }
          : href
      ) as Href;

      if (options?.replace) {
        router.replace(fullHref);
        return;
      }

      // If navigating to a top-level utility route (/settings or /workspace-select)
      // while already inside that utility hierarchy, replace/navigate cleanly
      // instead of stacking duplicate screens.
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

      if (
        (targetNormalized.startsWith('/settings') &&
          currentNormalized === '/workspace-select') ||
        (targetNormalized === '/workspace-select' &&
          currentNormalized.startsWith('/settings'))
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
    [pathname, router]
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
    navigateTo,
    goBackOrFallback,
    resetToWorkspaceHome,
    resetToLogin,
  };
}
