import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Phone,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../lib/api-client';
import { authApi } from '../../services/authApi';
import { UserProfile } from '../../types/auth';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { FormField, Input } from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

const userRegisterSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(100, 'First name cannot exceed 100 characters'),
    lastName: z
      .string()
      .trim()
      .max(100, 'Last name cannot exceed 100 characters')
      .optional()
      .or(z.literal('')),
    email: z
      .string()
      .trim()
      .min(1, 'Email address is required')
      .email('Enter a valid email address')
      .max(255, 'Email cannot exceed 255 characters'),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number (starting with 6–9)'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password cannot exceed 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type UserRegisterFormValues = z.infer<typeof userRegisterSchema>;

export interface UserAccountRegistrationFormProps {
  onSwitchToSchoolOnboarding: (prefill?: {
    contactPersonName?: string;
    contactEmail?: string;
    mobileNumber?: string;
  }) => void;
}

export const UserAccountRegistrationForm: React.FC<UserAccountRegistrationFormProps> = ({
  onSwitchToSchoolOnboarding,
}) => {
  const { isAuthenticated, user: activeUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registeredAccount, setRegisteredAccount] = useState<UserProfile | null>(null);
  const [submittedPhoneRaw, setSubmittedPhoneRaw] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterFormValues>({
    resolver: zodResolver(userRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = watch('password', '');
  const passwordChecks = [
    { label: '8 to 72 characters', met: watchedPassword.length >= 8 && watchedPassword.length <= 72 },
    { label: 'At least one letter', met: /[A-Za-z]/.test(watchedPassword) },
    { label: 'At least one number or symbol', met: /[\d\W_]/.test(watchedPassword) },
  ];

  const onSubmit = async (values: UserRegisterFormValues) => {
    setServerError(null);
    const normalizedPhone = values.phoneNumber.replace(/\D/g, '').slice(-10);
    try {
      const created = await authApi.register({
        firstName: values.firstName.trim(),
        lastName: values.lastName?.trim() || undefined,
        email: values.email.trim(),
        phoneNumber: normalizedPhone,
        password: values.password,
      });
      setSubmittedPhoneRaw(normalizedPhone);
      setRegisteredAccount(created);
      toast.success(
        'Account created successfully',
        'You can now sign in or submit a school onboarding application.'
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.message || 'Unable to create account.';
        if (msg.toLowerCase().includes('email')) {
          setError('email', { type: 'server', message: msg });
        } else if (msg.toLowerCase().includes('phone')) {
          setError('phoneNumber', { type: 'server', message: msg });
        }
        setServerError(msg);
      } else {
        setServerError('Unable to reach the server right now. Please try again.');
      }
    }
  };

  if (isAuthenticated && activeUser && !registeredAccount) {
    return (
      <div className="space-y-5">
        <InlineAlert variant="info" title="Active Account Session">
          You already have an active user account session. Creating a user account does not
          automatically grant <span className="font-mono font-semibold">SCHOOL_ADMIN</span> access.
          If you are registering a new school, submit a School Onboarding Application so your
          signed-in account is linked as the applicant.
        </InlineAlert>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={() =>
              onSwitchToSchoolOnboarding({
                contactPersonName: [activeUser.firstName, activeUser.lastName]
                  .filter(Boolean)
                  .join(' '),
                contactEmail: activeUser.email,
                mobileNumber: activeUser.phoneNumber?.replace(/^\+91/, '') || '',
              })
            }
            leftIcon={<Building2 className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Submit School Onboarding Application
          </Button>
          <Button variant="outline" onClick={() => navigate('/onboarding-status')}>
            View Account &amp; Approval Status
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await logout();
            }}
          >
            Sign Out to Register Another User
          </Button>
        </div>
      </div>
    );
  }

  if (registeredAccount) {
    const fullName = [registeredAccount.firstName, registeredAccount.lastName]
      .filter(Boolean)
      .join(' ');
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  User Account Created Successfully
                </h2>
                <Badge variant="success">Account Active</Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your personal SchoolForge user identity has been registered. You have{' '}
                <span className="font-semibold text-slate-900">not</span> been automatically logged
                in, and no <span className="font-mono font-semibold">SCHOOL_ADMIN</span> or
                organization privileges are granted until an onboarding request is approved or you
                accept a school invitation.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Full Name</span>
              <span className="font-semibold text-slate-900">{fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Email Address</span>
              <span className="font-semibold text-slate-900 break-all">
                {registeredAccount.email}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Organization Membership</span>
              <Badge variant="warning">Pending Onboarding / Invite</Badge>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Recommended Next Steps
          </h3>
          <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              <span className="font-semibold text-slate-900">Registering a new school?</span> Submit
              a School Onboarding Application (or sign in first and submit) so a Platform
              Administrator can review and approve your institution.
            </li>
            <li>
              <span className="font-semibold text-slate-900">Joining an existing school?</span> Sign
              in to check your account status, or accept the invitation link sent to{' '}
              <span className="font-mono">{registeredAccount.email}</span> by your School
              Administrator.
            </li>
          </ol>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={() =>
                navigate('/login', {
                  state: {
                    registeredEmail: registeredAccount.email,
                    registeredNotice:
                      'Account created! Sign in with your new credentials to check your status or submit a school onboarding application.',
                  },
                })
              }
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Proceed to Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                onSwitchToSchoolOnboarding({
                  contactPersonName: fullName,
                  contactEmail: registeredAccount.email,
                  mobileNumber: submittedPhoneRaw,
                })
              }
              leftIcon={<Building2 className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Submit School Onboarding Request
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold">Important:</span> Creating a personal user account does{' '}
          <span className="font-semibold underline">not</span> automatically create a school or
          grant <span className="font-mono">SCHOOL_ADMIN</span> privileges. To onboard a new
          institution, you must also submit a{' '}
          <button
            type="button"
            onClick={() => onSwitchToSchoolOnboarding()}
            className="font-semibold text-indigo-700 hover:text-indigo-800 underline cursor-pointer"
          >
            School Onboarding Application
          </button>{' '}
          for platform approval.
        </div>
      </div>

      {serverError && (
        <InlineAlert variant="error" title="Registration failed">
          {serverError}
        </InlineAlert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="First Name"
            htmlFor="reg-firstName"
            required
            error={errors.firstName?.message}
          >
            <Input
              id="reg-firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Rajesh"
              leftIcon={<User className="w-4 h-4" />}
              hasError={Boolean(errors.firstName)}
              {...register('firstName')}
            />
          </FormField>

          <FormField
            label="Last Name"
            htmlFor="reg-lastName"
            error={errors.lastName?.message}
          >
            <Input
              id="reg-lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Sharma"
              leftIcon={<User className="w-4 h-4" />}
              hasError={Boolean(errors.lastName)}
              {...register('lastName')}
            />
          </FormField>
        </div>

        <FormField
          label="Email Address"
          htmlFor="reg-email"
          required
          error={errors.email?.message}
        >
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="rajesh.sharma@school.edu.in"
            leftIcon={<Mail className="w-4 h-4" />}
            hasError={Boolean(errors.email)}
            {...register('email')}
          />
        </FormField>

        <FormField
          label="Mobile Number (10-digit Indian Mobile)"
          htmlFor="reg-phoneNumber"
          required
          hint="Enter 10 digits starting with 6, 7, 8, or 9 (+91 is applied automatically)"
          error={errors.phoneNumber?.message}
        >
          <Input
            id="reg-phoneNumber"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel-national"
            placeholder="9876543210"
            leftIcon={<Phone className="w-4 h-4" />}
            hasError={Boolean(errors.phoneNumber)}
            {...register('phoneNumber')}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Password"
            htmlFor="reg-password"
            required
            error={errors.password?.message}
          >
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

          <FormField
            label="Confirm Password"
            htmlFor="reg-confirmPassword"
            required
            error={errors.confirmPassword?.message}
          >
            <Input
              id="reg-confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              hasError={Boolean(errors.confirmPassword)}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              {...register('confirmPassword')}
            />
          </FormField>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-3.5 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500">Password requirements:</span>
          {passwordChecks.map((chk) => (
            <span
              key={chk.label}
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                chk.met ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              <Check
                className={`w-3 h-3 ${chk.met ? 'text-emerald-600' : 'text-slate-300'}`}
              />
              {chk.label}
            </span>
          ))}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
          >
            Create User Account
          </Button>
        </div>
      </form>

      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Sign in here
        </Link>
      </div>
    </div>
  );
};
