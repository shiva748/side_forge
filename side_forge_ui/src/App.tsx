import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingStatusPage } from './pages/OnboardingStatusPage';
import { WorkspaceSelectorPage } from './pages/WorkspaceSelectorPage';
import { PlatformOnboardingPage } from './pages/PlatformOnboardingPage';
import { WorkspaceShellPlaceholder } from './pages/WorkspaceShellPlaceholder';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              {/* Public Landing Page (Preserved) */}
              <Route path="/" element={<LandingPage />} />

              {/* Authentication & Registration */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/onboarding-status" element={<OnboardingStatusPage />} />

              {/* Multi-Workspace & Role Context Selection */}
              <Route
                path="/workspaces"
                element={
                  <ProtectedRoute>
                    <WorkspaceSelectorPage />
                  </ProtectedRoute>
                }
              />

              {/* Platform Administration: School Onboarding Requests Management */}
              <Route
                path="/platform"
                element={
                  <ProtectedRoute
                    workspace="PLATFORM"
                    requiredPermissions={['platform.organization.view']}
                  >
                    <PlatformOnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/onboarding"
                element={
                  <ProtectedRoute
                    workspace="PLATFORM"
                    requiredPermissions={['platform.organization.view']}
                  >
                    <PlatformOnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/context"
                element={
                  <ProtectedRoute workspace="PLATFORM">
                    <WorkspaceShellPlaceholder workspace="PLATFORM" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/*"
                element={<Navigate to="/platform/onboarding" replace />}
              />

              {/* School Administration Workspace Shell Placeholder */}
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute workspace="SCHOOL">
                    <WorkspaceShellPlaceholder workspace="SCHOOL" />
                  </ProtectedRoute>
                }
              />

              {/* Access Denied / Unauthorized */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* 404 Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

