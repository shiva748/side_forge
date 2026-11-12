import {
  Activity,
  Award,
  Bell,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Home,
  type LucideIcon,
  Users,
} from 'lucide-react-native';
import type { MobileRoleExperience, MobileWorkspace } from '@/types/auth';
import { normalizeRoutePath } from '@/utils/navigationGuard';

export interface RoleNavigationItemConfig {
  key: string;
  title: string;
  drawerLabel?: string;
  description: string;
  href: string;
  params?: Record<string, string>;
  Icon: LucideIcon;
  tone: 'primary' | 'success' | 'warning' | 'info';
  includeOnHomeGrid: boolean;
  requiredAnyPermissions?: string[];
  badge?: string;
}

/**
 * Fallback role-to-permission mapping aligned with backend DefaultRolePermissionMap
 * used when a membership summary does not include an explicit permissions array.
 */
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SCHOOL_ADMIN: [
    'school.view',
    'school.update',
    'school.settings.manage',
    'academic_session.view',
    'academic_session.manage',
    'class.view',
    'class.manage',
    'section.view',
    'section.manage',
    'subject.view',
    'subject.manage',
    'class_subject.view',
    'class_subject.manage',
    'student.view',
    'student.create',
    'student.update',
    'student.delete',
    'student.enrollment.manage',
    'student.guardian.manage',
    'teacher.view',
    'teacher.manage',
    'staff.view',
    'staff.manage',
    'timetable.view',
    'timetable.manage',
    'timetable.publish',
    'attendance.view',
    'attendance.mark',
    'attendance.update',
    'staff.attendance.view',
    'staff.attendance.manage',
    'exam.view',
    'exam.manage',
    'exam.enter_marks',
    'exam.publish_results',
    'fees.view',
    'fees.manage',
    'fees.collect',
    'fees.refund',
    'fees.report.view',
    'admission.view',
    'admission.manage',
    'communication.view',
    'communication.manage',
    'dashboard.view',
    'report.view',
    'report.export',
    'homework.view',
    'homework.manage',
    'homework.evaluate',
  ],
  PRINCIPAL: [
    'school.view',
    'academic_session.view',
    'academic_session.manage',
    'class.view',
    'class.manage',
    'section.view',
    'section.manage',
    'subject.view',
    'subject.manage',
    'class_subject.view',
    'class_subject.manage',
    'student.view',
    'student.create',
    'student.update',
    'student.enrollment.manage',
    'student.guardian.manage',
    'teacher.view',
    'teacher.manage',
    'staff.view',
    'staff.manage',
    'timetable.view',
    'timetable.manage',
    'timetable.publish',
    'attendance.view',
    'attendance.mark',
    'attendance.update',
    'staff.attendance.view',
    'staff.attendance.manage',
    'exam.view',
    'exam.manage',
    'exam.enter_marks',
    'exam.publish_results',
    'fees.view',
    'fees.report.view',
    'communication.view',
    'communication.manage',
    'dashboard.view',
    'report.view',
    'report.export',
    'homework.view',
    'homework.manage',
    'homework.evaluate',
  ],
  ACCOUNTANT: [
    'academic_session.view',
    'class.view',
    'section.view',
    'student.view',
    'staff.view',
    'teacher.view',
    'staff.attendance.view',
    'fees.view',
    'fees.collect',
    'fees.refund',
    'fees.report.view',
    'communication.view',
    'dashboard.view',
    'report.view',
    'report.export',
  ],
  RECEPTIONIST: [
    'academic_session.view',
    'class.view',
    'section.view',
    'subject.view',
    'class_subject.view',
    'student.view',
    'student.create',
    'student.update',
    'student.guardian.manage',
    'staff.view',
    'teacher.view',
    'timetable.view',
    'attendance.view',
    'communication.view',
    'dashboard.view',
  ],
  SCHOOL_STAFF: [
    'academic_session.view',
    'class.view',
    'section.view',
    'subject.view',
    'class_subject.view',
    'student.view',
    'staff.view',
    'teacher.view',
    'timetable.view',
    'communication.view',
    'dashboard.view',
  ],
  TEACHER: [
    'academic_session.view',
    'class.view',
    'section.view',
    'subject.view',
    'class_subject.view',
    'student.view',
    'teacher.view',
    'timetable.view',
    'attendance.view',
    'attendance.mark',
    'exam.view',
    'exam.enter_marks',
    'communication.view',
    'dashboard.view',
    'report.view',
    'homework.view',
    'homework.manage',
    'homework.evaluate',
  ],
  PARENT: [
    'parent.child.view',
    'parent.child.communication',
    'academic_session.view',
    'class.view',
    'subject.view',
    'timetable.view',
    'attendance.view',
    'exam.view',
    'fees.view',
    'communication.view',
    'dashboard.view',
    'homework.view',
    'homework.submit',
  ],
};

export function getEffectiveWorkspacePermissions(
  workspace: MobileWorkspace | null | undefined
): Set<string> {
  const perms = new Set<string>();
  if (!workspace) return perms;

  for (const p of workspace.permissions ?? []) {
    if (p) perms.add(p);
  }

  for (const role of workspace.roles ?? []) {
    const normalized = role.trim().toUpperCase();
    for (const p of DEFAULT_ROLE_PERMISSIONS[normalized] ?? []) {
      perms.add(p);
    }
  }

  return perms;
}

export function hasAnyWorkspacePermission(
  workspace: MobileWorkspace | null | undefined,
  requiredAny?: string[]
): boolean {
  if (!workspace) return false;
  if (!requiredAny || requiredAny.length === 0) return true;
  const effective = getEffectiveWorkspacePermissions(workspace);
  return requiredAny.some((req) => effective.has(req));
}

const SCHOOL_ADMIN_ITEMS: RoleNavigationItemConfig[] = [
  {
    key: 'overview',
    title: 'Overview',
    drawerLabel: 'Overview',
    description: 'School administration dashboard & module overview',
    href: '/(admin)',
    Icon: Home,
    tone: 'primary',
    includeOnHomeGrid: false,
  },
  {
    key: 'directory',
    title: 'Students & Staff',
    drawerLabel: 'Students & Staff',
    description: 'Student profiles, guardian records & staff directory',
    href: '/(admin)/directory',
    Icon: Users,
    tone: 'primary',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['student.view', 'teacher.view', 'staff.view'],
  },
  {
    key: 'operations',
    title: 'Daily Operations',
    drawerLabel: 'Daily Operations',
    description: 'School operations & daily activity overview',
    href: '/(admin)/operations',
    Icon: Activity,
    tone: 'info',
    includeOnHomeGrid: true,
    requiredAnyPermissions: [
      'school.view',
      'dashboard.view',
      'academic_session.view',
    ],
  },
  {
    key: 'attendance',
    title: 'Attendance',
    drawerLabel: 'Attendance',
    description: 'Student and staff attendance tracking',
    href: '/(admin)/operations',
    params: { section: 'attendance' },
    Icon: ClipboardCheck,
    tone: 'success',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['attendance.view', 'staff.attendance.view'],
  },
  {
    key: 'timetable',
    title: 'Timetable',
    drawerLabel: 'Timetable',
    description: 'Class & section schedules and period slots',
    href: '/(admin)/operations',
    params: { section: 'timetable' },
    Icon: Calendar,
    tone: 'primary',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['timetable.view'],
  },
  {
    key: 'examinations',
    title: 'Examinations',
    drawerLabel: 'Examinations',
    description: 'Exam schedules, subject marks & report cards',
    href: '/(admin)/operations',
    params: { section: 'examinations' },
    Icon: Award,
    tone: 'warning',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['exam.view'],
  },
  {
    key: 'finance',
    title: 'Fees & Finance',
    drawerLabel: 'Fees & Finance',
    description: 'Fee collections, outstanding dues & receipts',
    href: '/(admin)/finance',
    Icon: CreditCard,
    tone: 'success',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['fees.view', 'fees.collect', 'fees.report.view'],
  },
  {
    key: 'communication',
    title: 'Communication',
    drawerLabel: 'Communication',
    description: 'School announcements, notices & alerts',
    href: '/(admin)/operations',
    params: { section: 'communication' },
    Icon: Bell,
    tone: 'info',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['communication.view', 'communication.manage'],
  },
];

const PARENT_ITEMS: RoleNavigationItemConfig[] = [
  {
    key: 'overview',
    title: 'Overview',
    drawerLabel: 'Overview',
    description: 'Parent portal overview & child summary',
    href: '/(parent)',
    Icon: Home,
    tone: 'primary',
    includeOnHomeGrid: false,
  },
  {
    key: 'attendance',
    title: 'Attendance',
    drawerLabel: 'Attendance',
    description: 'Daily attendance status & monthly summary',
    href: '/(parent)/attendance',
    Icon: CalendarCheck,
    tone: 'success',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['parent.child.view', 'attendance.view'],
  },
  {
    key: 'homework',
    title: 'Homework',
    drawerLabel: 'Homework',
    description: 'Assigned tasks, due dates & submissions',
    href: '/(parent)/homework',
    Icon: FileSpreadsheet,
    tone: 'info',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['parent.child.view', 'homework.view'],
  },
  {
    key: 'exams',
    title: 'Exam Results',
    drawerLabel: 'Academics & Exam Results',
    description: 'Exam schedules & published report cards',
    href: '/(parent)/academics',
    params: { section: 'exams' },
    Icon: GraduationCap,
    tone: 'warning',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['parent.child.view', 'exam.view'],
  },
  {
    key: 'timetable',
    title: 'Timetable',
    drawerLabel: 'Timetable',
    description: 'Weekly class & section period schedule',
    href: '/(parent)/academics',
    params: { section: 'timetable' },
    Icon: Calendar,
    tone: 'primary',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['parent.child.view', 'timetable.view'],
  },
  {
    key: 'fees',
    title: 'Fees & Receipts',
    drawerLabel: 'Fees',
    description: 'Fee demands, balances & payment history',
    href: '/(parent)/fees',
    Icon: CreditCard,
    tone: 'success',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['parent.child.view', 'fees.view'],
  },
  {
    key: 'updates',
    title: 'Announcements',
    drawerLabel: 'Updates & Announcements',
    description: 'School notices, circulars & alerts',
    href: '/(parent)/updates',
    Icon: Bell,
    tone: 'info',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['parent.child.view', 'communication.view'],
  },
];

const TEACHER_ITEMS: RoleNavigationItemConfig[] = [
  {
    key: 'overview',
    title: 'Overview',
    drawerLabel: 'Overview',
    description: 'Teacher workspace overview',
    href: '/(teacher)',
    Icon: Home,
    tone: 'primary',
    includeOnHomeGrid: false,
  },
  {
    key: 'classes',
    title: 'Assigned Classes',
    drawerLabel: 'My Classes & Students',
    description: 'Section student rosters & academic details',
    href: '/(teacher)/classes',
    params: { section: 'roster' },
    Icon: Users,
    tone: 'primary',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['class.view', 'section.view', 'student.view'],
  },
  {
    key: 'attendance',
    title: 'Class Attendance',
    drawerLabel: 'Attendance',
    description: 'Daily roll call & section attendance',
    href: '/(teacher)/classes',
    Icon: ClipboardCheck,
    tone: 'success',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['attendance.view', 'attendance.mark'],
  },
  {
    key: 'timetable',
    title: 'Teaching Schedule',
    drawerLabel: 'Timetable',
    description: 'Daily & weekly assigned class periods',
    href: '/(teacher)/timetable',
    Icon: Calendar,
    tone: 'primary',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['timetable.view'],
  },
  {
    key: 'homework',
    title: 'Homework & Grading',
    drawerLabel: 'Homework & Assignments',
    description: 'Assign work & review student submissions',
    href: '/(teacher)/homework',
    Icon: FileText,
    tone: 'info',
    includeOnHomeGrid: true,
    requiredAnyPermissions: [
      'homework.view',
      'homework.manage',
      'homework.evaluate',
    ],
  },
  {
    key: 'exams',
    title: 'Examinations & Marks',
    drawerLabel: 'Examinations',
    description: 'Subject mark entry & exam schedules',
    href: '/(teacher)/homework',
    params: { section: 'exams' },
    Icon: GraduationCap,
    tone: 'warning',
    includeOnHomeGrid: true,
    requiredAnyPermissions: ['exam.view', 'exam.enter_marks'],
  },
];

const ROLE_NAVIGATION_MAP: Record<
  MobileRoleExperience,
  RoleNavigationItemConfig[]
> = {
  SCHOOL_ADMIN: SCHOOL_ADMIN_ITEMS,
  PARENT: PARENT_ITEMS,
  TEACHER: TEACHER_ITEMS,
};

export function getRoleNavigationItems(
  workspace: MobileWorkspace | null | undefined,
  options?: { homeGridOnly?: boolean }
): RoleNavigationItemConfig[] {
  if (!workspace || workspace.organizationStatus === 'DEACTIVATED') {
    return [];
  }
  const baseList = ROLE_NAVIGATION_MAP[workspace.experience] ?? [];
  return baseList.filter((item) => {
    if (options?.homeGridOnly && !item.includeOnHomeGrid) {
      return false;
    }
    return hasAnyWorkspacePermission(workspace, item.requiredAnyPermissions);
  });
}

export function isRoleNavigationItemActive(
  item: RoleNavigationItemConfig,
  pathname: string,
  currentSectionParam?: string | null
): boolean {
  const normalizedTarget = normalizeRoutePath(item.href);
  const normalizedCurrent = normalizeRoutePath(pathname || '/');

  if (normalizedTarget !== normalizedCurrent) {
    if (
      item.key === 'attendance' &&
      normalizedTarget === '/attendance' &&
      normalizedCurrent === '/academics' &&
      (!currentSectionParam || currentSectionParam === 'attendance')
    ) {
      return true;
    }
    if (
      item.key === 'homework' &&
      normalizedTarget === '/homework' &&
      normalizedCurrent === '/academics' &&
      currentSectionParam === 'homework'
    ) {
      return true;
    }
    return false;
  }

  const targetSection = item.params?.section ?? null;
  const activeSection = currentSectionParam ?? null;

  if (targetSection) {
    return activeSection === targetSection;
  }

  return !activeSection;
}

