import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';

export default function IndexRedirect() {
  const status = useAuthWorkspaceStore((s) => s.status);
  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const needsWorkspaceSelection = useAuthWorkspaceStore(
    (s) => s.needsWorkspaceSelection
  );
  const hasOnlyUnsupportedRoles = useAuthWorkspaceStore(
    (s) => s.hasOnlyUnsupportedRoles
  );

  if (status !== 'AUTHENTICATED') {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsWorkspaceSelection || hasOnlyUnsupportedRoles || !activeWorkspace) {
    return <Redirect href="/workspace-select" />;
  }

  if (activeWorkspace.experience === 'PARENT') {
    return <Redirect href="/(parent)" />;
  }
  if (activeWorkspace.experience === 'TEACHER') {
    return <Redirect href="/(teacher)" />;
  }
  return <Redirect href="/(admin)" />;
}
