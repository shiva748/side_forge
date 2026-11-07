import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api-client';
import { platformOnboardingApi } from '../services/onboardingApi';
import { WorkspaceType } from '../types/auth';
import {
  ApproveOnboardingSubscriptionRequest,
  ApprovedOrganizationResponse,
  BOARD_AFFILIATION_LABELS,
  MANAGEMENT_SYSTEM_LABELS,
  OnboardingRequestResponse,
  OnboardingStatus,
  PagedResponse,
  PlatformOnboardingAuditItem,
  STUDENT_STRENGTH_LABELS,
  SubscriptionPlanSummary,
} from '../types/onboarding';
import {
  ApproveOnboardingDialog,
  RejectOnboardingDialog,
} from '../components/platform/OnboardingActionDialogs';
import {
  formatOnboardingDate,
  getOnboardingStatusBadgeMeta,
  OnboardingRequestDetailsModal,
} from '../components/platform/OnboardingRequestDetailsModal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Input, Select } from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, InlineAlert } from '../components/ui/StateViews';

const STATUS_FILTER_OPTIONS: { value: OnboardingStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending Review' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export const PlatformOnboardingPage: React.FC = () => {
  const {
    user,
    hasPlatformAccess,
    platformRoles,
    platformPermissions,
    activeMemberships,
    switchWorkspace,
    logout,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Strictly check platform-scoped permissions (never organization-scoped SCHOOL_ADMIN)
  const canViewOnboarding = platformPermissions.has('platform.organization.view');
  const canManageOnboarding = platformPermissions.has('platform.organization.manage');
  const canViewPlans = platformPermissions.has('platform.plan.view');
  const canViewAuditLogs = platformPermissions.has('platform.audit.view');

  // Filter, search & pagination state
  const [statusFilter, setStatusFilter] = useState<OnboardingStatus | ''>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  // Data state
  const [pagedData, setPagedData] = useState<PagedResponse<OnboardingRequestResponse> | null>(
    null
  );
  const [statusCounts, setStatusCounts] = useState<{
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
  }>({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Plans & Audit logs for detail/approval modals
  const [plans, setPlans] = useState<SubscriptionPlanSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformOnboardingAuditItem[]>([]);

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequestResponse | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const [approveTarget, setApproveTarget] = useState<OnboardingRequestResponse | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OnboardingRequestResponse | null>(null);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [recentlyApprovedOrg, setRecentlyApprovedOrg] =
    useState<ApprovedOrganizationResponse | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchRequestsAndCounts = useCallback(async () => {
    if (!canViewOnboarding) {
      setIsLoading(false);
      setError('You do not have permission (platform.organization.view) to view onboarding requests.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [pageResp, allResp] = await Promise.all([
        platformOnboardingApi.listRequests({
          status: statusFilter,
          search: appliedSearch,
          page,
          size: pageSize,
        }),
        platformOnboardingApi.listRequests({
          page: 0,
          size: 100,
        }),
      ]);

      setPagedData(pageResp);

      const allItems = allResp.content || [];
      setStatusCounts({
        total: allResp.totalElements ?? allItems.length,
        pending: allItems.filter((r) => r.status === 'PENDING').length,
        underReview: allItems.filter((r) => r.status === 'UNDER_REVIEW').length,
        approved: allItems.filter((r) => r.status === 'APPROVED').length,
        rejected: allItems.filter((r) => r.status === 'REJECTED').length,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isForbidden) {
          setError('Access denied (403): Your account is not authorized to view onboarding requests.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to load school onboarding requests. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch, canViewOnboarding, page, pageSize, statusFilter]);

  const fetchSupportingData = useCallback(async () => {
    if (canViewPlans) {
      try {
        const activePlans = await platformOnboardingApi.listActivePlans();
        setPlans(Array.isArray(activePlans) ? activePlans : []);
      } catch {
        // Ignore non-critical plan list failure
      }
    }
    if (canViewAuditLogs) {
      try {
        const auditResp = await platformOnboardingApi.getOnboardingAuditLogs(0, 50);
        setAuditLogs(auditResp?.content || []);
      } catch {
        // Ignore non-critical audit log failure
      }
    }
  }, [canViewAuditLogs, canViewPlans]);

  useEffect(() => {
    void fetchRequestsAndCounts();
  }, [fetchRequestsAndCounts]);

  useEffect(() => {
    void fetchSupportingData();
  }, [fetchSupportingData]);

  const handleOpenDetails = async (row: OnboardingRequestResponse) => {
    setSelectedRequest(row);
    setIsDetailsModalOpen(true);
    setIsLoadingDetails(true);
    try {
      const fresh = await platformOnboardingApi.getRequestById(row.id);
      setSelectedRequest(fresh);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error('Could not refresh details', err.message);
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleConfirmApprove = async (
    requestId: number,
    subscriptionRequest?: ApproveOnboardingSubscriptionRequest
  ) => {
    setIsMutating(true);
    setActionError(null);
    try {
      const createdOrg = await platformOnboardingApi.approveRequest(
        requestId,
        subscriptionRequest
      );
      setRecentlyApprovedOrg(createdOrg);
      setApproveTarget(null);
      toast.success(
        'Onboarding request approved',
        `${createdOrg.name} (Organization #${createdOrg.id}) is now ACTIVE.`
      );
      await Promise.all([fetchRequestsAndCounts(), fetchSupportingData()]);
      if (selectedRequest && selectedRequest.id === requestId) {
        try {
          const updated = await platformOnboardingApi.getRequestById(requestId);
          setSelectedRequest(updated);
        } catch {
          setSelectedRequest((prev) =>
            prev ? { ...prev, status: 'APPROVED' } : null
          );
        }
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to approve onboarding request. Please try again.';
      setActionError(msg);
      toast.error('Approval failed', msg);
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmReject = async (requestId: number, rejectionReason: string) => {
    setIsMutating(true);
    setActionError(null);
    try {
      await platformOnboardingApi.rejectRequest(requestId, rejectionReason);
      setRejectTarget(null);
      toast.info(
        'Onboarding request rejected',
        `Application #ONB-${requestId} has been marked as REJECTED.`
      );
      await Promise.all([fetchRequestsAndCounts(), fetchSupportingData()]);
      if (selectedRequest && selectedRequest.id === requestId) {
        try {
          const updated = await platformOnboardingApi.getRequestById(requestId);
          setSelectedRequest(updated);
        } catch {
          setSelectedRequest((prev) =>
            prev ? { ...prev, status: 'REJECTED', rejectionReason } : null
          );
        }
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to reject onboarding request. Please try again.';
      setActionError(msg);
      toast.error('Rejection failed', msg);
    } finally {
      setIsMutating(false);
    }
  };

  const handleWorkspaceToggle = (target: WorkspaceType) => {
    switchWorkspace(target);
    navigate(target === 'PLATFORM' ? '/platform' : '/app');
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out', 'Your session has been closed.');
    navigate('/login', { replace: true });
  };

  const selectedRequestAuditEntries = useMemo(() => {
    if (!selectedRequest) return [];
    return auditLogs.filter((item) => item.resourceId === selectedRequest.id);
  }, [auditLogs, selectedRequest]);

  const columns: DataTableColumn<OnboardingRequestResponse>[] = useMemo(
    () => [
      {
        key: 'school',
        header: 'School / Organization',
        render: (row) => (
          <div className="space-y-1 min-w-[210px]">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => void handleOpenDetails(row)}
                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer"
              >
                {row.schoolName}
              </button>
              <span className="font-mono text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-1.5 py-0.5 rounded-md">
                #ONB-{row.id}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-600">
                {BOARD_AFFILIATION_LABELS[row.boardAffiliation] || row.boardAffiliation}
              </span>
              <span>•</span>
              <span>
                {row.city}, {row.state}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'applicant',
        header: 'Applicant',
        render: (row) => (
          <div className="space-y-0.5 min-w-[160px]">
            <div className="font-medium text-slate-900">{row.contactPersonName}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span>{row.designation}</span>
              {row.requestedBy ? (
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  User #{row.requestedBy}
                </span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Contact Info',
        render: (row) => (
          <div className="space-y-1 text-xs min-w-[185px]">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[200px]" title={row.contactEmail}>
                {row.contactEmail}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>+91 {row.mobileNumber}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'scale',
        header: 'Scale & System',
        render: (row) => (
          <div className="space-y-0.5 text-xs min-w-[160px]">
            <div className="font-medium text-slate-800">
              {STUDENT_STRENGTH_LABELS[row.studentStrength] || row.studentStrength}
            </div>
            <div className="text-slate-500">
              {row.campusCount} {row.campusCount === 1 ? 'campus' : 'campuses'} •{' '}
              {MANAGEMENT_SYSTEM_LABELS[row.managementSystem] || row.managementSystem}
            </div>
          </div>
        ),
      },
      {
        key: 'submittedAt',
        header: 'Submitted',
        render: (row) => (
          <div className="text-xs text-slate-600 whitespace-nowrap">
            {formatOnboardingDate(row.createdAt)}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const meta = getOnboardingStatusBadgeMeta(row.status);
          return (
            <Badge variant={meta.variant} dot>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => {
          const actionable = row.status === 'PENDING' || row.status === 'UNDER_REVIEW';
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleOpenDetails(row)}
                leftIcon={<Eye className="w-3.5 h-3.5" />}
              >
                Details
              </Button>
              {actionable && canManageOnboarding && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActionError(null);
                      setApproveTarget(row);
                    }}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActionError(null);
                      setRejectTarget(row);
                    }}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    leftIcon={<XCircle className="w-3.5 h-3.5" />}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [canManageOnboarding]
  );

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email;
  const rows = pagedData?.content || [];
  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;
  const fromRow = totalElements === 0 ? 0 : page * pageSize + 1;
  const toRow = Math.min((page + 1) * pageSize, totalElements);

  return (
    <div className="min-h-screen bg-stone-50/50 text-slate-900 flex flex-col">
      {/* Top Platform Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
                <span className="font-extrabold text-sm tracking-tight">SF</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                School<span className="text-indigo-600">Forge</span>
              </span>
            </Link>

            <span className="h-4 w-px bg-slate-200 hidden sm:inline-block" />

            <Badge variant="primary" dot>
              Platform Administration
            </Badge>

            <nav className="hidden md:flex items-center gap-1 ml-2">
              <Link
                to="/platform/onboarding"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60"
              >
                Onboarding Requests
              </Link>
              <Link
                to="/platform/context"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Workspace Context
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {hasPlatformAccess && activeMemberships.length > 0 && (
              <div className="hidden md:flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => handleWorkspaceToggle('SCHOOL')}
                  className="px-3 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  School Workspace
                </button>
                <button
                  type="button"
                  onClick={() => handleWorkspaceToggle('PLATFORM')}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-white text-slate-900 shadow-2xs transition-colors cursor-pointer"
                >
                  Platform Admin
                </button>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-medium text-slate-800">{fullName}</span>
              {platformRoles[0] && (
                <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded">
                  {platformRoles[0]}
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PageHeader
          eyebrow="Platform Control Plane"
          title="School Onboarding Requests"
          description="Review incoming school organization applications, verify institution and applicant details, and approve or reject tenant provisioning."
          badge={
            statusCounts.pending > 0 ? (
              <Badge variant="warning" dot>
                {statusCounts.pending} Pending Review
              </Badge>
            ) : (
              <Badge variant="neutral">All Caught Up</Badge>
            )
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              isLoading={isLoading}
              onClick={() => {
                void fetchRequestsAndCounts();
                void fetchSupportingData();
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          }
        />

        {/* Recently Approved Organization Banner */}
        {recentlyApprovedOrg && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">
                  Organization Provisioned: {recentlyApprovedOrg.name} (ID #
                  {recentlyApprovedOrg.id})
                </p>
                <p className="text-emerald-800">
                  Status: <span className="font-mono font-semibold">{recentlyApprovedOrg.status}</span>{' '}
                  • Location: {recentlyApprovedOrg.city}, {recentlyApprovedOrg.state} • Official
                  Email: {recentlyApprovedOrg.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRecentlyApprovedOrg(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Read-Only Access Notice if user lacks platform.organization.manage */}
        {!canManageOnboarding && canViewOnboarding && (
          <InlineAlert variant="info" title="Read-Only Onboarding Access">
            Your platform role grants view access (<span className="font-mono">platform.organization.view</span>).
            Approving or rejecting applications requires <span className="font-mono">platform.organization.manage</span>.
          </InlineAlert>
        )}
        {/* Status Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
              setPage(0);
            }}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
              statusFilter === ''
                ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30'
                : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Total Applications</span>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1.5">{statusCounts.total}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('PENDING');
              setPage(0);
            }}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/30'
                : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1.5">{statusCounts.pending}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('APPROVED');
              setPage(0);
            }}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30'
                : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Approved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-1.5">{statusCounts.approved}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('REJECTED');
              setPage(0);
            }}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
              statusFilter === 'REJECTED'
                ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/30'
                : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Rejected</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-700 mt-1.5">{statusCounts.rejected}</p>
          </button>
        </div>

        {/* Search & Status Filter Toolbar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search by school name, applicant, email, phone, city, or #ONB-ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              rightElement={
                searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Status:</span>
            </div>
            <Select
              aria-label="Filter by onboarding status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as OnboardingStatus | '');
                setPage(0);
              }}
              className="w-44 h-9 text-xs"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'ALL'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Rows per page"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 10);
                setPage(0);
              }}
              className="w-32 h-9 text-xs"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </Select>
          </div>
        </div>

        {/* Error or Table View */}
        {error ? (
          <ErrorState
            title="Unable to load onboarding requests"
            message={error}
            onRetry={() => void fetchRequestsAndCounts()}
          />
        ) : (
          <div className="space-y-3">
            <DataTable
              columns={columns}
              data={rows}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyTitle={
                appliedSearch || statusFilter
                  ? 'No matching onboarding requests'
                  : 'No school onboarding requests yet'
              }
              emptyDescription={
                appliedSearch || statusFilter
                  ? 'Try clearing your search query or switching the status filter to view all applications.'
                  : 'New school applications submitted from the public onboarding or registration page will appear here.'
              }
            />

            {/* Pagination Footer */}
            {totalElements > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600 shadow-2xs">
                <div>
                  Showing <span className="font-semibold text-slate-900">{fromRow}</span> to{' '}
                  <span className="font-semibold text-slate-900">{toRow}</span> of{' '}
                  <span className="font-semibold text-slate-900">{totalElements}</span> onboarding
                  requests
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 0 || isLoading}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    Previous
                  </Button>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-medium text-slate-700">
                    Page {page + 1} of {Math.max(1, totalPages)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1 || isLoading}
                    onClick={() => setPage((p) => p + 1)}
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Request Details Modal */}
      <OnboardingRequestDetailsModal
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        request={selectedRequest}
        isLoadingDetails={isLoadingDetails}
        canManageOnboarding={canManageOnboarding}
        auditEntries={selectedRequestAuditEntries}
        onApproveClick={(req) => {
          setActionError(null);
          setApproveTarget(req);
        }}
        onRejectClick={(req) => {
          setActionError(null);
          setRejectTarget(req);
        }}
      />

      {/* Approve Confirmation Dialog */}
      <ApproveOnboardingDialog
        open={Boolean(approveTarget)}
        onClose={() => {
          setApproveTarget(null);
          setActionError(null);
        }}
        request={approveTarget}
        plans={plans}
        isSubmitting={isMutating}
        errorMessage={actionError}
        onConfirmApprove={handleConfirmApprove}
      />

      {/* Reject Confirmation Dialog */}
      <RejectOnboardingDialog
        open={Boolean(rejectTarget)}
        onClose={() => {
          setRejectTarget(null);
          setActionError(null);
        }}
        request={rejectTarget}
        isSubmitting={isMutating}
        errorMessage={actionError}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  );
};
