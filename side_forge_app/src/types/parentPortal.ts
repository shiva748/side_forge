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
export type FeeDemandStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'WAIVED'
  | 'CANCELLED'
  | string;

export type FeePaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'CARD'
  | 'OTHER'
  | string;

export type FeePaymentStatus =
  | 'COMPLETED'
  | 'REVERSED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | string;

export type FeeCategory =
  | 'TUITION'
  | 'DEVELOPMENT'
  | 'EXAMINATION'
  | 'ADMISSION'
  | 'TRANSPORT'
  | 'LIBRARY'
  | 'LAB'
  | 'SPORTS'
  | 'OTHER'
  | string;

export type FeeFrequency = 'MONTHLY' | 'YEARLY' | 'ONE_TIME' | string;

export type ConcessionType =
  | 'PERCENTAGE'
  | 'FIXED_AMOUNT'
  | 'FULL_WAIVER'
  | 'PARTIAL_WAIVER'
  | string;

export type LateFeeType = 'NONE' | 'FIXED_AMOUNT' | 'PER_DAY' | string;

export type OneTimeTriggerCondition =
  | 'ON_ADMISSION'
  | 'ON_ENROLLMENT'
  | 'MANUAL'
  | string;

export type FeeStructureStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;

export type FeeReceiptExportFormat = 'PDF' | 'CSV' | 'EXCEL';

export interface FeeComponentResponse {
  id: number;
  name: string;
  code: string;
  category: FeeCategory;
  frequency: FeeFrequency;
  amount: number;
  applicableMonths: number[] | null;
  dueDayOfMonth: number | null;
  dueDate: string | null;
  oneTimeTrigger: OneTimeTriggerCondition | null;
  lateFeeType: LateFeeType | null;
  lateFeeAmount: number | null;
  lateFeeGraceDays: number;
  lateFeeCap: number | null;
  optionalComponent: boolean;
  displayOrder: number;
}

export interface ClassFeeStructureResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  name: string;
  versionNumber: number;
  status: FeeStructureStatus;
  effectiveFromDate: string | null;
  publishedAt: string | null;
  publishedBy: number | null;
  notes: string | null;
  totalMonthlyAmount: number;
  totalYearlyAmount: number;
  totalOneTimeAmount: number;
  totalAnnualEstimatedAmount: number;
  components: FeeComponentResponse[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ConcessionResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  studentId: number;
  enrollmentId: number;
  componentCode: string | null;
  concessionType: ConcessionType;
  value: number;
  applicableFromMonth: number | null;
  applicableToMonth: number | null;
  reason: string;
  approvedBy: number | null;
  approvedAt: string | null;
  active: boolean;
}

export interface StudentFeeDemandResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  classId: number;
  className: string | null;
  enrollmentId: number;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  feeStructureId: number;
  feeStructureVersion: number;
  componentId: number;
  componentCode: string;
  componentName: string;
  category: FeeCategory;
  frequency: FeeFrequency;
  billingYear: number;
  billingMonth: number;
  periodLabel: string;
  dueDate: string;
  baseAmount: number;
  concessionAmount: number;
  lateFeeAmount: number;
  netPayableAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: FeeDemandStatus;
  remarks: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  enrollmentId?: number | null;
  receiptNumber: string;
  idempotencyKey?: string | null;
  paymentDate: string;
  totalAmount: number;
  allocatedAmount: number;
  unappliedCreditAmount: number;
  refundedAmount: number;
  paymentMethod: FeePaymentMethod;
  referenceNumber: string | null;
  status: FeePaymentStatus;
  recordedBy?: number | null;
  reversedBy?: number | null;
  reversedAt?: string | null;
  reversalReason?: string | null;
  remarks?: string | null;
  allocations: PaymentAllocationResponse[];
  createdAt?: string | null;
}

export interface StudentFinancialProfileResponse {
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  enrollmentId: number;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  assignedFeeStructure: ClassFeeStructureResponse | null;
  assignedFeeStructureVersion: number | null;
  monthlyDemands: StudentFeeDemandResponse[];
  yearlyAndOneTimeDemands: StudentFeeDemandResponse[];
  concessions: ConcessionResponse[];
  totalBaseFees: number;
  totalConcessionsAndWaivers: number;
  totalLateFees: number;
  totalNetPayableFees: number;
  totalPaidAmount: number;
  unappliedAccountCredit: number;
  totalOutstandingBalance: number;
  totalOverdueAmount: number;
  paymentHistory: FeePaymentReceiptResponse[];
}

export interface ParentConsolidatedFeesResponse {
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  totalBaseAmount: number;
  totalConcessionAmount: number;
  totalLateFeeAmount: number;
  totalNetPayableAmount: number;
  totalPaidAmount: number;
  totalUnappliedCreditAmount: number;
  totalOutstandingAmount: number;
  totalOverdueAmount: number;
  childrenFinancialProfiles: StudentFinancialProfileResponse[];
}

export interface ChildFeesQueryParams {
  academicSessionId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type OfflinePaymentSubmissionStatus =
  | 'PENDING_VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | string;

export interface SchoolOfflinePaymentInstructionsResponse {
  organizationId: number;
  organizationName: string;
  payeeName: string | null;
  upiId: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  branchOrAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  supportedMethods: FeePaymentMethod[];
  instructionsNote: string | null;
}

export interface SubmitOfflineFeePaymentRequest {
  academicSessionId?: number | null;
  paymentDate: string;
  amount: number;
  paymentMethod: FeePaymentMethod;
  utrOrReferenceNumber: string;
  targetDemandIds?: number[] | null;
  remarks?: string | null;
}

export interface ParentFeePaymentSubmissionResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  studentId: number;
  admissionNumber: string | null;
  studentName: string | null;
  enrollmentId: number;
  submittedByUserId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: FeePaymentMethod;
  utrOrReferenceNumber: string;
  targetDemandIds: number[];
  remarks: string | null;
  status: OfflinePaymentSubmissionStatus;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewRemarks: string | null;
  approvedPaymentId: number | null;
  approvedReceiptNumber: string | null;
  proofFiles: StoredFileResponse[];
  createdAt: string | null;
}

export interface ParentChildOfflinePaymentOverviewResponse {
  studentId: number;
  studentName: string | null;
  academicSessionId: number;
  academicSessionName: string | null;
  paymentInstructions: SchoolOfflinePaymentInstructionsResponse;
  submissions: ParentFeePaymentSubmissionResponse[];
}

export interface PickedPaymentProofAsset {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number | null;
  webFile?: File | null;
}

export type AnnouncementAudience =
  | 'ALL'
  | 'PARENTS'
  | 'STUDENTS'
  | 'TEACHERS'
  | 'STAFF'
  | 'SPECIFIC_CLASSES'
  | 'SPECIFIC_STUDENTS';

export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED';

export interface ParentAnnouncementsQueryParams {
  importantOnly?: boolean | null;
  referenceDate?: string | null;
}

export interface AnnouncementResponse {
  id: number;
  organizationId: number;
  academicSessionId: number | null;
  title: string;
  description: string;
  status: AnnouncementStatus | string;
  targetAudience: AnnouncementAudience | string;
  targetClassIds?: number[];
  targetStudentIds?: number[];
  important: boolean;
  publicationDate: string;
  expiryDate: string | null;
  publishedAt: string | null;
  publishedBy?: number | null;
  createdBy?: number | null;
  attachments?: StoredFileResponse[];
  createdAt?: string | null;
  updatedAt?: string | null;
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

export type PeriodType =
  | 'TEACHING'
  | 'SHORT_BREAK'
  | 'LUNCH_BREAK'
  | 'ASSEMBLY';

export type TimetableStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ChildTimetableUnavailableKind =
  | 'NOT_PUBLISHED'
  | 'NOT_CONFIGURED'
  | 'NOT_ENROLLED'
  | 'UNAVAILABLE';

export interface TimetablePeriodResponse {
  id: number;
  organizationId: number;
  timetableConfigId: number;
  name: string;
  periodOrder: number;
  startTime: string;
  endTime: string;
  periodType: PeriodType;
  breakPeriod: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TimetableConfigResponse {
  id: number;
  organizationId: number;
  name: string;
  workingDays: DayOfWeekName[];
  dayStartTime: string;
  dayEndTime: string;
  description: string | null;
  active: boolean;
  periods: TimetablePeriodResponse[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

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
  createdAt?: string | null;
  updatedAt?: string | null;
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
  status: TimetableStatus | string;
  revisionNumber?: number | null;
  publishedAt?: string | null;
  publishedBy?: number | null;
  notes?: string | null;
  slots: TimetableSlotResponse[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

