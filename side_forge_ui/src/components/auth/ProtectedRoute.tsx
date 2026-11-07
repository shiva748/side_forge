import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PlatformFeature, WorkspaceType } from '../../types/auth';
import { FullScreenLoader } from '../ui/StateViews';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  workspace?: WorkspaceType;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requiredFeature?: PlatformFeature;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  workspace,
  requiredPermissions,
  requiredRoles,
  requiredFeature,
}) => {
  const {
    isAuthenticated,
    isLoading,
    isOrgContextLoading,
    hasPlatformAccess,
    activeMemberships,
    hasPermission,
    hasRole,
    hasFeature,
  } = useAuth();
  const location = useLocation();

  if (isLoading || isOrgContextLoading) {
    return <FullScreenLoader label="Verifying your session and workspace access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (workspace === 'PLATFORM' && !hasPlatformAccess) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          reason: 'PLATFORM_ACCESS_REQUIRED',
          message:
            'This area requires a Platform Administration role (e.g. SYSTEM_ADMIN, PLATFORM_ADMIN, PLATFORM_SUPPORT, or PLATFORM_FINANCE).',
        }}
        replace
      />
    );
  }

  if (workspace === 'SCHOOL' && activeMemberships.length === 0 && !hasPlatformAccess) {
    return (
      <Navigate
        to="/onboarding-status"
        state={{
          reason: 'NO_ACTIVE_ORGANIZATION',
          message:
            'Your account does not currently have an active membership in any school organization.',
        }}
        replace
      />
    );
  }

  if (requiredRoles && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          reason: 'ROLE_REQUIRED',
          message: `Access requires one of the following roles: ${requiredRoles.join(', ')}.`,
        }}
        replace
      />
    );
  }

  if (
    requiredPermissions &&
    requiredPermissions.length > 0 &&
    !hasPermission(requiredPermissions)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          reason: 'PERMISSION_REQUIRED',
          message: `You do not have the required permission (${requiredPermissions.join(', ')}) in the selected workspace.`,
        }}
        replace
      />
    );
  }

  if (requiredFeature && !hasFeature(requiredFeature)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          reason: 'FEATURE_ENTITLEMENT_REQUIRED',
          message: `The module "${requiredFeature}" is not enabled on your school's current subscription plan.`,
        }}
        replace
      />
    );
  }

  return <>{children}</>;
};
