import type { NotificationItem } from './notification';

export type StudentAttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'EXCUSED'
  | 'HOLIDAY';

export type HomeworkSubmissionStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'EVALUATED'
  | 'OVERDUE';

export type HomeworkStatus = 'ACTIVE' | 'CLOSED';

export type LateSubmissionPolicy = 'ALLOW_LATE' | 'REJECT_LATE';

export type FileResourceCategory =
  | 'PROFILE_PHOTO'
  | 'HOMEWORK_ATTACHMENT'
  | 'HOMEWORK_SUBMISSION'
  | 'STUDENT_DOCUMENT'
  | 'STAFF_DOCUMENT'
  | 'NOTICE_ATTACHMENT'
  | 'GENERAL_ORGANIZATION_FILE'
  | string;

export interface StoredFileResponse {
  id: number;
  fileUid: string;
  organizationId: number | null;
  uploadedByUserId: number;
  category: FileResourceCategory;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string | null;
  downloadUrl: string | null;
  createdAt: string;
}

export type GuardianRelationshipType =
  | 'FATHER'
  | 'MOTHER'
  | 'LEGAL_GUARDIAN'
  | 'GRANDPARENT'
  | 'SIBLING'
  | 'OTHER'
  | string;

export type EnrollmentStatus =
  | 'ACTIVE'
  | 'PROMOTED'
  | 'GRADUATED'
  | 'TRANSFERRED'
  | 'WITHDRAWN'
  | 'DROPPED'
  | string;

export interface LinkedChildSummaryResponse {
  studentId: number;
  organizationId: number;
  organizationName: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  studentStatus: string;
  profilePhotoFileId: number | null;
  profilePhotoUrl: string | null;
  relationshipType: GuardianRelationshipType;
  primaryContact: boolean;
  emergencyContact: boolean;
  receiveNotifications: boolean;
  academicSessionId: number | null;
  academicSessionName: string | null;
  classId: number | null;
  className: string | null;
  sectionId?: number | null;
  sectionName?: string | null;
  rollNumber: string | null;
  enrollmentStatus: EnrollmentStatus | null;
}

export interface StudentAttendanceSummaryResponse {
  studentId: number;
  admissionNumber: string;
  studentName: string;
  totalRecordedDays: number;
  holidayDays: number;
  excusedDays: number;
  applicableWorkingDays: number;
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  absentCount: number;
  attendancePercentage: number;
}

export interface StudentAttendanceResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  classId: number;
  className: string | null;
  enrollmentId: number;
  studentId: number;
  admissionNumber: string;
  studentFirstName: string;
  studentLastName: string | null;
  attendanceDate: string;
  status: StudentAttendanceStatus;
  markedBy?: number | null;
  updatedBy?: number | null;
  remarks: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface MonthlyAttendanceSummaryItem {
  yearMonth: string;
  applicableWorkingDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  excusedDays: number;
  holidayDays: number;
  attendancePercentage: number;
}

export interface AttendanceAuditLogResponse {
  id: number;
  organizationId: number;
  targetType: string;
  attendanceRecordId: number;
  targetPersonId: number;
  attendanceDate: string;
  previousStatus: string | null;
  newStatus: string;
  previousRemarks: string | null;
  newRemarks: string | null;
  changedBy: number | null;
  correctionReason: string | null;
  changedAt: string;
}

export interface ParentChildAttendanceResponse {
  studentId: number;
  admissionNumber: string;
  studentName: string;
  academicSessionId: number;
  academicSessionName: string;
  overallSummary: StudentAttendanceSummaryResponse | null;
  monthlySummaries: MonthlyAttendanceSummaryItem[];
  dailyRecords: StudentAttendanceResponse[];
  recentAttendanceUpdates: AttendanceAuditLogResponse[];
}

export interface ChildAttendanceQueryParams {
  academicSessionId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  year?: number | null;
  month?: number | null;
}

export interface StudentHomeworkSubmissionResponse {
  submissionId: number | null;
  organizationId: number;
  academicSessionId: number;
  homeworkId: number;
  homeworkTitle: string;
  homeworkDescription: string;
  classId: number;
  className: string | null;
  subjectId: number;
  subjectName: string | null;
  teacherId: number | null;
  teacherName: string | null;
  assignedDate: string;
  dueDate: string;
  maxMarks: number | null;
  allowResubmission: boolean;
  lateSubmissionPolicy?: LateSubmissionPolicy | null;
  referenceAttachments?: string[] | null;
  enrollmentId?: number | null;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  status: HomeworkSubmissionStatus;
  submissionText?: string | null;
  submissionAttachments?: string[] | null;
  submissionDate?: string | null;
  submittedAt: string | null;
  lastResubmittedAt?: string | null;
  submissionCount?: number;
  lateSubmission: boolean;
  marksAwarded: number | null;
  teacherFeedback: string | null;
  evaluatedBy?: number | null;
  evaluatedAt?: string | null;
}

export interface StudentHomeworkDashboardResponse {
  organizationId: number;
  academicSessionId: number;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  referenceDate: string;
  totalAssignedCount: number;
  pendingCount: number;
  overdueCount: number;
  submittedCount: number;
  evaluatedCount: number;
  assignments: StudentHomeworkSubmissionResponse[];
}

export interface ParentChildHomeworkDetailResponse {
  submission: StudentHomeworkSubmissionResponse;
  teacherAttachments: StoredFileResponse[];
  studentSubmissionFiles: StoredFileResponse[];
}

export type ExaminationStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PUBLISHED';

export type ExaminationType =
  | 'UNIT_TEST'
  | 'MONTHLY_TEST'
  | 'QUARTERLY'
  | 'MID_TERM'
  | 'HALF_YEARLY'
  | 'ANNUAL'
  | 'PRACTICAL'
  | 'FINAL'
  | 'OTHER';

export type MarkEntryStatus = 'PRESENT' | 'ABSENT' | 'EXEMPTED';

export type ReportCardExportFormat = 'PDF' | 'CSV' | 'EXCEL';

export interface ExamScheduleResponse {
  id: number;
  organizationId: number;
  examinationId: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string | null;
  examDate: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  passingMarks: number;
  invigilatorTeacherId: number | null;
  room: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExaminationResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  gradingScaleId?: number | null;
  gradingScaleName?: string | null;
  name: string;
  examType: ExaminationType | string;
  startDate: string;
  endDate: string;
  status: ExaminationStatus | string;
  instructions: string | null;
  finalizedAt?: string | null;
  publishedAt?: string | null;
  publishedBy?: number | null;
  schedules?: ExamScheduleResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamMarkResponse {
  id: number;
  organizationId: number;
  examinationId: number;
  examScheduleId: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string | null;
  studentId: number;
  admissionNumber: string;
  studentFirstName: string;
  studentLastName: string | null;
  entryStatus: MarkEntryStatus | string;
  marksObtained: number | null;
  maxMarks: number;
  passingMarks: number;
  grade: string | null;
  passed: boolean;
  enteredBy: number | null;
  updatedBy: number | null;
  remarks: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportCardResponse {
  examinationId: number;
  examinationName: string;
  examType: ExaminationType | string;
  examinationStatus: ExaminationStatus | string;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  totalObtainedMarks: number;
  totalMaxMarks: number;
  percentage: number;
  overallGrade: string | null;
  overallPassed: boolean;
  subjectMarks?: ExamMarkResponse[];
}

export interface ParentChildExaminationsResponse {
  studentId: number;
  admissionNumber: string;
  studentName: string;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  upcomingExaminations: ExaminationResponse[];
  publishedResults: ReportCardResponse[];
}
export interface PaymentAllocationResponse {
  id: number;
  demandId: number;
  componentCode: string;
  componentName: string;
  periodLabel: string;
  allocatedAmount: number;
  reversed: boolean;
}

export interface FeePaymentReceiptResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  receiptNumber: string;
  paymentDate: string;
  totalAmount: number;
  allocatedAmount: number;
  unappliedCreditAmount: number;
  refundedAmount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  allocations: PaymentAllocationResponse[];
}

export interface AnnouncementResponse {
  id: number;
  organizationId: number;
  academicSessionId: number | null;
  title: string;
  description: string;
  status: string;
  targetAudience: string;
  important: boolean;
  publicationDate: string;
  expiryDate: string | null;
  publishedAt: string | null;
}

export interface ChildDashboardCard {
  child: LinkedChildSummaryResponse;
  attendanceSummary: StudentAttendanceSummaryResponse | null;
  recentAttendance: StudentAttendanceResponse[];
  pendingHomeworkCount: number;
  overdueHomeworkCount: number;
  submittedHomeworkCount: number;
  evaluatedHomeworkCount: number;
  upcomingHomeworkDeadlines: StudentHomeworkSubmissionResponse[];
  upcomingExaminations: ExaminationResponse[];
  recentlyPublishedResults: ReportCardResponse[];
  totalNetPayableFees: number;
  totalPaidFees: number;
  outstandingFeeDues: number;
  overdueFeeDues: number;
  recentPayments: FeePaymentReceiptResponse[];
}

export interface ParentDashboardResponse {
  organizationId: number;
  organizationName: string;
  guardianId: number;
  guardianName: string;
  guardianEmail: string | null;
  guardianPhone: string | null;
  academicSessionId: number | null;
  academicSessionName: string | null;
  referenceDate: string;
  totalLinkedChildren: number;
  totalPendingHomeworkCount: number;
  totalUpcomingExaminationsCount: number;
  totalOutstandingFeeDues: number;
  unreadNotificationCount: number;
  children: ChildDashboardCard[];
  recentAnnouncements: AnnouncementResponse[];
  recentNotifications: NotificationItem[];
}

export interface StudentEnrollmentInfo {
  id: number;
  organizationId: number;
  studentId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  classCode: string | null;
  sectionId: number | null;
  sectionName: string | null;
  rollNumber: string | null;
  enrollmentDate: string | null;
  status: EnrollmentStatus;
}

export interface ParentChildDetailResponse {
  profilePhotoFileId: number | null;
  profilePhotoUrl: string | null;
  callerRelationshipType: GuardianRelationshipType;
  currentEnrollment: StudentEnrollmentInfo | null;
  enrollmentHistory: StudentEnrollmentInfo[];
}

export type DayOfWeekName =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface TimetableSlotResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  classTimetableId: number;
  classId: number;
  className: string | null;
  sectionId: number | null;
  sectionName: string | null;
  dayOfWeek: DayOfWeekName;
  periodId: number;
  periodName: string;
  periodOrder: number;
  startTime: string;
  endTime: string;
  subjectId: number | null;
  subjectName: string | null;
  subjectCode: string | null;
  teacherId: number | null;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  room: string | null;
  remarks: string | null;
}

export interface ClassTimetableResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  classCode: string | null;
  sectionId: number | null;
  sectionName: string | null;
  timetableConfigId: number;
  timetableConfigName: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  slots: TimetableSlotResponse[];
}

