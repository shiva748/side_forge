import { BadgeVariant } from '../components/ui/Badge';

export type AcademicSessionStatus =
  | 'PLANNED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'UPCOMING'
  | 'CURRENT'
  | 'ARCHIVED';
export type AcademicSessionScope = 'CURRENT' | 'PREVIOUS' | 'SPECIFIC';

export type ExaminationStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'MARKS_ENTRY'
  | 'FINALIZED'
  | 'PUBLISHED'
  | 'CANCELLED';

export type ExaminationType =
  | 'UNIT_TEST'
  | 'MID_TERM'
  | 'TERM_END'
  | 'ANNUAL'
  | 'PRACTICAL'
  | 'ASSESSMENT'
  | 'OTHER';

export type NoticeAudience = 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF';

export type AnnouncementAudience =
  | 'ALL'
  | 'STUDENTS'
  | 'PARENTS'
  | 'TEACHERS'
  | 'STAFF'
  | 'SPECIFIC_CLASSES'
  | 'SPECIFIC_STUDENTS';

export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type StudentStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'GRADUATED'
  | 'TRANSFERRED'
  | 'WITHDRAWN'
  | 'SUSPENDED';

export type EmploymentStatus =
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'RETIRED';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'VISITING'
  | 'TEMPORARY';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type FeePaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'CHEQUE'
  | 'DEMAND_DRAFT'
  | 'ONLINE_PORTAL'
  | 'OTHER';

export type FeePaymentStatus =
  | 'COMPLETED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'REVERSED';

export interface AcademicSessionResponse {
  id: number;
  organizationId: number;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DailyAttendanceSnapshot {
  date: string;
  totalCount: number;
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  leaveOrExcusedCount: number;
  holidayCount: number;
  attendancePercentage: number;
}

export interface UpcomingExaminationSummary {
  examinationId: number;
  examinationName: string;
  examType: ExaminationType;
  status: ExaminationStatus;
  classId: number;
  className: string;
  startDate: string | null;
  endDate: string | null;
  scheduledSubjectsCount: number;
}

export interface PublishedExamResultOverview {
  examinationId: number;
  examinationName: string;
  examType: ExaminationType;
  status: ExaminationStatus;
  officialResult: boolean;
  classId: number;
  className: string;
  totalEvaluatedStudents: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  classAveragePercentage: number;
  publishedAt: string | null;
}

export interface FinancialOverviewSnapshot {
  totalFeesDemanded: number;
  totalBaseAmount: number;
  totalConcessionsAndWaivers: number;
  totalLateFees: number;
  totalFeesCollected: number;
  totalRefunded: number;
  unappliedCredit: number;
  outstandingFeeAmount: number;
  overdueFeeAmount: number;
}

export interface SchoolActivityItem {
  activityType: string;
  module: string;
  summary: string;
  occurredAt: string;
  performedBy: number | null;
}

export interface SchoolNoticeResponse {
  id: number;
  organizationId: number;
  academicSessionId: number | null;
  title: string;
  content: string;
  audience: NoticeAudience;
  important: boolean;
  publishedDate: string;
  active: boolean;
  createdBy: number | null;
  createdAt: string;
}

export interface ChartSeriesPoint {
  label: string;
  value: number;
  secondaryValue: number | null;
  category: string | null;
}

export interface ChartDatasetResponse {
  chartKey: string;
  title: string;
  chartType: string;
  empty: boolean;
  emptyMessage: string | null;
  points: ChartSeriesPoint[];
}

export interface FutureModuleWidgetResponse {
  moduleCode: string;
  moduleName: string;
  available: boolean;
  statusMessage: string;
  metrics: Record<string, unknown>;
}

export interface ClassStrengthAndAttendanceItem {
  classId: number;
  classCode: string;
  className: string;
  activeStudentCount: number;
  attendancePercentage: number;
  averageAcademicPercentage: number;
}

export interface LowAttendanceStudentItem {
  studentId: number;
  admissionNumber: string;
  studentName: string;
  classId: number;
  className: string;
  applicableWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
}

export interface StudentAcademicAttentionItem {
  studentId: number;
  admissionNumber: string;
  studentName: string;
  classId: number;
  className: string;
  examinationId: number;
  examinationName: string;
  percentage: number;
  overallGrade: string;
  overallPassed: boolean;
  attentionReason: string;
}

export interface AdminDashboardResponse {
  organizationId: number;
  organizationName: string;
  currentAcademicSessionId: number | null;
  currentAcademicSessionName: string | null;
  currentAcademicSessionStatus: AcademicSessionStatus | null;
  referenceDate: string;
  totalActiveStudents: number;
  totalActiveTeachers: number;
  totalActiveNonTeachingStaff: number;
  totalActiveStaffAndTeachers: number;
  totalClasses: number;
  todayStudentAttendance: DailyAttendanceSnapshot | null;
  todayStaffAttendance: DailyAttendanceSnapshot | null;
  overallStudentAttendancePercentage: number;
  upcomingExaminations: UpcomingExaminationSummary[];
  recentlyPublishedResults: PublishedExamResultOverview[];
  financialSummary: FinancialOverviewSnapshot | null;
  recentActivities: SchoolActivityItem[];
  announcements: SchoolNoticeResponse[];
  charts: ChartDatasetResponse[];
  extensionWidgets: FutureModuleWidgetResponse[];
  emptyState: boolean;
  emptyStateMessage: string | null;
}

export interface PrincipalDashboardResponse {
  organizationId: number;
  organizationName: string;
  academicSessionId: number | null;
  academicSessionName: string | null;
  referenceDate: string;
  lowAttendanceThreshold: number;
  academicAttentionThreshold: number;
  classWisePerformanceAndStrength: ClassStrengthAndAttendanceItem[];
  lowAttendanceStudents: LowAttendanceStudentItem[];
  examinationPerformanceOverview: PublishedExamResultOverview[];
  upcomingExaminations: UpcomingExaminationSummary[];
  todayStaffAttendance: DailyAttendanceSnapshot | null;
  overallStaffAttendancePercentage: number;
  studentsRequiringAcademicAttention: StudentAcademicAttentionItem[];
  importantSchoolNotices: SchoolNoticeResponse[];
  charts: ChartDatasetResponse[];
  extensionWidgets: FutureModuleWidgetResponse[];
  emptyState: boolean;
  emptyStateMessage: string | null;
}

export interface FeePaymentReceiptResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  enrollmentId: number | null;
  receiptNumber: string;
  idempotencyKey: string | null;
  paymentDate: string;
  totalAmount: number;
  allocatedAmount: number;
  unappliedCreditAmount: number;
  refundedAmount: number;
  paymentMethod: FeePaymentMethod;
  referenceNumber: string | null;
  status: FeePaymentStatus;
  recordedBy: number | null;
  createdAt: string;
}

export interface ClassFeeReportItem {
  classId: number;
  classCode: string;
  className: string;
  studentCount: number;
  totalNetFeesExpected: number;
  totalCollectedAmount: number;
  totalOutstandingFees: number;
}

export interface MonthlyFeeCollectionItem {
  monthLabel: string;
  paymentCount: number;
  totalCollectedAmount: number;
}

export interface ConcessionWaiverSummary {
  activeConcessionRulesCount: number;
  studentsWithConcessionsCount: number;
  waivedDemandsCount: number;
  totalConcessionAndWaiverAmount: number;
  amountByConcessionType: Record<string, number>;
}

export interface AccountantDashboardResponse {
  organizationId: number;
  organizationName: string;
  academicSessionId: number | null;
  academicSessionName: string | null;
  referenceDate: string;
  totalFeeDemands: number;
  totalCollection: number;
  totalRefunded: number;
  unappliedCredit: number;
  outstandingFees: number;
  overdueFees: number;
  monthlyCollectionSummary: MonthlyFeeCollectionItem[];
  classWiseCollection: ClassFeeReportItem[];
  recentPayments: FeePaymentReceiptResponse[];
  recentPaymentReceipts: FeePaymentReceiptResponse[];
  concessionsAndWaiversSummary: ConcessionWaiverSummary | null;
  charts: ChartDatasetResponse[];
  extensionWidgets: FutureModuleWidgetResponse[];
  emptyState: boolean;
  emptyStateMessage: string | null;
}

export interface TeacherClassAssignmentResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string;
  classId: number;
  className: string;
  classCode: string;
  teacherId: number;
  staffId: number;
  teacherEmployeeId: string;
  teacherFirstName: string;
  teacherLastName: string | null;
  classTeacher: boolean;
  remarks: string | null;
}

export interface TeacherSubjectAssignmentResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string;
  classId: number;
  className: string;
  classCode: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  teacherId: number;
  staffId: number;
}

export interface TimetableSlotResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  classTimetableId: number;
  classId: number;
  className: string;
  dayOfWeek: string;
  periodId: number;
  periodName: string;
  periodOrder: number;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  teacherId: number | null;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  room: string | null;
  remarks: string | null;
}

export interface TeacherAttendanceTaskItem {
  classId: number;
  classCode: string;
  className: string;
  classTeacher: boolean;
  date: string;
  totalEnrolledStudents: number;
  markedCount: number;
  pendingCount: number;
  completed: boolean;
}

export interface TeacherDashboardResponse {
  organizationId: number;
  organizationName: string;
  academicSessionId: number | null;
  academicSessionName: string | null;
  teacherId: number;
  staffId: number;
  teacherName: string;
  referenceDate: string;
  assignedClasses: TeacherClassAssignmentResponse[];
  assignedSubjects: TeacherSubjectAssignmentResponse[];
  todayTimetable: TimetableSlotResponse[];
  todayAttendanceTasks: TeacherAttendanceTaskItem[];
  assignedClassAttendanceSummary: ClassStrengthAndAttendanceItem[];
  upcomingExaminations: UpcomingExaminationSummary[];
  homeworkAndEvaluationWidget: FutureModuleWidgetResponse | null;
  importantSchoolNotices: SchoolNoticeResponse[];
  extensionWidgets: FutureModuleWidgetResponse[];
  emptyState: boolean;
  emptyStateMessage: string | null;
}

export interface StudentSummaryItem {
  id: number;
  organizationId: number;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  gender: Gender;
  admissionDate: string | null;
  status: StudentStatus;
  createdAt: string;
}

export interface StaffSummaryItem {
  id: number;
  organizationId: number;
  employeeId: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  designation: string;
  department: string | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  teachingStaff: boolean;
  joiningDate: string | null;
  createdAt: string;
}

export interface AnnouncementItem {
  id: number;
  organizationId: number;
  academicSessionId: number | null;
  title: string;
  description: string;
  status: AnnouncementStatus;
  targetAudience: AnnouncementAudience;
  important: boolean;
  publicationDate: string | null;
  expiryDate: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export function getAcademicSessionStatusBadgeMeta(
  status?: AcademicSessionStatus | string | null
): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'ACTIVE':
    case 'CURRENT':
      return { label: 'Active Session', variant: 'success' };
    case 'PLANNED':
    case 'UPCOMING':
      return { label: 'Planned', variant: 'info' };
    case 'COMPLETED':
      return { label: 'Completed', variant: 'neutral' };
    case 'ARCHIVED':
      return { label: 'Archived', variant: 'neutral' };
    default:
      return { label: status || 'Unconfigured', variant: 'neutral' };
  }
}

export function getExamStatusBadgeMeta(
  status?: ExaminationStatus | string | null
): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'PUBLISHED':
      return { label: 'Published', variant: 'success' };
    case 'FINALIZED':
      return { label: 'Finalized', variant: 'primary' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', variant: 'warning' };
    case 'MARKS_ENTRY':
      return { label: 'Marks Entry', variant: 'info' };
    case 'SCHEDULED':
      return { label: 'Scheduled', variant: 'info' };
    case 'CANCELLED':
      return { label: 'Cancelled', variant: 'danger' };
    case 'DRAFT':
    default:
      return { label: status || 'Draft', variant: 'neutral' };
  }
}

export function formatExamTypeLabel(type?: ExaminationType | string | null): string {
  if (!type) return 'Examination';
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
