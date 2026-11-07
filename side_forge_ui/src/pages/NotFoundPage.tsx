import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const NotFoundPage: React.FC = () => {
  const { isAuthenticated, activeWorkspace } = useAuth();
  const workspacePath = activeWorkspace === 'PLATFORM' ? '/platform' : '/app';

  return (
    <div className="min-h-screen bg-stone-50/60 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Compass className="w-6 h-6" />
        </div>

        <Badge variant="neutral" className="mb-2">
          Error 404
        </Badge>

        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Page not found
        </h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          The page or route you requested does not exist or may have been moved.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {isAuthenticated && (
            <Link to={workspacePath}>
              <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Workspace
              </Button>
            </Link>
          )}
          <Link to="/">
            <Button
              variant={isAuthenticated ? 'outline' : 'primary'}
              leftIcon={<Home className="w-4 h-4" />}
            >
              Landing Page
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
