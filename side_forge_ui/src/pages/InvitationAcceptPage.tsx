import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api-client';
import { queryClient } from '../lib/query-client';
import { accountAndInvitationApi } from '../services/accountAndInvitationApi';
import {
  classifyInvitationVerificationError,
  clearRememberedInvitationToken,
  rememberInvitationTokenInSession,
  type ClassifiedInvitationError,
  type InvitationAcceptanceResponse,
  type InvitationResponse,
  type InvitationVerificationResponse,
} from '../types/accountAndInvitations';
import { formatRoleLabel } from '../types/auth';
import { getInvitationTargetTypeLabel } from '../types/staffManagement';
import { Badge, IdLabel, RoleTag } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FormField, Input } from '../components/ui/FormControls';
import { FullScreenLoader, InlineAlert } from '../components/ui/StateViews';

const INDIAN_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;

export const InvitationAcceptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    activeWorkspace,
    activeOrganization,
    refreshSession,
    selectOrganization,
    logout,
  } = useAuth();

  const rawToken = (searchParams.get('token') || '').trim();

  const [verifying, setVerifying] = useState<boolean>(Boolean(rawToken));
  const [verification, setVerification] =
    useState<InvitationVerificationResponse | null>(null);
  const [verificationError, setVerificationError] =
    useState<ClassifiedInvitationError | null>(null);

  // New-user acceptance form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Existing-user unauthenticated inline password option
  const [existingAccountPassword, setExistingAccountPassword] = useState('');
  const [showExistingPassword, setShowExistingPassword] = useState(false);

  // Action states
  const [submittingAccept, setSubmittingAccept] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [submittingReject, setSubmittingReject] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [openingWorkspace, setOpeningWorkspace] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Completed states
  const [acceptedResult, setAcceptedResult] =
    useState<InvitationAcceptanceResponse | null>(null);
  const [rejectedResult, setRejectedResult] =
    useState<InvitationResponse | null>(null);

  const loadVerification = useCallback(async () => {
    if (!rawToken) {
      setVerifying(false);
      setVerification(null);
      setVerificationError({
        kind: 'MISSING_TOKEN',
        title: 'Missing Invitation Token',
        description:
          'No invitation token was found in this link. Please open the complete invitation link shared by your school administrator.',
        nextSteps:
          'Check your invitation email or message for a link containing "?token=...", or sign in to your account.',
      });
      return;
    }

    setVerifying(true);
    setVerificationError(null);
    setActionError(null);
    try {
      const data = await accountAndInvitationApi.verifyInvitation(rawToken);
      setVerification(data);
      setFirstName(data.recipientFirstName || '');
      setLastName(data.recipientLastName || '');
      setPhoneNumber(data.recipientPhone || '');
      rememberInvitationTokenInSession(rawToken, data.invitationId);
    } catch (err) {
      setVerification(null);
      setVerificationError(classifyInvitationVerificationError(err));
    } finally {
      setVerifying(false);
    }
  }, [rawToken]);

  useEffect(() => {
    void loadVerification();
  }, [loadVerification]);

  const isAccountMismatch = Boolean(
    isAuthenticated &&
      user &&
      verification &&
      user.email.trim().toLowerCase() !== verification.email.trim().toLowerCase()
  );

  const isCorrectAuthenticatedUser = Boolean(
    isAuthenticated &&
      user &&
      verification &&
      user.email.trim().toLowerCase() === verification.email.trim().toLowerCase()
  );

  const handleNavigateToSignIn = () => {
    if (!verification) return;
    rememberInvitationTokenInSession(rawToken, verification.invitationId);
    navigate('/login', {
      state: {
        from: {
          pathname: '/invitations/accept',
          search: `?token=${encodeURIComponent(rawToken)}`,
        },
        registeredEmail: verification.email,
        registeredNotice: `Sign in as ${verification.email} to review and accept your invitation to ${verification.organizationName}.`,
      },
    });
  };

  const handleSwitchAccount = async () => {
    if (!verification) return;
    setSwitchingAccount(true);
    setActionError(null);
    try {
      rememberInvitationTokenInSession(rawToken, verification.invitationId);
      await logout();
      if (verification.existingUserAccount) {
        navigate('/login', {
          state: {
            from: {
              pathname: '/invitations/accept',
              search: `?token=${encodeURIComponent(rawToken)}`,
            },
            registeredEmail: verification.email,
            registeredNotice: `Signed out of previous session. Please sign in as ${verification.email} to accept your invitation to ${verification.organizationName}.`,
          },
        });
      } else {
        toast.info(
          'Signed out',
          `You can now activate your new account for ${verification.email}.`
        );
      }
    } finally {
      setSwitchingAccount(false);
    }
  };

  const handleAcceptNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verification || isAccountMismatch) return;
    setActionError(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phoneNumber.trim().replace(/[\s-]/g, '');

    if (!trimmedFirst) {
      setActionError('First name is required to activate your account.');
      return;
    }
    if (!trimmedPhone) {
      setActionError('Mobile phone number is required to activate your account.');
      return;
    }
    if (!INDIAN_PHONE_REGEX.test(trimmedPhone)) {
      setActionError(
        'Enter a valid 10-digit Indian mobile number (starting with 6–9, optional +91).'
      );
      return;
    }
    if (!password || password.length < 8 || password.length > 72) {
      setActionError('Password must be between 8 and 72 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setActionError('Password and confirmation password do not match.');
      return;
    }

    setSubmittingAccept(true);
    try {
      const accepted = await accountAndInvitationApi.acceptInvitation({
        token: rawToken,
        email: verification.email,
        firstName: trimmedFirst,
        lastName: trimmedLast || null,
        phoneNumber: trimmedPhone,
        password,
      });
      clearRememberedInvitationToken(rawToken, verification.invitationId);
      setPassword('');
      setConfirmPassword('');
      queryClient.clear();
      await refreshSession();
      setAcceptedResult(accepted);
      toast.success(
        'Invitation accepted',
        `Your account and ${formatRoleLabel(accepted.roleCode)} membership in ${verification.organizationName} are now active.`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Unable to accept invitation right now. Please try again.');
      }
    } finally {
      setSubmittingAccept(false);
    }
  };

  const handleAcceptExistingUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!verification || isAccountMismatch) return;
    setActionError(null);

    if (!isCorrectAuthenticatedUser && !existingAccountPassword) {
      setActionError(
        'Please enter your account password or click "Sign In to Your Account First" to verify your identity.'
      );
      return;
    }

    setSubmittingAccept(true);
    try {
      const accepted = await accountAndInvitationApi.acceptInvitation({
        token: rawToken,
        email: verification.email,
        password: isCorrectAuthenticatedUser
          ? undefined
          : existingAccountPassword,
      });
      clearRememberedInvitationToken(rawToken, verification.invitationId);
      setExistingAccountPassword('');
      queryClient.clear();
      await refreshSession();
      setAcceptedResult(accepted);
      toast.success(
        'Invitation accepted',
        `Joined ${verification.organizationName} as ${formatRoleLabel(accepted.roleCode)}.`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Unable to accept invitation right now. Please try again.');
      }
    } finally {
      setSubmittingAccept(false);
    }
  };

  const handleRejectInvitation = async () => {
    if (!verification || isAccountMismatch) return;
    setSubmittingReject(true);
    setActionError(null);
    try {
      const rejected = await accountAndInvitationApi.rejectInvitation({
        token: rawToken,
        email: verification.email,
      });
      clearRememberedInvitationToken(rawToken, verification.invitationId);
      await refreshSession();
      setRejectedResult(rejected);
      setConfirmingReject(false);
      toast.info(
        'Invitation declined',
        `You have declined the invitation to ${verification.organizationName}.`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Unable to decline invitation right now. Please try again.');
      }
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleOpenAcceptedOrganization = async () => {
    if (!acceptedResult) return;
    setOpeningWorkspace(true);
    try {
      await selectOrganization(acceptedResult.organizationId);
      navigate('/app', { replace: true });
    } finally {
      setOpeningWorkspace(false);
    }
  };

  if (verifying || isAuthLoading) {
    return (
      <FullScreenLoader label="Verifying your organization invitation link..." />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/60 bg-grid-pattern flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
            <span className="font-extrabold text-sm tracking-tight">SF</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            School<span className="text-indigo-600">Forge</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-slate-800">{user.email}</span>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-2xl w-full mx-auto my-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5 p-6 sm:p-8 space-y-6">
          {/* 1. Completed State: Accepted */}
          {acceptedResult && verification ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <Badge variant="success" dot>
                    Membership Activated
                  </Badge>
                  <h1 className="text-xl font-bold text-slate-900 mt-1">
                    Welcome to {verification.organizationName}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Your invitation has been accepted and your{' '}
                    <span className="font-semibold text-slate-900">
                      {formatRoleLabel(acceptedResult.roleCode)}
                    </span>{' '}
                    membership is now active for{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {acceptedResult.email}
                    </span>
                    .
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Organization:</span>
                  <span className="font-semibold text-slate-900">
                    {verification.organizationName} (#{acceptedResult.organizationId})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Activated Role:</span>
                  <RoleTag
                    label={formatRoleLabel(acceptedResult.roleCode)}
                    code={acceptedResult.roleCode}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Invitation Target:</span>
                  <Badge variant="neutral">
                    {getInvitationTargetTypeLabel(verification.targetType)}
                    {acceptedResult.linkedProfileId
                      ? ` (Profile #${acceptedResult.linkedProfileId})`
                      : ''}
                  </Badge>
                </div>
                {activeWorkspace && (
                  <div className="pt-2 border-t border-slate-200 text-slate-600">
                    Your existing active session context (
                    <span className="font-semibold text-slate-800">
                      {activeWorkspace === 'PLATFORM'
                        ? 'Platform Administration'
                        : activeOrganization?.organizationName || 'School Workspace'}
                    </span>
                    ) was preserved. You can open the new workspace below or switch workspaces at any time.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  isLoading={openingWorkspace}
                  onClick={() => void handleOpenAcceptedOrganization()}
                  leftIcon={<Building2 className="w-4 h-4" />}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Open {verification.organizationName} Workspace
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/workspaces?stay=1')}
                  leftIcon={<Layers className="w-4 h-4" />}
                >
                  View All Workspaces
                </Button>
              </div>
            </div>
          ) : rejectedResult && verification ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <Badge variant="neutral" dot>
                    Invitation Declined
                  </Badge>
                  <h1 className="text-xl font-bold text-slate-900 mt-1">
                    You Declined This Invitation
                  </h1>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    The invitation to join{' '}
                    <span className="font-semibold text-slate-900">
                      {verification.organizationName}
                    </span>{' '}
                    as{' '}
                    <span className="font-semibold text-slate-900">
                      {formatRoleLabel(verification.roleCode)}
                    </span>{' '}
                    has been marked as declined and can no longer be used.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                {isAuthenticated ? (
                  <Button
                    variant="primary"
                    onClick={() => navigate('/workspaces?stay=1')}
                  >
                    Return to Workspaces
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => navigate('/login')}>
                    Go to Sign In
                  </Button>
                )}
                <Link
                  to="/"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : verificationError || !verification ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <Badge
                    variant={
                      verificationError?.kind === 'ALREADY_ACCEPTED'
                        ? 'info'
                        : verificationError?.kind === 'EXPIRED'
                        ? 'warning'
                        : 'danger'
                    }
                    dot
                  >
                    {verificationError?.kind.replace(/_/g, ' ') || 'UNAVAILABLE'}
                  </Badge>
                  <h1 className="text-xl font-bold text-slate-900">
                    {verificationError?.title || 'Invitation Unavailable'}
                  </h1>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {verificationError?.description}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs">
                <p className="font-semibold text-slate-800">Recommended Next Steps</p>
                <p className="text-slate-600 leading-relaxed">
                  {verificationError?.nextSteps}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                {isAuthenticated ? (
                  <Button
                    variant="primary"
                    onClick={() => navigate('/workspaces?stay=1')}
                    leftIcon={<Layers className="w-4 h-4" />}
                  >
                    Open Workspace Selector
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => navigate('/login')}
                    leftIcon={<LogIn className="w-4 h-4" />}
                  >
                    Sign In to Existing Account
                  </Button>
                )}
                {rawToken && (
                  <Button
                    variant="outline"
                    onClick={() => void loadVerification()}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Retry Verification
                  </Button>
                )}
                <Link
                  to="/"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="info" dot>
                        Verified Invitation
                      </Badge>
                      <Badge
                        variant={
                          verification.existingUserAccount ? 'success' : 'warning'
                        }
                      >
                        {verification.existingUserAccount
                          ? 'Existing Side_forge Account'
                          : 'New Account Setup'}
                      </Badge>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                      Join {verification.organizationName}
                    </h1>
                  </div>
                </div>
                <IdLabel>ORG-{verification.organizationId}</IdLabel>
              </div>

              <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Inviting Organization</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {verification.organizationName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Invited Role</span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <RoleTag
                        label={formatRoleLabel(verification.roleCode)}
                        code={verification.roleCode}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Invited Email Address</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {verification.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Invitation Target</span>
                    <span className="font-medium text-slate-800">
                      {getInvitationTargetTypeLabel(verification.targetType)}
                      {verification.targetProfileId
                        ? ` (Profile #${verification.targetProfileId})`
                        : ''}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-indigo-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      Valid until{' '}
                      <strong className="text-slate-800">
                        {new Date(verification.expiresAt).toLocaleString()}
                      </strong>
                    </span>
                  </span>
                  <span className="text-indigo-700 font-medium">
                    Accepting activates your {formatRoleLabel(verification.roleCode)} access in{' '}
                    {verification.organizationName}.
                  </span>
                </div>
              </div>

              {actionError && (
                <InlineAlert variant="error" title="Unable to Complete Action">
                  {actionError}
                </InlineAlert>
              )}

              {isAccountMismatch && user ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <h2 className="text-sm font-bold text-amber-950">
                        Account Mismatch Detected
                      </h2>
                      <p className="text-amber-900 leading-relaxed">
                        You are currently signed in as{' '}
                        <span className="font-mono font-semibold">{user.email}</span>,
                        but this invitation was issued exclusively for{' '}
                        <span className="font-mono font-semibold">
                          {verification.email}
                        </span>
                        .
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        For security and tenant isolation, an invitation can never be accepted on behalf of another user account.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button
                      variant="primary"
                      isLoading={switchingAccount}
                      onClick={() => void handleSwitchAccount()}
                      leftIcon={<LogOut className="w-4 h-4" />}
                    >
                      {verification.existingUserAccount
                        ? `Sign Out & Sign In as ${verification.email}`
                        : `Sign Out & Create Account for ${verification.email}`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/workspaces?stay=1')}
                    >
                      Keep Current Session ({user.email})
                    </Button>
                  </div>
                </div>
              ) : verification.existingUserAccount ? (
                <div className="space-y-5">
                  {isCorrectAuthenticatedUser && user ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <p className="font-semibold text-emerald-950">
                            Signed in as {[user.firstName, user.lastName].filter(Boolean).join(' ')} ({user.email})
                          </p>
                          <p className="text-emerald-800 leading-relaxed">
                            Your existing Side_forge account, organizations, and roles will be preserved. Accepting this invitation adds{' '}
                            <strong>{verification.organizationName}</strong> ({formatRoleLabel(verification.roleCode)}) to your available workspaces.
                          </p>
                        </div>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-3">
                        <Button
                          variant="primary"
                          size="lg"
                          isLoading={submittingAccept}
                          disabled={submittingReject}
                          onClick={() => void handleAcceptExistingUser()}
                          leftIcon={<CheckCircle2 className="w-4 h-4" />}
                        >
                          Accept Invitation &amp; Join {verification.organizationName}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                        <div className="flex items-start gap-3">
                          <UserCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">
                              Existing Account Found for {verification.email}
                            </p>
                            <p className="text-slate-600 leading-relaxed">
                              You already have a Side_forge account. Sign in to preserve your existing memberships and roles, or verify your password below to accept immediately.
                            </p>
                          </div>
                        </div>

                        <div>
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleNavigateToSignIn}
                            leftIcon={<LogIn className="w-4 h-4" />}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                          >
                            Sign In to Your Account First (Recommended)
                          </Button>
                        </div>
                      </div>

                      <form
                        onSubmit={handleAcceptExistingUser}
                        className="rounded-xl border border-slate-200 p-4 space-y-3"
                      >
                        <p className="text-xs font-semibold text-slate-800">
                          Or verify your password for{' '}
                          <span className="font-mono text-indigo-700">
                            {verification.email}
                          </span>{' '}
                          to accept directly:
                        </p>
                        <FormField
                          label="Existing Account Password"
                          htmlFor="existing-user-password"
                          required
                        >
                          <Input
                            id="existing-user-password"
                            type={showExistingPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={existingAccountPassword}
                            onChange={(e) =>
                              setExistingAccountPassword(e.target.value)
                            }
                            placeholder="Enter your existing Side_forge password"
                            leftIcon={<Lock className="w-4 h-4" />}
                            rightElement={
                              <button
                                type="button"
                                onClick={() =>
                                  setShowExistingPassword((prev) => !prev)
                                }
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                              >
                                {showExistingPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            }
                          />
                        </FormField>
                        <Button
                          type="submit"
                          variant="outline"
                          isLoading={submittingAccept}
                          disabled={submittingReject}
                          leftIcon={<KeyRound className="w-4 h-4" />}
                        >
                          Verify Password &amp; Accept Invitation
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={handleAcceptNewUser}
                  noValidate
                  className="space-y-4"
                >
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-900">
                      Create Your Side_forge Account:
                    </span>{' '}
                    Complete your details and set a password below. Submitting this form creates your verified account for{' '}
                    <span className="font-mono font-medium text-slate-900">
                      {verification.email}
                    </span>{' '}
                    and immediately activates your{' '}
                    <span className="font-semibold text-slate-900">
                      {formatRoleLabel(verification.roleCode)}
                    </span>{' '}
                    membership in{' '}
                    <span className="font-semibold text-slate-900">
                      {verification.organizationName}
                    </span>
                    .
                  </div>

                  <FormField
                    label="Invited Email Address (Verified)"
                    htmlFor="inv-email"
                  >
                    <Input
                      id="inv-email"
                      type="email"
                      value={verification.email}
                      disabled
                      readOnly
                      leftIcon={<Mail className="w-4 h-4" />}
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="First Name"
                      htmlFor="inv-first-name"
                      required
                    >
                      <Input
                        id="inv-first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        maxLength={100}
                        required
                      />
                    </FormField>

                    <FormField label="Last Name" htmlFor="inv-last-name">
                      <Input
                        id="inv-last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name (optional)"
                        maxLength={100}
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Mobile Number (10-digit Indian)"
                    htmlFor="inv-phone"
                    required
                    hint="10 digits starting with 6–9 (optional +91 prefix)"
                  >
                    <Input
                      id="inv-phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9876543210"
                      maxLength={13}
                      leftIcon={<Phone className="w-4 h-4" />}
                      required
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="Create Password"
                      htmlFor="inv-password"
                      required
                      hint="8 to 72 characters"
                    >
                      <Input
                        id="inv-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        minLength={8}
                        maxLength={72}
                        leftIcon={<Lock className="w-4 h-4" />}
                        rightElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        }
                        required
                      />
                    </FormField>

                    <FormField
                      label="Confirm Password"
                      htmlFor="inv-confirm-password"
                      required
                    >
                      <Input
                        id="inv-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        minLength={8}
                        maxLength={72}
                        leftIcon={<Lock className="w-4 h-4" />}
                        rightElement={
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        }
                        required
                      />
                    </FormField>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={submittingAccept}
                      disabled={submittingReject}
                      className="w-full"
                      leftIcon={<UserPlus className="w-4 h-4" />}
                    >
                      Create Account &amp; Accept Invitation
                    </Button>
                  </div>
                </form>
              )}

              {!isAccountMismatch && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                  {confirmingReject ? (
                    <div className="w-full rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 flex items-center justify-between gap-3 flex-wrap text-xs">
                      <span className="font-medium text-rose-900">
                        Are you sure you want to decline this invitation to{' '}
                        <strong>{verification.organizationName}</strong>? This link cannot be reused.
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={submittingReject}
                          onClick={() => setConfirmingReject(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={submittingReject}
                          onClick={() => void handleRejectInvitation()}
                        >
                          Confirm Decline
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-slate-500">
                        Don&apos;t recognize this organization or don&apos;t wish to join?
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={submittingAccept}
                        onClick={() => setConfirmingReject(true)}
                        className="text-rose-600 hover:bg-rose-50"
                      >
                        Decline Invitation
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        <span>
          SchoolForge Multi-Tenant SaaS Platform • Verified Single-Use Invitation Security
        </span>
      </div>
    </div>
  );
};










