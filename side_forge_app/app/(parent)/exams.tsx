import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react-native';
import { useAppTheme } from '@/theme';
import { useAuthWorkspaceStore } from '@/store/useAuthWorkspaceStore';
import { parentPortalApi } from '@/api/parentPortalApi';
import { queryKeys } from '@/api/queryKeys';
import { useSafeNavigation } from '@/utils/navigationGuard';
import { AppShellHeader } from '@/components/workspace/WorkspaceTopBar';
import {
  ChildSwitcherBanner,
  type ChildBannerOption,
} from '@/components/workspace/ChildSwitcherBanner';
import { ParentAcademicSubNavBar } from '@/components/parent/ParentAcademicSubNavBar';
import {
  buildUnifiedExamItems,
  ExaminationFilterSection,
  ExaminationListSection,
  ExaminationOverviewSummaryCard,
  ExaminationResultDetailSheetModal,
  ExaminationScheduleDetailSheetModal,
  type ExamStatusFilter,
  filterUnifiedExamItems,
  formatExamTypeLabel,
  type UnifiedParentExamItem,
} from '@/components/parent/ParentExaminationComponents';
import type { ParentDashboardResponse } from '@/types/parentPortal';
import {
  EmptyState,
  FeedbackBanner,
  LoadingStateView,
  PickerField,
  ScreenContainer,
  type SelectOption,
} from '@/components/ui';

export default function ParentExamsScreen() {
  const queryClient = useQueryClient();
  const { colors, spacing, iconSizes } = useAppTheme();
  const { navigateTo } = useSafeNavigation();

  const activeWorkspace = useAuthWorkspaceStore((s) => s.activeWorkspace);
  const selectedChildId = useAuthWorkspaceStore((s) => s.selectedChildId);
  const setSelectedChildId = useAuthWorkspaceStore((s) => s.setSelectedChildId);

  const organizationId = activeWorkspace?.organizationId ?? 0;

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null
  );
  const [activeStatusFilter, setActiveStatusFilter] =
    useState<ExamStatusFilter>('ALL');
  const [selectedExamType, setSelectedExamType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExamItem, setSelectedExamItem] =
    useState<UnifiedParentExamItem | null>(null);

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
      parentPortalApi.getChildDetails(organizationId, activeChildId ?? 0),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const sessionOptions: SelectOption<number>[] = useMemo(() => {
    const details = childDetailsQuery.data;
    if (!details) return [];
    const seen = new Set<number>();
    const list: SelectOption<number>[] = [];

    if (details.currentEnrollment?.academicSessionId) {
      seen.add(details.currentEnrollment.academicSessionId);
      list.push({
        value: details.currentEnrollment.academicSessionId,
        label: `${
          details.currentEnrollment.academicSessionName ?? 'Current Session'
        } (Current)`,
        subtitle: [
          details.currentEnrollment.className,
          details.currentEnrollment.sectionName,
        ]
          .filter(Boolean)
          .join(' • '),
      });
    }

    for (const hist of details.enrollmentHistory ?? []) {
      if (hist.academicSessionId && !seen.has(hist.academicSessionId)) {
        seen.add(hist.academicSessionId);
        list.push({
          value: hist.academicSessionId,
          label: hist.academicSessionName ?? `Session #${hist.academicSessionId}`,
          subtitle: [hist.className, hist.sectionName, hist.status]
            .filter(Boolean)
            .join(' • '),
        });
      }
    }
    return list;
  }, [childDetailsQuery.data]);

  const examinationsQuery = useQuery({
    queryKey: queryKeys.parentPortal.childExaminations(
      organizationId,
      activeChildId ?? 0,
      selectedSessionId
    ),
    queryFn: () =>
      parentPortalApi.getChildExaminations(
        organizationId,
        activeChildId ?? 0,
        selectedSessionId
      ),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const examData = examinationsQuery.data ?? null;

  const effectiveSessionId =
    selectedSessionId ??
    examData?.academicSessionId ??
    childDetailsQuery.data?.currentEnrollment?.academicSessionId ??
    null;

  const resolvedSectionName = useMemo(() => {
    const details = childDetailsQuery.data;
    if (!details) return null;
    if (
      details.currentEnrollment &&
      (!effectiveSessionId ||
        details.currentEnrollment.academicSessionId === effectiveSessionId)
    ) {
      return details.currentEnrollment.sectionName ?? null;
    }
    const histMatch = (details.enrollmentHistory ?? []).find(
      (h) => h.academicSessionId === effectiveSessionId
    );
    return histMatch?.sectionName ?? null;
  }, [childDetailsQuery.data, effectiveSessionId]);

  const unifiedExamItems = useMemo(
    () => buildUnifiedExamItems(examData),
    [examData]
  );

  const examTypeOptions: SelectOption<string>[] = useMemo(() => {
    const seen = new Set<string>();
    const options: SelectOption<string>[] = [
      { value: 'ALL', label: 'All Examination Types' },
    ];
    for (const item of unifiedExamItems) {
      const key = (item.examType || '').toUpperCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        options.push({
          value: key,
          label: formatExamTypeLabel(key),
        });
      }
    }
    return options;
  }, [unifiedExamItems]);

  const filteredExamItems = useMemo(
    () =>
      filterUnifiedExamItems(
        unifiedExamItems,
        activeStatusFilter,
        selectedExamType,
        searchQuery
      ),
    [unifiedExamItems, activeStatusFilter, selectedExamType, searchQuery]
  );

  const selectedPublishedExamId =
    selectedExamItem?.category === 'PUBLISHED'
      ? selectedExamItem.examinationId
      : null;

  const reportCardDetailQuery = useQuery({
    queryKey: queryKeys.parentPortal.childReportCard(
      organizationId,
      activeChildId ?? 0,
      selectedPublishedExamId ?? 0
    ),
    queryFn: () =>
      parentPortalApi.getChildReportCard(
        organizationId,
        activeChildId ?? 0,
        selectedPublishedExamId ?? 0
      ),
    enabled:
      organizationId > 0 &&
      activeChildId !== null &&
      selectedPublishedExamId !== null,
    initialData: selectedExamItem?.reportCard ?? undefined,
  });

  const handleSelectChild = useCallback(
    (studentId: number) => {
      if (studentId === activeChildId) return;
      setSelectedChildId(studentId);
      setSelectedSessionId(null);
      setActiveStatusFilter('ALL');
      setSelectedExamType('ALL');
      setSearchQuery('');
      setSelectedExamItem(null);
    },
    [activeChildId, setSelectedChildId]
  );

  const handleResetFilters = useCallback(() => {
    setActiveStatusFilter('ALL');
    setSelectedExamType('ALL');
    setSearchQuery('');
  }, []);

  const handleRefresh = useCallback(async () => {
    const tasks: Promise<unknown>[] = [childrenQuery.refetch()];
    if (activeChildId) {
      tasks.push(
        childDetailsQuery.refetch(),
        examinationsQuery.refetch()
      );
      if (selectedPublishedExamId !== null) {
        tasks.push(reportCardDetailQuery.refetch());
      }
    }
    await Promise.all(tasks);
  }, [
    activeChildId,
    childrenQuery,
    childDetailsQuery,
    examinationsQuery,
    selectedPublishedExamId,
    reportCardDetailQuery,
  ]);

  const activeChildMeta = useMemo(
    () => childrenList.find((c) => c.studentId === activeChildId) ?? null,
    [childrenList, activeChildId]
  );

  const childBannerOptions: ChildBannerOption[] = useMemo(
    () =>
      childrenList.map((c) => {
        const isCurrent = c.studentId === activeChildId;
        const resolvedClassName = isCurrent
          ? examData?.className ??
            childDetailsQuery.data?.currentEnrollment?.className ??
            c.className ??
            null
          : c.className ?? null;
        const resolvedSec = isCurrent
          ? resolvedSectionName ?? c.sectionName ?? null
          : c.sectionName ?? null;
        const classLabelParts = [
          resolvedClassName || 'Unassigned Class',
          resolvedSec ? `Sec ${resolvedSec}` : null,
        ].filter(Boolean);

        return {
          id: c.studentId,
          studentId: c.studentId,
          fullName: `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}`,
          classLabel: classLabelParts.join(' • '),
          className: resolvedClassName,
          sectionName: resolvedSec,
          rollNumber: c.rollNumber,
          admissionNumber: c.admissionNumber,
          academicSessionName: isCurrent
            ? examData?.academicSessionName ??
              childDetailsQuery.data?.currentEnrollment?.academicSessionName ??
              c.academicSessionName ??
              null
            : c.academicSessionName ?? null,
          profilePhotoUrl: c.profilePhotoUrl,
          relationshipType: c.relationshipType,
        };
      }),
    [
      childrenList,
      activeChildId,
      examData,
      childDetailsQuery.data,
      resolvedSectionName,
    ]
  );

  const isRefreshing =
    childrenQuery.isRefetching ||
    childDetailsQuery.isRefetching ||
    examinationsQuery.isRefetching;

  const headerSubtitle = useMemo(() => {
    if (!activeChildMeta) {
      return 'Examination schedules, subject marks & official report cards';
    }
    const childFullName = `${activeChildMeta.firstName}${
      activeChildMeta.lastName ? ` ${activeChildMeta.lastName}` : ''
    }`;
    const classPart =
      examData?.className ?? activeChildMeta.className ?? null;
    const sessionPart =
      examData?.academicSessionName ??
      activeChildMeta.academicSessionName ??
      null;
    return [childFullName, classPart, resolvedSectionName, sessionPart]
      .filter(Boolean)
      .join(' • ');
  }, [activeChildMeta, examData, resolvedSectionName]);

  return (
    <ScreenContainer
      header={
        <AppShellHeader
          title="Exams & Report Cards"
          subtitle={headerSubtitle}
        />
      }
      onRefresh={handleRefresh}
      refreshing={isRefreshing}
    >
      <ParentAcademicSubNavBar activeSection="exams" />

      {childrenQuery.isLoading && childrenList.length === 0 ? (
        <LoadingStateView message="Loading linked student profile..." />
      ) : childrenQuery.isError && childrenList.length === 0 ? (
        <FeedbackBanner
          tone="danger"
          title="Unable to load linked children"
          message={
            childrenQuery.error instanceof Error
              ? childrenQuery.error.message
              : 'Could not load linked children in this school workspace.'
          }
          onRetry={() => void childrenQuery.refetch()}
        />
      ) : childrenList.length === 0 ? (
        <EmptyState
          icon={<Users size={iconSizes.xl} color={colors.primary} />}
          title="No Linked Students Found"
          description="Your parent account is active in this school, but no student profiles are currently linked."
          actionLabel="Back to Overview"
          onActionPress={() => navigateTo('/(parent)')}
        />
      ) : (
        <>
          <ChildSwitcherBanner
            childrenList={childBannerOptions}
            selectedChildId={activeChildId}
            onSelectChild={handleSelectChild}
          />

          {sessionOptions.length > 1 ? (
            <View
              style={[styles.sessionPickerWrap, { marginBottom: spacing.md }]}
            >
              <PickerField<number>
                label="Academic Session"
                options={sessionOptions}
                value={effectiveSessionId}
                onChange={(nextSessionId) => {
                  setSelectedSessionId(nextSessionId);
                  setSelectedExamItem(null);
                }}
              />
            </View>
          ) : null}

          {examinationsQuery.isLoading && activeChildId !== null ? (
            <LoadingStateView message="Loading examinations & published report cards..." />
          ) : (
            <>
              {examinationsQuery.isError ? (
                <FeedbackBanner
                  tone="danger"
                  title="Unable to load examinations"
                  message={
                    examinationsQuery.error instanceof Error
                      ? examinationsQuery.error.message
                      : 'Could not load examinations and report cards for this student.'
                  }
                  onRetry={() => void examinationsQuery.refetch()}
                  style={{ marginBottom: spacing.md }}
                />
              ) : null}

              <ExaminationOverviewSummaryCard
                items={unifiedExamItems}
                activeStatusFilter={activeStatusFilter}
                onSelectStatusFilter={setActiveStatusFilter}
                onOpenReportCard={(item) => setSelectedExamItem(item)}
              />

              <ExaminationFilterSection
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
                selectedExamType={selectedExamType}
                onChangeExamType={setSelectedExamType}
                examTypeOptions={examTypeOptions}
                activeStatusFilter={activeStatusFilter}
                onResetFilters={handleResetFilters}
              />

              <ExaminationListSection
                items={filteredExamItems}
                totalOriginalCount={unifiedExamItems.length}
                activeStatusFilter={activeStatusFilter}
                hasSearchOrTypeFilter={
                  selectedExamType !== 'ALL' || searchQuery.trim().length > 0
                }
                sectionName={resolvedSectionName}
                onSelectExam={(item) => setSelectedExamItem(item)}
                onResetFilters={handleResetFilters}
              />

              {activeChildId !== null ? (
                <>
                  <ExaminationResultDetailSheetModal
                    visible={
                      selectedExamItem !== null &&
                      selectedExamItem.category === 'PUBLISHED'
                    }
                    organizationId={organizationId}
                    studentId={activeChildId}
                    examItem={
                      selectedExamItem?.category === 'PUBLISHED'
                        ? selectedExamItem
                        : null
                    }
                    reportCardData={
                      reportCardDetailQuery.data ??
                      selectedExamItem?.reportCard ??
                      null
                    }
                    sectionName={resolvedSectionName}
                    isLoadingReportCard={reportCardDetailQuery.isLoading}
                    reportCardError={
                      reportCardDetailQuery.isError
                        ? reportCardDetailQuery.error instanceof Error
                          ? reportCardDetailQuery.error.message
                          : 'Could not load subject-wise report card details.'
                        : null
                    }
                    onRetryReportCard={() =>
                      void reportCardDetailQuery.refetch()
                    }
                    onClose={() => setSelectedExamItem(null)}
                  />

                  <ExaminationScheduleDetailSheetModal
                    visible={
                      selectedExamItem !== null &&
                      selectedExamItem.category !== 'PUBLISHED'
                    }
                    examItem={
                      selectedExamItem &&
                      selectedExamItem.category !== 'PUBLISHED'
                        ? selectedExamItem
                        : null
                    }
                    studentName={
                      examData?.studentName ??
                      (activeChildMeta
                        ? `${activeChildMeta.firstName}${
                            activeChildMeta.lastName
                              ? ` ${activeChildMeta.lastName}`
                              : ''
                          }`
                        : null)
                    }
                    sectionName={resolvedSectionName}
                    onClose={() => setSelectedExamItem(null)}
                  />
                </>
              ) : null}
            </>
          )}
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



