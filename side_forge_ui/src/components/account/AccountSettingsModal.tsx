import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Link2,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Trash2,
  Upload,
  User,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../lib/api-client';
import { queryClient } from '../../lib/query-client';
import { cn } from '../../lib/utils';
import { accountAndInvitationApi } from '../../services/accountAndInvitationApi';
import {
  clearRememberedInvitationToken,
  extractInvitationTokenFromInput,
  getRememberedTokenForInvitation,
  rememberInvitationTokenInSession,
  validateProfilePhotoFile,
  type InvitationResponse,
} from '../../types/accountAndInvitations';
import { formatRoleLabel } from '../../types/auth';
import { getInvitationTargetTypeLabel } from '../../types/staffManagement';
import { Badge, CounterLabel, IdLabel, RoleTag } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { FormField, Input } from '../ui/FormControls';
import { EmptyState, InlineAlert } from '../ui/StateViews';
import { UserAvatar } from './UserAvatar';

export type AccountSettingsTab =
  | 'profile'
  | 'photo'
  | 'password'
  | 'invitations';

export interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: AccountSettingsTab;
}

const INDIAN_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  open,
  onClose,
  initialTab = 'profile',
}) => {
  const {
    user,
    profilePhotoBlobUrl,
    refreshProfilePhoto,
    updateCurrentUserProfile,
    refreshSession,
    pendingInvitations,
    pendingInvitationsCount,
    refreshPendingInvitations,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AccountSettingsTab>(initialTab);

  // 1. My Profile State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // 2. Profile Photo State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);

  // 3. Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // 4. Pending Invitations State
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [invitationsSuccess, setInvitationsSuccess] = useState<string | null>(null);
  const [acceptingInvId, setAcceptingInvId] = useState<number | null>(null);
  const [confirmRejectInvId, setConfirmRejectInvId] = useState<number | null>(null);
  const [rejectingInvId, setRejectingInvId] = useState<number | null>(null);
  const [tokenPromptInvId, setTokenPromptInvId] = useState<number | null>(null);
  const [tokenPromptInput, setTokenPromptInput] = useState('');
  const [quickLinkInput, setQuickLinkInput] = useState('');

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !user) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setPhoneNumber(user.phoneNumber || '');
    setProfileError(null);
    setProfileSuccess(null);
    setPhotoError(null);
    setPhotoSuccess(null);
    setConfirmRemovePhoto(false);
    setPasswordError(null);
    setPasswordSuccess(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setInvitationsError(null);
    setInvitationsSuccess(null);
    setTokenPromptInvId(null);
    setTokenPromptInput('');
  }, [open, user?.id]);

  // Clean up preview object URL when changed or unmounted
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // =========================================================================
  // 1. PROFILE HANDLERS (`PUT /api/me`)
  // =========================================================================
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || savingProfile) return;
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phoneNumber.trim().replace(/[\s-]/g, '');

    if (!trimmedFirst) {
      setProfileError('First name is required.');
      return;
    }
    if (trimmedFirst.length > 100) {
      setProfileError('First name must not exceed 100 characters.');
      return;
    }
    if (trimmedLast.length > 100) {
      setProfileError('Last name must not exceed 100 characters.');
      return;
    }
    if (trimmedPhone && !INDIAN_PHONE_REGEX.test(trimmedPhone)) {
      setProfileError(
        'Enter a valid 10-digit Indian mobile number (starting with 6–9, optional +91 prefix).'
      );
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await accountAndInvitationApi.updateProfile({
        firstName: trimmedFirst,
        lastName: trimmedLast || null,
        phoneNumber: trimmedPhone || null,
      });
      updateCurrentUserProfile(updated);
      setFirstName(updated.firstName || '');
      setLastName(updated.lastName || '');
      setPhoneNumber(updated.phoneNumber || '');
      setProfileSuccess('Your profile information has been updated.');
      toast.success('Profile updated', 'Your account details have been saved.');
      void refreshSession();
    } catch (err) {
      if (err instanceof ApiError) {
        setProfileError(err.message);
      } else {
        setProfileError('Unable to update your profile right now.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // =========================================================================
  // 2. PROFILE PHOTO HANDLERS (`POST` / `DELETE /api/me/profile-photo`)
  // =========================================================================
  const handleSelectPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setPhotoSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateProfilePhotoFile(file);
    if (validationError) {
      setPhotoError(validationError);
      clearSelectedFile();
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile || uploadingPhoto) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    setPhotoSuccess(null);
    try {
      const stored = await accountAndInvitationApi.uploadProfilePhoto(
        selectedFile
      );
      if (user) {
        updateCurrentUserProfile({
          ...user,
          profilePhotoFileId: stored.id,
          profilePhotoUrl: '/api/me/profile-photo',
        });
      }
      await refreshProfilePhoto();
      void refreshSession();
      clearSelectedFile();
      setPhotoSuccess('Profile photo uploaded and updated across your workspace.');
      toast.success(
        'Profile photo updated',
        'Your new avatar is now active.'
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setPhotoError(err.message);
      } else {
        setPhotoError('Unable to upload profile photo right now.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (removingPhoto) return;
    setRemovingPhoto(true);
    setPhotoError(null);
    setPhotoSuccess(null);
    try {
      await accountAndInvitationApi.deleteProfilePhoto();
      if (user) {
        updateCurrentUserProfile({
          ...user,
          profilePhotoFileId: null,
          profilePhotoUrl: null,
        });
      }
      await refreshProfilePhoto();
      void refreshSession();
      clearSelectedFile();
      setConfirmRemovePhoto(false);
      setPhotoSuccess('Your profile photo has been removed.');
      toast.info('Profile photo removed', 'Reverted to your initials avatar.');
    } catch (err) {
      if (err instanceof ApiError) {
        setPhotoError(err.message);
      } else {
        setPhotoError('Unable to remove profile photo right now.');
      }
    } finally {
      setRemovingPhoto(false);
    }
  };

  // =========================================================================
  // 3. CHANGE PASSWORD HANDLER (`POST /api/me/change-password`)
  // =========================================================================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changingPassword) return;
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 8 || newPassword.length > 72) {
      setPasswordError('New password must be between 8 and 72 characters.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await accountAndInvitationApi.changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
      setPasswordSuccess('Your password has been changed successfully.');
      toast.success(
        'Password changed',
        'Your account password has been updated.'
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message);
      } else {
        setPasswordError('Unable to change password right now.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // =========================================================================
  // 4. PENDING INVITATIONS HANDLERS (`GET /api/me/invitations`)
  // =========================================================================
  const handleRefreshInvitations = async () => {
    setLoadingInvitations(true);
    setInvitationsError(null);
    try {
      await refreshPendingInvitations();
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleAcceptPendingInvitation = async (inv: InvitationResponse) => {
    setInvitationsError(null);
    setInvitationsSuccess(null);
    setAcceptingInvId(inv.id);
    try {
      const accepted = await accountAndInvitationApi.acceptMyInvitationById(
        inv.id
      );
      queryClient.clear();
      await refreshSession();
      setInvitationsSuccess(
        `Joined ${inv.organizationName || 'School Organization'} as ${formatRoleLabel(accepted.roleCode)}. It is now available in your Workspace Selector.`
      );
      toast.success(
        'Invitation accepted',
        `Activated ${formatRoleLabel(accepted.roleCode)} membership in ${inv.organizationName || 'organization'}.`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setInvitationsError(err.message);
      } else {
        setInvitationsError('Unable to accept invitation.');
      }
    } finally {
      setAcceptingInvId(null);
    }
  };

  const handleRejectPendingInvitation = async (inv: InvitationResponse) => {
    setInvitationsError(null);
    setInvitationsSuccess(null);
    setRejectingInvId(inv.id);
    try {
      await accountAndInvitationApi.rejectMyInvitationById(inv.id);
      setConfirmRejectInvId(null);
      await refreshPendingInvitations();
      setInvitationsSuccess(
        `Declined invitation from ${inv.organizationName || 'School Organization'}.`
      );
      toast.info('Invitation declined', 'The invitation has been declined.');
    } catch (err) {
      if (err instanceof ApiError) {
        setInvitationsError(err.message);
      } else {
        setInvitationsError('Unable to decline invitation.');
      }
    } finally {
      setRejectingInvId(null);
    }
  };

  if (!user) return null;

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="My Profile & Account Settings"
      description="Manage your personal Side_forge identity, profile photo, password security, and pending organization invitations."
      maxWidthClass="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-slate-400">
            Account ID #{user.id} • {user.email}
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Top User Summary Banner */}
        <div className="flex items-center justify-between gap-4 flex-wrap rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {fullName}
                </p>
                <Badge
                  variant={user.status === 'ACTIVE' ? 'success' : 'warning'}
                  dot
                >
                  {user.status}
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-500 truncate">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {user.emailVerified && (
              <Badge variant="info">Email Verified</Badge>
            )}
            <Badge variant="neutral">
              {(user.organizations || []).filter(
                (o) => o.membershipStatus === 'ACTIVE'
              ).length}{' '}
              Active Org(s)
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer',
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photo')}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer',
              activeTab === 'photo'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Profile Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer',
              activeTab === 'password'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invitations')}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer',
              activeTab === 'invitations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Pending Invitations</span>
            <CounterLabel count={pendingInvitationsCount} />
          </button>
        </div>

        {/* TAB 1: MY PROFILE */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} noValidate className="space-y-4">
            {profileError && (
              <InlineAlert variant="error" title="Update Failed">
                {profileError}
              </InlineAlert>
            )}
            {profileSuccess && (
              <InlineAlert variant="success" title="Profile Saved">
                {profileSuccess}
              </InlineAlert>
            )}

            <FormField
              label="Account Email Address (Read-Only)"
              htmlFor="acct-email"
              hint="Your login email address identifies your Side_forge account across all workspaces."
            >
              <Input
                id="acct-email"
                type="email"
                value={user.email}
                disabled
                readOnly
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="First Name" htmlFor="acct-first-name" required>
                <Input
                  id="acct-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  maxLength={100}
                  required
                />
              </FormField>

              <FormField label="Last Name" htmlFor="acct-last-name">
                <Input
                  id="acct-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name (optional)"
                  maxLength={100}
                />
              </FormField>
            </div>

            <FormField
              label="Mobile Number (10-digit Indian)"
              htmlFor="acct-phone"
              hint="Format: 10 digits starting with 6–9 (optional +91 prefix)"
            >
              <Input
                id="acct-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                maxLength={13}
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </FormField>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={savingProfile}
                onClick={() => {
                  setFirstName(user.firstName || '');
                  setLastName(user.lastName || '');
                  setPhoneNumber(user.phoneNumber || '');
                  setProfileError(null);
                  setProfileSuccess(null);
                }}
              >
                Reset
              </Button>
              <Button type="submit" variant="primary" isLoading={savingProfile}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: PROFILE PHOTO */}
        {activeTab === 'photo' && (
          <div className="space-y-4">
            {photoError && (
              <InlineAlert variant="error" title="Profile Photo Error">
                {photoError}
              </InlineAlert>
            )}
            {photoSuccess && (
              <InlineAlert variant="success" title="Profile Photo Updated">
                {photoSuccess}
              </InlineAlert>
            )}

            <div className="rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <UserAvatar
                  size="xl"
                  overrideSrc={previewUrl || profilePhotoBlobUrl}
                />
                <span className="text-[11px] font-medium text-slate-500">
                  {previewUrl
                    ? 'Selected Preview'
                    : profilePhotoBlobUrl
                    ? 'Current Photo'
                    : 'Fallback Avatar'}
                </span>
              </div>

              <div className="flex-1 space-y-3 text-xs w-full">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Personal Profile Photo
                  </h3>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Supported formats: <strong>JPG, JPEG, PNG, WEBP, GIF</strong>. Maximum file size: <strong>5 MB</strong>.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleSelectPhotoFile}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatBytes(selectedFile.size)} • {selectedFile.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploadingPhoto}
                        onClick={clearSelectedFile}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={uploadingPhoto}
                        onClick={() => void handleUploadPhoto()}
                        leftIcon={<Upload className="w-3.5 h-3.5" />}
                      >
                        {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      leftIcon={<ImagePlus className="w-4 h-4" />}
                    >
                      {user.profilePhotoFileId
                        ? 'Choose Replacement Photo'
                        : 'Select Photo to Upload'}
                    </Button>

                    {(user.profilePhotoFileId || profilePhotoBlobUrl) &&
                      !confirmRemovePhoto && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setConfirmRemovePhoto(true)}
                          leftIcon={<Trash2 className="w-4 h-4" />}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          Remove Photo
                        </Button>
                      )}
                  </div>
                )}

                {confirmRemovePhoto && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-medium text-rose-900">
                      Remove your current profile photo?
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={removingPhoto}
                        onClick={() => setConfirmRemovePhoto(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={removingPhoto}
                        onClick={() => void handleRemovePhoto()}
                      >
                        Confirm Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CHANGE PASSWORD */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} noValidate className="space-y-4">
            {passwordError && (
              <InlineAlert variant="error" title="Password Change Failed">
                {passwordError}
              </InlineAlert>
            )}
            {passwordSuccess && (
              <InlineAlert variant="success" title="Password Updated">
                {passwordSuccess}
              </InlineAlert>
            )}

            <FormField
              label="Current Password"
              htmlFor="chg-current-password"
              required
            >
              <Input
                id="chg-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="New Password"
                htmlFor="chg-new-password"
                required
                hint="8 to 72 characters; must differ from current password"
              >
                <Input
                  id="chg-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  maxLength={72}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    >
                      {showNewPassword ? (
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
                label="Confirm New Password"
                htmlFor="chg-confirm-password"
                required
              >
                <Input
                  id="chg-confirm-password"
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={8}
                  maxLength={72}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmNewPassword((prev) => !prev)
                      }
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    >
                      {showConfirmNewPassword ? (
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

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={changingPassword}
              >
                Update Password
              </Button>
            </div>
          </form>
        )}

        {/* TAB 4: PENDING INVITATIONS (`GET /api/me/invitations`) */}
        {activeTab === 'invitations' && (
          <div className="space-y-4">
            {invitationsError && (
              <InlineAlert variant="error" title="Invitation Action Error">
                {invitationsError}
              </InlineAlert>
            )}
            {invitationsSuccess && (
              <InlineAlert variant="success" title="Invitation Updated">
                {invitationsSuccess}
              </InlineAlert>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-600">
                Manage all pending, accepted, rejected, and expired invitations in your full inbox.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  isLoading={loadingInvitations}
                  onClick={() => void handleRefreshInvitations()}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Refresh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    navigate('/invitations');
                  }}
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Open Full Inbox
                </Button>
              </div>
            </div>

            {pendingInvitations.length === 0 ? (
              <EmptyState
                icon={<Mail className="w-6 h-6" />}
                title="No Pending Invitations"
                description={`There are currently no pending organization invitations for ${user.email}.`}
              />
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map((inv) => {
                  const isConfirmingReject = confirmRejectInvId === inv.id;

                  return (
                    <div
                      key={inv.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-xs shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-bold text-slate-900">
                              {inv.organizationName || 'School Organization'}
                            </span>
                            <Badge variant="warning" dot>
                              {inv.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-slate-600 pt-0.5">
                            <span>Role:</span>
                            <RoleTag
                              label={formatRoleLabel(inv.roleCode)}
                              code={inv.roleCode}
                            />
                            <span>•</span>
                            <span>
                              Target:{' '}
                              <strong className="text-slate-800">
                                {getInvitationTargetTypeLabel(inv.targetType)}
                              </strong>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              Expires:{' '}
                              {new Date(inv.expiresAt).toLocaleString()}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isConfirmingReject ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={rejectingInvId === inv.id}
                                onClick={() => setConfirmRejectInvId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                isLoading={rejectingInvId === inv.id}
                                onClick={() =>
                                  void handleRejectPendingInvitation(inv)
                                }
                              >
                                Confirm Decline
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={acceptingInvId === inv.id}
                                onClick={() => setConfirmRejectInvId(inv.id)}
                                className="text-rose-600 hover:bg-rose-50"
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                isLoading={acceptingInvId === inv.id}
                                onClick={() =>
                                  void handleAcceptPendingInvitation(inv)
                                }
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              >
                                Accept Invitation
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};








