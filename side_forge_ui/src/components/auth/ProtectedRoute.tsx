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
    activeWorkspace,
    activeOrganization,
    availableWorkspaces,
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

  // If the user has no valid workspace contexts at all, route to onboarding-status
  if (workspace && availableWorkspaces.length === 0) {
    return (
      <Navigate
        to="/onboarding-status"
        state={{
          reason: 'NO_ACTIVE_WORKSPACE',
          message:
            'Your account does not currently have an active membership in any school organization or platform role.',
        }}
        replace
      />
    );
  }

  // If a specific workspace type is required, ensure the active context matches and is valid
  if (workspace === 'PLATFORM') {
    if (!hasPlatformAccess) {
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
    if (activeWorkspace !== 'PLATFORM') {
      return (
        <Navigate
          to="/workspaces"
          state={{
            from: location,
            reason: 'WORKSPACE_SELECTION_REQUIRED',
            message: 'Please select the Platform Administration workspace to continue.',
          }}
          replace
        />
      );
    }
  }

  if (workspace === 'SCHOOL') {
    if (activeMemberships.length === 0) {
      return (
        <Navigate
          to={hasPlatformAccess ? '/workspaces' : '/onboarding-status'}
          state={{
            reason: 'NO_ACTIVE_ORGANIZATION',
            message:
              'Your account does not currently have an active membership in any school organization.',
          }}
          replace
        />
      );
    }
    if (activeWorkspace !== 'SCHOOL' || !activeOrganization) {
      return (
        <Navigate
          to="/workspaces"
          state={{
            from: location,
            reason: 'WORKSPACE_SELECTION_REQUIRED',
            message: 'Please select an active school workspace to continue.',
          }}
          replace
        />
      );
    }
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
