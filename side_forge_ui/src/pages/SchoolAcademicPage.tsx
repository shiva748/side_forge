import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  GraduationCap,
  Layers,
  Lock,
  PauseCircle,
  Play,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api-client';
import { academicManagementApi } from '../services/academicManagementApi';
import { classifyOrganizationAccessError } from '../types/auth';
import {
  AcademicSessionResponse,
  AcademicSessionStatus,
  AssignClassSubjectRequest,
  ClassSubjectResponse,
  CreateSchoolClassRequest,
  CreateSectionRequest,
  CreateSubjectRequest,
  getSessionStatusBadgeMeta,
  SchoolClassResponse,
  SectionResponse,
  SubjectResponse,
  UpdateSchoolClassRequest,
  UpdateSectionRequest,
  UpdateSubjectRequest,
} from '../types/academicManagement';
import { AppShell } from '../components/layout/AppShell';
import { formatOnboardingDate } from '../components/platform/OnboardingRequestDetailsModal';
import {
  AcademicSessionFormDialog,
  AcademicSessionLifecycleDialog,
  AssignClassSubjectDialog,
  DeactivateEntityDialog,
  RemoveClassSubjectDialog,
  SchoolClassFormDialog,
  SectionFormDialog,
  SubjectFormDialog,
} from '../components/school/AcademicManagementDialogs';
import { Badge, CounterLabel, IdLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { FormField, Input, Select } from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  LoadingState,
} from '../components/ui/StateViews';
import { TruncatedText } from '../components/ui/TruncatedText';

type AcademicTab = 'SESSIONS' | 'CLASSES' | 'SECTIONS' | 'SUBJECTS' | 'ASSIGNMENTS';

export const SchoolAcademicPage: React.FC = () => {
  const {
    activeOrganizationId,
    activeOrganization,
    activeOrganizationRestriction,
    isOrganizationSuspended,
    isOrganizationRestricted,
    revalidateOrganizationStatus,
    hasPermission,
    hasFeature,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const hasAcademicFeature = hasFeature('ACADEMIC_MANAGEMENT');

  const canViewSessions = hasAcademicFeature && hasPermission('academic_session.view');
  const canManageSessions =
    hasAcademicFeature && hasPermission('academic_session.manage');

  const canViewClasses = hasAcademicFeature && hasPermission('class.view');
  const canManageClasses = hasAcademicFeature && hasPermission('class.manage');

  const canViewSections = hasAcademicFeature && hasPermission('section.view');
  const canManageSections = hasAcademicFeature && hasPermission('section.manage');

  const canViewSubjects = hasAcademicFeature && hasPermission('subject.view');
  const canManageSubjects = hasAcademicFeature && hasPermission('subject.manage');

  const canViewClassSubjects =
    hasAcademicFeature && hasPermission('class_subject.view');
  const canManageClassSubjects =
    hasAcademicFeature && hasPermission('class_subject.manage');

  const availableTabs = useMemo<AcademicTab[]>(() => {
    const list: AcademicTab[] = [];
    if (canViewSessions || canManageSessions) list.push('SESSIONS');
    if (canViewClasses || canManageClasses) list.push('CLASSES');
    if (canViewSections || canManageSections) list.push('SECTIONS');
    if (canViewSubjects || canManageSubjects) list.push('SUBJECTS');
    if (canViewClassSubjects || canManageClassSubjects) list.push('ASSIGNMENTS');
    return list;
  }, [
    canManageClassSubjects,
    canManageClasses,
    canManageSections,
    canManageSessions,
    canManageSubjects,
    canViewClassSubjects,
    canViewClasses,
    canViewSections,
    canViewSessions,
    canViewSubjects,
  ]);

  const tabParam = searchParams.get('tab') as AcademicTab | null;
  const [activeTab, setActiveTab] = useState<AcademicTab>(() => {
    if (
      tabParam &&
      ['SESSIONS', 'CLASSES', 'SECTIONS', 'SUBJECTS', 'ASSIGNMENTS'].includes(tabParam)
    ) {
      return tabParam;
    }
    return 'SESSIONS';
  });

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [activeTab, availableTabs]);

  const handleSelectTab = (tab: AcademicTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const [sessions, setSessions] = useState<AcademicSessionResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionStatusFilter, setSessionStatusFilter] = useState<
    AcademicSessionStatus | ''
  >('');
  const [sessionSearch, setSessionSearch] = useState('');

  const [classStatusFilter, setClassStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [classSearch, setClassSearch] = useState('');
  const [classPage, setClassPage] = useState(0);

  const [subjectStatusFilter, setSubjectStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectPage, setSubjectPage] = useState(0);

  const pageSize = 10;

  const [selectedAssignmentSessionId, setSelectedAssignmentSessionId] = useState<
    number | null
  >(null);
  const [selectedAssignmentClassId, setSelectedAssignmentClassId] = useState<
    number | null
  >(null);
  const [classSubjects, setClassSubjects] = useState<ClassSubjectResponse[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState<boolean>(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [editingSession, setEditingSession] =
    useState<AcademicSessionResponse | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<{
    session: AcademicSessionResponse;
    action: 'START' | 'COMPLETE';
  } | null>(null);

  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClassResponse | null>(
    null
  );

  const [isSubjectFormOpen, setIsSubjectFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectResponse | null>(
    null
  );

  // Class Sections state (scoped to `selectedAssignmentSessionId`)
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState<boolean>(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sectionClassFilter, setSectionClassFilter] = useState<number | ''>('');
  const [sectionStatusFilter, setSectionStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [sectionSearch, setSectionSearch] = useState<string>('');
  const [sectionPage, setSectionPage] = useState<number>(0);
  const [isSectionFormOpen, setIsSectionFormOpen] = useState<boolean>(false);
  const [editingSection, setEditingSection] = useState<SectionResponse | null>(
    null
  );
  const [preselectedSectionClassId, setPreselectedSectionClassId] = useState<
    number | null
  >(null);
  const [expandedClassIds, setExpandedClassIds] = useState<Set<number>>(
    new Set()
  );

  const [deactivateTarget, setDeactivateTarget] = useState<{
    type: 'Class' | 'Subject' | 'Section';
    id: number;
    sessionId?: number;
    name: string;
    code: string;
  } | null>(null);

  const [isAssignSubjectOpen, setIsAssignSubjectOpen] = useState(false);
  const [removeAssignmentTarget, setRemoveAssignmentTarget] = useState<{
    subjectId: number;
    subjectName: string;
    subjectCode: string;
  } | null>(null);

  const [isMutating, setIsMutating] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAssignmentSessionId(null);
    setSelectedAssignmentClassId(null);
    setClassSubjects([]);
    setSections([]);
    setSectionClassFilter('');
    setSectionStatusFilter('ALL');
    setSectionSearch('');
    setSectionPage(0);
    setClassPage(0);
    setSubjectPage(0);
  }, [activeOrganizationId]);

  const loadAcademicData = useCallback(
    async (isManualRefresh = false) => {
      if (!activeOrganizationId) return;

      if (isOrganizationRestricted) {
        setSessions([]);
        setClasses([]);
        setSubjects([]);
        setClassSubjects([]);
        setIsSessionFormOpen(false);
        setLifecycleTarget(null);
        setIsClassFormOpen(false);
        setIsSubjectFormOpen(false);
        setDeactivateTarget(null);
        setIsAssignSubjectOpen(false);
        setRemoveAssignmentTarget(null);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        if (isManualRefresh) {
          await revalidateOrganizationStatus();
        }
        return;
      }

      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const tasks: Promise<void>[] = [];

        if (canViewSessions || canViewClassSubjects || canViewSections) {
          tasks.push(
            academicManagementApi
              .getSessions(activeOrganizationId)
              .then((res) => setSessions(res || []))
              .catch((err) => {
                if (err instanceof ApiError && err.status === 403) {
                  setSessions([]);
                  return;
                }
                throw err;
              })
          );
        } else {
          setSessions([]);
        }

        if (canViewClasses || canViewClassSubjects || canViewSections) {
          tasks.push(
            academicManagementApi
              .getClasses(activeOrganizationId)
              .then((res) => setClasses(res || []))
              .catch((err) => {
                if (err instanceof ApiError && err.status === 403) {
                  setClasses([]);
                  return;
                }
                throw err;
              })
          );
        } else {
          setClasses([]);
        }

        if (canViewSubjects || canViewClassSubjects) {
          tasks.push(
            academicManagementApi
              .getSubjects(activeOrganizationId)
              .then((res) => setSubjects(res || []))
              .catch((err) => {
                if (err instanceof ApiError && err.status === 403) {
                  setSubjects([]);
                  return;
                }
                throw err;
              })
          );
        } else {
          setSubjects([]);
        }

        await Promise.all(tasks);
      } catch (err) {
        const classified = classifyOrganizationAccessError(err);
        if (
          classified.kind === 'ORG_SUSPENDED' ||
          classified.kind === 'ORG_DEACTIVATED'
        ) {
          setError(null);
          return;
        }
        setError(classified.userMessage);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      activeOrganizationId,
      canViewClassSubjects,
      canViewClasses,
      canViewSections,
      canViewSessions,
      canViewSubjects,
      isOrganizationRestricted,
      revalidateOrganizationStatus,
    ]
  );

  useEffect(() => {
    void loadAcademicData(false);
  }, [loadAcademicData]);

  // Default assignment session (prefer ACTIVE, then PLANNED, then first) and class
  useEffect(() => {
    if (sessions.length === 0) {
      setSelectedAssignmentSessionId(null);
      return;
    }
    if (
      selectedAssignmentSessionId &&
      sessions.some((s) => s.id === selectedAssignmentSessionId)
    ) {
      return;
    }
    const activeSess = sessions.find((s) => s.status === 'ACTIVE');
    const plannedSess = sessions.find((s) => s.status === 'PLANNED');
    setSelectedAssignmentSessionId(
      activeSess?.id ?? plannedSess?.id ?? sessions[0].id
    );
  }, [selectedAssignmentSessionId, sessions]);

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedAssignmentClassId(null);
      return;
    }
    if (
      selectedAssignmentClassId &&
      classes.some((c) => c.id === selectedAssignmentClassId)
    ) {
      return;
    }
    const activeCls = classes.find((c) => c.active);
    setSelectedAssignmentClassId(activeCls?.id ?? classes[0].id);
  }, [classes, selectedAssignmentClassId]);

  const loadClassSubjects = useCallback(async () => {
    if (
      !activeOrganizationId ||
      !selectedAssignmentSessionId ||
      !selectedAssignmentClassId ||
      !canViewClassSubjects
    ) {
      setClassSubjects([]);
      return;
    }
    setIsLoadingAssignments(true);
    setAssignmentsError(null);
    try {
      const list = await academicManagementApi.getClassSubjects(
        activeOrganizationId,
        selectedAssignmentSessionId,
        selectedAssignmentClassId
      );
      setClassSubjects(list || []);
    } catch (err) {
      setAssignmentsError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load class-subject assignments.'
      );
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [
    activeOrganizationId,
    canViewClassSubjects,
    selectedAssignmentClassId,
    selectedAssignmentSessionId,
  ]);

  useEffect(() => {
    if (activeTab === 'ASSIGNMENTS') {
      void loadClassSubjects();
    }
  }, [activeTab, loadClassSubjects]);

  // Clear stale section data immediately when the selected academic session changes
  useEffect(() => {
    setSections([]);
    setSectionPage(0);
  }, [selectedAssignmentSessionId]);

  const loadSections = useCallback(async () => {
    if (
      !activeOrganizationId ||
      !selectedAssignmentSessionId ||
      (!canViewSections && !canManageSections)
    ) {
      setSections([]);
      return;
    }
    setIsLoadingSections(true);
    setSectionsError(null);
    const requestSessionId = selectedAssignmentSessionId;
    try {
      const list = await academicManagementApi.getSections(
        activeOrganizationId,
        requestSessionId
      );
      setSections((prev) =>
        requestSessionId === selectedAssignmentSessionId ? list || [] : prev
      );
    } catch (err) {
      setSectionsError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load class sections for the selected academic session.'
      );
    } finally {
      setIsLoadingSections(false);
    }
  }, [
    activeOrganizationId,
    canManageSections,
    canViewSections,
    selectedAssignmentSessionId,
  ]);

  useEffect(() => {
    if (activeTab === 'SECTIONS' || activeTab === 'CLASSES') {
      void loadSections();
    }
  }, [activeTab, loadSections]);

  // Expand all classes that have sections by default when classes/sections load
  useEffect(() => {
    if (classes.length === 0) return;
    setExpandedClassIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set(classes.map((c) => c.id));
    });
  }, [classes]);

  const handleSaveSession = async (name: string) => {
    if (!activeOrganizationId) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      if (editingSession) {
        const updated = await academicManagementApi.updateSession(
          activeOrganizationId,
          editingSession.id,
          { name }
        );
        toast.success(
          'Academic session updated',
          `Renamed academic session to "${updated.name}".`
        );
      } else {
        const created = await academicManagementApi.createSession(
          activeOrganizationId,
          { name }
        );
        toast.success(
          'Academic session created',
          `Session "${created.name}" created in PLANNED status.`
        );
      }
      setIsSessionFormOpen(false);
      setEditingSession(null);
      await loadAcademicData(true);
    } catch (err) {
      setDialogError(classifyOrganizationAccessError(err).userMessage);
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmSessionLifecycle = async () => {
    if (!activeOrganizationId || !lifecycleTarget) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      const { session, action } = lifecycleTarget;
      if (action === 'START') {
        const started = await academicManagementApi.startSession(
          activeOrganizationId,
          session.id
        );
        toast.success(
          'Academic session activated',
          `"${started.name}" is now the active academic session.`
        );
      } else {
        const completed = await academicManagementApi.completeSession(
          activeOrganizationId,
          session.id
        );
        toast.success(
          'Academic session completed',
          `"${completed.name}" has been marked as COMPLETED.`
        );
      }
      setLifecycleTarget(null);
      await loadAcademicData(true);
    } catch (err) {
      setDialogError(classifyOrganizationAccessError(err).userMessage);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveClass = async (
    payload: CreateSchoolClassRequest | UpdateSchoolClassRequest
  ) => {
    if (!activeOrganizationId) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      if (editingClass) {
        const updated = await academicManagementApi.updateClass(
          activeOrganizationId,
          editingClass.id,
          payload
        );
        toast.success(
          'School class updated',
          `Updated class "${updated.name}" (${updated.code}).`
        );
      } else {
        const created = await academicManagementApi.createClass(
          activeOrganizationId,
          payload
        );
        toast.success(
          'School class created',
          `Created class "${created.name}" (${created.code}).`
        );
      }
      setIsClassFormOpen(false);
      setEditingClass(null);
      await loadAcademicData(true);
    } catch (err) {
      setDialogError(classifyOrganizationAccessError(err).userMessage);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveSubject = async (
    payload: CreateSubjectRequest | UpdateSubjectRequest
  ) => {
    if (!activeOrganizationId) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      if (editingSubject) {
        const updated = await academicManagementApi.updateSubject(
          activeOrganizationId,
          editingSubject.id,
          payload
        );
        toast.success(
          'Subject updated',
          `Updated subject "${updated.name}" (${updated.code}).`
        );
      } else {
        const created = await academicManagementApi.createSubject(
          activeOrganizationId,
          payload
        );
        toast.success(
          'Subject created',
          `Created subject "${created.name}" (${created.code}).`
        );
      }
      setIsSubjectFormOpen(false);
      setEditingSubject(null);
      await loadAcademicData(true);
    } catch (err) {
      setDialogError(classifyOrganizationAccessError(err).userMessage);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveSection = async (
    payload: CreateSectionRequest | UpdateSectionRequest
  ) => {
    if (!activeOrganizationId || !selectedAssignmentSessionId) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      if (editingSection) {
        const updated = await academicManagementApi.updateSection(
          activeOrganizationId,
          selectedAssignmentSessionId,
          editingSection.id,
          payload
        );
        toast.success(
          'Class section updated',
          `Section "${updated.name}" updated successfully.`
        );
      } else {
        const created = await academicManagementApi.createSection(
          activeOrganizationId,
          selectedAssignmentSessionId,
          payload
        );
        toast.success(
          'Class section created',
          `Section "${created.name}" created in ${
            selectedAssignmentSession?.name || 'selected session'
          }.`
        );
      }
      setExpandedClassIds((prev) => {
        const next = new Set(prev);
        next.add(payload.classId);
        return next;
      });
      setIsSectionFormOpen(false);
      setEditingSection(null);
      setPreselectedSectionClassId(null);
      await loadSections();
    } catch (err) {
      setDialogError(classifyOrganizationAccessError(err).userMessage);
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!activeOrganizationId || !deactivateTarget) return;
    setIsMutating(true);
    setDialogError(null);
    try {
      if (deactivateTarget.type === 'Class') {
        await academicManagementApi.deactivateClass(
          activeOrganizationId,
          deactivateTarget.id
        );
        toast.info(
          'Class deactivated',
          `"${deactivateTarget.name}" (${deactivateTarget.code}) is now inactive.`
        );
      } else if (deactivateTarget.type === 'Subject') {
        await academicManagementApi.deactivateSubject(
          activeOrganizationId,
          deactivateTarget.id
        );
        toast.info(
          'Subject deactivated',
          `"${deactivateTarget.name}" (${deactivateTarget.code}) is now inactive.`
        );
      } else if (deactivateTarget.type === 'Section') {
        const targetSessId =
          deactivateTarget.sessionId || selectedAssignmentSessionId;
        if (!targetSessId) return;
        await academicManagementApi.deactivateSection(
          activeOrganizationId,
          targetSessId,
          deactivateTarget.id
        );
        toast.info(
          'Section deactivated',
          `Section "${deactivateTarget.name}" (${deactivateTarget.code}) is now inactive.`
        );
        setDeactivateTarget(null);
        await loadSections();
        return;
      }
      setDeactivateTarget(null);
      await loadAcademicData(true);
    } catch (err) {
      setDialogError(classifyOrganizationAccessError(err).userMessage);
    } finally {
      setIsMutating(false);
    }
  };

  const handleAssignSubjectToClass = async (
    payload: AssignClassSubjectRequest
  ) => {
    if (
      !activeOrganizationId ||
      !selectedAssignmentSessionId ||
      !selectedAssignmentClassId
    ) {
      return;
    }
    setIsMutating(true);
    setDialogError(null);
    try {
      await academicManagementApi.assignSubjectToClass(
        activeOrganizationId,
        selectedAssignmentSessionId,
        selectedAssignmentClassId,
        payload
      );
      toast.success(
        'Subject assigned to class',
        'Class-subject assignment has been saved for the selected academic session.'
      );
      setIsAssignSubjectOpen(false);
      await loadClassSubjects();
    } catch (err) {
      setDialogError(classifyOrganizationAccessError(err).userMessage);
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmRemoveAssignment = async () => {
    if (
      !activeOrganizationId ||
      !selectedAssignmentSessionId ||
      !selectedAssignmentClassId ||
      !removeAssignmentTarget
    ) {
      return;
    }
    setIsMutating(true);
    setDialogError(null);
    try {
      await academicManagementApi.removeSubjectFromClass(
        activeOrganizationId,
        selectedAssignmentSessionId,
        selectedAssignmentClassId,
        removeAssignmentTarget.subjectId
      );
      toast.info(
        'Subject removed from class',
        `Removed "${removeAssignmentTarget.subjectName}" from the class.`
      );
      setRemoveAssignmentTarget(null);
      await loadClassSubjects();
    } catch (err) {
      setDialogError(classifyOrganizationAccessError(err).userMessage);
    } finally {
      setIsMutating(false);
    }
  };

  const activeSession = useMemo(
    () => sessions.find((s) => s.status === 'ACTIVE') || null,
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const q = sessionSearch.trim().toLowerCase();
    return sessions.filter((s) => {
      if (sessionStatusFilter && s.status !== sessionStatusFilter) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sessionSearch, sessionStatusFilter, sessions]);

  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    return classes.filter((c) => {
      if (classStatusFilter === 'ACTIVE' && !c.active) return false;
      if (classStatusFilter === 'INACTIVE' && c.active) return false;
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !c.code.toLowerCase().includes(q) &&
        !(c.description || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [classSearch, classStatusFilter, classes]);

  const pagedClasses = useMemo(() => {
    const start = classPage * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [classPage, filteredClasses]);

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    return subjects.filter((s) => {
      if (subjectStatusFilter === 'ACTIVE' && !s.active) return false;
      if (subjectStatusFilter === 'INACTIVE' && s.active) return false;
      if (
        q &&
        !s.name.toLowerCase().includes(q) &&
        !s.code.toLowerCase().includes(q) &&
        !(s.description || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [subjectSearch, subjectStatusFilter, subjects]);

  const pagedSubjects = useMemo(() => {
    const start = subjectPage * pageSize;
    return filteredSubjects.slice(start, start + pageSize);
  }, [filteredSubjects, subjectPage]);

  const subjectById = useMemo(() => {
    const map = new Map<number, SubjectResponse>();
    for (const s of subjects) {
      map.set(s.id, s);
    }
    return map;
  }, [subjects]);

  const classById = useMemo(() => {
    const map = new Map<number, SchoolClassResponse>();
    for (const c of classes) {
      map.set(c.id, c);
    }
    return map;
  }, [classes]);

  const sectionsByClassId = useMemo(() => {
    const map = new Map<number, SectionResponse[]>();
    for (const sec of sections) {
      const list = map.get(sec.classId) || [];
      list.push(sec);
      map.set(sec.classId, list);
    }
    for (const [cid, list] of map.entries()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
      map.set(cid, list);
    }
    return map;
  }, [sections]);

  const toggleExpandClass = useCallback((classId: number) => {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  }, []);

  const expandAllClasses = useCallback(() => {
    setExpandedClassIds(new Set(classes.map((c) => c.id)));
  }, [classes]);

  const collapseAllClasses = useCallback(() => {
    setExpandedClassIds(new Set());
  }, []);

  const hierarchyClasses = useMemo(() => {
    const q = sectionSearch.trim().toLowerCase();
    return [...classes]
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
      .filter((cls) => {
        if (sectionClassFilter && cls.id !== Number(sectionClassFilter)) {
          return false;
        }
        const clsSections = sectionsByClassId.get(cls.id) || [];
        const matchingSections = clsSections.filter((sec) => {
          if (sectionStatusFilter === 'ACTIVE' && !sec.active) return false;
          if (sectionStatusFilter === 'INACTIVE' && sec.active) return false;
          if (q && !sec.name.toLowerCase().includes(q)) return false;
          return true;
        });
        if (!q && sectionStatusFilter === 'ALL') return true;
        const classMatchesQuery =
          !q ||
          cls.name.toLowerCase().includes(q) ||
          cls.code.toLowerCase().includes(q);
        if (sectionStatusFilter !== 'ALL') {
          return matchingSections.length > 0 || (classMatchesQuery && clsSections.length === 0);
        }
        return classMatchesQuery || matchingSections.length > 0;
      });
  }, [
    classes,
    sectionClassFilter,
    sectionSearch,
    sectionStatusFilter,
    sectionsByClassId,
  ]);

  const filteredSections = useMemo(() => {
    const q = sectionSearch.trim().toLowerCase();
    return sections.filter((sec) => {
      if (!q) return true;
      const cls = classById.get(sec.classId);
      const matchesName = sec.name.toLowerCase().includes(q);
      const matchesClass =
        (cls?.name || '').toLowerCase().includes(q) ||
        (cls?.code || '').toLowerCase().includes(q);
      return matchesName || matchesClass;
    });
  }, [classById, sectionSearch, sections]);

  const pagedSections = useMemo(() => {
    const start = sectionPage * pageSize;
    return filteredSections.slice(start, start + pageSize);
  }, [filteredSections, sectionPage]);

  const selectedAssignmentSession = useMemo(
    () => sessions.find((s) => s.id === selectedAssignmentSessionId) || null,
    [selectedAssignmentSessionId, sessions]
  );

  const selectedAssignmentClass = useMemo(
    () => classes.find((c) => c.id === selectedAssignmentClassId) || null,
    [classes, selectedAssignmentClassId]
  );

  const availableSubjectsForAssignment = useMemo(() => {
    const assignedIds = new Set(classSubjects.map((cs) => cs.subjectId));
    return subjects.filter((s) => s.active && !assignedIds.has(s.id));
  }, [classSubjects, subjects]);

  const sessionColumns: DataTableColumn<AcademicSessionResponse>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Academic Session',
        render: (row) => (
          <div className="flex items-center gap-2 flex-wrap min-w-[180px]">
            <TruncatedText
              text={row.name}
              maxWidthClass="max-w-[200px]"
              className="font-semibold text-slate-900"
            />
            {row.status === 'ACTIVE' && (
              <Badge variant="primary">Current Active</Badge>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Lifecycle Status',
        render: (row) => {
          const meta = getSessionStatusBadgeMeta(row.status);
          return (
            <Badge variant={meta.variant} dot>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        key: 'dates',
        header: 'Start / End Date',
        render: (row) => (
          <div className="space-y-0.5 text-xs min-w-[165px]">
            <div className="text-slate-700">
              <span className="text-slate-400">Start:</span>{' '}
              <span className="font-medium">{row.startDate || 'Not started'}</span>
            </div>
            <div className="text-slate-600">
              <span className="text-slate-400">End:</span>{' '}
              <span>{row.endDate || '—'}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created / Updated',
        render: (row) => (
          <div className="space-y-0.5 text-xs text-slate-500 whitespace-nowrap">
            <div>Created {formatOnboardingDate(row.createdAt)}</div>
            <div className="text-[11px] text-slate-400">
              Updated {formatOnboardingDate(row.updatedAt)}
            </div>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => {
          const isCompleted = row.status === 'COMPLETED';
          const isPlanned = row.status === 'PLANNED';
          const isActive = row.status === 'ACTIVE';
          const blockedByAnotherActive =
            isPlanned && activeSession != null && activeSession.id !== row.id;

          return (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              {(canViewClassSubjects || canManageClassSubjects) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAssignmentSessionId(row.id);
                    handleSelectTab('ASSIGNMENTS');
                  }}
                  leftIcon={<Layers className="w-3.5 h-3.5" />}
                >
                  {isCompleted ? 'View Subjects' : 'Class Subjects'}
                </Button>
              )}

              {canManageSessions && !isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSession(row);
                    setDialogError(null);
                    setIsSessionFormOpen(true);
                  }}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
              )}

              {canManageSessions && isPlanned && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={blockedByAnotherActive}
                  title={
                    blockedByAnotherActive
                      ? `Complete the current active session (${activeSession?.name}) before activating this session.`
                      : 'Activate this planned academic session'
                  }
                  onClick={() => {
                    setDialogError(null);
                    setLifecycleTarget({ session: row, action: 'START' });
                  }}
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                >
                  Activate
                </Button>
              )}

              {canManageSessions && isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDialogError(null);
                    setLifecycleTarget({ session: row, action: 'COMPLETE' });
                  }}
                  className="text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Complete
                </Button>
              )}

              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 px-2 py-1">
                  <Lock className="w-3 h-3" />
                  <span>Locked</span>
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [
      activeSession,
      canManageClassSubjects,
      canManageSessions,
      canViewClassSubjects,
    ]
  );

  const classColumns: DataTableColumn<SchoolClassResponse>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Class Name & Code',
        render: (row) => (
          <div className="flex items-center gap-2 flex-wrap min-w-[180px]">
            <TruncatedText
              text={row.name}
              maxWidthClass="max-w-[180px]"
              className="font-semibold text-slate-900"
            />
            <IdLabel>{row.code}</IdLabel>
          </div>
        ),
      },
      {
        key: 'displayOrder',
        header: 'Order & Sections',
        render: (row) => {
          const clsSections = sectionsByClassId.get(row.id) || [];
          const activeSecCount = clsSections.filter((s) => s.active).length;
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <CounterLabel count={`#${row.displayOrder}`} />
              <button
                type="button"
                onClick={() => {
                  setExpandedClassIds((prev) => new Set(prev).add(row.id));
                  handleSelectTab('SECTIONS');
                }}
                className="inline-flex items-center gap-1 rounded-md border border-indigo-200/80 bg-indigo-50/70 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100/80 cursor-pointer"
                title="View sections under this class in the hierarchy"
              >
                <Layers className="w-3 h-3" />
                <span>
                  {clsSections.length}{' '}
                  {clsSections.length === 1 ? 'section' : 'sections'}
                </span>
                {clsSections.length > 0 &&
                  activeSecCount !== clsSections.length && (
                    <span className="text-[10px] text-indigo-500">
                      ({activeSecCount} active)
                    </span>
                  )}
              </button>
            </div>
          );
        },
      },
      {
        key: 'description',
        header: 'Description',
        render: (row) =>
          row.description ? (
            <TruncatedText
              text={row.description}
              maxWidthClass="max-w-[260px]"
              className="text-xs text-slate-600"
            />
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant={row.active ? 'success' : 'neutral'} dot>
            {row.active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        render: (row) => (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {formatOnboardingDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            {canManageSections &&
              row.active &&
              selectedAssignmentSession &&
              selectedAssignmentSession.status !== 'COMPLETED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSection(null);
                    setPreselectedSectionClassId(row.id);
                    setDialogError(null);
                    setIsSectionFormOpen(true);
                  }}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Section
                </Button>
              )}
            {(canViewClassSubjects || canManageClassSubjects) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedAssignmentClassId(row.id);
                  handleSelectTab('ASSIGNMENTS');
                }}
                leftIcon={<Layers className="w-3.5 h-3.5" />}
              >
                Subjects
              </Button>
            )}
            {canManageClasses && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingClass(row);
                    setDialogError(null);
                    setIsClassFormOpen(true);
                  }}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
                {row.active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDialogError(null);
                      setDeactivateTarget({
                        type: 'Class',
                        id: row.id,
                        name: row.name,
                        code: row.code,
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
    [
      canManageClassSubjects,
      canManageClasses,
      canManageSections,
      canViewClassSubjects,
      selectedAssignmentSession,
      sectionsByClassId,
    ]
  );

  const subjectColumns: DataTableColumn<SubjectResponse>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Subject Name & Code',
        render: (row) => (
          <div className="flex items-center gap-2 flex-wrap min-w-[180px]">
            <TruncatedText
              text={row.name}
              maxWidthClass="max-w-[200px]"
              className="font-semibold text-slate-900"
            />
            <IdLabel>{row.code}</IdLabel>
          </div>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        render: (row) =>
          row.description ? (
            <TruncatedText
              text={row.description}
              maxWidthClass="max-w-[300px]"
              className="text-xs text-slate-600"
            />
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant={row.active ? 'success' : 'neutral'} dot>
            {row.active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        render: (row) => (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {formatOnboardingDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            {canManageSubjects && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSubject(row);
                    setDialogError(null);
                    setIsSubjectFormOpen(true);
                  }}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
                {row.active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDialogError(null);
                      setDeactivateTarget({
                        type: 'Subject',
                        id: row.id,
                        name: row.name,
                        code: row.code,
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
    [canManageSubjects]
  );

  const assignmentColumns: DataTableColumn<ClassSubjectResponse>[] = useMemo(
    () => [
      {
        key: 'subject',
        header: 'Assigned Subject',
        render: (row) => {
          const sub = subjectById.get(row.subjectId);
          return (
            <div className="flex items-center gap-2 flex-wrap min-w-[180px]">
              <TruncatedText
                text={sub?.name || `Subject #${row.subjectId}`}
                maxWidthClass="max-w-[200px]"
                className="font-semibold text-slate-900"
              />
              {sub?.code && <IdLabel>{sub.code}</IdLabel>}
              {sub && !sub.active && (
                <Badge variant="neutral">Subject Inactive</Badge>
              )}
            </div>
          );
        },
      },
      {
        key: 'compulsory',
        header: 'Curriculum Type',
        render: (row) => (
          <Badge variant={row.compulsory ? 'primary' : 'info'}>
            {row.compulsory ? 'Compulsory' : 'Optional / Elective'}
          </Badge>
        ),
      },
      {
        key: 'displayOrder',
        header: 'Order',
        render: (row) => <CounterLabel count={`#${row.displayOrder}`} />,
      },
      {
        key: 'createdAt',
        header: 'Assigned On',
        render: (row) => (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {formatOnboardingDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => {
          const isSessionCompleted =
            selectedAssignmentSession?.status === 'COMPLETED';
          if (!canManageClassSubjects) return null;
          if (isSessionCompleted) {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Lock className="w-3 h-3" />
                <span>Session Completed</span>
              </span>
            );
          }
          const sub = subjectById.get(row.subjectId);
          return (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDialogError(null);
                  setRemoveAssignmentTarget({
                    subjectId: row.subjectId,
                    subjectName: sub?.name || `Subject #${row.subjectId}`,
                    subjectCode: sub?.code || `#${row.subjectId}`,
                  });
                }}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Remove
              </Button>
            </div>
          );
        },
      },
    ],
    [canManageClassSubjects, selectedAssignmentSession, subjectById]
  );

  const sectionColumns: DataTableColumn<SectionResponse>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Section',
        render: (row) => (
          <div className="flex items-center gap-2 flex-wrap min-w-[140px]">
            <span className="font-bold text-slate-900 text-sm">
              Section {row.name}
            </span>
            <IdLabel>#SEC-{row.id}</IdLabel>
          </div>
        ),
      },
      {
        key: 'class',
        header: 'Associated Class',
        render: (row) => {
          const cls = classById.get(row.classId);
          return (
            <div className="flex items-center gap-2 flex-wrap min-w-[160px]">
              <span className="font-semibold text-slate-900">
                {cls?.name || `Class #${row.classId}`}
              </span>
              {cls?.code && <IdLabel>{cls.code}</IdLabel>}
              {cls && !cls.active && (
                <Badge variant="neutral">Class Inactive</Badge>
              )}
            </div>
          );
        },
      },
      {
        key: 'session',
        header: 'Academic Session',
        render: () => {
          const meta = selectedAssignmentSession
            ? getSessionStatusBadgeMeta(selectedAssignmentSession.status)
            : null;
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-800">
                {selectedAssignmentSession?.name || '—'}
              </span>
              {meta && <Badge variant={meta.variant}>{meta.label}</Badge>}
            </div>
          );
        },
      },
      {
        key: 'capacity',
        header: 'Seating Capacity',
        render: (row) =>
          row.capacity !== null && row.capacity !== undefined ? (
            <span className="font-mono text-xs font-semibold text-slate-800">
              {row.capacity.toLocaleString('en-IN')} students
            </span>
          ) : (
            <span className="text-xs text-slate-400">Unspecified</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant={row.active ? 'success' : 'neutral'} dot>
            {row.active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'updatedAt',
        header: 'Updated On',
        render: (row) => (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {formatOnboardingDate(row.updatedAt || row.createdAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => {
          if (!canManageSections) return null;
          const isSessionCompleted =
            selectedAssignmentSession?.status === 'COMPLETED';
          if (isSessionCompleted) {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Lock className="w-3 h-3" />
                <span>Session Completed</span>
              </span>
            );
          }
          const cls = classById.get(row.classId);
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSection(row);
                  setDialogError(null);
                  setIsSectionFormOpen(true);
                }}
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>
              {row.active && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDialogError(null);
                    setDeactivateTarget({
                      type: 'Section',
                      id: row.id,
                      sessionId: row.academicSessionId,
                      name: `${cls?.name || `Class #${row.classId}`} — Section ${row.name}`,
                      code: `SEC-${row.id}`,
                    });
                  }}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  leftIcon={<PowerOff className="w-3.5 h-3.5" />}
                >
                  Deactivate
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [canManageSections, classById, selectedAssignmentSession]
  );

  const totalClassPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const totalSubjectPages = Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  const totalSectionPages = Math.max(1, Math.ceil(filteredSections.length / pageSize));

  if (isOrganizationSuspended) {
    return (
      <AppShell
        pageTitle="Academic Management"
        breadcrumbParent={
          activeOrganization?.organizationName || 'School Administration'
        }
      >
        <div className="space-y-6">
          <PageHeader
            eyebrow={
              activeOrganization?.organizationName
                ? `${activeOrganization.organizationName} • Academic Configuration`
                : 'School Administration'
            }
            title="Academic Management"
            description="Configure academic sessions, reusable school classes, subjects, and session-specific class-subject assignments."
            badge={
              <Badge variant="warning" dot>
                Organization Suspended — Module Restricted
              </Badge>
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/app')}
                >
                  Subscription &amp; Status Overview
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isRefreshing}
                  onClick={() => void loadAcademicData(true)}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Check Status / Revalidate
                </Button>
              </div>
            }
          />

          <div className="rounded-2xl border border-amber-200/90 bg-white p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300/80 text-amber-800 flex items-center justify-center shrink-0">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Academic Management Unavailable During Organization Suspension
                  </h2>
                  <Badge variant="warning" dot>
                    Suspended
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <strong>
                    {activeOrganization?.organizationName || 'Your school organization'}
                  </strong>{' '}
                  has been suspended by a Platform Administrator. Creating, viewing, or
                  modifying academic sessions, classes, subjects, and class-subject
                  assignments is temporarily restricted by backend security until the
                  organization is reactivated.
                </p>
                {activeOrganizationRestriction?.reason && (
                  <p className="text-xs text-amber-900 font-medium pt-1">
                    Suspension Reason: {activeOrganizationRestriction.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!hasAcademicFeature) {
    return (
      <AppShell
        pageTitle="Academic Management"
        breadcrumbParent={
          activeOrganization?.organizationName || 'School Administration'
        }
      >
        <InlineAlert
          variant="warning"
          title="Academic Management Module Not Enabled"
        >
          Your organization&apos;s current subscription plan does not include the{' '}
          <span className="font-mono font-semibold">ACADEMIC_MANAGEMENT</span> feature
          entitlement.
        </InlineAlert>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle="Academic Management"
      breadcrumbParent={
        activeOrganization?.organizationName || 'School Administration'
      }
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow={
            activeOrganization?.organizationName
              ? `${activeOrganization.organizationName} • Academic Configuration`
              : 'School Administration'
          }
          title="Academic Management"
          description="Configure academic sessions, reusable school classes, subjects, and session-specific class-subject assignments."
          badge={
            activeSession ? (
              <Badge variant="success" dot>
                Active Session: {activeSession.name}
              </Badge>
            ) : (
              <Badge variant="neutral">No Active Session</Badge>
            )
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'SESSIONS' && canManageSessions && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingSession(null);
                    setDialogError(null);
                    setIsSessionFormOpen(true);
                  }}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  New Session
                </Button>
              )}
              {activeTab === 'CLASSES' && canManageClasses && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingClass(null);
                    setDialogError(null);
                    setIsClassFormOpen(true);
                  }}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  New Class
                </Button>
              )}
              {activeTab === 'SECTIONS' &&
                canManageSections &&
                selectedAssignmentSession &&
                selectedAssignmentSession.status !== 'COMPLETED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingSection(null);
                      setDialogError(null);
                      setIsSectionFormOpen(true);
                    }}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    New Section
                  </Button>
                )}
              {activeTab === 'SUBJECTS' && canManageSubjects && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingSubject(null);
                    setDialogError(null);
                    setIsSubjectFormOpen(true);
                  }}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  New Subject
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                isLoading={isRefreshing}
                onClick={() => {
                  void loadAcademicData(true);
                  if (activeTab === 'ASSIGNMENTS') {
                    void loadClassSubjects();
                  }
                  if (activeTab === 'SECTIONS') {
                    void loadSections();
                  }
                }}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {/* Module Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200/80 pb-3">
          {(canViewSessions || canManageSessions) && (
            <button
              type="button"
              onClick={() => handleSelectTab('SESSIONS')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'SESSIONS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Academic Sessions</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                  activeTab === 'SESSIONS'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {sessions.length}
              </span>
            </button>
          )}

          {(canViewClasses || canManageClasses) && (
            <button
              type="button"
              onClick={() => handleSelectTab('CLASSES')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'CLASSES'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Classes</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                  activeTab === 'CLASSES'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {classes.length}
              </span>
            </button>
          )}

          {(canViewSections || canManageSections) && (
            <button
              type="button"
              onClick={() => handleSelectTab('SECTIONS')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'SECTIONS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Class Sections</span>
              {activeTab === 'SECTIONS' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] tabular-nums bg-indigo-500 text-white">
                  {sections.length}
                </span>
              )}
            </button>
          )}

          {(canViewSubjects || canManageSubjects) && (
            <button
              type="button"
              onClick={() => handleSelectTab('SUBJECTS')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'SUBJECTS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Subjects</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
                  activeTab === 'SUBJECTS'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {subjects.length}
              </span>
            </button>
          )}

          {(canViewClassSubjects || canManageClassSubjects) && (
            <button
              type="button"
              onClick={() => handleSelectTab('ASSIGNMENTS')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'ASSIGNMENTS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Class-Subject Assignments</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <LoadingState label="Loading academic configuration..." />
        ) : error ? (
          <ErrorState
            title="Unable to load academic configuration"
            message={error}
            onRetry={() => void loadAcademicData(true)}
          />
        ) : (
          <>
            {/* TAB 1: ACADEMIC SESSIONS */}
            {activeTab === 'SESSIONS' && (
              <div className="space-y-4">
                {activeSession ? (
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">
                            {activeSession.name}
                          </span>
                          <Badge variant="success" dot>
                            Active Session
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          Started on{' '}
                          <strong className="font-semibold">
                            {activeSession.startDate || '—'}
                          </strong>
                          . You can create and prepare upcoming{' '}
                          <strong className="font-semibold">PLANNED</strong> sessions at any time
                          without interrupting this active session.
                        </p>
                      </div>
                    </div>
                    {canManageSessions && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDialogError(null);
                          setLifecycleTarget({
                            session: activeSession,
                            action: 'COMPLETE',
                          });
                        }}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Complete Active Session
                      </Button>
                    )}
                  </div>
                ) : (
                  <InlineAlert
                    variant="info"
                    title="No Active Academic Session"
                  >
                    There is currently no active academic session. Create a new planned session or
                    activate an existing planned session to start daily academic operations.
                  </InlineAlert>
                )}

                {/* Search & Status Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 max-w-md">
                    <Input
                      placeholder="Search sessions by name..."
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      leftIcon={<Search className="w-4 h-4" />}
                      rightElement={
                        sessionSearch ? (
                          <button
                            type="button"
                            onClick={() => setSessionSearch('')}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            aria-label="Clear session search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : null
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <Select
                      aria-label="Filter by session status"
                      value={sessionStatusFilter}
                      onChange={(e) =>
                        setSessionStatusFilter(
                          e.target.value as AcademicSessionStatus | ''
                        )
                      }
                      className="w-44 h-9 text-xs"
                    >
                      <option value="">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PLANNED">Planned</option>
                      <option value="COMPLETED">Completed</option>
                    </Select>
                  </div>
                </div>

                <DataTable
                  columns={sessionColumns}
                  data={filteredSessions}
                  rowKey={(row) => row.id}
                  emptyTitle="No academic sessions found"
                  emptyDescription="Create an academic session (e.g., 2026-2027) to begin configuring your school year."
                />
              </div>
            )}

            {/* TAB 2: CLASSES */}
            {activeTab === 'CLASSES' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 max-w-md">
                    <Input
                      placeholder="Search classes by name, code, or description..."
                      value={classSearch}
                      onChange={(e) => {
                        setClassSearch(e.target.value);
                        setClassPage(0);
                      }}
                      leftIcon={<Search className="w-4 h-4" />}
                      rightElement={
                        classSearch ? (
                          <button
                            type="button"
                            onClick={() => {
                              setClassSearch('');
                              setClassPage(0);
                            }}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            aria-label="Clear class search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : null
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <Select
                      aria-label="Filter classes by status"
                      value={classStatusFilter}
                      onChange={(e) => {
                        setClassStatusFilter(
                          e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE'
                        );
                        setClassPage(0);
                      }}
                      className="w-44 h-9 text-xs"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active Only</option>
                      <option value="INACTIVE">Inactive Only</option>
                    </Select>
                  </div>
                </div>

                <DataTable
                  columns={classColumns}
                  data={pagedClasses}
                  rowKey={(row) => row.id}
                  emptyTitle="No classes found"
                  emptyDescription="Create organization-wide classes (e.g., Grade 10, Class 8) that can be reused across academic sessions."
                />

                {filteredClasses.length > pageSize && (
                  <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-600">
                    <span>
                      Showing {classPage * pageSize + 1}–
                      {Math.min(
                        (classPage + 1) * pageSize,
                        filteredClasses.length
                      )}{' '}
                      of {filteredClasses.length} classes
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={classPage === 0}
                        onClick={() =>
                          setClassPage((prev) => Math.max(0, prev - 1))
                        }
                        leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                      >
                        Prev
                      </Button>
                      <span className="px-2 font-medium text-slate-700 tabular-nums">
                        Page {classPage + 1} of {totalClassPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={classPage >= totalClassPages - 1}
                        onClick={() =>
                          setClassPage((prev) =>
                            Math.min(totalClassPages - 1, prev + 1)
                          )
                        }
                        rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SUBJECTS */}
            {/* TAB: CLASS SECTIONS */}
            {activeTab === 'SECTIONS' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                    <div className="md:col-span-3">
                      <FormField
                        label="Academic Session"
                        htmlFor="sections-session-select"
                      >
                        <Select
                          id="sections-session-select"
                          value={selectedAssignmentSessionId ?? ''}
                          onChange={(e) => {
                            setSelectedAssignmentSessionId(
                              e.target.value ? Number(e.target.value) : null
                            );
                            setSectionPage(0);
                          }}
                        >
                          <option value="">Select an academic session...</option>
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.status})
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>

                    <div className="md:col-span-3">
                      <FormField
                        label="Filter by Class"
                        htmlFor="sections-class-filter"
                      >
                        <Select
                          id="sections-class-filter"
                          value={sectionClassFilter}
                          onChange={(e) => {
                            setSectionClassFilter(
                              e.target.value ? Number(e.target.value) : ''
                            );
                            setSectionPage(0);
                          }}
                        >
                          <option value="">All Classes in Session</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code}){!c.active ? ' [Inactive]' : ''}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>

                    <div className="md:col-span-2">
                      <FormField
                        label="Section Status"
                        htmlFor="sections-status-filter"
                      >
                        <Select
                          id="sections-status-filter"
                          value={sectionStatusFilter}
                          onChange={(e) => {
                            setSectionStatusFilter(
                              e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE'
                            );
                            setSectionPage(0);
                          }}
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="ACTIVE">Active Only</option>
                          <option value="INACTIVE">Inactive Only</option>
                        </Select>
                      </FormField>
                    </div>

                    <div className="md:col-span-4">
                      <FormField
                        label="Search Sections"
                        htmlFor="sections-search-input"
                      >
                        <Input
                          id="sections-search-input"
                          placeholder="Search by section or class name..."
                          value={sectionSearch}
                          onChange={(e) => {
                            setSectionSearch(e.target.value);
                            setSectionPage(0);
                          }}
                          leftIcon={<Search className="w-4 h-4" />}
                          rightElement={
                            sectionSearch ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSectionSearch('');
                                  setSectionPage(0);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                aria-label="Clear section search"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            ) : null
                          }
                        />
                      </FormField>
                    </div>
                  </div>
                </div>

                {selectedAssignmentSession?.status === 'COMPLETED' && (
                  <InlineAlert
                    variant="warning"
                    title="Completed Session (Read-Only)"
                  >
                    <strong>{selectedAssignmentSession.name}</strong> is completed. Class sections
                    for this academic session are locked and cannot be created, edited, or
                    deactivated.
                  </InlineAlert>
                )}

                {!selectedAssignmentSession ? (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
                    <p className="text-sm font-semibold text-slate-800">
                      Select an Academic Session
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose an academic session above to view or manage class sections for that
                      session.
                    </p>
                  </div>
                ) : isLoadingSections ? (
                  <LoadingState label="Loading class sections for selected session..." />
                ) : sectionsError ? (
                  <ErrorState
                    title="Unable to load class sections"
                    message={sectionsError}
                    onRetry={() => void loadSections()}
                  />
                ) : (
                  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                          <Layers className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {selectedAssignmentSession.name}
                            </span>
                            {selectedAssignmentSession.status === 'ACTIVE' && (
                              <Badge variant="success" dot>
                                Active Session
                              </Badge>
                            )}
                            <span className="text-xs text-slate-500">
                              • {hierarchyClasses.length} Classes • {sections.length} Sections
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Academic Hierarchy: Session → Class → Sections
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={expandAllClasses}>
                          Expand All
                        </Button>
                        <Button variant="outline" size="sm" onClick={collapseAllClasses}>
                          Collapse All
                        </Button>
                      </div>
                    </div>

                    {hierarchyClasses.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm font-semibold text-slate-800">
                          No classes match your filter
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {classes.length === 0
                            ? 'Create school classes first, then add sections (A, B, C) under each class.'
                            : 'Try clearing your class, status, or search filters above.'}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200/80">
                        {hierarchyClasses.map((cls) => {
                          const allClassSections = sectionsByClassId.get(cls.id) || [];
                          const q = sectionSearch.trim().toLowerCase();
                          const visibleSections = allClassSections.filter((sec) => {
                            if (sectionStatusFilter === 'ACTIVE' && !sec.active) return false;
                            if (sectionStatusFilter === 'INACTIVE' && sec.active) return false;
                            if (
                              q &&
                              !sec.name.toLowerCase().includes(q) &&
                              !cls.name.toLowerCase().includes(q) &&
                              !cls.code.toLowerCase().includes(q)
                            ) {
                              return false;
                            }
                            return true;
                          });
                          const isExpanded = expandedClassIds.has(cls.id);
                          const isSessionLocked = selectedAssignmentSession.status === 'COMPLETED';

                          return (
                            <div key={cls.id} className="bg-white">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 hover:bg-slate-50/80 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandClass(cls.id)}
                                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
                                    aria-label={isExpanded ? `Collapse ${cls.name}` : `Expand ${cls.name}`}
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandClass(cls.id)}
                                    className="flex items-center gap-2 flex-wrap text-left cursor-pointer"
                                  >
                                    <span className="text-sm font-semibold text-slate-900">{cls.name}</span>
                                    <IdLabel>{cls.code}</IdLabel>
                                    <CounterLabel count={`#${cls.displayOrder}`} />
                                    <Badge variant={cls.active ? 'success' : 'neutral'} dot>
                                      {cls.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200/80">
                                      {allClassSections.length} {allClassSections.length === 1 ? 'section' : 'sections'}
                                    </span>
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5 pl-9 sm:pl-0">
                                  {canManageSections && cls.active && !isSessionLocked && (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        setEditingSection(null);
                                        setPreselectedSectionClassId(cls.id);
                                        setDialogError(null);
                                        setIsSectionFormOpen(true);
                                      }}
                                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                                    >
                                      Add Section
                                    </Button>
                                  )}
                                  {(canViewClassSubjects || canManageClassSubjects) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedAssignmentClassId(cls.id);
                                        handleSelectTab('ASSIGNMENTS');
                                      }}
                                      leftIcon={<Layers className="w-3.5 h-3.5" />}
                                    >
                                      Subjects
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/40 pl-8 pr-4 py-2.5">
                                  {visibleSections.length === 0 ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-500">
                                      <span>
                                        No sections created under <strong className="text-slate-700">{cls.name}</strong> in {selectedAssignmentSession.name}.
                                      </span>
                                      {canManageSections && cls.active && !isSessionLocked && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingSection(null);
                                            setPreselectedSectionClassId(cls.id);
                                            setDialogError(null);
                                            setIsSectionFormOpen(true);
                                          }}
                                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          Create first section (e.g., Section A)
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="relative border-l-2 border-indigo-200/80 ml-2 pl-4 space-y-2">
                                      {visibleSections.map((sec) => (
                                        <div
                                          key={sec.id}
                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-2xs hover:border-indigo-200"
                                        >
                                          <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-900 border border-indigo-200/60">
                                              Section {sec.name}
                                            </span>
                                            <IdLabel>{`#SEC-${sec.id}`}</IdLabel>
                                            <Badge variant={sec.active ? 'success' : 'neutral'} dot>
                                              {sec.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                            <span className="text-xs text-slate-600">
                                              Capacity:{' '}
                                              {sec.capacity !== null && sec.capacity !== undefined ? (
                                                <strong className="text-slate-800">{sec.capacity} students</strong>
                                              ) : (
                                                <span className="text-slate-400">Unspecified</span>
                                              )}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                              • Updated {formatOnboardingDate(sec.updatedAt || sec.createdAt)}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 justify-end">
                                            {canManageSections ? (
                                              <>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  disabled={isSessionLocked}
                                                  onClick={() => {
                                                    setEditingSection(sec);
                                                    setPreselectedSectionClassId(sec.classId);
                                                    setDialogError(null);
                                                    setIsSectionFormOpen(true);
                                                  }}
                                                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                                                >
                                                  Edit
                                                </Button>
                                                {sec.active && (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isSessionLocked}
                                                    onClick={() => {
                                                      setDialogError(null);
                                                      setDeactivateTarget({
                                                        type: 'Section',
                                                        id: sec.id,
                                                        name: `${cls.name} - Section ${sec.name}`,
                                                        code: cls.code,
                                                      });
                                                    }}
                                                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                    leftIcon={<PowerOff className="w-3.5 h-3.5" />}
                                                  >
                                                    Deactivate
                                                  </Button>
                                                )}
                                              </>
                                            ) : (
                                              <span className="text-xs text-slate-400">View only</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SUBJECTS */}
            {activeTab === 'SUBJECTS' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 max-w-md">
                    <Input
                      placeholder="Search subjects by name, code, or description..."
                      value={subjectSearch}
                      onChange={(e) => {
                        setSubjectSearch(e.target.value);
                        setSubjectPage(0);
                      }}
                      leftIcon={<Search className="w-4 h-4" />}
                      rightElement={
                        subjectSearch ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSubjectSearch('');
                              setSubjectPage(0);
                            }}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            aria-label="Clear subject search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : null
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <Select
                      aria-label="Filter subjects by status"
                      value={subjectStatusFilter}
                      onChange={(e) => {
                        setSubjectStatusFilter(
                          e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE'
                        );
                        setSubjectPage(0);
                      }}
                      className="w-44 h-9 text-xs"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active Only</option>
                      <option value="INACTIVE">Inactive Only</option>
                    </Select>
                  </div>
                </div>

                <DataTable
                  columns={subjectColumns}
                  data={pagedSubjects}
                  rowKey={(row) => row.id}
                  emptyTitle="No subjects found"
                  emptyDescription="Create organization-wide subjects (e.g., Mathematics, Physics) to assign to classes in each academic session."
                />

                {filteredSubjects.length > pageSize && (
                  <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-600">
                    <span>
                      Showing {subjectPage * pageSize + 1}–
                      {Math.min(
                        (subjectPage + 1) * pageSize,
                        filteredSubjects.length
                      )}{' '}
                      of {filteredSubjects.length} subjects
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={subjectPage === 0}
                        onClick={() =>
                          setSubjectPage((prev) => Math.max(0, prev - 1))
                        }
                        leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                      >
                        Prev
                      </Button>
                      <span className="px-2 font-medium text-slate-700 tabular-nums">
                        Page {subjectPage + 1} of {totalSubjectPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={subjectPage >= totalSubjectPages - 1}
                        onClick={() =>
                          setSubjectPage((prev) =>
                            Math.min(totalSubjectPages - 1, prev + 1)
                          )
                        }
                        rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CLASS-SUBJECT ASSIGNMENTS */}
            {activeTab === 'ASSIGNMENTS' && (
              <div className="space-y-4">
                {/* Context Selector Bar: Academic Session + Class */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-5">
                      <FormField
                        label="Academic Session"
                        htmlFor="assignment-session-select"
                      >
                        <Select
                          id="assignment-session-select"
                          value={selectedAssignmentSessionId ?? ''}
                          onChange={(e) =>
                            setSelectedAssignmentSessionId(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        >
                          <option value="">Select an academic session...</option>
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.status})
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>

                    <div className="md:col-span-5">
                      <FormField
                        label="School Class"
                        htmlFor="assignment-class-select"
                      >
                        <Select
                          id="assignment-class-select"
                          value={selectedAssignmentClassId ?? ''}
                          onChange={(e) =>
                            setSelectedAssignmentClassId(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        >
                          <option value="">Select a class...</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code}){!c.active ? ' [Inactive]' : ''}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                      {canManageClassSubjects && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={
                            !selectedAssignmentSession ||
                            !selectedAssignmentClass ||
                            selectedAssignmentSession.status === 'COMPLETED'
                          }
                          onClick={() => {
                            setDialogError(null);
                            setIsAssignSubjectOpen(true);
                          }}
                          leftIcon={<Plus className="w-3.5 h-3.5" />}
                          className="w-full"
                        >
                          Assign Subject
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {selectedAssignmentSession?.status === 'COMPLETED' && (
                  <InlineAlert
                    variant="warning"
                    title="Completed Session (Read-Only)"
                  >
                    <strong>{selectedAssignmentSession.name}</strong> is completed. Subject
                    assignments for this academic session are locked and cannot be added or
                    removed.
                  </InlineAlert>
                )}

                {!selectedAssignmentSession || !selectedAssignmentClass ? (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
                    <p className="text-sm font-semibold text-slate-800">
                      Select an Academic Session and Class
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose both a session and a school class above to view or manage assigned
                      curriculum subjects.
                    </p>
                  </div>
                ) : isLoadingAssignments ? (
                  <LoadingState label="Loading assigned subjects for class..." />
                ) : assignmentsError ? (
                  <ErrorState
                    title="Unable to load class-subject assignments"
                    message={assignmentsError}
                    onRetry={() => void loadClassSubjects()}
                  />
                ) : (
                  <DataTable
                    columns={assignmentColumns}
                    data={classSubjects}
                    rowKey={(row) => row.id}
                    emptyTitle={`No subjects assigned to ${selectedAssignmentClass.name}`}
                    emptyDescription={`Assign active subjects to ${selectedAssignmentClass.name} for the ${selectedAssignmentSession.name} session.`}
                  />
                )}
              </div>
            )}

            {/* MODALS & CONFIRMATION DIALOGS */}
            <AcademicSessionFormDialog
              open={isSessionFormOpen}
              onClose={() => {
                if (!isMutating) {
                  setIsSessionFormOpen(false);
                  setEditingSession(null);
                  setDialogError(null);
                }
              }}
              editingSession={editingSession}
              isSubmitting={isMutating}
              errorMessage={dialogError}
              onSubmit={handleSaveSession}
            />

            <AcademicSessionLifecycleDialog
              open={Boolean(lifecycleTarget)}
              onClose={() => {
                if (!isMutating) {
                  setLifecycleTarget(null);
                  setDialogError(null);
                }
              }}
              session={lifecycleTarget?.session ?? null}
              action={lifecycleTarget?.action ?? null}
              isSubmitting={isMutating}
              errorMessage={dialogError}
              onConfirm={handleConfirmSessionLifecycle}
            />

            <SchoolClassFormDialog
              open={isClassFormOpen}
              onClose={() => {
                if (!isMutating) {
                  setIsClassFormOpen(false);
                  setEditingClass(null);
                  setDialogError(null);
                }
              }}
              editingClass={editingClass}
              defaultDisplayOrder={classes.length + 1}
              isSubmitting={isMutating}
              errorMessage={dialogError}
              onSubmit={handleSaveClass}
            />

            <SectionFormDialog
              open={isSectionFormOpen}
              onClose={() => {
                if (!isMutating) {
                  setIsSectionFormOpen(false);
                  setEditingSection(null);
                  setPreselectedSectionClassId(null);
                  setDialogError(null);
                }
              }}
              sessionName={selectedAssignmentSession?.name ?? ''}
              editingSection={editingSection}
              availableClasses={classes}
              existingSections={sections}
              defaultClassId={
                preselectedSectionClassId ??
                (sectionClassFilter ? Number(sectionClassFilter) : null)
              }
              isSubmitting={isMutating}
              errorMessage={dialogError}
              onSubmit={handleSaveSection}
            />

            <SubjectFormDialog
              open={isSubjectFormOpen}
              onClose={() => {
                if (!isMutating) {
                  setIsSubjectFormOpen(false);
                  setEditingSubject(null);
                  setDialogError(null);
                }
              }}
              editingSubject={editingSubject}
              isSubmitting={isMutating}
              errorMessage={dialogError}
              onSubmit={handleSaveSubject}
            />

            <DeactivateEntityDialog
              open={Boolean(deactivateTarget)}
              onClose={() => {
                if (!isMutating) {
                  setDeactivateTarget(null);
                  setDialogError(null);
                }
              }}
              entityType={deactivateTarget?.type ?? 'Class'}
              entityName={deactivateTarget?.name ?? ''}
              entityCode={deactivateTarget?.code ?? ''}
              isSubmitting={isMutating}
              errorMessage={dialogError}
              onConfirm={handleConfirmDeactivate}
            />

            <AssignClassSubjectDialog
              open={isAssignSubjectOpen}
              onClose={() => {
                if (!isMutating) {
                  setIsAssignSubjectOpen(false);
                  setDialogError(null);
                }
              }}
              sessionName={selectedAssignmentSession?.name ?? ''}
              className={selectedAssignmentClass?.name ?? ''}
              availableSubjects={availableSubjectsForAssignment}
              defaultDisplayOrder={classSubjects.length + 1}
              isSubmitting={isMutating}
              errorMessage={dialogError}
              onSubmit={handleAssignSubjectToClass}
            />

            <RemoveClassSubjectDialog
              open={Boolean(removeAssignmentTarget)}
              onClose={() => {
                if (!isMutating) {
                  setRemoveAssignmentTarget(null);
                  setDialogError(null);
                }
              }}
              subjectName={removeAssignmentTarget?.subjectName ?? ''}
              subjectCode={removeAssignmentTarget?.subjectCode ?? ''}
              className={selectedAssignmentClass?.name ?? ''}
              sessionName={selectedAssignmentSession?.name ?? ''}
              isSubmitting={isMutating}
              errorMessage={dialogError}
              onConfirm={handleConfirmRemoveAssignment}
            />
          </>
        )}
      </div>
    </AppShell>
  );
};
