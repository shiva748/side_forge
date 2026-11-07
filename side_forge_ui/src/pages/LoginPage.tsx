import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Building2, Eye, EyeOff, Lock, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api-client';
import { Button } from '../components/ui/Button';
import { FormField, Input } from '../components/ui/FormControls';
import { InlineAlert } from '../components/ui/StateViews';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginLocationState {
  from?: { pathname?: string };
  registeredEmail?: string;
  registeredNotice?: string;
}

export const LoginPage: React.FC = () => {
  const { isAuthenticated, activeWorkspace, hasPlatformAccess, activeMemberships, login } =
    useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const locState = (location.state as LoginLocationState) || {};

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: locState.registeredEmail || '', password: '' },
  });

  if (isAuthenticated) {
    const fromPath = locState.from?.pathname;
    const fallback =
      activeWorkspace === 'PLATFORM' && hasPlatformAccess
        ? '/platform'
        : activeMemberships.length > 0
        ? '/app'
        : '/onboarding-status';
    return <Navigate to={fromPath || fallback} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const { defaultRoute } = await login({
        email: values.email.trim(),
        password: values.password,
      });
      toast.success('Signed in successfully', 'Welcome back to SchoolForge.');
      const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(fromPath || defaultRoute, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.status === 401
            ? 'Invalid email address or password. Please try again.'
            : err.message
        );
      } else {
        setServerError('Unable to sign in right now. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/60 bg-grid-pattern flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
            <span className="font-extrabold text-sm tracking-tight">SF</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            School<span className="text-indigo-600">Forge</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </Link>
          <span className="h-3.5 w-px bg-slate-200" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto my-8">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          <div className="space-y-1.5 mb-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Web Portal</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sign in to your account
            </h1>
            <p className="text-sm text-slate-500">
              Access your school workspace or platform administration console.
            </p>
          </div>

          {locState.registeredNotice && !serverError && (
            <div className="mb-5">
              <InlineAlert variant="success" title="Account ready">
                {locState.registeredNotice}
              </InlineAlert>
            </div>
          )}

          {serverError && (
            <div className="mb-5">
              <InlineAlert variant="error" title="Sign-in failed">
                {serverError}
              </InlineAlert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField
              label="Email Address"
              htmlFor="login-email"
              required
              error={errors.email?.message}
            >
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="principal@school.edu.in"
                leftIcon={<Mail className="w-4 h-4" />}
                hasError={Boolean(errors.email)}
                {...register('email')}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="login-password"
              required
              error={errors.password?.message}
            >
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                leftIcon={<Lock className="w-4 h-4" />}
                hasError={Boolean(errors.password)}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                {...register('password')}
              />
            </FormField>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full"
              >
                Sign in to Workspace
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <p className="text-xs text-slate-500 text-center">
              Don&apos;t have an account or registering a new school?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                to="/register?mode=school"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/50 hover:bg-indigo-100/70 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>School Onboarding</span>
              </Link>
              <Link
                to="/register?mode=user"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create User Account</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        <span>SchoolForge Multi-Tenant SaaS Platform • Protected by HttpOnly Session Security</span>
      </div>
    </div>
  );
};

