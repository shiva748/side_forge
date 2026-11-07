import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { SchoolOnboardingRegistrationForm } from '../components/auth/SchoolOnboardingRegistrationForm';
import { UserAccountRegistrationForm } from '../components/auth/UserAccountRegistrationForm';

export type RegistrationMode = 'school' | 'user';

export const RegisterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode: RegistrationMode =
    searchParams.get('mode') === 'user' ? 'user' : 'school';

  const [mode, setMode] = useState<RegistrationMode>(initialMode);
  const [onboardingPrefill, setOnboardingPrefill] = useState<{
    contactPersonName?: string;
    contactEmail?: string;
    mobileNumber?: string;
  }>();

  const handleModeChange = (nextMode: RegistrationMode) => {
    setMode(nextMode);
    setSearchParams({ mode: nextMode }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-50/60 bg-grid-pattern flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
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
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
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

      {/* Registration Card */}
      <div
        className={`w-full mx-auto my-8 transition-all ${
          mode === 'school' ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 text-xs font-medium text-indigo-700 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Registration &amp; Institution Onboarding</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'school'
                ? 'Register Your School for Onboarding'
                : 'Create a Personal User Account'}
            </h1>
            <p className="text-sm text-slate-500">
              {mode === 'school'
                ? 'Submit an official institution onboarding request for platform review and approval.'
                : 'Register your individual SchoolForge user identity to submit an application or accept a school invitation.'}
            </p>
          </div>

          {/* Flow Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200/70 mb-6">
            <button
              type="button"
              onClick={() => handleModeChange('school')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'school'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>School Onboarding</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('user')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'user'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>User Account</span>
            </button>
          </div>

          {mode === 'school' ? (
            <SchoolOnboardingRegistrationForm
              prefill={onboardingPrefill}
              onSwitchToUserAccount={() => handleModeChange('user')}
            />
          ) : (
            <UserAccountRegistrationForm
              onSwitchToSchoolOnboarding={(prefill) => {
                if (prefill) setOnboardingPrefill(prefill);
                handleModeChange('school');
              }}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400">
        <span>SchoolForge Multi-Tenant SaaS Platform • Protected by HttpOnly Session Security</span>
      </div>
    </div>
  );
};
