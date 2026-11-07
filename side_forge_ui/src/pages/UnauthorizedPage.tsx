import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const UnauthorizedPage: React.FC = () => {
  const {
    isAuthenticated,
    activeWorkspace,
    hasMultipleWorkspaces,
    hasPlatformAccess,
    activeMemberships,
    logout,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state as { reason?: string; message?: string }) || {};
  const reason = state.reason || 'ACCESS_DENIED';
  const message =
    state.message ||
    'You do not have the required permissions or subscription entitlement to view this page.';

  const defaultWorkspacePath =
    activeWorkspace === 'PLATFORM' && hasPlatformAccess
      ? '/platform'
      : activeMemberships.length > 0
      ? '/app'
      : '/workspaces';

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-50/60 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <Badge variant="warning" className="mb-2">
          403 • {reason.replace(/_/g, ' ')}
        </Badge>

        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Access Restricted
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {isAuthenticated ? (
            <>
              <Button
                variant="primary"
                onClick={() => navigate(defaultWorkspacePath)}
                leftIcon={<Building2 className="w-4 h-4" />}
              >
                Return to Workspace
              </Button>
              {hasMultipleWorkspaces && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/workspaces?stay=1')}
                >
                  Switch Workspace
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleSignOut}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Go to Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
