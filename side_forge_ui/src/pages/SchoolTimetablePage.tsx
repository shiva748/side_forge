import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  Edit3,
  Eye,
  Filter,
  Layers,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api-client';
import { academicManagementApi } from '../services/academicManagementApi';
import { staffManagementApi } from '../services/staffManagementApi';
import { timetableManagementApi } from '../services/timetableManagementApi';
import { classifyOrganizationAccessError } from '../types/auth';
import type {
  AcademicSessionResponse,
  ClassSubjectResponse,
  SchoolClassResponse,
  SectionResponse,
  SubjectResponse,
} from '../types/academicManagement';
import type {
  StaffResponse,
  TeacherResponse,
  TeacherSubjectAssignmentResponse,
} from '../types/staffManagement';
import {
  ALL_DAYS_OF_WEEK,
  ClassTimetableResponse,
  CreateClassTimetableRequest,
  CreateTimetableConfigRequest,
  CreateTimetablePeriodRequest,
  CreateTimetableSlotRequest,
  DAY_OF_WEEK_LABELS,
  DayOfWeek,
  formatLocalTime,
  formatSlotTeacherName,
  PERIOD_TYPE_META,
  sortWorkingDays,
  TIMETABLE_STATUS_META,
  TimetableConfigResponse,
  TimetablePeriodResponse,
  TimetableSlotResponse,
  UpdateTimetableConfigRequest,
  UpdateTimetablePeriodRequest,
  UpdateTimetableSlotRequest,
} from '../types/timetableManagement';
import { AppShell } from '../components/layout/AppShell';
import { SuspendedOrganizationWorkspaceView } from '../components/school/OrganizationStatusBanner';
import {
  CreateClassTimetableDialog,
  TimetableConfigFormDialog,
  TimetableLifecycleAction,
  TimetableLifecycleConfirmDialog,
  TimetablePeriodFormDialog,
  TimetableSlotFormDialog,
  TimetableSlotSubmitMeta,
} from '../components/school/TimetableManagementDialogs';
import { Badge, IdLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  LoadingState,
} from '../components/ui/StateViews';

type TimetableTab = 'CLASS_TIMETABLE' | 'TEACHER_TIMETABLE' | 'CONFIGS';

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, subtitle, actions, children }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
    {(title || subtitle || actions) && (
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {title && (
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.message) return err.message;
  const classified = classifyOrganizationAccessError(err);
  return classified.userMessage || fallback;
}

function getDurationMinutes(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const s = start.trim().slice(0, 5).split(':').map(Number);
  const e = end.trim().slice(0, 5).split(':').map(Number);
  if (s.length !== 2 || e.length !== 2 || s.some(Number.isNaN) || e.some(Number.isNaN)) {
    return null;
  }
  const diff = e[0] * 60 + e[1] - (s[0] * 60 + s[1]);
  return diff > 0 ? diff : null;
}

export const SchoolTimetablePage: React.FC = () => {
  const {
    user,
    activeOrganizationId,
    activeOrganization,
    isOrganizationSuspended,
    revalidateOrganizationStatus,
    hasPermission,
    hasFeature,
    hasRole,
  } = useAuth();

  const organizationId = activeOrganizationId;
  const canViewTimetable = hasPermission('timetable.view');
  const canManageTimetable = hasPermission('timetable.manage');
  const canPublishTimetable = hasPermission('timetable.publish');
  const isTimetableFeatureEnabled = hasFeature('TIMETABLE');

  // Determine if user is a TEACHER without admin/coordinator override roles
  // (matches backend TimetableService.enforceTeacherAccessIfApplicable)
  const isRestrictedTeacherOnly = useMemo(() => {
    const isTeacher = hasRole('TEACHER');
    const hasBroadRole = hasRole([
      'SCHOOL_ADMIN',
      'PRINCIPAL',
      'ACADEMIC_COORDINATOR',
      'STAFF_ADMIN',
    ]);
    return isTeacher && !hasBroadRole;
  }, [hasRole]);

  const [activeTab, setActiveTab] = useState<TimetableTab>('CLASS_TIMETABLE');

  // Core master data
  const [sessions, setSessions] = useState<AcademicSessionResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectResponse[]>([]);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [staffList, setStaffList] = useState<StaffResponse[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<
    TeacherSubjectAssignmentResponse[]
  >([]);
  const [configs, setConfigs] = useState<TimetableConfigResponse[]>([]);

  // Selected filters
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSectionScope, setSelectedSectionScope] = useState<
    number | 'CLASS_WIDE' | 'AUTO'
  >('AUTO');
  const [selectedDayFilter, setSelectedDayFilter] = useState<DayOfWeek | 'ALL'>('ALL');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);

  // Session-scoped timetable data
  const [sessionTimetables, setSessionTimetables] = useState<
    ClassTimetableResponse[]
  >([]);
  const [unscheduledTeachers, setUnscheduledTeachers] = useState<
    TeacherResponse[]
  >([]);

  // Teacher schedule viewer state
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [teacherDayFilter, setTeacherDayFilter] = useState<DayOfWeek | 'ALL'>('ALL');
  const [teacherSlots, setTeacherSlots] = useState<TimetableSlotResponse[]>([]);
  const [isLoadingTeacherSlots, setIsLoadingTeacherSlots] = useState(false);
  const [teacherSlotsError, setTeacherSlotsError] = useState<string | null>(null);

  // Loading & feedback states
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingSessionData, setIsLoadingSessionData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Dialog states
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<TimetableConfigResponse | null>(null);

  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] =
    useState<TimetablePeriodResponse | null>(null);

  const [createTimetableDialogOpen, setCreateTimetableDialogOpen] =
    useState(false);

  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] =
    useState<TimetableSlotResponse | null>(null);
  const [slotDefaultDay, setSlotDefaultDay] = useState<DayOfWeek | null>(null);
  const [slotDefaultPeriodId, setSlotDefaultPeriodId] = useState<number | null>(
    null
  );

  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);
  const [lifecycleAction, setLifecycleAction] =
    useState<TimetableLifecycleAction | null>(null);
  const [lifecycleTargetSlot, setLifecycleTargetSlot] =
    useState<TimetableSlotResponse | null>(null);

  const [isMutating, setIsMutating] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Load Master Data & Timetable Configurations
  // ---------------------------------------------------------------------------
  const loadMasterData = useCallback(async () => {
    if (!organizationId || !canViewTimetable || !isTimetableFeatureEnabled) {
      setIsLoadingInitial(false);
      return;
    }

    setIsLoadingInitial(true);
    setLoadError(null);

    try {
      const [
        sessionsRes,
        classesRes,
        subjectsRes,
        teachersPageRes,
        staffPageRes,
        configsRes,
      ] = await Promise.all([
        academicManagementApi
          .getSessions(organizationId)
          .catch(() => [] as AcademicSessionResponse[]),
        academicManagementApi
          .getClasses(organizationId)
          .catch(() => [] as SchoolClassResponse[]),
        academicManagementApi
          .getSubjects(organizationId)
          .catch(() => [] as SubjectResponse[]),
        staffManagementApi
          .listTeachers(organizationId, { page: 0, size: 100 })
          .then((p) => p.content || [])
          .catch(() => [] as TeacherResponse[]),
        staffManagementApi
          .listStaff(organizationId, { page: 0, size: 100 })
          .then((p) => p.content || [])
          .catch(() => [] as StaffResponse[]),
        timetableManagementApi.getConfigs(organizationId),
      ]);

      setSessions(sessionsRes);
      setClasses(classesRes);
      setSubjects(subjectsRes);
      setTeachers(teachersPageRes);
      setStaffList(staffPageRes);
      setConfigs(configsRes);

      // Default selections
      setSelectedSessionId((prev) => {
        if (prev && sessionsRes.some((s) => s.id === prev)) return prev;
        const current =
          sessionsRes.find((s) => s.status === 'ACTIVE') || sessionsRes[0];
        return current ? current.id : null;
      });

      const activeClasses = classesRes
        .filter((c) => c.active)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      setSelectedClassId((prev) => {
        if (prev && classesRes.some((c) => c.id === prev)) return prev;
        return activeClasses[0]?.id ?? classesRes[0]?.id ?? null;
      });

      setSelectedConfigId((prev) => {
        if (prev && configsRes.some((c) => c.id === prev)) return prev;
        const activeCfg = configsRes.find((c) => c.active) || configsRes[0];
        return activeCfg ? activeCfg.id : null;
      });

      // Default teacher selection (respecting restricted teacher-only users)
      const linkedSelfTeacher = teachersPageRes.find(
        (t) => t.userId != null && user?.id != null && t.userId === user.id
      );
      setSelectedTeacherId((prev) => {
        if (isRestrictedTeacherOnly) {
          return linkedSelfTeacher ? linkedSelfTeacher.id : null;
        }
        if (prev && teachersPageRes.some((t) => t.id === prev)) return prev;
        if (linkedSelfTeacher) return linkedSelfTeacher.id;
        const activeTeacher =
          teachersPageRes.find((t) => t.employmentStatus === 'ACTIVE') ||
          teachersPageRes[0];
        return activeTeacher ? activeTeacher.id : null;
      });
    } catch (err) {
      setLoadError(
        extractErrorMessage(err, 'Failed to load timetable configuration data.')
      );
    } finally {
      setIsLoadingInitial(false);
    }
  }, [
    canViewTimetable,
    isRestrictedTeacherOnly,
    isTimetableFeatureEnabled,
    organizationId,
    user?.id,
  ]);

  useEffect(() => {
    void loadMasterData();
  }, [loadMasterData]);

  // ---------------------------------------------------------------------------
  // 2. Load Session Timetables, Sections, Teacher Assignments & Unscheduled Teachers
  // ---------------------------------------------------------------------------
  const loadSessionTimetableData = useCallback(async () => {
    if (
      !organizationId ||
      !selectedSessionId ||
      !canViewTimetable ||
      !isTimetableFeatureEnabled
    ) {
      setSessionTimetables([]);
      setUnscheduledTeachers([]);
      setSections([]);
      setTeacherAssignments([]);
      return;
    }

    setIsLoadingSessionData(true);
    try {
      const [timetablesRes, unscheduledRes, sectionsRes, sessionAssignmentsRes] =
        await Promise.all([
          timetableManagementApi.getSessionTimetables(
            organizationId,
            selectedSessionId
          ),
          timetableManagementApi
            .getUnscheduledTeachers(organizationId, selectedSessionId)
            .catch(() => [] as TeacherResponse[]),
          academicManagementApi
            .getSections(organizationId, selectedSessionId)
            .catch(() => [] as SectionResponse[]),
          staffManagementApi
            .getSessionSubjectAssignments(organizationId, selectedSessionId)
            .catch(() => [] as TeacherSubjectAssignmentResponse[]),
        ]);
      setSessionTimetables(timetablesRes);
      setUnscheduledTeachers(unscheduledRes);
      setSections(sectionsRes);
      setTeacherAssignments(sessionAssignmentsRes);
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: extractErrorMessage(
          err,
          'Failed to load class timetables for the selected academic session.'
        ),
      });
    } finally {
      setIsLoadingSessionData(false);
    }
  }, [
    canViewTimetable,
    isTimetableFeatureEnabled,
    organizationId,
    selectedSessionId,
  ]);

  useEffect(() => {
    void loadSessionTimetableData();
  }, [loadSessionTimetableData]);

  // Load class subjects and class-specific subject-teacher assignments when (organizationId, selectedSessionId, selectedClassId) change
  useEffect(() => {
    if (
      !organizationId ||
      !selectedSessionId ||
      !selectedClassId ||
      !canViewTimetable ||
      !isTimetableFeatureEnabled
    ) {
      setClassSubjects([]);
      return;
    }
    academicManagementApi
      .getClassSubjects(organizationId, selectedSessionId, selectedClassId)
      .then((list) => setClassSubjects(list || []))
      .catch(() => setClassSubjects([]));

    staffManagementApi
      .getAllClassSubjectTeachers(
        organizationId,
        selectedSessionId,
        selectedClassId
      )
      .then((classAssignments) => {
        if (!classAssignments || classAssignments.length === 0) return;
        setTeacherAssignments((prev) => {
          const map = new Map(prev.map((a) => [a.id, a]));
          for (const ca of classAssignments) {
            map.set(ca.id, ca);
          }
          return Array.from(map.values());
        });
      })
      .catch(() => null);
  }, [
    canViewTimetable,
    isTimetableFeatureEnabled,
    organizationId,
    selectedClassId,
    selectedSessionId,
  ]);

  // ---------------------------------------------------------------------------
  // 3. Load Teacher Schedule when on TEACHER_TIMETABLE tab
  // ---------------------------------------------------------------------------
  const loadTeacherSchedule = useCallback(async () => {
    if (
      !organizationId ||
      !selectedTeacherId ||
      !canViewTimetable ||
      !isTimetableFeatureEnabled
    ) {
      setTeacherSlots([]);
      return;
    }

    setIsLoadingTeacherSlots(true);
    setTeacherSlotsError(null);
    try {
      const slots = await timetableManagementApi.getTeacherTimetable(
        organizationId,
        selectedTeacherId,
        {
          academicSessionId: selectedSessionId || undefined,
          dayOfWeek:
            teacherDayFilter === 'ALL' ? undefined : teacherDayFilter,
        }
      );
      setTeacherSlots(slots);
    } catch (err) {
      setTeacherSlotsError(
        extractErrorMessage(err, 'Failed to load teacher schedule.')
      );
      setTeacherSlots([]);
    } finally {
      setIsLoadingTeacherSlots(false);
    }
  }, [
    canViewTimetable,
    isTimetableFeatureEnabled,
    organizationId,
    selectedSessionId,
    selectedTeacherId,
    teacherDayFilter,
  ]);

  useEffect(() => {
    if (activeTab === 'TEACHER_TIMETABLE') {
      void loadTeacherSchedule();
    }
  }, [activeTab, loadTeacherSchedule]);

  // ---------------------------------------------------------------------------
  // Derived Memos
  // ---------------------------------------------------------------------------
  const selectedClassSections = useMemo(
    () =>
      sections
        .filter((sec) => sec.classId === selectedClassId && sec.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [sections, selectedClassId]
  );

  const classTimetablesForSelectedClass = useMemo(
    () =>
      sessionTimetables.filter(
        (t) =>
          t.academicSessionId === selectedSessionId &&
          t.classId === selectedClassId
      ),
    [selectedClassId, selectedSessionId, sessionTimetables]
  );

  const effectiveSectionId = useMemo<number | null>(() => {
    if (selectedSectionScope === 'CLASS_WIDE') {
      return null;
    }
    if (typeof selectedSectionScope === 'number') {
      const stillValid =
        selectedClassSections.some((s) => s.id === selectedSectionScope) ||
        classTimetablesForSelectedClass.some(
          (t) => t.sectionId === selectedSectionScope
        );
      if (stillValid) {
        return selectedSectionScope;
      }
    }
    if (classTimetablesForSelectedClass.length > 0) {
      return classTimetablesForSelectedClass[0].sectionId ?? null;
    }
    if (selectedClassSections.length > 0) {
      return selectedClassSections[0].id;
    }
    return null;
  }, [
    classTimetablesForSelectedClass,
    selectedClassSections,
    selectedSectionScope,
  ]);

  const selectedSectionObj = useMemo(
    () =>
      effectiveSectionId != null
        ? selectedClassSections.find((s) => s.id === effectiveSectionId) || null
        : null,
    [effectiveSectionId, selectedClassSections]
  );

  const currentClassTimetable = useMemo(
    () =>
      classTimetablesForSelectedClass.find(
        (t) => (t.sectionId ?? null) === effectiveSectionId
      ) || null,
    [classTimetablesForSelectedClass, effectiveSectionId]
  );

  const currentTimetableConfig = useMemo(() => {
    if (!currentClassTimetable) return null;
    return (
      configs.find((c) => c.id === currentClassTimetable.timetableConfigId) ||
      null
    );
  }, [configs, currentClassTimetable]);

  const selectedConfig = useMemo(
    () => configs.find((c) => c.id === selectedConfigId) || configs[0] || null,
    [configs, selectedConfigId]
  );

  const publishedConfigIds = useMemo(
    () =>
      new Set(
        sessionTimetables
          .filter((t) => t.status === 'PUBLISHED')
          .map((t) => t.timetableConfigId)
      ),
    [sessionTimetables]
  );

  // ---------------------------------------------------------------------------
  // Mutation Handlers
  // ---------------------------------------------------------------------------
  const handleSaveConfig = async (
    payload: CreateTimetableConfigRequest | UpdateTimetableConfigRequest
  ) => {
    if (!organizationId) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      let saved: TimetableConfigResponse;
      if (editingConfig) {
        saved = await timetableManagementApi.updateConfig(
          organizationId,
          editingConfig.id,
          payload as UpdateTimetableConfigRequest
        );
        setConfigs((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
        setBannerMessage({
          type: 'success',
          text: `Updated timetable configuration "${saved.name}".`,
        });
      } else {
        saved = await timetableManagementApi.createConfig(
          organizationId,
          payload as CreateTimetableConfigRequest
        );
        setConfigs((prev) => [...prev, saved]);
        setSelectedConfigId(saved.id);
        setBannerMessage({
          type: 'success',
          text: `Created timetable configuration "${saved.name}".`,
        });
      }
      setConfigDialogOpen(false);
      setEditingConfig(null);
    } catch (err) {
      setDialogError(
        extractErrorMessage(err, 'Failed to save timetable configuration.')
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleSavePeriod = async (
    payload: CreateTimetablePeriodRequest | UpdateTimetablePeriodRequest
  ) => {
    if (!organizationId || !selectedConfig) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      if (editingPeriod) {
        await timetableManagementApi.updatePeriod(
          organizationId,
          selectedConfig.id,
          editingPeriod.id,
          payload as UpdateTimetablePeriodRequest
        );
      } else {
        await timetableManagementApi.addPeriod(
          organizationId,
          selectedConfig.id,
          payload as CreateTimetablePeriodRequest
        );
      }

      const refreshedConfig = await timetableManagementApi.getConfigById(
        organizationId,
        selectedConfig.id
      );
      setConfigs((prev) =>
        prev.map((c) => (c.id === refreshedConfig.id ? refreshedConfig : c))
      );
      setPeriodDialogOpen(false);
      setEditingPeriod(null);
      setBannerMessage({
        type: 'success',
        text: editingPeriod
          ? `Updated period "${payload.name}" in ${selectedConfig.name}.`
          : `Added period "${payload.name}" to ${selectedConfig.name}.`,
      });
    } catch (err) {
      setDialogError(
        extractErrorMessage(err, 'Failed to save timetable period.')
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateClassTimetable = async (
    payload: CreateClassTimetableRequest
  ) => {
    if (!organizationId) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      const created = await timetableManagementApi.createClassTimetable(
        organizationId,
        payload
      );
      setSelectedSessionId(created.academicSessionId);
      setSelectedClassId(created.classId);
      setSelectedSectionScope(
        created.sectionId != null ? created.sectionId : 'CLASS_WIDE'
      );
      setSessionTimetables((prev) => [
        ...prev.filter((t) => t.id !== created.id),
        created,
      ]);
      setCreateTimetableDialogOpen(false);
      setBannerMessage({
        type: 'success',
        text: `Initialized draft timetable for ${
          created.className || `Class #${created.classId}`
        }${created.sectionName ? ` — Section ${created.sectionName}` : ''}.`,
      });
    } catch (err) {
      setDialogError(
        extractErrorMessage(err, 'Failed to create class timetable.')
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleQuickCreateSubject = async (
    name: string,
    code: string
  ): Promise<SubjectResponse> => {
    if (!organizationId) {
      throw new Error('No organization selected.');
    }
    const created = await academicManagementApi.createSubject(organizationId, {
      name,
      code,
    });
    setSubjects((prev) => [...prev, created]);
    return created;
  };

  const handleQuickSetupClassTimetable = async () => {
    if (!organizationId || !selectedSessionId || !selectedClassId) return;
    setIsMutating(true);
    setBannerMessage(null);
    try {
      // 1. Find or create an active Bell Config with at least 1 TEACHING period
      let targetConfig =
        (currentTimetableConfig && currentTimetableConfig.active
          ? currentTimetableConfig
          : null) ||
        configs.find(
          (c) =>
            c.active && (c.periods || []).some((p) => p.periodType === 'TEACHING')
        ) ||
        configs.find((c) => c.active) ||
        null;

      if (!targetConfig) {
        targetConfig = await timetableManagementApi.createConfig(
          organizationId,
          {
            name: 'Standard School Schedule (Mon–Sat)',
            workingDays: [
              'MONDAY',
              'TUESDAY',
              'WEDNESDAY',
              'THURSDAY',
              'FRIDAY',
              'SATURDAY',
            ],
            dayStartTime: '08:00',
            dayEndTime: '14:00',
            description: 'Auto-created standard 8-period school bell schedule.',
          }
        );
      }

      // 2. If targetConfig has 0 periods, populate a standard 8-period + lunch schedule
      if (!targetConfig.periods || targetConfig.periods.length === 0) {
        const standardSlots: CreateTimetablePeriodRequest[] = [
          {
            name: 'Period 1',
            periodOrder: 1,
            startTime: '08:00',
            endTime: '08:40',
            periodType: 'TEACHING',
          },
          {
            name: 'Period 2',
            periodOrder: 2,
            startTime: '08:40',
            endTime: '09:20',
            periodType: 'TEACHING',
          },
          {
            name: 'Period 3',
            periodOrder: 3,
            startTime: '09:20',
            endTime: '10:00',
            periodType: 'TEACHING',
          },
          {
            name: 'Period 4',
            periodOrder: 4,
            startTime: '10:00',
            endTime: '10:40',
            periodType: 'TEACHING',
          },
          {
            name: 'Lunch Break',
            periodOrder: 5,
            startTime: '10:40',
            endTime: '11:20',
            periodType: 'LUNCH_BREAK',
          },
          {
            name: 'Period 5',
            periodOrder: 6,
            startTime: '11:20',
            endTime: '12:00',
            periodType: 'TEACHING',
          },
          {
            name: 'Period 6',
            periodOrder: 7,
            startTime: '12:00',
            endTime: '12:40',
            periodType: 'TEACHING',
          },
          {
            name: 'Period 7',
            periodOrder: 8,
            startTime: '12:40',
            endTime: '13:20',
            periodType: 'TEACHING',
          },
          {
            name: 'Period 8',
            periodOrder: 9,
            startTime: '13:20',
            endTime: '14:00',
            periodType: 'TEACHING',
          },
        ];

        for (const p of standardSlots) {
          await timetableManagementApi.addPeriod(
            organizationId,
            targetConfig.id,
            p
          );
        }

        targetConfig = await timetableManagementApi.getConfigById(
          organizationId,
          targetConfig.id
        );
      }

      // 3. Create Draft Class Timetable if not yet initialized for this (session, class, section)
      if (!currentClassTimetable) {
        const created = await timetableManagementApi.createClassTimetable(
          organizationId,
          {
            academicSessionId: selectedSessionId,
            classId: selectedClassId,
            sectionId: effectiveSectionId,
            timetableConfigId: targetConfig.id,
            notes: 'Initialized via Quick Setup',
          }
        );
        setSelectedSectionScope(
          created.sectionId != null ? created.sectionId : 'CLASS_WIDE'
        );
      }

      await loadMasterData();
      await loadSessionTimetableData();
      setBannerMessage({
        type: 'success',
        text: 'Weekly timetable grid is ready! Click any "+ Assign Slot" cell below to assign a subject and teacher.',
      });
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: extractErrorMessage(
          err,
          'Failed to quick-setup class timetable.'
        ),
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveSlot = async (
    payload: CreateTimetableSlotRequest | UpdateTimetableSlotRequest,
    meta?: TimetableSlotSubmitMeta
  ) => {
    if (!organizationId || !currentClassTimetable) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      let resolvedTeacherId = payload.teacherId;

      // 1. If user selected an active Staff member without a TeacherProfile yet, auto-create TeacherProfile
      if (!resolvedTeacherId && meta?.selectedStaffId) {
        const createdTeacher = await staffManagementApi.createTeacher(
          organizationId,
          {
            staffId: meta.selectedStaffId,
            availableForAssignment: true,
          }
        );
        resolvedTeacherId = createdTeacher.id;
        setTeachers((prev) => [...prev, createdTeacher]);
      } else if (resolvedTeacherId && meta?.needsTeacherEnablement) {
        // Ensure availableForAssignment is true
        await staffManagementApi
          .changeTeacherStatus(organizationId, resolvedTeacherId, {
            availableForAssignment: true,
          })
          .catch(() => null);
      }

      // 2. Auto-link Subject to Class if needed (frontend + backend both support this)
      if (meta?.needsSubjectClassLink) {
        await academicManagementApi
          .assignSubjectToClass(
            organizationId,
            currentClassTimetable.academicSessionId,
            currentClassTimetable.classId,
            {
              subjectId: payload.subjectId,
              compulsory: true,
            }
          )
          .catch(() => null);
      }

      // 3. Auto-link Teacher to Subject & Class if needed (frontend + backend both support this)
      if (resolvedTeacherId && meta?.needsTeacherSubjectLink) {
        await staffManagementApi
          .assignTeacherToSubject(
            organizationId,
            currentClassTimetable.academicSessionId,
            currentClassTimetable.classId,
            payload.subjectId,
            {
              teacherId: resolvedTeacherId,
            }
          )
          .catch(() => null);
      }

      const finalPayload = {
        ...payload,
        teacherId: resolvedTeacherId,
      };

      if (editingSlot) {
        await timetableManagementApi.updateSlot(
          organizationId,
          currentClassTimetable.id,
          editingSlot.id,
          finalPayload as UpdateTimetableSlotRequest
        );
      } else {
        await timetableManagementApi.addSlot(
          organizationId,
          currentClassTimetable.id,
          finalPayload as CreateTimetableSlotRequest
        );
      }

      await Promise.all([
        loadSessionTimetableData(),
        academicManagementApi
          .getClassSubjects(
            organizationId,
            currentClassTimetable.academicSessionId,
            currentClassTimetable.classId
          )
          .then((list) => setClassSubjects(list || []))
          .catch(() => null),
      ]);
      setSlotDialogOpen(false);
      setEditingSlot(null);
      setBannerMessage({
        type: 'success',
        text: editingSlot
          ? 'Updated period assignment.'
          : 'Assigned teacher and subject to period.',
      });
    } catch (err) {
      setDialogError(
        extractErrorMessage(
          err,
          'Failed to save teaching slot due to a conflict or validation error.'
        )
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmLifecycle = async () => {
    if (!organizationId || !currentClassTimetable || !lifecycleAction) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      if (lifecycleAction === 'PUBLISH') {
        const updated = await timetableManagementApi.publishTimetable(
          organizationId,
          currentClassTimetable.id
        );
        setSessionTimetables((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        setBannerMessage({
          type: 'success',
          text: `Published timetable for ${
            updated.className || `Class #${updated.classId}`
          } (Revision v${updated.revisionNumber}).`,
        });
      } else if (lifecycleAction === 'REOPEN') {
        const updated = await timetableManagementApi.reopenTimetable(
          organizationId,
          currentClassTimetable.id
        );
        setSessionTimetables((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        setBannerMessage({
          type: 'success',
          text: `Reopened timetable for ${
            updated.className || `Class #${updated.classId}`
          } to DRAFT (Revision v${updated.revisionNumber}).`,
        });
      } else if (lifecycleAction === 'DELETE_SLOT' && lifecycleTargetSlot) {
        await timetableManagementApi.removeSlot(
          organizationId,
          currentClassTimetable.id,
          lifecycleTargetSlot.id
        );
        await loadSessionTimetableData();
        setSlotDialogOpen(false);
        setEditingSlot(null);
        setBannerMessage({
          type: 'success',
          text: 'Removed scheduled teaching slot from draft timetable.',
        });
      }
      setLifecycleDialogOpen(false);
      setLifecycleAction(null);
      setLifecycleTargetSlot(null);
    } catch (err) {
      setDialogError(
        extractErrorMessage(err, 'Failed to complete timetable action.')
      );
    } finally {
      setIsMutating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------
  const breadcrumbParent =
    activeOrganization?.organizationName || 'School Workspace';

  if (isOrganizationSuspended) {
    return (
      <AppShell
        pageTitle="Timetable Management"
        breadcrumbParent={breadcrumbParent}
      >
        <SuspendedOrganizationWorkspaceView />
      </AppShell>
    );
  }

  if (!organizationId) {
    return (
      <AppShell
        pageTitle="Timetable Management"
        breadcrumbParent={breadcrumbParent}
      >
        <EmptyState
          title="No Organization Selected"
          description="Please select a school organization to manage class and teacher timetables."
        />
      </AppShell>
    );
  }

  if (!isTimetableFeatureEnabled) {
    return (
      <AppShell
        pageTitle="Timetable Management"
        breadcrumbParent={breadcrumbParent}
      >
        <div className="space-y-5">
          <PageHeader
            badge="Academic Scheduling"
            title="Timetable Management"
            description="Weekly class schedules, bell timings, teacher workload views, and conflict-free slot allocation."
          />
          <Card>
            <EmptyState
              icon={<Lock className="h-6 w-6" />}
              title="Timetable Feature Not Enabled"
              description="The TIMETABLE module is not enabled in your school's current subscription plan or feature overrides."
            />
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!canViewTimetable) {
    return (
      <AppShell
        pageTitle="Timetable Management"
        breadcrumbParent={breadcrumbParent}
      >
        <div className="space-y-5">
          <PageHeader
            badge="Academic Scheduling"
            title="Timetable Management"
            description="Weekly class schedules, bell timings, teacher workload views, and conflict-free slot allocation."
          />
          <Card>
            <ErrorState
              title="Insufficient Permissions"
              message="You need the 'timetable.view' permission to view class and teacher timetables."
            />
          </Card>
        </div>
      </AppShell>
    );
  }

  if (isLoadingInitial) {
    return (
      <AppShell
        pageTitle="Timetable Management"
        breadcrumbParent={breadcrumbParent}
      >
        <div className="space-y-5">
          <PageHeader
            badge="Academic Scheduling"
            title="Timetable Management"
            description="Loading school timetable configurations, academic sessions, and class schedules..."
          />
          <Card>
            <LoadingState label="Loading timetable workspace..." />
          </Card>
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell
        pageTitle="Timetable Management"
        breadcrumbParent={breadcrumbParent}
      >
        <div className="space-y-5">
          <PageHeader
            badge="Academic Scheduling"
            title="Timetable Management"
            description="Weekly class schedules, bell timings, teacher workload views, and conflict-free slot allocation."
          />
          <Card>
            <ErrorState
              title="Failed to Load Timetable Workspace"
              message={loadError}
              onRetry={loadMasterData}
            />
          </Card>
        </div>
      </AppShell>
    );
  }

  const publishedCount = sessionTimetables.filter(
    (t) => t.status === 'PUBLISHED'
  ).length;
  const draftCount = sessionTimetables.filter(
    (t) => t.status === 'DRAFT'
  ).length;
  const totalSlotsInSession = sessionTimetables.reduce(
    (acc, t) => acc + (t.slots?.length || 0),
    0
  );
  const activeConfigsCount = configs.filter((c) => c.active).length;

  const gridWorkingDays = currentTimetableConfig?.workingDays?.length
    ? sortWorkingDays(currentTimetableConfig.workingDays)
    : (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as DayOfWeek[]);

  const visibleGridDays =
    selectedDayFilter === 'ALL'
      ? gridWorkingDays
      : gridWorkingDays.filter((d) => d === selectedDayFilter);

  const orderedConfigPeriods = [...(currentTimetableConfig?.periods || [])].sort(
    (a, b) => a.periodOrder - b.periodOrder
  );

  return (
    <AppShell
      pageTitle="Timetable Management"
      breadcrumbParent={breadcrumbParent}
    >
      <div className="space-y-5">
      <PageHeader
        badge="Academic Scheduling"
        title="Timetable Management"
        description="Configure school bell schedules, build conflict-free weekly class timetables, manage draft/publish revisions, and inspect teacher schedules."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => {
                void loadMasterData();
                void loadSessionTimetableData();
                if (activeTab === 'TEACHER_TIMETABLE') {
                  void loadTeacherSchedule();
                }
              }}
            >
              Refresh
            </Button>
            {canManageTimetable && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Settings className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setEditingConfig(null);
                    setDialogError(null);
                    setConfigDialogOpen(true);
                  }}
                >
                  New Bell Config
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setDialogError(null);
                    setCreateTimetableDialogOpen(true);
                  }}
                >
                  Initialize Class Timetable
                </Button>
              </>
            )}
          </div>
        }
      />

      {bannerMessage && (
        <InlineAlert
          variant={bannerMessage.type === 'success' ? 'success' : 'error'}
          title={
            bannerMessage.type === 'success' ? 'Timetable Updated' : 'Attention'
          }
        >
          <div className="flex items-center justify-between gap-3">
            <span>{bannerMessage.text}</span>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-[11px] font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </InlineAlert>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Published Class Timetables</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {publishedCount}
            </span>
            <span className="text-[11px] text-slate-500">
              of {classes.filter((c) => c.active).length} active
              classes
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Draft Timetables</span>
            <Edit3 className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {draftCount}
            </span>
            <span className="text-[11px] text-slate-500">
              in preparation / revision
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Scheduled Weekly Slots</span>
            <Calendar className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {totalSlotsInSession}
            </span>
            <span className="text-[11px] text-slate-500">
              conflict-checked periods
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Bell Configurations</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {activeConfigsCount}
            </span>
            <span className="text-[11px] text-slate-500">
              {unscheduledTeachers.length} unscheduled active teachers
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('CLASS_TIMETABLE')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'CLASS_TIMETABLE'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Class Timetables (Weekly Grid)
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              activeTab === 'CLASS_TIMETABLE'
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-200/80 text-slate-700'
            }`}
          >
            {sessionTimetables.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TEACHER_TIMETABLE')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'TEACHER_TIMETABLE'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          {isRestrictedTeacherOnly ? 'My Teaching Schedule' : 'Teacher Schedules'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONFIGS')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'CONFIGS'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Bell Schedules & Period Configs
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              activeTab === 'CONFIGS'
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-200/80 text-slate-700'
            }`}
          >
            {configs.length}
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: CLASS TIMETABLES (WEEKLY GRID & SESSION OVERVIEW)            */}
      {/* =================================================================== */}
      {activeTab === 'CLASS_TIMETABLE' && (
        <div className="space-y-5">
          {/* Selector & Action Bar */}
          <Card>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 flex-1">
                <div>
                  <label
                    htmlFor="tt-filter-session"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    Academic Session
                  </label>
                  <Select
                    id="tt-filter-session"
                    value={selectedSessionId ? String(selectedSessionId) : ''}
                    onChange={(e) => {
                      setSelectedSessionId(
                        e.target.value ? Number(e.target.value) : null
                      );
                      setSelectedSectionScope('AUTO');
                    }}
                  >
                    <option value="">Select session...</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status}){' '}
                        {s.status === 'ACTIVE' ? '• Active' : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="tt-filter-class"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    School Class
                  </label>
                  <Select
                    id="tt-filter-class"
                    value={selectedClassId ? String(selectedClassId) : ''}
                    onChange={(e) => {
                      setSelectedClassId(
                        e.target.value ? Number(e.target.value) : null
                      );
                      setSelectedSectionScope('AUTO');
                    }}
                  >
                    <option value="">Select class...</option>
                    {classes
                      .filter((c) => c.active)
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((c) => {
                        const clsTimetables = sessionTimetables.filter(
                          (t) =>
                            t.academicSessionId === selectedSessionId &&
                            t.classId === c.id
                        );
                        const clsSections = sections.filter(
                          (sec) => sec.classId === c.id && sec.active
                        );
                        const totalSlots = clsTimetables.reduce(
                          (acc, t) => acc + (t.slots?.length || 0),
                          0
                        );
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code}){' '}
                            {clsTimetables.length > 0
                              ? clsSections.length > 0
                                ? `• ${clsTimetables.length}/${clsSections.length} sec (${totalSlots} slots)`
                                : `• ${clsTimetables[0].status} (${totalSlots} slots)`
                              : clsSections.length > 0
                                ? `• ${clsSections.length} sec • Not Initialized`
                                : '• Not Initialized'}
                          </option>
                        );
                      })}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="tt-filter-section"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    Section / Timetable Scope
                  </label>
                  <Select
                    id="tt-filter-section"
                    value={
                      effectiveSectionId != null
                        ? String(effectiveSectionId)
                        : 'CLASS_WIDE'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSectionScope(
                        val === 'CLASS_WIDE' ? 'CLASS_WIDE' : Number(val)
                      );
                    }}
                    disabled={!selectedClassId}
                  >
                    {selectedClassSections.map((sec) => {
                      const secTt = classTimetablesForSelectedClass.find(
                        (t) => t.sectionId === sec.id
                      );
                      return (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.name}{' '}
                          {secTt
                            ? `• ${secTt.status} (${secTt.slots?.length || 0} slots)`
                            : '• Not Initialized'}
                        </option>
                      );
                    })}
                    <option value="CLASS_WIDE">
                      {selectedClassSections.length > 0
                        ? 'Class-wide (All Sections)'
                        : 'Class-wide (No sections configured)'}{' '}
                      {classTimetablesForSelectedClass.find(
                        (t) => t.sectionId == null
                      )
                        ? `• ${
                            classTimetablesForSelectedClass.find(
                              (t) => t.sectionId == null
                            )!.status
                          }`
                        : ''}
                    </option>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="tt-filter-day"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    Day Filter
                  </label>
                  <Select
                    id="tt-filter-day"
                    value={selectedDayFilter}
                    onChange={(e) =>
                      setSelectedDayFilter(e.target.value as DayOfWeek | 'ALL')
                    }
                  >
                    <option value="ALL">All Working Days (Weekly Grid)</option>
                    {gridWorkingDays.map((day) => (
                      <option key={day} value={day}>
                        {DAY_OF_WEEK_LABELS[day].fullLabel} Only
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Lifecycle & Slot Controls for Selected Class Timetable */}
              {currentClassTimetable && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {currentClassTimetable.status === 'DRAFT' &&
                    canManageTimetable && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setEditingSlot(null);
                          setSlotDefaultDay(null);
                          setSlotDefaultPeriodId(null);
                          setDialogError(null);
                          setSlotDialogOpen(true);
                        }}
                      >
                        Schedule Slot
                      </Button>
                    )}

                  {currentClassTimetable.status === 'DRAFT' &&
                    canPublishTimetable && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Send className="h-3.5 w-3.5" />}
                        disabled={(currentClassTimetable.slots?.length || 0) === 0}
                        onClick={() => {
                          setLifecycleAction('PUBLISH');
                          setLifecycleTargetSlot(null);
                          setDialogError(null);
                          setLifecycleDialogOpen(true);
                        }}
                      >
                        Publish Timetable
                      </Button>
                    )}

                  {currentClassTimetable.status === 'PUBLISHED' &&
                    canPublishTimetable && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setLifecycleAction('REOPEN');
                          setLifecycleTargetSlot(null);
                          setDialogError(null);
                          setLifecycleDialogOpen(true);
                        }}
                      >
                        Reopen for Revision
                      </Button>
                    )}
                </div>
              )}
            </div>

            {/* Quick Section Switcher Pills when the selected class has sections */}
            {selectedClassId && selectedClassSections.length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                    Class Sections:
                  </span>
                  {selectedClassSections.map((sec) => {
                    const secTt = classTimetablesForSelectedClass.find(
                      (t) => t.sectionId === sec.id
                    );
                    const isActivePill = effectiveSectionId === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setSelectedSectionScope(sec.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                          isActivePill
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                            : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>Section {sec.name}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                            isActivePill
                              ? 'bg-indigo-500 text-white'
                              : secTt?.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : secTt
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200/80 text-slate-500'
                          }`}
                        >
                          {secTt
                            ? `${secTt.slots?.length || 0} slots`
                            : 'Unscheduled'}
                        </span>
                      </button>
                    );
                  })}
                  {classTimetablesForSelectedClass.some(
                    (t) => t.sectionId == null
                  ) && (
                    <button
                      type="button"
                      onClick={() => setSelectedSectionScope('CLASS_WIDE')}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        effectiveSectionId == null
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Class-wide
                    </button>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Selected Class Timetable Weekly Grid Card */}
          {isLoadingSessionData ? (
            <Card>
              <LoadingState label="Loading class timetable grid..." />
            </Card>
          ) : !currentClassTimetable ? (
            <Card>
              <EmptyState
                icon={<Calendar className="h-6 w-6" />}
                title={
                  selectedSectionObj
                    ? `No Timetable Initialized for ${
                        classes.find((c) => c.id === selectedClassId)?.name ||
                        'Class'
                      } — Section ${selectedSectionObj.name}`
                    : 'No Timetable Initialized for Selected Class'
                }
                description={
                  selectedClassId
                    ? `No timetable exists yet for ${
                        classes.find((c) => c.id === selectedClassId)?.name ||
                        'this class'
                      }${
                        selectedSectionObj
                          ? ` (Section ${selectedSectionObj.name})`
                          : ''
                      } in the selected academic session. Initialize a draft timetable to start assigning subject and teacher slots.`
                    : 'Select an academic session and school class above to view or initialize its weekly timetable.'
                }
                action={
                  canManageTimetable && selectedSessionId && selectedClassId ? (
                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                        onClick={() => void handleQuickSetupClassTimetable()}
                        isLoading={isMutating}
                      >
                        Quick Setup 8-Period Grid
                        {selectedSectionObj
                          ? ` (Sec ${selectedSectionObj.name})`
                          : ''}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setDialogError(null);
                          setCreateTimetableDialogOpen(true);
                        }}
                      >
                        Custom Setup...
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <Card
              title={`${
                currentClassTimetable.className ||
                `Class #${currentClassTimetable.classId}`
              }${
                currentClassTimetable.sectionName
                  ? ` — Section ${currentClassTimetable.sectionName}`
                  : ' (Class-wide)'
              } — Weekly Timetable`}
              subtitle={`Bell Schedule: ${
                currentClassTimetable.timetableConfigName ||
                currentTimetableConfig?.name ||
                `Config #${currentClassTimetable.timetableConfigId}`
              } • Revision v${currentClassTimetable.revisionNumber}${
                selectedClassSections.length > 0
                  ? ` • Active Class Sections: ${selectedClassSections
                      .map((s) => s.name)
                      .join(', ')}`
                  : ''
              }`}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <IdLabel>Timetable #{currentClassTimetable.id}</IdLabel>
                  <Badge
                    variant={
                      TIMETABLE_STATUS_META[currentClassTimetable.status].variant
                    }
                  >
                    {TIMETABLE_STATUS_META[currentClassTimetable.status].label}
                  </Badge>
                  <Badge variant="neutral">
                    {currentClassTimetable.slots?.length || 0} slots
                  </Badge>
                </div>
              }
            >
              <div className="space-y-4">
                {currentClassTimetable.notes && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Notes:</span>{' '}
                    {currentClassTimetable.notes}
                  </div>
                )}

                {orderedConfigPeriods.length === 0 ? (
                  <EmptyState
                    icon={<Clock className="h-6 w-6" />}
                    title="No Periods Configured in Bell Schedule"
                    description={`The linked bell schedule "${
                      currentTimetableConfig?.name || 'Configuration'
                    }" does not have any periods yet. Add teaching periods and breaks in the Bell Schedules tab.`}
                    action={
                      canManageTimetable ? (
                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                            onClick={() => void handleQuickSetupClassTimetable()}
                            isLoading={isMutating}
                          >
                            Auto-Generate Standard 8 Periods
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (currentTimetableConfig) {
                                setSelectedConfigId(currentTimetableConfig.id);
                              }
                              setActiveTab('CONFIGS');
                            }}
                          >
                            Configure Bell Periods Manually
                          </Button>
                        </div>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[780px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="w-44 border-r border-slate-200 px-3.5 py-3">
                            Period / Bell Timing
                          </th>
                          {visibleGridDays.map((day) => (
                            <th
                              key={day}
                              className="border-r border-slate-200 px-3.5 py-3 last:border-r-0"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-slate-800">
                                  {DAY_OF_WEEK_LABELS[day].fullLabel}
                                </span>
                                <span className="text-[10px] font-normal text-slate-400">
                                  {
                                    (currentClassTimetable.slots || []).filter(
                                      (s) => s.dayOfWeek === day
                                    ).length
                                  }{' '}
                                  slots
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {orderedConfigPeriods.map((period) => {
                          const isBreakOrNonTeaching =
                            period.breakPeriod ||
                            period.periodType !== 'TEACHING';
                          const pMeta = PERIOD_TYPE_META[period.periodType];

                          if (isBreakOrNonTeaching) {
                            return (
                              <tr
                                key={period.id}
                                className="bg-amber-50/40 text-slate-700"
                              >
                                <td className="border-r border-slate-200 px-3.5 py-2.5">
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                    <Coffee className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span>{period.name}</span>
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-slate-500">
                                    {formatLocalTime(period.startTime)} –{' '}
                                    {formatLocalTime(period.endTime)}
                                  </div>
                                </td>
                                <td
                                  colSpan={visibleGridDays.length}
                                  className="px-4 py-2.5 text-center"
                                >
                                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-100/60 px-3 py-1 text-[11px] font-semibold text-amber-900">
                                    <span>{pMeta.label}</span>
                                    <span className="text-amber-600">•</span>
                                    <span>
                                      {formatLocalTime(period.startTime)} –{' '}
                                      {formatLocalTime(period.endTime)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr
                              key={period.id}
                              className="hover:bg-slate-50/30 transition-colors"
                            >
                              <td className="border-r border-slate-200 bg-slate-50/40 px-3.5 py-3 align-top">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-slate-900">
                                    {period.name}
                                  </span>
                                  <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                    #{period.periodOrder}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span>
                                    {formatLocalTime(period.startTime)} –{' '}
                                    {formatLocalTime(period.endTime)}
                                  </span>
                                </div>
                              </td>

                              {visibleGridDays.map((day) => {
                                const slot = (
                                  currentClassTimetable.slots || []
                                ).find(
                                  (s) =>
                                    s.dayOfWeek === day &&
                                    s.periodId === period.id
                                );
                                const isEditableDraft =
                                  currentClassTimetable.status === 'DRAFT' &&
                                  canManageTimetable;

                                return (
                                  <td
                                    key={`${day}-${period.id}`}
                                    className="border-r border-slate-200 p-2 align-top last:border-r-0 min-w-[165px]"
                                  >
                                    {slot ? (
                                      <div
                                        onClick={() => {
                                          if (!isEditableDraft) return;
                                          setEditingSlot(slot);
                                          setSlotDefaultDay(day);
                                          setSlotDefaultPeriodId(period.id);
                                          setDialogError(null);
                                          setSlotDialogOpen(true);
                                        }}
                                        className={`group relative rounded-lg border border-indigo-200/80 bg-indigo-50/40 p-2.5 transition-all ${
                                          isEditableDraft
                                            ? 'hover:border-indigo-400 hover:bg-indigo-50/80 cursor-pointer'
                                            : ''
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-1.5">
                                          <div className="font-semibold text-slate-900 leading-snug">
                                            {slot.subjectName ||
                                              `Subject #${slot.subjectId}`}
                                          </div>
                                          {slot.subjectCode && (
                                            <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                              {slot.subjectCode}
                                            </span>
                                          )}
                                        </div>

                                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                                          <UserCheck className="h-3 w-3 text-indigo-600 shrink-0" />
                                          <span className="truncate">
                                            {formatSlotTeacherName(slot)}
                                          </span>
                                        </div>

                                        {(slot.room || slot.remarks) && (
                                          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                                            {slot.room && (
                                              <span className="inline-flex items-center gap-0.5 rounded bg-white/90 border border-slate-200 px-1.5 py-0.5 font-medium text-slate-600">
                                                <MapPin className="h-2.5 w-2.5 text-slate-400" />
                                                {slot.room}
                                              </span>
                                            )}
                                            {slot.remarks && (
                                              <span
                                                className="truncate max-w-[130px] italic"
                                                title={slot.remarks}
                                              >
                                                {slot.remarks}
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        {isEditableDraft && (
                                          <div className="mt-2 flex items-center justify-end gap-1 border-t border-indigo-100/80 pt-1.5 opacity-80 group-hover:opacity-100">
                                            <span className="text-[10px] font-semibold text-indigo-700 hover:underline">
                                              Edit Slot
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : isEditableDraft ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSlot(null);
                                          setSlotDefaultDay(day);
                                          setSlotDefaultPeriodId(period.id);
                                          setDialogError(null);
                                          setSlotDialogOpen(true);
                                        }}
                                        className="flex h-full min-h-[78px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-2 text-[11px] font-medium text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-600 transition-colors cursor-pointer"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Assign Slot</span>
                                      </button>
                                    ) : (
                                      <div className="flex h-full min-h-[78px] items-center justify-center rounded-lg border border-slate-100 bg-slate-50/30 p-2 text-[11px] text-slate-400">
                                        Free Period
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Session-wide Class Timetables Overview & Unscheduled Teachers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card
                title="Session Class Timetables Overview"
                subtitle="Coverage and lifecycle status across all active classes in the selected academic session."
              >
                {classes.filter((c) => c.active).length === 0 ? (
                  <EmptyState
                    title="No Active School Classes"
                    description="Create school classes in Academic Management first."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="py-2.5 pr-3">Class &amp; Section</th>
                          <th className="px-3 py-2.5">Bell Config</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Slots</th>
                          <th className="pl-3 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classes
                          .filter((c) => c.active)
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .flatMap((cls) => {
                            const clsSections = sections
                              .filter(
                                (sec) => sec.classId === cls.id && sec.active
                              )
                              .sort((a, b) => a.name.localeCompare(b.name));
                            const clsTimetables = sessionTimetables.filter(
                              (t) =>
                                t.academicSessionId === selectedSessionId &&
                                t.classId === cls.id
                            );
                            const scopes =
                              clsSections.length > 0
                                ? clsSections.map((sec) => ({
                                    key: `${cls.id}-sec-${sec.id}`,
                                    section: sec as SectionResponse | null,
                                    ct:
                                      clsTimetables.find(
                                        (t) => t.sectionId === sec.id
                                      ) || null,
                                  }))
                                : [
                                    {
                                      key: `${cls.id}-cw`,
                                      section: null as SectionResponse | null,
                                      ct:
                                        clsTimetables.find(
                                          (t) => t.sectionId == null
                                        ) || null,
                                    },
                                  ];

                            return scopes.map(({ key, section, ct }) => {
                              const isSelected =
                                selectedClassId === cls.id &&
                                effectiveSectionId === (section?.id ?? null);

                              return (
                                <tr
                                  key={key}
                                  className={
                                    isSelected
                                      ? 'bg-indigo-50/40'
                                      : 'hover:bg-slate-50/60'
                                  }
                                >
                                  <td className="py-2.5 pr-3 font-semibold text-slate-900">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span>{cls.name}</span>
                                      <span className="font-normal text-slate-400">
                                        ({cls.code})
                                      </span>
                                      {section ? (
                                        <Badge variant="info">
                                          Sec {section.name}
                                        </Badge>
                                      ) : (
                                        <span className="text-[11px] font-normal text-slate-400">
                                          Class-wide
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                <td className="px-3 py-2.5 text-slate-600">
                                  {ct
                                    ? ct.timetableConfigName ||
                                      `Config #${ct.timetableConfigId}`
                                    : '—'}
                                </td>
                                <td className="px-3 py-2.5">
                                  {ct ? (
                                    <Badge
                                      variant={
                                        TIMETABLE_STATUS_META[ct.status].variant
                                      }
                                    >
                                      {TIMETABLE_STATUS_META[ct.status].label}{' '}
                                      (v{ct.revisionNumber})
                                    </Badge>
                                  ) : (
                                    <Badge variant="neutral">
                                      Not Initialized
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">
                                  {ct ? `${ct.slots?.length || 0} slots` : '0'}
                                </td>
                                  <td className="pl-3 py-2.5 text-right">
                                    {ct ? (
                                      <Button
                                        variant={
                                          isSelected ? 'secondary' : 'outline'
                                        }
                                        size="sm"
                                        onClick={() => {
                                          setSelectedClassId(cls.id);
                                          setSelectedSectionScope(
                                            section ? section.id : 'CLASS_WIDE'
                                          );
                                        }}
                                      >
                                        {isSelected ? 'Viewing' : 'Open Grid'}
                                      </Button>
                                    ) : canManageTimetable ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={
                                          <Plus className="h-3.5 w-3.5" />
                                        }
                                        onClick={() => {
                                          setSelectedClassId(cls.id);
                                          setSelectedSectionScope(
                                            section ? section.id : 'CLASS_WIDE'
                                          );
                                          setDialogError(null);
                                          setCreateTimetableDialogOpen(true);
                                        }}
                                      >
                                        Initialize
                                      </Button>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            <div>
              <Card
                title="Unscheduled Active Teachers"
                subtitle="Active teachers with zero scheduled periods in this session."
                actions={
                  <Badge
                    variant={
                      unscheduledTeachers.length === 0 ? 'success' : 'warning'
                    }
                  >
                    {unscheduledTeachers.length}
                  </Badge>
                }
              >
                {unscheduledTeachers.length === 0 ? (
                  <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3.5 text-xs text-emerald-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      All Active Teachers Scheduled
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Every active teacher in this organization has at least one
                      assigned period in the selected academic session.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {unscheduledTeachers.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">
                            {t.firstName} {t.lastName || ''}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {t.employeeId || `Teacher #${t.id}`}
                            {t.designation ? ` • ${t.designation}` : ''}
                          </div>
                        </div>
                        {!isRestrictedTeacherOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTeacherId(t.id);
                              setActiveTab('TEACHER_TIMETABLE');
                            }}
                          >
                            Schedule
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: TEACHER SCHEDULE VIEWER                                      */}
      {/* =================================================================== */}
      {activeTab === 'TEACHER_TIMETABLE' && (
        <div className="space-y-5">
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label
                  htmlFor="teacher-tt-session"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  Academic Session
                </label>
                <Select
                  id="teacher-tt-session"
                  value={selectedSessionId ? String(selectedSessionId) : ''}
                  onChange={(e) =>
                    setSelectedSessionId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">All Academic Sessions</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status}){' '}
                      {s.status === 'ACTIVE' ? '• Active' : ''}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label
                  htmlFor="teacher-tt-select"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  {isRestrictedTeacherOnly
                    ? 'Logged-in Teacher Profile'
                    : 'Select Teacher'}
                </label>
                <Select
                  id="teacher-tt-select"
                  value={selectedTeacherId ? String(selectedTeacherId) : ''}
                  disabled={isRestrictedTeacherOnly}
                  onChange={(e) =>
                    setSelectedTeacherId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">Select teacher...</option>
                  {teachers
                    .filter(
                      (t) =>
                        !isRestrictedTeacherOnly ||
                        (user?.id != null && t.userId === user.id)
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName || ''}{' '}
                        {t.employeeId ? `(${t.employeeId})` : ''} •{' '}
                        {t.employmentStatus}
                      </option>
                    ))}
                </Select>
              </div>

              <div>
                <label
                  htmlFor="teacher-tt-day"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  Day of Week Filter
                </label>
                <Select
                  id="teacher-tt-day"
                  value={teacherDayFilter}
                  onChange={(e) =>
                    setTeacherDayFilter(e.target.value as DayOfWeek | 'ALL')
                  }
                >
                  <option value="ALL">All Weekdays</option>
                  {ALL_DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.fullLabel}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {isRestrictedTeacherOnly && !selectedTeacherId ? (
            <Card>
              <EmptyState
                icon={<UserCheck className="h-6 w-6" />}
                title="Teacher Profile Not Linked to Your Account"
                description="Your user account does not yet have a linked teacher profile in this organization. Please ask a School Administrator to link your user account in Staff Management."
              />
            </Card>
          ) : isLoadingTeacherSlots ? (
            <Card>
              <LoadingState label="Loading teacher schedule..." />
            </Card>
          ) : teacherSlotsError ? (
            <Card>
              <ErrorState
                title="Unable to Load Teacher Schedule"
                message={teacherSlotsError}
                onRetry={loadTeacherSchedule}
              />
            </Card>
          ) : !selectedTeacherId ? (
            <Card>
              <EmptyState
                icon={<UserCheck className="h-6 w-6" />}
                title="Select a Teacher"
                description="Choose a teacher above to inspect their weekly teaching schedule across all classes."
              />
            </Card>
          ) : teacherSlots.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Calendar className="h-6 w-6" />}
                title="No Scheduled Teaching Slots Found"
                description="This teacher has no assigned timetable slots matching the selected session and day filter."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ALL_DAYS_OF_WEEK.map((dayMeta) => {
                const daySlots = teacherSlots
                  .filter((s) => s.dayOfWeek === dayMeta.value)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                if (daySlots.length === 0) return null;

                return (
                  <Card
                    key={dayMeta.value}
                    title={dayMeta.fullLabel}
                    subtitle={`${daySlots.length} scheduled teaching ${
                      daySlots.length === 1 ? 'period' : 'periods'
                    }`}
                    actions={<Badge variant="info">{daySlots.length}</Badge>}
                  >
                    <div className="space-y-2.5">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="rounded-lg border border-slate-200/90 bg-slate-50/70 p-3 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
                              <Clock className="h-3.5 w-3.5" />
                              {formatLocalTime(slot.startTime)} –{' '}
                              {formatLocalTime(slot.endTime)}
                            </span>
                            <Badge variant="neutral">
                              {slot.periodName ||
                                `Period #${slot.periodOrder ?? slot.periodId}`}
                            </Badge>
                          </div>

                          <div className="font-semibold text-slate-900">
                            {slot.subjectName || `Subject #${slot.subjectId}`}{' '}
                            {slot.subjectCode ? (
                              <span className="text-slate-500 font-normal">
                                ({slot.subjectCode})
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                            <span className="font-medium text-slate-800">
                              Class: {slot.className || `#${slot.classId}`}
                              {slot.sectionName
                                ? ` • Sec ${slot.sectionName}`
                                : ''}
                            </span>
                            {slot.room && (
                              <span className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                <MapPin className="h-2.5 w-2.5 text-slate-400" />
                                {slot.room}
                              </span>
                            )}
                          </div>

                          {slot.remarks && (
                            <p className="text-[11px] italic text-slate-500">
                              {slot.remarks}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: TIMETABLE CONFIGURATIONS & BELL SCHEDULES                    */}
      {/* =================================================================== */}
      {activeTab === 'CONFIGS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: List of Bell Configurations */}
          <div className="space-y-3">
            <Card
              title="Bell Schedule Configurations"
              subtitle="Reusable working day & school hour templates."
              actions={
                canManageTimetable ? (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setEditingConfig(null);
                      setDialogError(null);
                      setConfigDialogOpen(true);
                    }}
                  >
                    New
                  </Button>
                ) : undefined
              }
            >
              {configs.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-6 w-6" />}
                  title="No Configurations Created"
                  description="Create your school's first timetable configuration with working days and school hours."
                />
              ) : (
                <div className="space-y-2.5">
                  {configs.map((cfg) => {
                    const isSelected = selectedConfig?.id === cfg.id;
                    const teachingCount = (cfg.periods || []).filter(
                      (p) => p.periodType === 'TEACHING'
                    ).length;
                    const breakCount = (cfg.periods || []).length - teachingCount;

                    return (
                      <div
                        key={cfg.id}
                        onClick={() => setSelectedConfigId(cfg.id)}
                        className={`rounded-xl border p-3.5 text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/40 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-slate-900">
                            {cfg.name}
                          </div>
                          <Badge variant={cfg.active ? 'success' : 'neutral'}>
                            {cfg.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {formatLocalTime(cfg.dayStartTime)} –{' '}
                            {formatLocalTime(cfg.dayEndTime)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {sortWorkingDays(cfg.workingDays || []).map((d) => (
                            <span
                              key={d}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
                            >
                              {DAY_OF_WEEK_LABELS[d].shortLabel}
                            </span>
                          ))}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                          <span>
                            {teachingCount} teaching • {breakCount} breaks
                          </span>
                          {canManageTimetable && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConfig(cfg);
                                setDialogError(null);
                                setConfigDialogOpen(true);
                              }}
                              className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                            >
                              Edit Config
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right: Periods & Breaks Timeline for Selected Configuration */}
          <div className="lg:col-span-2">
            {!selectedConfig ? (
              <Card>
                <EmptyState
                  icon={<Clock className="h-6 w-6" />}
                  title="Select or Create a Bell Configuration"
                  description="Choose a configuration from the left panel to manage its chronological teaching periods and breaks."
                />
              </Card>
            ) : (
              <Card
                title={`${selectedConfig.name} — Periods & Breaks`}
                subtitle={`School Hours: ${formatLocalTime(
                  selectedConfig.dayStartTime
                )} – ${formatLocalTime(selectedConfig.dayEndTime)}${
                  selectedConfig.description
                    ? ` • ${selectedConfig.description}`
                    : ''
                }`}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <IdLabel>Config #{selectedConfig.id}</IdLabel>
                    {canManageTimetable && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setEditingPeriod(null);
                          setDialogError(null);
                          setPeriodDialogOpen(true);
                        }}
                      >
                        Add Period / Break
                      </Button>
                    )}
                  </div>
                }
              >
                {(selectedConfig.periods || []).length === 0 ? (
                  <EmptyState
                    icon={<Clock className="h-6 w-6" />}
                    title="No Periods Added Yet"
                    description="Add teaching periods, short breaks, lunch breaks, or morning assembly slots within the configured school hours."
                    action={
                      canManageTimetable ? (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Plus className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setEditingPeriod(null);
                            setDialogError(null);
                            setPeriodDialogOpen(true);
                          }}
                        >
                          Add First Period
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="py-2.5 pr-3">Order</th>
                          <th className="px-3 py-2.5">Period / Break Label</th>
                          <th className="px-3 py-2.5">Type</th>
                          <th className="px-3 py-2.5">Time Window</th>
                          <th className="px-3 py-2.5">Duration</th>
                          {canManageTimetable && (
                            <th className="pl-3 py-2.5 text-right">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...(selectedConfig.periods || [])]
                          .sort((a, b) => a.periodOrder - b.periodOrder)
                          .map((period) => {
                            const meta = PERIOD_TYPE_META[period.periodType];
                            const duration = getDurationMinutes(
                              period.startTime,
                              period.endTime
                            );

                            return (
                              <tr
                                key={period.id}
                                className={
                                  period.breakPeriod ||
                                  period.periodType !== 'TEACHING'
                                    ? 'bg-amber-50/30'
                                    : 'hover:bg-slate-50/60'
                                }
                              >
                                <td className="py-2.5 pr-3 font-semibold text-slate-500">
                                  #{period.periodOrder}
                                </td>
                                <td className="px-3 py-2.5 font-semibold text-slate-900">
                                  {period.name}
                                </td>
                                <td className="px-3 py-2.5">
                                  <Badge variant={meta.variant}>
                                    {meta.label}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2.5 font-medium text-slate-700">
                                  {formatLocalTime(period.startTime)} –{' '}
                                  {formatLocalTime(period.endTime)}
                                </td>
                                <td className="px-3 py-2.5 text-slate-500">
                                  {duration ? `${duration} mins` : '—'}
                                </td>
                                {canManageTimetable && (
                                  <td className="pl-3 py-2.5 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingPeriod(period);
                                        setDialogError(null);
                                        setPeriodDialogOpen(true);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DIALOGS                                                             */}
      {/* =================================================================== */}
      <TimetableConfigFormDialog
        open={configDialogOpen}
        onClose={() => {
          setConfigDialogOpen(false);
          setEditingConfig(null);
          setDialogError(null);
        }}
        editingConfig={editingConfig}
        hasPublishedDependents={
          editingConfig ? publishedConfigIds.has(editingConfig.id) : false
        }
        isSubmitting={isMutating}
        errorMessage={dialogError}
        onSubmit={handleSaveConfig}
      />

      <TimetablePeriodFormDialog
        open={periodDialogOpen}
        onClose={() => {
          setPeriodDialogOpen(false);
          setEditingPeriod(null);
          setDialogError(null);
        }}
        config={selectedConfig}
        editingPeriod={editingPeriod}
        hasPublishedDependents={
          selectedConfig ? publishedConfigIds.has(selectedConfig.id) : false
        }
        isSubmitting={isMutating}
        errorMessage={dialogError}
        onSubmit={handleSavePeriod}
      />

      <CreateClassTimetableDialog
        open={createTimetableDialogOpen}
        onClose={() => {
          setCreateTimetableDialogOpen(false);
          setDialogError(null);
        }}
        sessions={sessions}
        classes={classes}
        sections={sections}
        configs={configs}
        existingTimetables={sessionTimetables}
        defaultSessionId={selectedSessionId}
        defaultClassId={selectedClassId}
        defaultSectionId={effectiveSectionId}
        isSubmitting={isMutating}
        errorMessage={dialogError}
        onSubmit={handleCreateClassTimetable}
      />

      <TimetableSlotFormDialog
        open={slotDialogOpen}
        onClose={() => {
          setSlotDialogOpen(false);
          setEditingSlot(null);
          setDialogError(null);
        }}
        timetable={currentClassTimetable}
        config={currentTimetableConfig}
        editingSlot={editingSlot}
        defaultDayOfWeek={slotDefaultDay}
        defaultPeriodId={slotDefaultPeriodId}
        classSubjects={classSubjects}
        allSubjects={subjects}
        teacherAssignments={teacherAssignments}
        teachers={teachers}
        staffList={staffList}
        classSections={selectedClassSections}
        allSessionTimetables={sessionTimetables}
        isSubmitting={isMutating}
        errorMessage={dialogError}
        onSubmit={handleSaveSlot}
        onQuickCreateSubject={
          canManageTimetable ? handleQuickCreateSubject : undefined
        }
        onRequestDelete={(slot) => {
          setLifecycleAction('DELETE_SLOT');
          setLifecycleTargetSlot(slot);
          setDialogError(null);
          setLifecycleDialogOpen(true);
        }}
      />

      <TimetableLifecycleConfirmDialog
        open={lifecycleDialogOpen}
        onClose={() => {
          setLifecycleDialogOpen(false);
          setLifecycleAction(null);
          setLifecycleTargetSlot(null);
          setDialogError(null);
        }}
        action={lifecycleAction}
        timetable={currentClassTimetable}
        targetSlot={lifecycleTargetSlot}
        isSubmitting={isMutating}
        errorMessage={dialogError}
        onConfirm={handleConfirmLifecycle}
      />
      </div>
    </AppShell>
  );
};






