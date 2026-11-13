import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Users } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { parentPortalApi } from '@/api/parentPortalApi';
import { queryKeys } from '@/api/queryKeys';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import {
  ChildSwitcherBanner,
  type ChildBannerOption,
} from '@/components/workspace/ChildSwitcherBanner';
import {
  buildCombinedFeeDemands,
  computeUpcomingDuesSummary,
  FamilyConsolidatedFeesBanner,
  type FeeDemandFrequencyFilter,
  FeeDemandsFilterSection,
  FeeDemandsListSection,
  type FeeDemandStatusFilter,
  type FeeSectionTab,
  FeesOverviewSummaryCard,
  FeesSectionTabSwitcher,
  FeeStructureAndConcessionsSection,
  filterFeeDemands,
  type PaymentDateWindowFilter,
  PaymentHistorySection,
  type PaymentMethodFilter,
  resolveDateWindowBounds,
} from '@/components/parent/ParentFeeComponents';
import {
  FeeDemandDetailSheetModal,
  PaymentReceiptDetailSheetModal,
  triggerReceiptBrowserOrShareDownload,
} from '@/components/parent/ParentFeeDetailSheets';
import {
  OfflinePaymentSubmissionSheetModal,
  ParentOfflinePaymentSubmissionsList,
  SchoolOfflinePaymentInstructionsCard,
} from '@/components/parent/ParentOfflinePaymentComponents';
import type {
  FeePaymentReceiptResponse,
  FeeReceiptExportFormat,
  ParentDashboardResponse,
  ParentFeePaymentSubmissionResponse,
  StoredFileResponse,
  StudentFeeDemandResponse,
} from '@/types/parentPortal';
import {
  EmptyState,
  FeedbackBanner,
  LoadingStateView,
  PickerField,
  ScreenContainer,
  type SelectOption,
} from '@/components/ui';

export default function ParentFeesScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing, iconSizes } = useAppTheme();

  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const selectedChildId = useAuthWorkspaceStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthWorkspaceStore((s) => s.setSelectedChildId);

  const organizationId = activeWorkspace?.organizationId ?? 0;

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<FeeSectionTab>('DEMANDS');
  const [statusFilter, setStatusFilter] =
    useState<FeeDemandStatusFilter>('ALL');
  const [frequencyFilter, setFrequencyFilter] =
    useState<FeeDemandFrequencyFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateWindowFilter, setDateWindowFilter] =
    useState<PaymentDateWindowFilter>('ALL_TIME');
  const [methodFilter, setMethodFilter] =
    useState<PaymentMethodFilter>('ALL');

  const [selectedDemand, setSelectedDemand] =
    useState<StudentFeeDemandResponse | null>(null);
  const [selectedReceipt, setSelectedReceipt] =
    useState<FeePaymentReceiptResponse | null>(null);
  const [offlineSubmitModalVisible, setOfflineSubmitModalVisible] =
    useState<boolean>(false);
  const [preselectedDemandForSubmit, setPreselectedDemandForSubmit] =
    useState<number | null>(null);
  const [downloadingReceiptKey, setDownloadingReceiptKey] = useState<
    string | null
  >(null);
  const [downloadingProofKey, setDownloadingProofKey] = useState<string | null>(
    null
  );
  const [quickDownloadFeedback, setQuickDownloadFeedback] = useState<{
    tone: 'success' | 'danger';
    message: string;
  } | null>(null);

  const cachedDashboard = queryClient.getQueryData<ParentDashboardResponse>(
    queryKeys.parentPortal.dashboard(organizationId)
  );

  const childrenQuery = useQuery({
    queryKey: queryKeys.parentPortal.children(organizationId),
    queryFn: () => parentPortalApi.getLinkedChildren(organizationId),
    enabled: organizationId > 0,
    initialData: cachedDashboard
      ? cachedDashboard.children.map((c) => c.child)
      : undefined,
  });

  const childrenList = childrenQuery.data ?? [];

  const activeChildId = useMemo(() => {
    if (childrenList.length === 0) return null;
    const match = childrenList.find((c) => c.studentId === selectedChildId);
    return match ? match.studentId : childrenList[0].studentId;
  }, [childrenList, selectedChildId]);

  useEffect(() => {
    if (activeChildId && activeChildId !== selectedChildId) {
      setSelectedChildId(activeChildId);
    }
  }, [activeChildId, selectedChildId, setSelectedChildId]);

  const childDetailsQuery = useQuery({
    queryKey: queryKeys.parentPortal.childDetails(
      organizationId,
      activeChildId ?? 0
    ),
    queryFn: () =>
      parentPortalApi.getChildDetails(organizationId, activeChildId!),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const activeChildMeta = useMemo(
    () => childrenList.find((c) => c.studentId === activeChildId) ?? null,
    [childrenList, activeChildId]
  );

  useEffect(() => {
    setSelectedSessionId(null);
    setStatusFilter('ALL');
    setFrequencyFilter('ALL');
    setSearchQuery('');
    setDateWindowFilter('ALL_TIME');
    setMethodFilter('ALL');
    setSelectedDemand(null);
    setSelectedReceipt(null);
    setOfflineSubmitModalVisible(false);
    setPreselectedDemandForSubmit(null);
    setQuickDownloadFeedback(null);
    setDownloadingReceiptKey(null);
    setDownloadingProofKey(null);
  }, [activeChildId]);

  const effectiveSessionId = useMemo(() => {
    if (selectedSessionId) return selectedSessionId;
    if (childDetailsQuery.data?.currentEnrollment?.academicSessionId) {
      return childDetailsQuery.data.currentEnrollment.academicSessionId;
    }
    if (activeChildMeta?.academicSessionId) {
      return activeChildMeta.academicSessionId;
    }
    return null;
  }, [
    selectedSessionId,
    childDetailsQuery.data?.currentEnrollment?.academicSessionId,
    activeChildMeta?.academicSessionId,
  ]);
  const dateBounds = useMemo(
    () => resolveDateWindowBounds(dateWindowFilter),
    [dateWindowFilter]
  );

  const financialProfileQuery = useQuery({
    queryKey: queryKeys.parentPortal.childFees(
      organizationId,
      activeChildId ?? 0,
      effectiveSessionId,
      dateBounds.startDate ?? null,
      dateBounds.endDate ?? null
    ),
    queryFn: () =>
      parentPortalApi.getChildFinancialProfile(organizationId, activeChildId!, {
        academicSessionId: effectiveSessionId,
        startDate: dateBounds.startDate ?? null,
        endDate: dateBounds.endDate ?? null,
      }),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const consolidatedFeesQuery = useQuery({
    queryKey: queryKeys.parentPortal.consolidatedFees(
      organizationId,
      effectiveSessionId
    ),
    queryFn: () =>
      parentPortalApi.getConsolidatedFeesOverview(
        organizationId,
        effectiveSessionId
      ),
    enabled: organizationId > 0 && childrenList.length > 1,
  });

  const receiptDetailQuery = useQuery({
    queryKey: queryKeys.parentPortal.childPaymentReceipt(
      organizationId,
      activeChildId ?? 0,
      selectedReceipt?.id ?? 0
    ),
    queryFn: () =>
      parentPortalApi.getChildPaymentReceipt(
        organizationId,
        activeChildId!,
        selectedReceipt!.id
      ),
    enabled:
      organizationId > 0 &&
      activeChildId !== null &&
      selectedReceipt !== null,
  });

  const offlinePaymentOverviewQuery = useQuery({
    queryKey: queryKeys.parentPortal.childOfflinePaymentSubmissions(
      organizationId,
      activeChildId ?? 0,
      effectiveSessionId
    ),
    queryFn: () =>
      parentPortalApi.getChildOfflinePaymentOverview(
        organizationId,
        activeChildId!,
        effectiveSessionId
      ),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const sessionOptions = useMemo<SelectOption[]>(() => {
    const map = new Map<string, SelectOption>();

    const currentEnrollment = childDetailsQuery.data?.currentEnrollment;
    if (currentEnrollment?.academicSessionId) {
      const idStr = String(currentEnrollment.academicSessionId);
      map.set(idStr, {
        value: idStr,
        label:
          currentEnrollment.academicSessionName ||
          `Session #${currentEnrollment.academicSessionId}`,
        subtitle: currentEnrollment.className
          ? `${currentEnrollment.className}${
              currentEnrollment.sectionName
                ? ` - ${currentEnrollment.sectionName}`
                : ''
            } (Current)`
          : 'Current Enrollment',
      });
    }

    for (const item of childDetailsQuery.data?.enrollmentHistory ?? []) {
      const idStr = String(item.academicSessionId);
      if (!map.has(idStr)) {
        map.set(idStr, {
          value: idStr,
          label:
            item.academicSessionName || `Session #${item.academicSessionId}`,
          subtitle: item.className
            ? `${item.className}${
                item.sectionName ? ` - ${item.sectionName}` : ''
              } (${item.status})`
            : item.status,
        });
      }
    }

    if (activeChildMeta?.academicSessionId) {
      const idStr = String(activeChildMeta.academicSessionId);
      if (!map.has(idStr)) {
        map.set(idStr, {
          value: idStr,
          label:
            activeChildMeta.academicSessionName ||
            `Session #${activeChildMeta.academicSessionId}`,
          subtitle: activeChildMeta.className || 'Active Session',
        });
      }
    }

    const fp = financialProfileQuery.data;
    if (fp?.academicSessionId) {
      const idStr = String(fp.academicSessionId);
      if (!map.has(idStr)) {
        map.set(idStr, {
          value: idStr,
          label: fp.academicSessionName || `Session #${fp.academicSessionId}`,
          subtitle: fp.className || 'Active Session',
        });
      }
    }

    return Array.from(map.values());
  }, [
    childDetailsQuery.data,
    activeChildMeta,
    financialProfileQuery.data,
  ]);

  const childBannerOptions: ChildBannerOption[] = useMemo(
    () =>
      childrenList.map((c) => {
        const detailSection =
          c.studentId === activeChildId
            ? childDetailsQuery.data?.currentEnrollment?.sectionName
            : c.sectionName;
        const resolvedSec = detailSection ?? c.sectionName ?? null;
        const classLabelParts = [
          c.className || 'Unassigned Class',
          resolvedSec ? `Sec ${resolvedSec}` : null,
        ].filter(Boolean);

        return {
          id: c.studentId,
          studentId: c.studentId,
          fullName:
            c.fullName ||
            `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}`.trim(),
          classLabel: classLabelParts.join(' • '),
          className: c.className,
          sectionName: resolvedSec,
          rollNumber: c.rollNumber,
          admissionNumber: c.admissionNumber,
          academicSessionName: c.academicSessionName,
        };
      }),
    [
      childrenList,
      activeChildId,
      childDetailsQuery.data?.currentEnrollment?.sectionName,
    ]
  );

  const profileData = financialProfileQuery.data ?? null;

  const combinedDemands = useMemo(
    () => buildCombinedFeeDemands(profileData),
    [profileData]
  );

  const upcomingSummary = useMemo(
    () => computeUpcomingDuesSummary(combinedDemands),
    [combinedDemands]
  );

  const statusCounts = useMemo<Record<FeeDemandStatusFilter, number>>(() => {
    const counts: Record<FeeDemandStatusFilter, number> = {
      ALL: combinedDemands.length,
      PENDING: 0,
      PARTIALLY_PAID: 0,
      OVERDUE: 0,
      PAID: 0,
      WAIVED: 0,
    };
    for (const d of combinedDemands) {
      if (d.status === 'PENDING') counts.PENDING += 1;
      else if (d.status === 'PARTIALLY_PAID') counts.PARTIALLY_PAID += 1;
      else if (d.status === 'OVERDUE') counts.OVERDUE += 1;
      else if (d.status === 'PAID') counts.PAID += 1;
      else if (d.status === 'WAIVED') counts.WAIVED += 1;
    }
    return counts;
  }, [combinedDemands]);

  const resolvedSectionName = useMemo(() => {
    const historyMatch = effectiveSessionId
      ? childDetailsQuery.data?.enrollmentHistory?.find(
          (e) => e.academicSessionId === effectiveSessionId
        )
      : null;
    return (
      historyMatch?.sectionName ??
      childDetailsQuery.data?.currentEnrollment?.sectionName ??
      activeChildMeta?.sectionName ??
      null
    );
  }, [
    effectiveSessionId,
    childDetailsQuery.data?.enrollmentHistory,
    childDetailsQuery.data?.currentEnrollment?.sectionName,
    activeChildMeta?.sectionName,
  ]);

  const handleResetDemandFilters = useCallback(() => {
    setStatusFilter('ALL');
    setFrequencyFilter('ALL');
    setSearchQuery('');
  }, []);

  const handleResetPaymentFilters = useCallback(() => {
    setDateWindowFilter('ALL_TIME');
    setMethodFilter('ALL');
  }, []);

  const handleQuickDownloadReceipt = useCallback(
    async (
      payment: FeePaymentReceiptResponse,
      format: FeeReceiptExportFormat
    ) => {
      if (!activeChildId || downloadingReceiptKey !== null) return;
      const key = `${payment.id}:${format}`;
      setDownloadingReceiptKey(key);
      setQuickDownloadFeedback(null);

      try {
        const ext =
          format === 'CSV' ? 'csv' : format === 'EXCEL' ? 'xls' : 'pdf';
        const safeCode = (payment.receiptNumber || String(payment.id))
          .replace(/[^a-zA-Z0-9_-]+/g, '-')
          .toLowerCase();
        const filename = `fee-receipt-${safeCode}.${ext}`;
        const result = await parentPortalApi.downloadChildPaymentReceipt(
          organizationId,
          activeChildId,
          payment.id,
          format,
          filename
        );
        const msg = await triggerReceiptBrowserOrShareDownload(
          result,
          `Fee Receipt ${payment.receiptNumber} - ${payment.studentName}`
        );
        setQuickDownloadFeedback({
          tone: 'success',
          message: msg,
        });
      } catch (err) {
        setQuickDownloadFeedback({
          tone: 'danger',
          message:
            err instanceof Error
              ? err.message
              : 'Unable to download official fee receipt right now.',
        });
      } finally {
        setDownloadingReceiptKey(null);
      }
    },
    [activeChildId, downloadingReceiptKey, organizationId]
  );

  const handleDownloadProof = useCallback(
    async (
      submission: ParentFeePaymentSubmissionResponse,
      file: StoredFileResponse
    ) => {
      if (!activeChildId || downloadingProofKey !== null) return;
      const key = `${submission.id}:${file.id}`;
      setDownloadingProofKey(key);
      setQuickDownloadFeedback(null);

      try {
        const result = await parentPortalApi.downloadOfflinePaymentProof(
          organizationId,
          activeChildId,
          submission.id,
          file.id,
          file.originalFilename,
          file.contentType
        );
        const msg = await triggerReceiptBrowserOrShareDownload(
          result,
          `Payment Proof ${submission.utrOrReferenceNumber}`
        );
        setQuickDownloadFeedback({
          tone: 'success',
          message: msg,
        });
      } catch (err) {
        setQuickDownloadFeedback({
          tone: 'danger',
          message:
            err instanceof Error
              ? err.message
              : 'Unable to download payment proof attachment.',
        });
      } finally {
        setDownloadingProofKey(null);
      }
    },
    [activeChildId, downloadingProofKey, organizationId]
  );

  const handleRefresh = useCallback(async () => {
    setQuickDownloadFeedback(null);
    await Promise.all([
      childrenQuery.refetch(),
      activeChildId ? childDetailsQuery.refetch() : Promise.resolve(),
      activeChildId ? financialProfileQuery.refetch() : Promise.resolve(),
      activeChildId ? offlinePaymentOverviewQuery.refetch() : Promise.resolve(),
      childrenList.length > 1
        ? consolidatedFeesQuery.refetch()
        : Promise.resolve(),
      selectedReceipt ? receiptDetailQuery.refetch() : Promise.resolve(),
    ]);
  }, [
    childrenQuery,
    activeChildId,
    childDetailsQuery,
    financialProfileQuery,
    offlinePaymentOverviewQuery,
    childrenList.length,
    consolidatedFeesQuery,
    selectedReceipt,
    receiptDetailQuery,
  ]);

  const isInitialLoading =
    (childrenQuery.isLoading && !childrenQuery.data) ||
    (activeChildId !== null &&
      financialProfileQuery.isLoading &&
      !financialProfileQuery.data);

  const isRefreshing =
    !isInitialLoading &&
    (childrenQuery.isRefetching || financialProfileQuery.isRefetching);

  const errorMessage = useMemo(() => {
    const err = financialProfileQuery.error ?? childrenQuery.error;
    if (!err) return null;
    return err instanceof Error
      ? err.message
      : 'Unable to load student fee statement and payment records.';
  }, [financialProfileQuery.error, childrenQuery.error]);

  const filteredDemands = useMemo(
    () =>
      filterFeeDemands(
        combinedDemands,
        statusFilter,
        frequencyFilter,
        searchQuery
      ),
    [combinedDemands, statusFilter, frequencyFilter, searchQuery]
  );

  const unpaidDemands = useMemo(
    () =>
      combinedDemands.filter(
        (d) =>
          (d.status === 'PENDING' ||
            d.status === 'PARTIALLY_PAID' ||
            d.status === 'OVERDUE') &&
          (d.outstandingAmount ?? 0) > 0
      ),
    [combinedDemands]
  );

  const offlineOverview = offlinePaymentOverviewQuery.data ?? null;
  const offlineSubmissions = offlineOverview?.submissions ?? [];

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Fees & Finance"
          subtitle="Fee obligations, demands, payments & official receipts"
        />
      }
      onRefresh={handleRefresh}
      refreshing={isRefreshing}
    >
      {isInitialLoading ? (
        <LoadingStateView message="Loading fee statement and payment records..." />
      ) : childrenQuery.isError && childrenList.length === 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <FeedbackBanner
            tone="danger"
            title="Could not load linked children"
            message={errorMessage ?? 'Please check your connection and retry.'}
          />
          <View style={{ marginTop: spacing.md }}>
            <EmptyState
              icon={<Users size={iconSizes.xl} color={colors.danger} />}
              title="Student Context Unavailable"
              description="We could not load your linked children profiles for this school."
              actionLabel="Retry"
              onActionPress={() => void handleRefresh()}
            />
          </View>
        </View>
      ) : childrenList.length === 0 ? (
        <EmptyState
          icon={<Users size={iconSizes.xl} color={colors.primary} />}
          title="No Linked Children Found"
          description="Your parent account does not have any active student profiles linked in this school yet."
        />
      ) : (
        <>
          <ChildSwitcherBanner
            childrenList={childBannerOptions}
            selectedChildId={activeChildId}
            onSelectChild={(studentId) => setSelectedChildId(studentId)}
          />

          {sessionOptions.length > 1 ? (
            <View
              style={[styles.sessionPickerWrap, { marginBottom: spacing.md }]}
            >
              <PickerField
                label="Academic Session"
                placeholder="Select Academic Session"
                value={effectiveSessionId ? String(effectiveSessionId) : null}
                options={sessionOptions}
                onChange={(val) => {
                  const parsed = Number(val);
                  if (!Number.isNaN(parsed) && parsed > 0) {
                    setSelectedSessionId(parsed);
                    setSelectedDemand(null);
                    setSelectedReceipt(null);
                  }
                }}
              />
            </View>
          ) : null}

          {consolidatedFeesQuery.data && childrenList.length > 1 ? (
            <FamilyConsolidatedFeesBanner
              consolidated={consolidatedFeesQuery.data}
              childrenCount={childrenList.length}
            />
          ) : null}

          {financialProfileQuery.isError && !profileData ? (
            <View style={{ marginTop: spacing.sm }}>
              <FeedbackBanner
                tone="danger"
                title="Unable to load fee statement"
                message={
                  errorMessage ??
                  'An unexpected error occurred while fetching fee records.'
                }
              />
              <View style={{ marginTop: spacing.md }}>
                <EmptyState
                  icon={
                    <CreditCard size={iconSizes.xl} color={colors.danger} />
                  }
                  title="Fee Statement Unavailable"
                  description="We could not retrieve fee demands and payment records for this session."
                  actionLabel="Retry"
                  onActionPress={() => void financialProfileQuery.refetch()}
                />
              </View>
            </View>
          ) : profileData ? (
            <>
              <FeesOverviewSummaryCard
                profile={profileData}
                sectionName={resolvedSectionName}
                upcomingSummary={upcomingSummary}
                latestPayment={profileData.paymentHistory?.[0] ?? null}
                onOpenRecentReceipt={(payment) => setSelectedReceipt(payment)}
                onSelectOverdueFilter={() => {
                  setActiveTab('DEMANDS');
                  setStatusFilter((prev) =>
                    prev === 'OVERDUE' ? 'ALL' : 'OVERDUE'
                  );
                }}
                onSelectUpcomingFilter={() => {
                  setActiveTab('DEMANDS');
                  setStatusFilter((prev) =>
                    prev === 'PENDING' ? 'ALL' : 'PENDING'
                  );
                }}
              />

              {quickDownloadFeedback ? (
                <View style={{ marginBottom: spacing.md }}>
                  <FeedbackBanner
                    tone={quickDownloadFeedback.tone}
                    message={quickDownloadFeedback.message}
                  />
                </View>
              ) : null}

              <SchoolOfflinePaymentInstructionsCard
                instructions={offlineOverview?.paymentInstructions ?? null}
                onOpenSubmitModal={() => {
                  setPreselectedDemandForSubmit(null);
                  setOfflineSubmitModalVisible(true);
                }}
              />

              <FeesSectionTabSwitcher
                activeTab={activeTab}
                onSelectTab={(tab) => setActiveTab(tab)}
                demandsCount={combinedDemands.length}
                paymentsCount={
                  (profileData.paymentHistory ?? []).length +
                  offlineSubmissions.length
                }
                concessionsCount={(profileData.concessions ?? []).length}
              />

              {activeTab === 'DEMANDS' ? (
                <>
                  <FeeDemandsFilterSection
                    statusFilter={statusFilter}
                    onSelectStatusFilter={setStatusFilter}
                    frequencyFilter={frequencyFilter}
                    onSelectFrequencyFilter={setFrequencyFilter}
                    searchQuery={searchQuery}
                    onChangeSearchQuery={setSearchQuery}
                    statusCounts={statusCounts}
                    onResetFilters={handleResetDemandFilters}
                  />
                  <FeeDemandsListSection
                    demands={filteredDemands}
                    totalOriginalCount={combinedDemands.length}
                    academicSessionName={profileData.academicSessionName}
                    onSelectDemand={(demand) => setSelectedDemand(demand)}
                    onResetFilters={handleResetDemandFilters}
                  />
                </>
              ) : activeTab === 'PAYMENTS' ? (
                <>
                  <ParentOfflinePaymentSubmissionsList
                    submissions={offlineSubmissions}
                    demands={combinedDemands}
                    downloadingProofKey={downloadingProofKey}
                    onDownloadProof={(sub, file) =>
                      void handleDownloadProof(sub, file)
                    }
                  />
                  <PaymentHistorySection
                    payments={profileData.paymentHistory ?? []}
                    dateWindowFilter={dateWindowFilter}
                    onSelectDateWindowFilter={setDateWindowFilter}
                    methodFilter={methodFilter}
                    onSelectMethodFilter={setMethodFilter}
                    downloadingKey={downloadingReceiptKey}
                    onSelectPayment={(payment) => setSelectedReceipt(payment)}
                    onQuickDownloadReceipt={(payment, format) =>
                      void handleQuickDownloadReceipt(payment, format)
                    }
                    onResetFilters={handleResetPaymentFilters}
                  />
                </>
              ) : (
                <FeeStructureAndConcessionsSection
                  structure={profileData.assignedFeeStructure}
                  structureVersion={profileData.assignedFeeStructureVersion}
                  concessions={profileData.concessions ?? []}
                />
              )}

              {activeChildId !== null ? (
                <>
                  <FeeDemandDetailSheetModal
                    visible={selectedDemand !== null}
                    demand={selectedDemand}
                    profile={profileData}
                    sectionName={resolvedSectionName}
                    onOpenReceipt={(payment) => {
                      setSelectedDemand(null);
                      setSelectedReceipt(payment);
                    }}
                    onOpenOfflineSubmit={(demand) => {
                      setSelectedDemand(null);
                      setPreselectedDemandForSubmit(demand.id);
                      setOfflineSubmitModalVisible(true);
                    }}
                    onClose={() => setSelectedDemand(null)}
                  />

                  <OfflinePaymentSubmissionSheetModal
                    visible={offlineSubmitModalVisible}
                    organizationId={organizationId}
                    studentId={activeChildId}
                    academicSessionId={effectiveSessionId}
                    studentName={profileData.studentName}
                    instructions={offlineOverview?.paymentInstructions ?? null}
                    unpaidDemands={unpaidDemands}
                    preselectedDemandId={preselectedDemandForSubmit}
                    onSubmittedSuccess={() => {
                      setQuickDownloadFeedback({
                        tone: 'success',
                        message:
                          'Offline payment reference submitted for school verification.',
                      });
                      void offlinePaymentOverviewQuery.refetch();
                    }}
                    onClose={() => {
                      setOfflineSubmitModalVisible(false);
                      setPreselectedDemandForSubmit(null);
                    }}
                  />

                  <PaymentReceiptDetailSheetModal
                    visible={selectedReceipt !== null}
                    organizationId={organizationId}
                    studentId={activeChildId}
                    receipt={receiptDetailQuery.data ?? selectedReceipt}
                    isLoadingReceipt={receiptDetailQuery.isLoading}
                    receiptError={
                      receiptDetailQuery.isError
                        ? receiptDetailQuery.error instanceof Error
                          ? receiptDetailQuery.error.message
                          : 'Could not refresh receipt details.'
                        : null
                    }
                    onRetryReceipt={() => void receiptDetailQuery.refetch()}
                    onClose={() => setSelectedReceipt(null)}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sessionPickerWrap: {
    width: '100%',
  },
});



