import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Edit3,
  Eye,
  Filter,
  Gift,
  Layers,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api-client';
import { platformDashboardApi } from '../services/platformDashboardApi';
import { platformSubscriptionApi } from '../services/platformSubscriptionApi';
import { SubscriptionStatus } from '../types/auth';
import { PagedResponse } from '../types/onboarding';
import {
  getSubscriptionStatusBadgeMeta,
  OrganizationAdminListItemResponse,
  OrganizationSubscriptionHistoryItem,
  PlatformDashboardResponse,
} from '../types/platformDashboard';
import {
  AssignSubscriptionRequest,
  ChangeSubscriptionPlanRequest,
  CreateSubscriptionPlanRequest,
  formatCurrencyINR,
  FullOrganizationSubscriptionResponse,
  getGracePeriodEndDate,
  getPaymentStatusBadgeMeta,
  OrganizationBillingSummaryResponse,
  PLATFORM_FEATURE_LABELS,
  RenewSubscriptionRequest,
  resolveSubscriptionPaymentLabel,
  SubscriptionPaymentResponse,
  SubscriptionPlanResponse,
  UpdateSubscriptionPlanRequest,
  UpdateSubscriptionStatusRequest,
} from '../types/platformSubscription';
import { AppShell } from '../components/layout/AppShell';
import {
  PaymentReceiptDownloadButtons,
  RecordManualPaymentDialog,
} from '../components/platform/ManualPaymentAndReceiptControls';
import {
  SubscriptionActionDialog,
  SubscriptionActionMode,
  SubscriptionActionTarget,
} from '../components/platform/SubscriptionActionDialogs';
import { SubscriptionDetailsModal } from '../components/platform/SubscriptionDetailsModal';
import {
  PlanDetailsModal,
  PlanFormModal,
  PlanStatusConfirmDialog,
} from '../components/platform/SubscriptionPlanModals';
import { Badge, CounterLabel, IdLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Input, Select } from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, InlineAlert } from '../components/ui/StateViews';
import { TruncatedText } from '../components/ui/TruncatedText';

type ActiveSectionTab =
  | 'SUBSCRIPTIONS'
  | 'PLANS'
  | 'RENEWALS_AND_ALERTS'
  | 'PAYMENTS';

const SUB_STATUS_OPTIONS: { value: SubscriptionStatus | ''; label: string }[] = [
  { value: '', label: 'All Subscription Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'PAST_DUE', label: 'Grace Period (Past Due)' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
export const PlatformSubscriptionsPage: React.FC = () => {
  const { platformPermissions } = useAuth();
  const toast = useToast();

  // Strictly check platform-scoped permissions
  const canViewDashboard = platformPermissions.has('platform.dashboard.view');
  const canViewOrganizations = platformPermissions.has('platform.organization.view');
  const canViewPlans = platformPermissions.has('platform.plan.view');
  const canManagePlans = platformPermissions.has('platform.plan.manage');
  const canViewSubscriptions = platformPermissions.has('platform.subscription.view');
  const canManageSubscriptions = platformPermissions.has('platform.subscription.manage');
  const canViewBilling = platformPermissions.has('platform.billing.view');
  const canManageBilling = platformPermissions.has('platform.billing.manage');
  const canManageEntitlements = platformPermissions.has('platform.entitlement.manage');

  const [activeTab, setActiveTab] = useState<ActiveSectionTab>('SUBSCRIPTIONS');

  // Directory filters & pagination
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<SubscriptionStatus | ''>('');
  const [planCodeFilter, setPlanCodeFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Overview & Directory data
  const [dashboardMetrics, setDashboardMetrics] =
    useState<PlatformDashboardResponse | null>(null);
  const [orgSubscriptionsPage, setOrgSubscriptionsPage] =
    useState<PagedResponse<OrganizationAdminListItemResponse> | null>(null);
  const [currentSubByOrgId, setCurrentSubByOrgId] = useState<
    Record<number, FullOrganizationSubscriptionResponse | null>
  >({});
  const [plans, setPlans] = useState<SubscriptionPlanResponse[]>([]);
  const [paymentsPage, setPaymentsPage] =
    useState<PagedResponse<SubscriptionPaymentResponse> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Plan Modals state
  const [selectedPlanForView, setSelectedPlanForView] =
    useState<SubscriptionPlanResponse | null>(null);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanResponse | null>(null);
  const [planStatusTarget, setPlanStatusTarget] =
    useState<SubscriptionPlanResponse | null>(null);
  const [isMutatingPlan, setIsMutatingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Organization Subscription Details & Action Modals state
  const [detailOrg, setDetailOrg] = useState<{ id: number; name: string } | null>(null);
  const [detailCurrentSub, setDetailCurrentSub] =
    useState<FullOrganizationSubscriptionResponse | null>(null);
  const [detailHistory, setDetailHistory] = useState<
    OrganizationSubscriptionHistoryItem[]
  >([]);
  const [detailBilling, setDetailBilling] =
    useState<OrganizationBillingSummaryResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [subActionTarget, setSubActionTarget] =
    useState<SubscriptionActionTarget | null>(null);
  const [isMutatingSub, setIsMutatingSub] = useState(false);
  const [subActionError, setSubActionError] = useState<string | null>(null);

  // Manual Payment Recording Dialog state
  const [manualPaymentTarget, setManualPaymentTarget] = useState<{
    organizationId: number;
    organizationName: string;
    currentSubscription: FullOrganizationSubscriptionResponse | null;
    billingSummary: OrganizationBillingSummaryResponse | null;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);


  const loadSubscriptionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tasks: Promise<void>[] = [];

      if (canViewDashboard) {
        tasks.push(
          platformDashboardApi
            .getDashboardMetrics()
            .then((res) => setDashboardMetrics(res))
            .catch(() => {
              // Non-blocking if dashboard metrics fail
            })
        );
      }

      if (canViewPlans) {
        tasks.push(
          platformSubscriptionApi
            .listPlans()
            .then((res) => setPlans(Array.isArray(res) ? res : []))
            .catch(() => {
              // Handled per section
            })
        );
      }

      if (canViewOrganizations) {
        tasks.push(
          platformDashboardApi
            .listOrganizations({
              subscriptionStatus: subStatusFilter,
              planCode: planCodeFilter || undefined,
              search: appliedSearch || undefined,
              page,
              size: pageSize,
            })
            .then(async (pageResp) => {
              setOrgSubscriptionsPage(pageResp);
              if (canViewSubscriptions && pageResp?.content?.length) {
                const entries = await Promise.all(
                  pageResp.content.map(async (org) => {
                    try {
                      const cur = await platformSubscriptionApi.getCurrentSubscription(
                        org.id
                      );
                      return [org.id, cur] as const;
                    } catch {
                      return [org.id, null] as const;
                    }
                  })
                );
                setCurrentSubByOrgId((prev) => ({
                  ...prev,
                  ...Object.fromEntries(entries),
                }));
              }
            })
        );
      }

      if (canViewBilling) {
        tasks.push(
          platformSubscriptionApi
            .listAllPayments({ page: 0, size: 20 })
            .then((res) => setPaymentsPage(res))
            .catch(() => {
              // Non-blocking
            })
        );
      }

      await Promise.all(tasks);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.isForbidden
            ? 'Access denied (403): You do not have permission to view subscription records.'
            : err.message
        );
      } else {
        setError('Unable to load subscription management data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    appliedSearch,
    canViewBilling,
    canViewDashboard,
    canViewOrganizations,
    canViewPlans,
    canViewSubscriptions,
    page,
    pageSize,
    planCodeFilter,
    subStatusFilter,
  ]);

  useEffect(() => {
    void loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handleOpenSubscriptionDetails = useCallback(
    async (organizationId: number, organizationName: string) => {
      setDetailOrg({ id: organizationId, name: organizationName });
      setIsLoadingDetail(true);
      setDetailError(null);
      try {
        const [curSub, hist, bill] = await Promise.all([
          canViewSubscriptions
            ? platformSubscriptionApi
                .getCurrentSubscription(organizationId)
                .catch(() => null)
            : Promise.resolve(null),
          canViewSubscriptions
            ? platformSubscriptionApi
                .getSubscriptionHistory(organizationId)
                .catch(() => [])
            : Promise.resolve([]),
          canViewBilling
            ? platformSubscriptionApi
                .getOrganizationBillingSummary(organizationId)
                .catch(() => null)
            : Promise.resolve(null),
        ]);
        setDetailCurrentSub(curSub);
        setDetailHistory(Array.isArray(hist) ? hist : []);
        setDetailBilling(bill);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Unable to load subscription details.';
        setDetailError(msg);
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [canViewBilling, canViewSubscriptions]
  );

  const refreshAfterMutation = async (organizationId?: number, orgName?: string) => {
    await loadSubscriptionData();
    if (organizationId && detailOrg?.id === organizationId) {
      await handleOpenSubscriptionDetails(organizationId, orgName || detailOrg.name);
    }
  };

  // Plan Mutations (`platform.plan.manage`)
  const handleCreatePlan = async (payload: CreateSubscriptionPlanRequest) => {
    setIsMutatingPlan(true);
    setPlanError(null);
    try {
      const created = await platformSubscriptionApi.createPlan(payload);
      setIsPlanFormOpen(false);
      toast.success('Subscription plan created', `${created.name} (${created.code}) is now active.`);
      await loadSubscriptionData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create subscription plan.';
      setPlanError(msg);
      toast.error('Create plan failed', msg);
    } finally {
      setIsMutatingPlan(false);
    }
  };

  const handleUpdatePlan = async (planId: number, payload: UpdateSubscriptionPlanRequest) => {
    setIsMutatingPlan(true);
    setPlanError(null);
    try {
      const updated = await platformSubscriptionApi.updatePlan(planId, payload);
      setIsPlanFormOpen(false);
      setEditingPlan(null);
      toast.success('Subscription plan updated', `${updated.name} (${updated.code}) saved.`);
      await loadSubscriptionData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update subscription plan.';
      setPlanError(msg);
      toast.error('Update plan failed', msg);
    } finally {
      setIsMutatingPlan(false);
    }
  };

  const handleTogglePlanStatus = async (planId: number, nextActive: boolean) => {
    setIsMutatingPlan(true);
    setPlanError(null);
    try {
      const updated = await platformSubscriptionApi.changePlanStatus(planId, nextActive);
      setPlanStatusTarget(null);
      toast.info(
        'Plan status updated',
        `${updated.name} (${updated.code}) is now ${updated.active ? 'ACTIVE' : 'INACTIVE'}.`
      );
      await loadSubscriptionData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to change plan status.';
      setPlanError(msg);
      toast.error('Status update failed', msg);
    } finally {
      setIsMutatingPlan(false);
    }
  };

  // Organization Subscription Mutations (`platform.subscription.manage`)
  const handleAssignSubscription = async (
    organizationId: number,
    payload: AssignSubscriptionRequest
  ) => {
    setIsMutatingSub(true);
    setSubActionError(null);
    try {
      const res = await platformSubscriptionApi.assignSubscription(organizationId, payload);
      const targetName = subActionTarget?.organizationName || res.organizationName;
      setSubActionTarget(null);
      toast.success(
        'Subscription assigned',
        `Assigned ${res.planName} (${res.billingInterval}) to ${targetName}.`
      );
      await refreshAfterMutation(organizationId, targetName);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to assign subscription.';
      setSubActionError(msg);
      toast.error('Assignment failed', msg);
    } finally {
      setIsMutatingSub(false);
    }
  };

  const handleChangePlan = async (
    organizationId: number,
    payload: ChangeSubscriptionPlanRequest
  ) => {
    setIsMutatingSub(true);
    setSubActionError(null);
    try {
      const res = await platformSubscriptionApi.changeSubscriptionPlan(organizationId, payload);
      const targetName = subActionTarget?.organizationName || res.organizationName;
      setSubActionTarget(null);
      toast.success('Subscription plan changed', `Updated ${targetName} to ${res.planName}.`);
      await refreshAfterMutation(organizationId, targetName);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to change subscription plan.';
      setSubActionError(msg);
      toast.error('Plan change failed', msg);
    } finally {
      setIsMutatingSub(false);
    }
  };

  const handleRenewSubscription = async (
    organizationId: number,
    payload: RenewSubscriptionRequest
  ) => {
    setIsMutatingSub(true);
    setSubActionError(null);
    try {
      const res = await platformSubscriptionApi.renewSubscription(organizationId, payload);
      const targetName = subActionTarget?.organizationName || res.organizationName;
      setSubActionTarget(null);
      toast.success(
        'Subscription renewed',
        `Extended validity for ${targetName} through ${res.expiryDate}.`
      );
      await refreshAfterMutation(organizationId, targetName);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to renew subscription.';
      setSubActionError(msg);
      toast.error('Renewal failed', msg);
    } finally {
      setIsMutatingSub(false);
    }
  };

  const handleChangeStatus = async (
    organizationId: number,
    payload: UpdateSubscriptionStatusRequest
  ) => {
    setIsMutatingSub(true);
    setSubActionError(null);
    try {
      const res = await platformSubscriptionApi.updateSubscriptionStatus(
        organizationId,
        payload
      );
      const targetName = subActionTarget?.organizationName || res.organizationName;
      setSubActionTarget(null);
      toast.success(
        'Subscription status updated',
        `${targetName} subscription is now ${res.effectiveStatus || res.status}.`
      );
      await refreshAfterMutation(organizationId, targetName);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to update subscription status.';
      setSubActionError(msg);
      toast.error('Status update failed', msg);
    } finally {
      setIsMutatingSub(false);
    }
  };
  const triggerSubActionForOrg = useCallback(
    async (
      orgId: number,
      orgName: string,
      mode: SubscriptionActionMode,
      options?: { presetStatus?: 'ACTIVE'; presetComplimentary?: boolean }
    ) => {
      setSubActionError(null);
      let existingSub =
        detailOrg?.id === orgId && detailCurrentSub
          ? detailCurrentSub
          : currentSubByOrgId[orgId] ?? null;

      setSubActionTarget({
        organizationId: orgId,
        organizationName: orgName,
        currentSubscription: existingSub,
        mode,
        presetStatus: options?.presetStatus,
        presetComplimentary: options?.presetComplimentary,
      });

      if (!existingSub && canViewSubscriptions) {
        try {
          const fetched = await platformSubscriptionApi.getCurrentSubscription(orgId);
          if (fetched) {
            setCurrentSubByOrgId((prev) => ({ ...prev, [orgId]: fetched }));
            setSubActionTarget((prev) =>
              prev && prev.organizationId === orgId
                ? { ...prev, currentSubscription: fetched }
                : prev
            );
          }
        } catch {
          // Organization may not have an assigned subscription yet
        }
      }
    },
    [canViewSubscriptions, currentSubByOrgId, detailCurrentSub, detailOrg]
  );

  const handleOpenRecordPayment = useCallback(
    async (orgId: number, orgName: string) => {
      const cachedSub =
        detailOrg?.id === orgId
          ? detailCurrentSub
          : currentSubByOrgId[orgId] || null;
      const cachedBilling =
        detailOrg?.id === orgId ? detailBilling : null;

      setManualPaymentTarget({
        organizationId: orgId,
        organizationName: orgName,
        currentSubscription: cachedSub,
        billingSummary: cachedBilling,
      });

      try {
        const [fetchedSub, fetchedBilling] = await Promise.all([
          cachedSub
            ? Promise.resolve(cachedSub)
            : canViewSubscriptions
            ? platformSubscriptionApi.getCurrentSubscription(orgId).catch(() => null)
            : Promise.resolve(null),
          cachedBilling
            ? Promise.resolve(cachedBilling)
            : canViewBilling
            ? platformSubscriptionApi
                .getOrganizationBillingSummary(orgId)
                .catch(() => null)
            : Promise.resolve(null),
        ]);
        if (fetchedSub) {
          setCurrentSubByOrgId((prev) => ({ ...prev, [orgId]: fetchedSub }));
        }
        setManualPaymentTarget((prev) =>
          prev && prev.organizationId === orgId
            ? {
                ...prev,
                currentSubscription: fetchedSub,
                billingSummary: fetchedBilling,
              }
            : prev
        );
      } catch {
        // Keep cached values
      }
    },
    [
      canViewBilling,
      canViewSubscriptions,
      currentSubByOrgId,
      detailBilling,
      detailCurrentSub,
      detailOrg,
    ]
  );

  const subscriptionColumns: DataTableColumn<OrganizationAdminListItemResponse>[] = useMemo(
    () => [
      {
        key: 'organization',
        header: 'Organization',
        render: (row) => (
          <div className="space-y-1 min-w-[190px]">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <button
                type="button"
                onClick={() => void handleOpenSubscriptionDetails(row.id, row.name)}
                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer min-w-0"
              >
                <TruncatedText
                  text={row.name}
                  maxWidthClass="max-w-[200px]"
                  className="font-semibold"
                />
              </button>
              <IdLabel>Org #{row.id}</IdLabel>
            </div>
            <TruncatedText
              text={`${row.city}, ${row.state}`}
              maxWidthClass="max-w-[220px]"
              as="p"
              className="text-xs text-slate-500"
            />
          </div>
        ),
      },
      {
        key: 'plan',
        header: 'Plan & Billing Cycle',
        render: (row) => {
          const curSub = currentSubByOrgId[row.id];
          const isComp =
            curSub != null && !curSub.trial && Number(curSub.contractedAmount || 0) === 0;
          return (
            <div className="space-y-0.5 text-xs min-w-[155px]">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap min-w-0">
                <TruncatedText
                  text={row.planName || 'Unassigned'}
                  maxWidthClass="max-w-[150px]"
                />
                {row.planCode && (
                  <span className="font-mono text-[10px] text-slate-500">
                    ({row.planCode})
                  </span>
                )}
              </div>
              <div className="text-slate-500 flex items-center gap-1.5">
                <span>{row.billingInterval || '—'}</span>
                {isComp && (
                  <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                    Complimentary
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Subscription Status',
        render: (row) => {
          const meta = getSubscriptionStatusBadgeMeta(row.subscriptionStatus);
          return (
            <Badge variant={meta.variant} dot>
              {meta.label}
            </Badge>
          );
        },
      },

      {
        key: 'dates',
        header: 'Start / Expiry / Grace End',
        render: (row) => {
          const curSub = currentSubByOrgId[row.id];
          const graceEnd =
            row.subscriptionStatus === 'PAST_DUE'
              ? getGracePeriodEndDate(row.expiryDate)
              : null;
          return (
            <div className="space-y-0.5 text-xs min-w-[165px]">
              <div className="text-slate-700">
                <span className="text-slate-400">Start:</span>{' '}
                {curSub?.startDate || '—'}
              </div>
              <div className="font-medium text-slate-800">
                <span className="text-slate-400 font-normal">Exp:</span>{' '}
                {row.expiryDate || '—'}
              </div>
              {graceEnd && (
                <div className="text-[11px] font-semibold text-amber-700">
                  Grace ends: {graceEnd}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'paymentStatus',
        header: 'Payment Status',
        render: (row) => {
          const curSub = currentSubByOrgId[row.id];
          if (!curSub && !row.planCode) {
            return <Badge variant="neutral">Unassigned</Badge>;
          }
          if (!curSub) {
            return (
              <div className="space-y-0.5 min-w-[125px]">
                <Badge
                  variant={row.billingInterval === 'TRIAL' ? 'primary' : 'neutral'}
                  dot={row.billingInterval === 'TRIAL'}
                >
                  {row.billingInterval === 'TRIAL' ? 'Free Trial' : 'View Details'}
                </Badge>
                {row.billingInterval === 'TRIAL' && (
                  <div className="text-[11px] text-slate-500">No charge during trial</div>
                )}
              </div>
            );
          }
          const pmtMeta = resolveSubscriptionPaymentLabel(curSub);
          return (
            <div className="space-y-1 min-w-[130px]">
              <div>
                <Badge variant={pmtMeta.variant} dot>
                  {pmtMeta.label}
                </Badge>
              </div>
              {pmtMeta.amountText && (
                <div
                  className={`text-[11px] font-medium tabular-nums ${
                    pmtMeta.amountTone === 'danger'
                      ? 'text-rose-700'
                      : pmtMeta.amountTone === 'warning'
                      ? 'text-amber-700'
                      : pmtMeta.amountTone === 'success'
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }`}
                >
                  {pmtMeta.amountText}
                </div>
              )}
            </div>
          );
        },
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
              onClick={() => void handleOpenSubscriptionDetails(row.id, row.name)}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              Details
            </Button>
            {canManageBilling && row.planCode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleOpenRecordPayment(row.id, row.name)}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                leftIcon={<Receipt className="w-3.5 h-3.5" />}
              >
                Pay
              </Button>
            )}
            {canManageSubscriptions && (
              <>
                {row.subscriptionStatus !== 'ACTIVE' && row.planCode && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      triggerSubActionForOrg(row.id, row.name, 'CHANGE_STATUS', {
                        presetStatus: 'ACTIVE',
                      })
                    }
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Activate
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    triggerSubActionForOrg(
                      row.id,
                      row.name,
                      row.planCode ? 'RENEW' : 'ASSIGN'
                    )
                  }
                  className="text-indigo-600 hover:bg-indigo-50"
                  leftIcon={
                    row.planCode ? (
                      <CalendarPlus className="w-3.5 h-3.5" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {row.planCode ? 'Renew' : 'Assign'}
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [
      canManageBilling,
      canManageSubscriptions,
      currentSubByOrgId,
      handleOpenRecordPayment,
      handleOpenSubscriptionDetails,
    ]
  );


  const totalSubscriptions = useMemo(() => {
    if (!dashboardMetrics) return orgSubscriptionsPage?.totalElements ?? 0;
    return (
      (dashboardMetrics.activeSubscriptions || 0) +
      (dashboardMetrics.trialSubscriptions || 0) +
      (dashboardMetrics.pastDueSubscriptions || 0) +
      (dashboardMetrics.expiredSubscriptions || 0) +
      (dashboardMetrics.suspendedSubscriptions || 0) +
      (dashboardMetrics.cancelledSubscriptions || 0)
    );
  }, [dashboardMetrics, orgSubscriptionsPage]);

  const pendingPaymentsCount = (dashboardMetrics?.overdueSubscriptions || []).length;
  const rows = orgSubscriptionsPage?.content || [];
  const totalElements = orgSubscriptionsPage?.totalElements ?? 0;
  const totalPages = orgSubscriptionsPage?.totalPages ?? 0;
  const fromRow = totalElements === 0 ? 0 : page * pageSize + 1;
  const toRow = Math.min((page + 1) * pageSize, totalElements);

  return (
    <AppShell pageTitle="Subscriptions" breadcrumbParent="Platform Administration">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Platform Control Plane"
          title="SaaS Subscription Management"
          description="Manage Side_forge subscription plans, organization SaaS subscriptions, 15-day grace periods, renewals, and billing history."
          actions={
            <div className="flex items-center gap-2">
              {canManagePlans && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingPlan(null);
                    setPlanError(null);
                    setIsPlanFormOpen(true);
                  }}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  New Plan
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                isLoading={isLoading}
                onClick={() => void loadSubscriptionData()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {/* 1. Subscription Management Overview (5 Focused KPI Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Total Subscriptions</span>
              <CreditCard className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1.5">
              {totalSubscriptions.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">All SaaS tenant records</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Active Subscriptions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-1.5">
              {(dashboardMetrics?.activeSubscriptions ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              + {(dashboardMetrics?.trialSubscriptions ?? 0).toLocaleString('en-IN')} in Trial
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">In Grace Period</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1.5">
              {(dashboardMetrics?.pastDueSubscriptions ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">15-day post-expiry window</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Expired</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-700 mt-1.5">
              {(dashboardMetrics?.expiredSubscriptions ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {(dashboardMetrics?.suspendedSubscriptions ?? 0) > 0
                ? `${dashboardMetrics?.suspendedSubscriptions} suspended post-grace`
                : 'Past grace window'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Pending Payments</span>
              <Receipt className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1.5">
              {pendingPaymentsCount.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {dashboardMetrics?.totalOutstandingSubscriptionAmount
                ? `${formatCurrencyINR(
                    dashboardMetrics.totalOutstandingSubscriptionAmount
                  )} due`
                : 'Organizations with balance due'}
            </p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('SUBSCRIPTIONS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'SUBSCRIPTIONS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Organization Subscriptions ({totalElements})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PLANS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'PLANS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Subscription Plans ({plans.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RENEWALS_AND_ALERTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'RENEWALS_AND_ALERTS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Renewal &amp; Expiry Monitoring
          </button>

          {canViewBilling && (
            <button
              type="button"
              onClick={() => setActiveTab('PAYMENTS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'PAYMENTS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              Payment &amp; Billing Records ({paymentsPage?.totalElements ?? 0})
            </button>
          )}
        </div>

        {error && (
          <ErrorState
            title="Unable to load subscription data"
            message={error}
            onRetry={() => void loadSubscriptionData()}
          />
        )}

        {/* TAB 1: ORGANIZATION SUBSCRIPTIONS DIRECTORY */}
        {!error && activeTab === 'SUBSCRIPTIONS' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 max-w-md">
                <Input
                  placeholder="Search by organization name..."
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
                  <span className="font-medium">Filter:</span>
                </div>

                <Select
                  aria-label="Filter by subscription status"
                  value={subStatusFilter}
                  onChange={(e) => {
                    setSubStatusFilter(e.target.value as SubscriptionStatus | '');
                    setPage(0);
                  }}
                  className="w-48 h-9 text-xs"
                >
                  {SUB_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value || 'ALL_STATUS'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>

                <Select
                  aria-label="Filter by subscription plan"
                  value={planCodeFilter}
                  onChange={(e) => {
                    setPlanCodeFilter(e.target.value);
                    setPage(0);
                  }}
                  className="w-44 h-9 text-xs"
                >
                  <option value="">All Plans</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name} ({p.code})
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
                  className="w-28 h-9 text-xs"
                >
                  <option value="10">10 / page</option>
                  <option value="20">20 / page</option>
                  <option value="50">50 / page</option>
                </Select>
              </div>
            </div>

            <DataTable
              columns={subscriptionColumns}
              data={rows}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyTitle="No matching organization subscriptions"
              emptyDescription="Try clearing your search or status/plan filters."
            />

            {totalElements > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-600 shadow-2xs">
                <div>
                  Showing <span className="font-semibold text-slate-900">{fromRow}</span> to{' '}
                  <span className="font-semibold text-slate-900">{toRow}</span> of{' '}
                  <span className="font-semibold text-slate-900">{totalElements}</span>{' '}
                  organization subscriptions
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

        {/* TAB 2: SUBSCRIPTION PLANS MANAGEMENT */}
        {!error && activeTab === 'PLANS' && (
          <div className="space-y-4">
            <InlineAlert
              variant="info"
              title="Subscription Plan Pricing & Snapshot Policy"
            >
              Changes to a plan&apos;s monthly/yearly price or student limit apply to{' '}
              <strong className="font-semibold">
                new subscriptions, renewals, and plan upgrades/downgrades
              </strong>
              . Existing active organization subscriptions retain their snapshotted contracted
              amount and student limit for their current billing period.
            </InlineAlert>
            {plans.length === 0 ? (
              <EmptyState
                title="No subscription plans configured"
                description="Create a subscription plan to start provisioning school subscriptions."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <TruncatedText
                              text={plan.name}
                              maxWidthClass="max-w-[200px]"
                              className="text-base font-bold text-slate-900"
                            />
                            <IdLabel>{plan.code}</IdLabel>
                            {plan.defaultTrialPlan && (
                              <Badge variant="primary">
                                Default Trial ({plan.defaultTrialDays || 30}d)
                              </Badge>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {plan.description}
                            </p>
                          )}
                        </div>
                        <Badge variant={plan.active ? 'success' : 'neutral'} dot>
                          {plan.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 rounded-xl bg-slate-50/70 border border-slate-100 p-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Monthly</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {formatCurrencyINR(plan.monthlyPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Yearly</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {formatCurrencyINR(plan.yearlyPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Max Students</span>
                          <span className="font-bold text-indigo-700 text-sm flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {plan.maxStudents.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>


                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            Included Features ({(plan.includedFeatures || []).length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(plan.includedFeatures || []).slice(0, 6).map((feat) => (
                            <span
                              key={feat}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                            >
                              {PLATFORM_FEATURE_LABELS[feat] || feat}
                            </span>
                          ))}
                          {(plan.includedFeatures || []).length > 6 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                              +{(plan.includedFeatures || []).length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPlanForView(plan)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Details
                      </Button>
                      {canManagePlans && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingPlan(plan);
                              setPlanError(null);
                              setIsPlanFormOpen(true);
                            }}
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPlanError(null);
                              setPlanStatusTarget(plan);
                            }}
                            className={
                              plan.active
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }
                          >
                            {plan.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RENEWAL & EXPIRY MONITORING */}
        {!error && activeTab === 'RENEWALS_AND_ALERTS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Expirations (Within 30 Days) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h2 className="text-sm font-semibold text-slate-900">
                    Upcoming Expirations (Next 30 Days)
                  </h2>
                </div>
                <CounterLabel
                  count={(dashboardMetrics?.expiringSubscriptionsWithin30Days || []).length}
                />
              </div>

              {(dashboardMetrics?.expiringSubscriptionsWithin30Days || []).length === 0 ? (
                <EmptyState
                  title="No subscriptions expiring within 30 days"
                  description="Active and trial subscriptions nearing their expiry date will appear here."
                  className="py-10"
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {(dashboardMetrics?.expiringSubscriptionsWithin30Days || []).map((item) => {
                    const meta = getSubscriptionStatusBadgeMeta(item.subscriptionStatus);
                    return (
                      <div
                        key={item.id}
                        className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <TruncatedText
                            text={item.name}
                            maxWidthClass="max-w-[240px] sm:max-w-[300px]"
                            as="p"
                            className="font-semibold text-slate-900 text-sm"
                          />
                          <p className="text-slate-500">
                            {item.planName || 'Standard Plan'} ({item.billingInterval || '—'}) •
                            Expires <strong className="text-slate-700">{item.expiryDate}</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={meta.variant} dot>
                            {meta.label}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleOpenSubscriptionDetails(item.id, item.name)}
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grace Period (15-Day), Expired & Pending Renewal Payments */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <h2 className="text-sm font-semibold text-slate-900">
                    Grace Period, Expired &amp; Pending Renewal Payments
                  </h2>
                </div>
                <CounterLabel
                  count={(dashboardMetrics?.overdueSubscriptions || []).length}
                />
              </div>

              {(dashboardMetrics?.overdueSubscriptions || []).length === 0 ? (
                <EmptyState
                  title="No overdue or grace-period subscriptions"
                  description="Subscriptions in the 15-day post-expiry grace period, expired subscriptions, and organizations with pending payments will appear here."
                  className="py-10"
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {(dashboardMetrics?.overdueSubscriptions || []).map((item) => {
                    const meta = getSubscriptionStatusBadgeMeta(item.subscriptionStatus);
                    const graceEnd =
                      item.subscriptionStatus === 'PAST_DUE'
                        ? getGracePeriodEndDate(item.expiryDate)
                        : null;
                    return (
                      <div
                        key={item.id}
                        className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <TruncatedText
                            text={item.name}
                            maxWidthClass="max-w-[240px] sm:max-w-[300px]"
                            as="p"
                            className="font-semibold text-slate-900 text-sm"
                          />
                          <p className="text-slate-500">
                            {item.planName || 'Plan'} • Expiry:{' '}
                            <strong className="text-slate-700">{item.expiryDate || '—'}</strong>
                            {graceEnd ? (
                              <span className="text-amber-700 font-medium">
                                {' '}
                                • Grace ends {graceEnd}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={meta.variant} dot>
                            {meta.label}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleOpenSubscriptionDetails(item.id, item.name)}
                          >
                            Manage
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENT & BILLING RECORDS */}
        {!error && activeTab === 'PAYMENTS' && (
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Side_forge SaaS Subscription Payments
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Platform subscription payment records verified by the backend.
                  </p>
                </div>
              </div>
              <CounterLabel
                count={paymentsPage?.totalElements ?? 0}
                label={(paymentsPage?.totalElements ?? 0) === 1 ? 'Record' : 'Records'}
              />
            </div>

            {!paymentsPage?.content || paymentsPage.content.length === 0 ? (
              <EmptyState
                title="No SaaS subscription payments recorded"
                description="Verified platform subscription payment records will appear here."
                className="py-10"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[11px]">
                      <th className="px-4 py-3 font-semibold">Invoice / Ref</th>
                      <th className="px-4 py-3 font-semibold">Organization</th>
                      <th className="px-4 py-3 font-semibold">Payment Date</th>
                      <th className="px-4 py-3 font-semibold">Billing Period</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Receipts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentsPage.content.map((pmt) => {
                      const pmtMeta = getPaymentStatusBadgeMeta(pmt.status);
                      return (
                        <tr key={pmt.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3.5 font-mono text-slate-800">
                            {pmt.invoiceNumber}
                            {pmt.referenceNumber ? (
                              <span className="block text-[10px] text-slate-400">
                                Ref: {pmt.referenceNumber}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900">
                            <button
                              type="button"
                              onClick={() =>
                                void handleOpenSubscriptionDetails(
                                  pmt.organizationId,
                                  pmt.organizationName
                                )
                              }
                              className="hover:text-indigo-600 transition-colors cursor-pointer text-left min-w-0"
                            >
                              <TruncatedText
                                text={pmt.organizationName}
                                maxWidthClass="max-w-[200px]"
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                            {pmt.paymentDate}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                            {pmt.billingPeriodStart && pmt.billingPeriodEnd
                              ? `${pmt.billingPeriodStart} → ${pmt.billingPeriodEnd}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">{pmt.paymentMethod}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                            {formatCurrencyINR(pmt.amountReceived, true)}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant={pmtMeta.variant} dot>
                              {pmtMeta.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <PaymentReceiptDownloadButtons
                              organizationId={pmt.organizationId}
                              paymentId={pmt.id}
                              invoiceNumber={pmt.invoiceNumber}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plan Details Modal */}
      <PlanDetailsModal
        open={Boolean(selectedPlanForView)}
        onClose={() => setSelectedPlanForView(null)}
        plan={selectedPlanForView}
        canManagePlans={canManagePlans}
        onEditPlan={(plan) => {
          setEditingPlan(plan);
          setPlanError(null);
          setIsPlanFormOpen(true);
        }}
        onTogglePlanStatus={(plan) => {
          setPlanError(null);
          setPlanStatusTarget(plan);
        }}
      />

      {/* Create / Edit Plan Modal */}
      <PlanFormModal
        open={isPlanFormOpen}
        onClose={() => {
          setIsPlanFormOpen(false);
          setEditingPlan(null);
          setPlanError(null);
        }}
        editingPlan={editingPlan}
        isSubmitting={isMutatingPlan}
        errorMessage={planError}
        onSubmitCreate={handleCreatePlan}
        onSubmitUpdate={handleUpdatePlan}
      />

      {/* Activate / Deactivate Plan Confirmation Dialog */}
      <PlanStatusConfirmDialog
        open={Boolean(planStatusTarget)}
        onClose={() => {
          setPlanStatusTarget(null);
          setPlanError(null);
        }}
        plan={planStatusTarget}
        isSubmitting={isMutatingPlan}
        errorMessage={planError}
        onConfirmToggle={handleTogglePlanStatus}
      />

      {/* Organization Subscription Details Modal */}
      <SubscriptionDetailsModal
        open={Boolean(detailOrg) && !subActionTarget && !manualPaymentTarget}
        onClose={() => setDetailOrg(null)}
        organizationId={detailOrg?.id ?? null}
        organizationName={detailOrg?.name || ''}
        currentSubscription={detailCurrentSub}
        subscriptionHistory={detailHistory}
        billingSummary={detailBilling}
        isLoading={isLoadingDetail}
        errorMessage={detailError}
        canManageSubscriptions={canManageSubscriptions}
        canManageBilling={canManageBilling}
        canManageEntitlements={canManageEntitlements}
        onOpenRecordPayment={() => {
          if (!detailOrg) return;
          void handleOpenRecordPayment(detailOrg.id, detailOrg.name);
        }}
        onCapacityOverrideUpdated={() => {
          if (!detailOrg) return;
          void refreshAfterMutation(detailOrg.id, detailOrg.name);
        }}
        onTriggerAction={(mode, options) => {
          if (!detailOrg) return;
          triggerSubActionForOrg(detailOrg.id, detailOrg.name, mode, options);
        }}
      />

      {/* Record Manual Payment Dialog */}
      <RecordManualPaymentDialog
        open={Boolean(manualPaymentTarget)}
        onClose={() => setManualPaymentTarget(null)}
        organizationId={manualPaymentTarget?.organizationId ?? null}
        organizationName={manualPaymentTarget?.organizationName || ''}
        currentSubscription={manualPaymentTarget?.currentSubscription || null}
        billingSummary={manualPaymentTarget?.billingSummary || null}
        onPaymentRecorded={(payment, updatedSub, updatedBilling) => {
          if (updatedSub) {
            setCurrentSubByOrgId((prev) => ({
              ...prev,
              [payment.organizationId]: updatedSub,
            }));
          }
          if (detailOrg?.id === payment.organizationId) {
            if (updatedSub) setDetailCurrentSub(updatedSub);
            if (updatedBilling) setDetailBilling(updatedBilling);
          }
          void refreshAfterMutation(
            payment.organizationId,
            payment.organizationName
          );
        }}
      />

      {/* Manual Subscription Management Confirmation Dialog */}
      <SubscriptionActionDialog
        open={Boolean(subActionTarget)}
        onClose={() => {
          setSubActionTarget(null);
          setSubActionError(null);
        }}
        target={subActionTarget}
        plans={plans}
        isSubmitting={isMutatingSub}
        errorMessage={subActionError}
        onConfirmAssign={handleAssignSubscription}
        onConfirmChangePlan={handleChangePlan}
        onConfirmRenew={handleRenewSubscription}
        onConfirmChangeStatus={handleChangeStatus}
      />
    </AppShell>
  );
};
