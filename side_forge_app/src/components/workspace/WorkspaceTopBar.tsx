import React, { useState } from 'react';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HamburgerMenuDrawer } from './HamburgerMenuDrawer';

export interface AppShellHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

/**
 * Compact, clean authenticated screen header with a hamburger menu button.
 * Keeps organization switching, role info, and settings inside the slide-over
 * HamburgerMenuDrawer rather than consuming permanent screen space.
 */
export function AppShellHeader({
  title,
  subtitle,
  rightAction,
}: AppShellHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);

  const resolvedSubtitle =
    subtitle ?? activeWorkspace?.organizationName ?? undefined;

  return (
    <>
      <ScreenHeader
        title={title}
        subtitle={resolvedSubtitle}
        showMenuButton
        onMenuPress={() => setDrawerOpen(true)}
        rightAction={rightAction}
      />
      <HamburgerMenuDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

export interface WorkspaceTopBarProps {
  roleLabel: string;
}

/**
 * Legacy export kept as a no-op so any transitional imports do not render
 * a duplicate permanent workspace bar.
 */
export function WorkspaceTopBar(_props: WorkspaceTopBarProps) {
  return null;
}

