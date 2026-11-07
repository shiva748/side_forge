import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Mail,
  PauseCircle,
  Phone,
  PowerOff,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api-client';
import { platformOnboardingApi } from '../services/onboardingApi';
import { platformDashboardApi } from '../services/platformDashboardApi';
import { SubscriptionStatus } from '../types/auth';
import {
  BOARD_AFFILIATION_LABELS,
  OnboardingRequestResponse,
  PagedResponse,
} from '../types/onboarding';
import {
  getOrganizationStatusBadgeMeta,
  getSubscriptionStatusBadgeMeta,
  ManageableOrganizationStatus,
  OrganizationAdminDetailResponse,
  OrganizationAdminListItemResponse,
  OrganizationStatus,
} from '../types/platformDashboard';
import { AppShell } from '../components/layout/AppShell';
import { formatOnboardingDate } from '../components/platform/OnboardingRequestDetailsModal';
import { OrganizationDetailsModal } from '../components/platform/OrganizationDetailsModal';
import {
  OrganizationStatusActionDialog,
  OrganizationStatusTarget,
} from '../components/platform/OrganizationStatusActionDialog';
import { Badge, CounterLabel, IdLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Input, Select } from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, InlineAlert } from '../components/ui/StateViews';
import { TruncatedText } from '../components/ui/TruncatedText';

const ORG_STATUS_FILTER_OPTIONS: { value: OrganizationStatus | ''; label: string }[] = [
  { value: '', label: 'All Organization Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
];

const SUB_STATUS_FILTER_OPTIONS: { value: SubscriptionStatus | ''; label: string }[] = [
  { value: '', label: 'All Subscription Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'PAST_DUE', label: 'Grace Period (Past Due)' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

type SortField = 'id' | 'name' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

export const PlatformOrganizationsPage: React.FC = () => {
  const { platformPermissions } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Strictly check platform-scoped permissions
  const canViewOrganizations = platformPermissions.has('platform.organization.view');
  const canManageOrganizations = platformPermissions.has('platform.organization.manage');

  const initialStatusParam = searchParams.get('status') as OrganizationStatus | null;
  const validInitialStatus: OrganizationStatus | '' =
    initialStatusParam &&
    ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING', 'REJECTED'].includes(initialStatusParam)
      ? initialStatusParam
      : '';

  // Filters, search, sorting & pagination state
  const [statusFilter, setStatusFilter] = useState<OrganizationStatus | ''>(
    validInitialStatus
  );
  const [subStatusFilter, setSubStatusFilter] = useState<SubscriptionStatus | ''>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Data state
  const [pagedData, setPagedData] =
    useState<PagedResponse<OrganizationAdminListItemResponse> | null>(null);
  const [approvedOnboardingByEmail, setApprovedOnboardingByEmail] = useState<
    Record<string, OnboardingRequestResponse>
  >({});
  const [statusCounts, setStatusCounts] = useState<{
    total: number;
    active: number;
    suspended: number;
    deactivated: number;
  }>({
    total: 0,
    active: 0,
    suspended: 0,
    deactivated: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Details & Status Action Modal state
  const [selectedOrgDetail, setSelectedOrgDetail] =
    useState<OrganizationAdminDetailResponse | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [statusActionTarget, setStatusActionTarget] =
    useState<OrganizationStatusTarget | null>(null);
  const [isMutatingStatus, setIsMutatingStatus] = useState<boolean>(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Support searching by numeric Organization ID (#12 or 12) in addition to backend name/email/city search
  const backendSearchParam = useMemo(() => {
    const trimmed = appliedSearch.replace(/^#?(org-?)?/i, '').trim();
    if (/^\d+$/.test(trimmed)) {
      return undefined;
    }
    return appliedSearch || undefined;
  }, [appliedSearch]);

  const fetchOrganizationsAndCounts = useCallback(async () => {
    if (!canViewOrganizations) {
      setIsLoading(false);
      setError(
        'You do not have permission (platform.organization.view) to view organizations.'
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [pageResp, allResp, approvedOnbResp] = await Promise.all([
        platformDashboardApi.listOrganizations({
          status: statusFilter,
          subscriptionStatus: subStatusFilter,
          search: backendSearchParam,
          page,
          size: pageSize,
        }),
        platformDashboardApi.listOrganizations({
          page: 0,
          size: 100,
        }),
        platformOnboardingApi
          .listRequests({ status: 'APPROVED', page: 0, size: 100 })
          .catch(() => null),
      ]);

      setPagedData(pageResp);

      const allItems = allResp?.content || [];
      setStatusCounts({
        total: allResp?.totalElements ?? allItems.length,
        active: allItems.filter((o) => o.status === 'ACTIVE').length,
        suspended: allItems.filter((o) => o.status === 'SUSPENDED').length,
        deactivated: allItems.filter((o) => o.status === 'DEACTIVATED').length,
      });

      if (approvedOnbResp?.content) {
        const map: Record<string, OnboardingRequestResponse> = {};
        for (const req of approvedOnbResp.content) {
          if (req.schoolEmail) {
            map[req.schoolEmail.toLowerCase()] = req;
          }
          if (req.schoolName) {
            map[`name:${req.schoolName.toLowerCase()}`] = req;
          }
        }
        setApprovedOnboardingByEmail(map);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isForbidden) {
          setError(
            'Access denied (403): Your account is not authorized to view registered organizations.'
          );
        } else {
          setError(err.message);
        }
      } else {
        setError('Unable to load registered organizations. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [backendSearchParam, canViewOrganizations, page, pageSize, statusFilter, subStatusFilter]);

  useEffect(() => {
    void fetchOrganizationsAndCounts();
  }, [fetchOrganizationsAndCounts]);

  const handleOpenDetails = useCallback(
    async (organizationId: number) => {
      setIsDetailsModalOpen(true);
      setIsLoadingDetails(true);
      setDetailsError(null);
      try {
        const detail = await platformDashboardApi.getOrganizationDetails(organizationId);
        setSelectedOrgDetail(detail);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Unable to load organization details.';
        setDetailsError(msg);
        toast.error('Could not load organization details', msg);
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [toast]
  );

  // Open organization details modal automatically if navigated with `?organizationId=<id>`
  useEffect(() => {
    const orgIdParam = Number(searchParams.get('organizationId'));
    if (!orgIdParam || Number.isNaN(orgIdParam) || !canViewOrganizations) return;
    void handleOpenDetails(orgIdParam);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('organizationId');
    setSearchParams(nextParams, { replace: true });
  }, [canViewOrganizations, handleOpenDetails, searchParams, setSearchParams]);

  const handleConfirmStatusChange = async (
    organizationId: number,
    nextStatus: ManageableOrganizationStatus,
    reason: string
  ) => {
    setIsMutatingStatus(true);
    setStatusActionError(null);
    try {
      const updatedDetail = await platformDashboardApi.changeOrganizationStatus(
        organizationId,
        { status: nextStatus, reason }
      );
      setStatusActionTarget(null);
      toast.success(
        'Organization status updated',
        `${updatedDetail.name} (Org #${updatedDetail.id}) is now ${updatedDetail.status}.`
      );
      if (selectedOrgDetail && selectedOrgDetail.id === organizationId) {
        setSelectedOrgDetail(updatedDetail);
      }
      await fetchOrganizationsAndCounts();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to update organization status. Please try again.';
      setStatusActionError(msg);
      toast.error('Status update failed', msg);
    } finally {
      setIsMutatingStatus(false);
    }
  };

  const resolveOnboardingApplicant = useCallback(
    (email?: string | null, name?: string | null): OnboardingRequestResponse | null => {
      if (email && approvedOnboardingByEmail[email.toLowerCase()]) {
        return approvedOnboardingByEmail[email.toLowerCase()];
      }
      if (name && approvedOnboardingByEmail[`name:${name.toLowerCase()}`]) {
        return approvedOnboardingByEmail[`name:${name.toLowerCase()}`];
      }
      return null;
    },
    [approvedOnboardingByEmail]
  );

  // Filter by numeric ID when user searches `#12` or `12`, and apply client-side sorting
  const displayedRows = useMemo(() => {
    const rawRows = pagedData?.content || [];
    const idQuery = appliedSearch.replace(/^#?(org-?)?/i, '').trim();
    const filtered =
      /^\d+$/.test(idQuery)
        ? rawRows.filter((r) => String(r.id).includes(idQuery))
        : rawRows;

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'id') {
        cmp = a.id - b.id;
      } else if (sortField === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'createdAt') {
        cmp =
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      } else if (sortField === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [appliedSearch, pagedData, sortField, sortOrder]);

  const columns: DataTableColumn<OrganizationAdminListItemResponse>[] = useMemo(
    () => [
      {
        key: 'organization',
        header: 'Organization / School',
        render: (row) => (
          <div className="space-y-1 min-w-[210px]">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <button
                type="button"
                onClick={() => void handleOpenDetails(row.id)}
                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer min-w-0"
              >
                <TruncatedText
                  text={row.name}
                  maxWidthClass="max-w-[210px]"
                  className="font-semibold"
                />
              </button>
              <IdLabel>Org #{row.id}</IdLabel>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
              <span className="font-medium text-slate-600 shrink-0">
                {BOARD_AFFILIATION_LABELS[row.boardAffiliation] || row.boardAffiliation}
              </span>
              <span className="shrink-0">•</span>
              <TruncatedText
                text={`${row.city}, ${row.state}`}
                maxWidthClass="max-w-[160px]"
              />
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Contact Details',
        render: (row) => {
          const applicant = resolveOnboardingApplicant(row.contactEmail, row.name);
          return (
            <div className="space-y-1 text-xs min-w-[190px]">
              {applicant?.contactPersonName && (
                <TruncatedText
                  text={
                    applicant.designation
                      ? `${applicant.contactPersonName} (${applicant.designation})`
                      : applicant.contactPersonName
                  }
                  maxWidthClass="max-w-[200px]"
                  as="div"
                  className="font-medium text-slate-900"
                >
                  {applicant.contactPersonName}
                  {applicant.designation ? (
                    <span className="text-slate-500 font-normal">
                      {' '}
                      ({applicant.designation})
                    </span>
                  ) : null}
                </TruncatedText>
              )}
              <div className="flex items-center gap-1.5 text-slate-700 min-w-0">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <TruncatedText
                  text={row.contactEmail}
                  maxWidthClass="max-w-[190px]"
                />
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="whitespace-nowrap">{row.contactPhone}</span>
              </div>
            </div>
          );
        },
      },

      {
        key: 'status',
        header: 'Org Status',
        render: (row) => {
          const meta = getOrganizationStatusBadgeMeta(row.status);
          return (
            <Badge variant={meta.variant} dot>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        key: 'subscription',
        header: 'SaaS Subscription',
        render: (row) => {
          const subMeta = getSubscriptionStatusBadgeMeta(row.subscriptionStatus);
          return (
            <div className="space-y-1 text-xs min-w-[155px]">
              <div>
                <Badge variant={subMeta.variant} dot>
                  {subMeta.label}
                </Badge>
              </div>
              <div className="text-slate-500">
                {row.planName ? (
                  <>
                    <span className="font-medium text-slate-700">{row.planName}</span>
                    {row.expiryDate ? ` • Exp ${row.expiryDate}` : ''}
                  </>
                ) : (
                  'No active plan'
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        header: 'Registered',
        render: (row) => (
          <div className="text-xs text-slate-600 whitespace-nowrap">
            {formatOnboardingDate(row.createdAt)}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleOpenDetails(row.id)}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              View
            </Button>
            {canManageOrganizations && (
              <>
                {row.status !== 'ACTIVE' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setStatusActionError(null);
                      setStatusActionTarget({
                        id: row.id,
                        name: row.name,
                        currentStatus: row.status,
                        nextStatus: 'ACTIVE',
                      });
                    }}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Activate
                  </Button>
                )}
                {row.status === 'ACTIVE' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusActionError(null);
                      setStatusActionTarget({
                        id: row.id,
                        name: row.name,
                        currentStatus: row.status,
                        nextStatus: 'SUSPENDED',
                      });
                    }}
                    className="text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    leftIcon={<PauseCircle className="w-3.5 h-3.5" />}
                  >
                    Suspend
                  </Button>
                )}
                {row.status !== 'DEACTIVATED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusActionError(null);
                      setStatusActionTarget({
                        id: row.id,
                        name: row.name,
                        currentStatus: row.status,
                        nextStatus: 'DEACTIVATED',
                      });
                    }}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    leftIcon={<PowerOff className="w-3.5 h-3.5" />}
                  >
                    Deactivate
                  </Button>
                )}
              </>
            )}
          </div>
        ),
      },
    ],
    [canManageOrganizations, handleOpenDetails, resolveOnboardingApplicant]
  );

  const totalElements = pagedData?.totalElements ?? 0;
  const totalPages = pagedData?.totalPages ?? 0;
  const fromRow = totalElements === 0 ? 0 : page * pageSize + 1;
  const toRow = Math.min((page + 1) * pageSize, totalElements);

  const selectedApplicant = selectedOrgDetail
    ? resolveOnboardingApplicant(selectedOrgDetail.contactEmail, selectedOrgDetail.name)
    : null;

  return (
    <AppShell
      pageTitle="Organizations"
      breadcrumbParent="Platform Administration"
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Platform Control Plane"
          title="School Organizations"
          description="Directory of registered school organizations on the Side_forge platform. View tenant profiles, read-only SaaS subscription status, and manage organization lifecycle state."
          badge={
            <CounterLabel
              count={statusCounts.total}
              label={statusCounts.total === 1 ? 'Organization' : 'Organizations'}
            />
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              isLoading={isLoading}
              onClick={() => void fetchOrganizationsAndCounts()}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          }
        />

        {/* Read-Only Access Notice if user lacks platform.organization.manage */}
        {!canManageOrganizations && canViewOrganizations && (
          <InlineAlert variant="info" title="Read-Only Organization Directory Access">
            Your platform role grants view access (
            <span className="font-mono">platform.organization.view</span>). Activating,
            suspending, or deactivating organizations requires{' '}
            <span className="font-mono">platform.organization.manage</span>.
          </InlineAlert>
        )}

        {/* Status Summary Cards */}
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
              <span className="font-medium">Total Registered</span>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1.5">{statusCounts.total}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('ACTIVE');
              setPage(0);
            }}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30'
                : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-1.5">
              {statusCounts.active}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('SUSPENDED');
              setPage(0);
            }}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
              statusFilter === 'SUSPENDED'
                ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/30'
                : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Suspended</span>
              <PauseCircle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1.5">
              {statusCounts.suspended}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('DEACTIVATED');
              setPage(0);
            }}
            className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
              statusFilter === 'DEACTIVATED'
                ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/30'
                : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Deactivated</span>
              <PowerOff className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-700 mt-1.5">
              {statusCounts.deactivated}
            </p>
          </button>
        </div>

        {/* Search, Filter & Sort Toolbar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search by school name, email, city, or Org #ID..."
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Filters:</span>
            </div>

            <Select
              aria-label="Filter by organization status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as OrganizationStatus | '');
                setPage(0);
              }}
              className="w-44 h-9 text-xs"
            >
              {ORG_STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'ALL_ORG'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Filter by subscription status"
              value={subStatusFilter}
              onChange={(e) => {
                setSubStatusFilter(e.target.value as SubscriptionStatus | '');
                setPage(0);
              }}
              className="w-48 h-9 text-xs"
            >
              {SUB_STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'ALL_SUB'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Sort:</span>
            </div>

            <Select
              aria-label="Sort organizations"
              value={`${sortField}:${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split(':') as [SortField, SortOrder];
                setSortField(f || 'id');
                setSortOrder(o || 'desc');
              }}
              className="w-44 h-9 text-xs"
            >
              <option value="id:desc">Newest Registered</option>
              <option value="id:asc">Oldest Registered</option>
              <option value="name:asc">School Name (A–Z)</option>
              <option value="name:desc">School Name (Z–A)</option>
              <option value="status:asc">Status (A–Z)</option>
            </Select>

            <Select
              aria-label="Rows per page"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 10);
                setPage(0);
              }}
              className="w-28 h-9 text-xs"
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
            title="Unable to load organizations"
            message={error}
            onRetry={() => void fetchOrganizationsAndCounts()}
          />
        ) : (
          <div className="space-y-3">
            <DataTable
              columns={columns}
              data={displayedRows}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyTitle={
                appliedSearch || statusFilter || subStatusFilter
                  ? 'No matching organizations found'
                  : 'No registered school organizations yet'
              }
              emptyDescription={
                appliedSearch || statusFilter || subStatusFilter
                  ? 'Try clearing your search query or adjusting the status filters.'
                  : 'Organizations are provisioned automatically when school onboarding requests are approved.'
              }
            />

            {/* Pagination Footer */}
            {totalElements > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600 shadow-2xs">
                <div>
                  Showing <span className="font-semibold text-slate-900">{fromRow}</span> to{' '}
                  <span className="font-semibold text-slate-900">{toRow}</span> of{' '}
                  <span className="font-semibold text-slate-900">{totalElements}</span>{' '}
                  organizations
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
      </div>

      {/* Organization Details Modal */}
      <OrganizationDetailsModal
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        organization={selectedOrgDetail}
        applicantContactName={selectedApplicant?.contactPersonName}
        applicantDesignation={selectedApplicant?.designation}
        isLoading={isLoadingDetails}
        errorMessage={detailsError}
        canManageOrganization={canManageOrganizations}
        onTriggerStatusAction={(org, nextStatus) => {
          setStatusActionError(null);
          setStatusActionTarget({
            id: org.id,
            name: org.name,
            currentStatus: org.status,
            nextStatus,
          });
        }}
      />

      {/* Organization Status Change Confirmation Dialog */}
      <OrganizationStatusActionDialog
        open={Boolean(statusActionTarget)}
        onClose={() => {
          setStatusActionTarget(null);
          setStatusActionError(null);
        }}
        target={statusActionTarget}
        isSubmitting={isMutatingStatus}
        errorMessage={statusActionError}
        onConfirmStatusChange={handleConfirmStatusChange}
      />
    </AppShell>
  );
};
