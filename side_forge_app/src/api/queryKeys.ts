import { QueryClient } from '@tanstack/react-query';
import type { MobileRoleExperience } from '@/types/auth';

/**
 * Strict multi-tenant & role-scoped query keys.
 * Every organization-scoped query includes `organizationId` and `experience`
 * so switching schools or roles never leaks cached data across tenants.
 */
export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => ['auth', 'me'] as const,
    memberships: () => ['auth', 'memberships'] as const,
  },
  invitations: {
    all: ['invitations'] as const,
    verify: (token: string) => ['invitations', 'verify', token] as const,
  },
  notifications: {
    personal: () => ['notifications', 'personal'] as const,
    personalUnread: () => ['notifications', 'personal', 'unread'] as const,
    orgList: (organizationId: number, experience: MobileRoleExperience) =>
      ['org', organizationId, experience, 'notifications', 'list'] as const,
    orgUnread: (organizationId: number, experience: MobileRoleExperience) =>
      ['org', organizationId, experience, 'notifications', 'unread'] as const,
  },
  workspace: {
    scope: (organizationId: number, experience: MobileRoleExperience) =>
      ['org', organizationId, experience] as const,
    dashboard: (organizationId: number, experience: MobileRoleExperience) =>
      ['org', organizationId, experience, 'dashboard'] as const,
    children: (organizationId: number) =>
      ['org', organizationId, 'PARENT', 'children'] as const,
    timetable: (
      organizationId: number,
      experience: MobileRoleExperience,
      targetId?: number | string
    ) =>
      ['org', organizationId, experience, 'timetable', targetId ?? 'all'] as const,
    attendance: (
      organizationId: number,
      experience: MobileRoleExperience,
      targetId?: number | string
    ) =>
      ['org', organizationId, experience, 'attendance', targetId ?? 'all'] as const,
    homework: (
      organizationId: number,
      experience: MobileRoleExperience,
      targetId?: number | string
    ) =>
      ['org', organizationId, experience, 'homework', targetId ?? 'all'] as const,
    exams: (
      organizationId: number,
      experience: MobileRoleExperience,
      targetId?: number | string
    ) =>
      ['org', organizationId, experience, 'exams', targetId ?? 'all'] as const,
    fees: (
      organizationId: number,
      experience: MobileRoleExperience,
      targetId?: number | string
    ) =>
      ['org', organizationId, experience, 'fees', targetId ?? 'all'] as const,
  },
  parentPortal: {
    all: (organizationId: number) =>
      ['org', organizationId, 'PARENT', 'portal'] as const,
    dashboard: (
      organizationId: number,
      academicSessionId?: number | null
    ) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'dashboard',
        academicSessionId ?? 'current',
      ] as const,
    children: (
      organizationId: number,
      academicSessionId?: number | null
    ) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'children',
        academicSessionId ?? 'current',
      ] as const,
    childDashboard: (
      organizationId: number,
      studentId: number,
      academicSessionId?: number | null
    ) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'child',
        studentId,
        'dashboard',
        academicSessionId ?? 'current',
      ] as const,
    childDetails: (organizationId: number, studentId: number) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'child',
        studentId,
        'details',
      ] as const,
    childTimetable: (
      organizationId: number,
      studentId: number,
      academicSessionId?: number | null
    ) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'child',
        studentId,
        'timetable',
        academicSessionId ?? 'current',
      ] as const,
    childAttendance: (
      organizationId: number,
      studentId: number,
      academicSessionId?: number | null
    ) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'child',
        studentId,
        'attendance',
        academicSessionId ?? 'current',
      ] as const,
    childHomework: (
      organizationId: number,
      studentId: number,
      academicSessionId?: number | null
    ) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'child',
        studentId,
        'homework',
        academicSessionId ?? 'current',
      ] as const,
    childHomeworkDetail: (
      organizationId: number,
      studentId: number,
      homeworkId: number
    ) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'child',
        studentId,
        'homework',
        homeworkId,
        'detail',
      ] as const,
    childExaminations: (
      organizationId: number,
      studentId: number,
      academicSessionId?: number | null
    ) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'child',
        studentId,
        'examinations',
        academicSessionId ?? 'current',
      ] as const,
    childReportCard: (
      organizationId: number,
      studentId: number,
      examinationId: number
    ) =>
      [
        'org',
        organizationId,
        'PARENT',
        'portal',
        'child',
        studentId,
        'examinations',
        examinationId,
        'report-card',
      ] as const,
  },
};

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
