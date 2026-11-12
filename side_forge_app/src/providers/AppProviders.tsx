import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';
import { createAppQueryClient } from '@/api/queryKeys';
import { onUnauthorizedSession } from '@/api/client';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());
  const bootstrapSession = useAuthWorkspaceStore((s) => s.bootstrapSession);
  const handleUnauthorizedSession = useAuthWorkspaceStore(
    (s) => s.handleUnauthorizedSession
  );

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    const unsubscribe = onUnauthorizedSession(() => {
      handleUnauthorizedSession(queryClient);
    });
    return unsubscribe;
  }, [handleUnauthorizedSession, queryClient]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
