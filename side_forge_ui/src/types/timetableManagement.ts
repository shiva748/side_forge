import type { BadgeVariant } from '../components/ui/Badge';

export type DayOfWeek =
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

export const ALL_DAYS_OF_WEEK: {
  value: DayOfWeek;
  label: string;
  fullLabel: string;
  shortLabel: string;
  order: number;
}[] = [
  {
    value: 'MONDAY',
    label: 'Monday',
    fullLabel: 'Monday',
    shortLabel: 'Mon',
    order: 1,
  },
  {
    value: 'TUESDAY',
    label: 'Tuesday',
    fullLabel: 'Tuesday',
    shortLabel: 'Tue',
    order: 2,
  },
  {
    value: 'WEDNESDAY',
    label: 'Wednesday',
    fullLabel: 'Wednesday',
    shortLabel: 'Wed',
    order: 3,
  },
  {
    value: 'THURSDAY',
    label: 'Thursday',
    fullLabel: 'Thursday',
    shortLabel: 'Thu',
    order: 4,
  },
  {
    value: 'FRIDAY',
    label: 'Friday',
    fullLabel: 'Friday',
    shortLabel: 'Fri',
    order: 5,
  },
  {
    value: 'SATURDAY',
    label: 'Saturday',
    fullLabel: 'Saturday',
    shortLabel: 'Sat',
    order: 6,
  },
  {
    value: 'SUNDAY',
    label: 'Sunday',
    fullLabel: 'Sunday',
    shortLabel: 'Sun',
    order: 7,
  },
];

export const DAY_OF_WEEK_LABELS: Record<
  DayOfWeek,
  { fullLabel: string; shortLabel: string }
> = {
  MONDAY: { fullLabel: 'Monday', shortLabel: 'Mon' },
  TUESDAY: { fullLabel: 'Tuesday', shortLabel: 'Tue' },
  WEDNESDAY: { fullLabel: 'Wednesday', shortLabel: 'Wed' },
  THURSDAY: { fullLabel: 'Thursday', shortLabel: 'Thu' },
  FRIDAY: { fullLabel: 'Friday', shortLabel: 'Fri' },
  SATURDAY: { fullLabel: 'Saturday', shortLabel: 'Sat' },
  SUNDAY: { fullLabel: 'Sunday', shortLabel: 'Sun' },
};

export const DAY_OF_WEEK_SHORT_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

export const PERIOD_TYPE_META: Record<
  PeriodType,
  {
    label: string;
    variant: BadgeVariant;
    isTeaching: boolean;
    isBreak: boolean;
    description: string;
  }
> = {
  TEACHING: {
    label: 'Teaching Period',
    variant: 'primary',
    isTeaching: true,
    isBreak: false,
    description: 'Regular academic subject teaching slot.',
  },
  SHORT_BREAK: {
    label: 'Short Break',
    variant: 'warning',
    isTeaching: false,
    isBreak: true,
    description: 'Recess or short interval between teaching periods.',
  },
  LUNCH_BREAK: {
    label: 'Lunch Break',
    variant: 'warning',
    isTeaching: false,
    isBreak: true,
    description: 'Midday meal break (non-teaching slot).',
  },
  ASSEMBLY: {
    label: 'Assembly',
    variant: 'info',
    isTeaching: false,
    isBreak: false,
    description: 'Morning assembly or homeroom gathering (non-teaching slot).',
  },
};

export const TIMETABLE_STATUS_META: Record<
  TimetableStatus,
  { label: string; variant: BadgeVariant; description: string }
> = {
  DRAFT: {
    label: 'Draft',
    variant: 'warning',
    description:
      'Editable working draft. Add, update, or remove period slots before publishing.',
  },
  PUBLISHED: {
    label: 'Published',
    variant: 'success',
    description:
      'Official published class timetable visible to teachers, staff, students, and parents. Reopen for revision to modify slots.',
  },
  ARCHIVED: {
    label: 'Archived',
    variant: 'neutral',
    description: 'Historical archived timetable.',
  },
};

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
  createdAt: string;
  updatedAt: string;
}

export interface TimetableConfigResponse {
  id: number;
  organizationId: number;
  name: string;
  workingDays: DayOfWeek[];
  dayStartTime: string;
  dayEndTime: string;
  description: string | null;
  active: boolean;
  periods: TimetablePeriodResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimetableConfigRequest {
  name: string;
  workingDays: DayOfWeek[];
  dayStartTime: string;
  dayEndTime: string;
  description?: string | null;
}

export interface UpdateTimetableConfigRequest {
  name: string;
  workingDays: DayOfWeek[];
  dayStartTime: string;
  dayEndTime: string;
  description?: string | null;
  active?: boolean;
}

export interface CreateTimetablePeriodRequest {
  name: string;
  periodOrder: number;
  startTime: string;
  endTime: string;
  periodType: PeriodType;
}

export interface UpdateTimetablePeriodRequest {
  name: string;
  periodOrder: number;
  startTime: string;
  endTime: string;
  periodType: PeriodType;
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
  dayOfWeek: DayOfWeek;
  periodId: number;
  periodName: string | null;
  periodOrder: number | null;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName: string | null;
  subjectCode: string | null;
  teacherId: number;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  room: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
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
  status: TimetableStatus;
  revisionNumber: number;
  publishedAt: string | null;
  publishedBy: number | null;
  notes: string | null;
  slots: TimetableSlotResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassTimetableRequest {
  academicSessionId: number;
  classId: number;
  sectionId?: number | null;
  timetableConfigId: number;
  notes?: string | null;
}

export interface CreateTimetableSlotRequest {
  dayOfWeek: DayOfWeek;
  periodId: number;
  subjectId: number;
  teacherId: number;
  room?: string | null;
  remarks?: string | null;
}

export interface UpdateTimetableSlotRequest {
  dayOfWeek: DayOfWeek;
  periodId: number;
  subjectId: number;
  teacherId: number;
  room?: string | null;
  remarks?: string | null;
}

export function toTimeInputValue(time?: string | null): string {
  if (!time) return '';
  return time.trim().slice(0, 5);
}

export function formatLocalTime(time?: string | null): string {
  if (!time) return '—';
  const hhmm = time.trim().slice(0, 5);
  const parts = hhmm.split(':').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return hhmm;
  const [h, m] = parts;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function timesOverlap(
  s1?: string | null,
  e1?: string | null,
  s2?: string | null,
  e2?: string | null
): boolean {
  if (!s1 || !e1 || !s2 || !e2) return false;
  const aStart = toTimeInputValue(s1);
  const aEnd = toTimeInputValue(e1);
  const bStart = toTimeInputValue(s2);
  const bEnd = toTimeInputValue(e2);
  return aStart < bEnd && bStart < aEnd;
}

export function formatSlotTeacherName(
  slot: Pick<
    TimetableSlotResponse,
    'teacherFirstName' | 'teacherLastName' | 'teacherId'
  >
): string {
  const full = [slot.teacherFirstName, slot.teacherLastName]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ');
  return full || `Teacher #${slot.teacherId}`;
}

export function sortWorkingDays(days: DayOfWeek[]): DayOfWeek[] {
  const orderMap = new Map(ALL_DAYS_OF_WEEK.map((d) => [d.value, d.order]));
  return [...days].sort(
    (a, b) => (orderMap.get(a) ?? 99) - (orderMap.get(b) ?? 99)
  );
}

