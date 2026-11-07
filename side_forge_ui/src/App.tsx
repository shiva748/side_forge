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
import { PlatformDashboardPage } from './pages/PlatformDashboardPage';
import { PlatformOnboardingPage } from './pages/PlatformOnboardingPage';
import { PlatformOrganizationsPage } from './pages/PlatformOrganizationsPage';
import { PlatformSubscriptionsPage } from './pages/PlatformSubscriptionsPage';
import { SchoolDashboardPage } from './pages/SchoolDashboardPage';
import { SchoolAcademicPage } from './pages/SchoolAcademicPage';
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

              {/* Platform Administration: Dashboard & Onboarding Management */}
              <Route
                path="/platform"
                element={
                  <ProtectedRoute
                    workspace="PLATFORM"
                    requiredPermissions={['platform.dashboard.view']}
                  >
                    <PlatformDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/dashboard"
                element={
                  <ProtectedRoute
                    workspace="PLATFORM"
                    requiredPermissions={['platform.dashboard.view']}
                  >
                    <PlatformDashboardPage />
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
                path="/platform/organizations"
                element={
                  <ProtectedRoute
                    workspace="PLATFORM"
                    requiredPermissions={['platform.organization.view']}
                  >
                    <PlatformOrganizationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/platform/subscriptions"
                element={
                  <ProtectedRoute
                    workspace="PLATFORM"
                    requiredPermissions={['platform.subscription.view']}
                  >
                    <PlatformSubscriptionsPage />
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
                element={<Navigate to="/platform" replace />}
              />

              {/* School Administration Workspace */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute workspace="SCHOOL">
                    <SchoolDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/dashboard"
                element={
                  <ProtectedRoute workspace="SCHOOL">
                    <SchoolDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/academics"
                element={
                  <ProtectedRoute
                    workspace="SCHOOL"
                    requiredFeature="ACADEMIC_MANAGEMENT"
                  >
                    <SchoolAcademicPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/context"
                element={
                  <ProtectedRoute workspace="SCHOOL">
                    <WorkspaceShellPlaceholder workspace="SCHOOL" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/*"
                element={<Navigate to="/app" replace />}
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

