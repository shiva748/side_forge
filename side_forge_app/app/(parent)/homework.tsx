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
import {
  HomeworkAssignmentListSection,
  HomeworkDetailSheetModal,
  HomeworkFilterAndSearchSection,
  HomeworkOverviewSummaryCard,
  type HomeworkSortAndWindowOption,
  type HomeworkStatusFilter,
  filterAndSortHomeworkItems,
} from '@/components/parent/ParentHomeworkComponents';
import type {
  ParentDashboardResponse,
  StudentHomeworkSubmissionResponse,
} from '@/types/parentPortal';
import {
  EmptyState,
  FeedbackBanner,
  LoadingStateView,
  PickerField,
  ScreenContainer,
  type SelectOption,
} from '@/components/ui';

export default function ParentHomeworkScreen() {
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
    useState<HomeworkStatusFilter>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | 'ALL'>(
    'ALL'
  );
  const [sortAndWindow, setSortAndWindow] =
    useState<HomeworkSortAndWindowOption>('PRIORITY');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHomeworkItem, setSelectedHomeworkItem] =
    useState<StudentHomeworkSubmissionResponse | null>(null);

  // Seed linked children from cached Parent Dashboard if already loaded
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

  const enrollments = useMemo(() => {
    const details = childDetailsQuery.data;
    if (!details) return [];
    const list = [...(details.enrollmentHistory ?? [])];
    if (
      details.currentEnrollment &&
      !list.some((e) => e.id === details.currentEnrollment?.id)
    ) {
      list.unshift(details.currentEnrollment);
    }
    return list;
  }, [childDetailsQuery.data]);

  const activeEnrollment = useMemo(() => {
    if (childDetailsQuery.data?.currentEnrollment) {
      return childDetailsQuery.data.currentEnrollment;
    }
    if (enrollments.length === 0) return null;
    return enrollments.find((e) => e.status === 'ACTIVE') ?? enrollments[0];
  }, [childDetailsQuery.data?.currentEnrollment, enrollments]);

  const activeChildSummary = useMemo(
    () => childrenList.find((c) => c.studentId === activeChildId) ?? null,
    [childrenList, activeChildId]
  );

  const effectiveSessionId =
    selectedSessionId ??
    activeEnrollment?.academicSessionId ??
    activeChildSummary?.academicSessionId ??
    cachedDashboard?.academicSessionId ??
    null;

  const sessionOptions = useMemo<SelectOption<number>[]>(() => {
    const seen = new Set<number>();
    const opts: SelectOption<number>[] = [];
    const currentSessionId = childDetailsQuery.data?.currentEnrollment?.academicSessionId;
    for (const enr of enrollments) {
      if (enr.academicSessionId && !seen.has(enr.academicSessionId)) {
        seen.add(enr.academicSessionId);
        const isCurrent = enr.academicSessionId === currentSessionId;
        opts.push({
          value: enr.academicSessionId,
          label: enr.academicSessionName || `Session #${enr.academicSessionId}`,
          subtitle: `${enr.className || 'Class'}${
            enr.sectionName ? ` · Section ${enr.sectionName}` : ''
          }${isCurrent ? ' (Current)' : ''}`,
        });
      }
    }
    return opts;
  }, [enrollments, childDetailsQuery.data?.currentEnrollment?.academicSessionId]);

  // Child-scoped Homework Dashboard query
  const homeworkQuery = useQuery({
    queryKey: queryKeys.parentPortal.childHomework(
      organizationId,
      activeChildId ?? 0,
      effectiveSessionId ?? undefined
    ),
    queryFn: () =>
      parentPortalApi.getChildHomeworkDashboard(
        organizationId,
        activeChildId!,
        {
          academicSessionId: effectiveSessionId ?? undefined,
        }
      ),
    enabled: organizationId > 0 && activeChildId !== null,
  });

  const homeworkData = homeworkQuery.data;
  const allHomeworkItems = useMemo(
    () => homeworkData?.homeworkItems ?? [],
    [homeworkData?.homeworkItems]
  );

  // Child-scoped Homework Detail query when an assignment is selected
  const selectedHomeworkId = selectedHomeworkItem?.homeworkId ?? null;
  const homeworkDetailQuery = useQuery({
    queryKey: queryKeys.parentPortal.childHomeworkDetail(
      organizationId,
      activeChildId ?? 0,
      selectedHomeworkId ?? 0
    ),
    queryFn: () =>
      parentPortalApi.getChildHomeworkDetail(
        organizationId,
        activeChildId!,
        selectedHomeworkId!
      ),
    enabled:
      organizationId > 0 &&
      activeChildId !== null &&
      selectedHomeworkId !== null,
  });

  const childBannerOptions = useMemo<ChildBannerOption[]>(() => {
    return childrenList.map((child) => {
      const isSelected = child.studentId === activeChildId;
      const sectionName =
        (isSelected ? activeEnrollment?.sectionName : child.sectionName) ??
        child.sectionName ??
        null;
      const classLabelParts = [
        child.className || 'Unassigned Class',
        sectionName ? `Sec ${sectionName}` : null,
      ].filter(Boolean);

      return {
        id: child.studentId,
        studentId: child.studentId,
        organizationId: child.organizationId,
        fullName: child.fullName,
        classLabel: classLabelParts.join(' • '),
        className: child.className,
        sectionName,
        rollNumber: child.rollNumber,
        admissionNumber: child.admissionNumber,
        academicSessionName: child.academicSessionName,
        profilePhotoUrl: child.profilePhotoUrl,
        relationshipType: child.relationshipType,
      };
    });
  }, [childrenList, activeChildId, activeEnrollment?.sectionName]);

  const subjectOptions = useMemo<SelectOption<number | 'ALL'>[]>(() => {
    const map = new Map<number, string>();
    for (const item of allHomeworkItems) {
      if (item.subjectId && item.subjectName && !map.has(item.subjectId)) {
        map.set(item.subjectId, item.subjectName);
      }
    }
    const sorted = Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
    return [
      { value: 'ALL', label: 'All Subjects' },
      ...sorted.map(([id, name]) => ({ value: id, label: name })),
    ];
  }, [allHomeworkItems]);

  const filteredHomeworkItems = useMemo(
    () =>
      filterAndSortHomeworkItems(allHomeworkItems, {
        statusFilter: activeStatusFilter,
        subjectId: selectedSubjectId,
        sortAndWindow,
        searchQuery,
      }),
    [
      allHomeworkItems,
      activeStatusFilter,
      selectedSubjectId,
      sortAndWindow,
      searchQuery,
    ]
  );

  const handleResetFilters = useCallback(() => {
    setActiveStatusFilter('ALL');
    setSelectedSubjectId('ALL');
    setSortAndWindow('PRIORITY');
    setSearchQuery('');
  }, []);

  const handleSelectChild = useCallback(
    (studentId: number) => {
      if (studentId === activeChildId) return;
      setSelectedChildId(studentId);
      setSelectedSessionId(null);
      setSelectedHomeworkItem(null);
      handleResetFilters();
    },
    [activeChildId, setSelectedChildId, handleResetFilters]
  );

  const handleRefresh = useCallback(async () => {
    if (!organizationId) return;
    const tasks: Promise<unknown>[] = [childrenQuery.refetch()];
    if (activeChildId) {
      tasks.push(childDetailsQuery.refetch(), homeworkQuery.refetch());
      if (selectedHomeworkId) {
        tasks.push(homeworkDetailQuery.refetch());
      }
    }
    await Promise.all(tasks);
  }, [
    organizationId,
    activeChildId,
    selectedHomeworkId,
    childrenQuery,
    childDetailsQuery,
    homeworkQuery,
    homeworkDetailQuery,
  ]);

  const isRefreshing =
    (childrenQuery.isRefetching && !childrenQuery.isLoading) ||
    (homeworkQuery.isRefetching && !homeworkQuery.isLoading);

  return (
    <ScreenContainer
      refreshing={isRefreshing}
      onRefresh={() => void handleRefresh()}
      header={
        <AppShellHeader
          title="Homework & Assignments"
          subtitle="Assigned tasks, deadlines, submissions & teacher feedback"
        />
      }
    >
      {childrenQuery.isLoading ? (
        <LoadingStateView message="Loading linked student profile..." />
      ) : childrenQuery.isError ? (
        <FeedbackBanner
          tone="warning"
          title="Unable to load linked children"
          message={
            childrenQuery.error instanceof Error
              ? childrenQuery.error.message
              : 'No student profile is linked to your guardian account in this school yet.'
          }
          onRetry={() => void childrenQuery.refetch()}
          style={{ marginBottom: spacing.md }}
        />
      ) : childrenList.length === 0 ? (
        <EmptyState
          icon={<Users size={iconSizes.xl} color={colors.primary} />}
          title="No Linked Children Yet"
          description="Once your school links your child's student profile to your guardian account, their homework assignments, submission status, and teacher feedback will appear here."
          actionLabel="Check Invitations"
          onActionPress={() => navigateTo('/settings/invitations')}
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
                  setSelectedHomeworkItem(null);
                }}
              />
            </View>
          ) : null}

          {homeworkQuery.isLoading && activeChildId !== null ? (
            <LoadingStateView message="Loading homework assignments..." />
          ) : (
            <>
              {homeworkQuery.isError ? (
                <FeedbackBanner
                  tone="danger"
                  title="Unable to load homework"
                  message={
                    homeworkQuery.error instanceof Error
                      ? homeworkQuery.error.message
                      : 'Could not load homework assignments for this student.'
                  }
                  onRetry={() => void homeworkQuery.refetch()}
                  style={{ marginBottom: spacing.md }}
                />
              ) : null}

              <HomeworkOverviewSummaryCard
                dashboard={homeworkData ?? null}
                activeStatusFilter={activeStatusFilter}
                onSelectStatusFilter={setActiveStatusFilter}
              />

              <HomeworkFilterAndSearchSection
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
                selectedSubjectId={selectedSubjectId}
                onChangeSubjectId={setSelectedSubjectId}
                subjectOptions={subjectOptions}
                sortAndWindow={sortAndWindow}
                onChangeSortAndWindow={setSortAndWindow}
                activeStatusFilter={activeStatusFilter}
                onResetAllFilters={handleResetFilters}
              />

              <HomeworkAssignmentListSection
                assignments={filteredHomeworkItems}
                totalOriginalCount={allHomeworkItems.length}
                onSelectAssignment={(item) => setSelectedHomeworkItem(item)}
                onResetFilters={handleResetFilters}
              />

              {activeChildId !== null ? (
                <HomeworkDetailSheetModal
                  visible={selectedHomeworkItem !== null}
                  organizationId={organizationId}
                  studentId={activeChildId}
                  summaryItem={selectedHomeworkItem}
                  detailData={homeworkDetailQuery.data ?? null}
                  isLoadingDetail={homeworkDetailQuery.isLoading}
                  detailError={
                    homeworkDetailQuery.isError
                      ? homeworkDetailQuery.error instanceof Error
                        ? homeworkDetailQuery.error.message
                        : 'Could not load attachment details for this homework.'
                      : null
                  }
                  onRetryDetail={() => void homeworkDetailQuery.refetch()}
                  onClose={() => setSelectedHomeworkItem(null)}
                />
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


