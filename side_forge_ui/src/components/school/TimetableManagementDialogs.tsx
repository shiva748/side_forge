import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type {
  AcademicSessionResponse,
  ClassSubjectResponse,
  SchoolClassResponse,
  SectionResponse,
  SubjectResponse,
} from '../../types/academicManagement';
import type {
  StaffResponse,
  TeacherResponse,
  TeacherSubjectAssignmentResponse,
} from '../../types/staffManagement';
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
  PeriodType,
  sortWorkingDays,
  timesOverlap,
  TimetableConfigResponse,
  TimetablePeriodResponse,
  TimetableSlotResponse,
  toTimeInputValue,
  UpdateTimetableConfigRequest,
  UpdateTimetablePeriodRequest,
  UpdateTimetableSlotRequest,
} from '../../types/timetableManagement';
import { Badge, IdLabel } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { FormField, Input, Select, Textarea } from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

// ============================================================================
// 1. Create / Edit Timetable Configuration Dialog (Working Days & Working Hours)
// ============================================================================

export interface TimetableConfigFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingConfig: TimetableConfigResponse | null;
  hasPublishedDependents?: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (
    payload: CreateTimetableConfigRequest | UpdateTimetableConfigRequest
  ) => Promise<void>;
}

const DEFAULT_WORKING_DAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

export const TimetableConfigFormDialog: React.FC<
  TimetableConfigFormDialogProps
> = ({
  open,
  onClose,
  editingConfig,
  hasPublishedDependents = false,
  isSubmitting,
  errorMessage,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [workingDays, setWorkingDays] =
    useState<DayOfWeek[]>(DEFAULT_WORKING_DAYS);
  const [dayStartTime, setDayStartTime] = useState('08:00');
  const [dayEndTime, setDayEndTime] = useState('14:30');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingConfig) {
      setName(editingConfig.name || '');
      setWorkingDays(
        editingConfig.workingDays?.length
          ? sortWorkingDays(editingConfig.workingDays)
          : DEFAULT_WORKING_DAYS
      );
      setDayStartTime(toTimeInputValue(editingConfig.dayStartTime) || '08:00');
      setDayEndTime(toTimeInputValue(editingConfig.dayEndTime) || '14:30');
      setDescription(editingConfig.description || '');
      setActive(editingConfig.active);
    } else {
      setName('');
      setWorkingDays(DEFAULT_WORKING_DAYS);
      setDayStartTime('08:00');
      setDayEndTime('14:30');
      setDescription('');
      setActive(true);
    }
    setValidationError(null);
  }, [editingConfig, open]);

  const toggleDay = (day: DayOfWeek) => {
    setWorkingDays((prev) => {
      const exists = prev.includes(day);
      const next = exists ? prev.filter((d) => d !== day) : [...prev, day];
      return sortWorkingDays(next);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError('Configuration name is required.');
      return;
    }
    if (trimmedName.length > 100) {
      setValidationError('Configuration name must not exceed 100 characters.');
      return;
    }
    if (workingDays.length === 0) {
      setValidationError('Please select at least one school working day.');
      return;
    }
    if (!dayStartTime || !dayEndTime || dayStartTime >= dayEndTime) {
      setValidationError('School start time must be earlier than school end time.');
      return;
    }

    if (editingConfig && editingConfig.periods?.length > 0) {
      for (const p of editingConfig.periods) {
        const pStart = toTimeInputValue(p.startTime);
        const pEnd = toTimeInputValue(p.endTime);
        if (pStart < dayStartTime || pEnd > dayEndTime) {
          setValidationError(
            `Updated working hours (${dayStartTime}–${dayEndTime}) would invalidate existing period "${p.name}" (${pStart}–${pEnd}). Adjust the period timings first.`
          );
          return;
        }
      }
    }

    setValidationError(null);
    await onSubmit({
      name: trimmedName,
      workingDays: sortWorkingDays(workingDays),
      dayStartTime,
      dayEndTime,
      description: description.trim() || null,
      ...(editingConfig ? { active } : {}),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        editingConfig
          ? 'Edit Timetable Configuration'
          : 'Create Timetable Configuration'
      }
      description={
        editingConfig
          ? `Modify working days and school hours for "${editingConfig.name}".`
          : 'Define a reusable timetable structure with working weekdays, school hours, and period slots.'
      }
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="timetable-config-form"
            variant="primary"
            disabled={editingConfig !== null && hasPublishedDependents}
            isLoading={isSubmitting}
          >
            {editingConfig ? 'Save Changes' : 'Create Configuration'}
          </Button>
        </>
      }
    >
      <form
        id="timetable-config-form"
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {(errorMessage || validationError) && (
          <InlineAlert variant="error" title="Unable to save configuration">
            {validationError || errorMessage}
          </InlineAlert>
        )}

        {editingConfig && hasPublishedDependents && (
          <InlineAlert
            variant="warning"
            title="Locked by Published Class Timetable"
          >
            One or more published class timetables currently depend on{' '}
            <strong>{editingConfig.name}</strong>. Reopen those timetables to
            DRAFT first if you need to modify working days or school hours.
          </InlineAlert>
        )}

        <FormField
          label="Configuration Name"
          htmlFor="tt-cfg-name"
          required
          hint="E.g., Primary Wing Schedule, Senior Secondary (Mon–Sat)."
        >
          <Input
            id="tt-cfg-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Standard School Day (Mon–Sat)"
            maxLength={100}
            required
          />
        </FormField>

        <FormField
          label="School Working Days"
          htmlFor="tt-cfg-days"
          required
          hint="Select all weekdays on which classes are conducted."
        >
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS_OF_WEEK.map((day) => {
                const selected = workingDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      selected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-400">Quick presets:</span>
              <button
                type="button"
                onClick={() =>
                  setWorkingDays([
                    'MONDAY',
                    'TUESDAY',
                    'WEDNESDAY',
                    'THURSDAY',
                    'FRIDAY',
                  ])
                }
                className="font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Mon–Fri (5 days)
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setWorkingDays(DEFAULT_WORKING_DAYS)}
                className="font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Mon–Sat (6 days)
              </button>
            </div>
          </div>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField
            label="School Day Start Time"
            htmlFor="tt-cfg-start"
            required
          >
            <Input
              id="tt-cfg-start"
              type="time"
              value={dayStartTime}
              onChange={(e) => setDayStartTime(e.target.value)}
              required
            />
          </FormField>

          <FormField
            label="School Day End Time"
            htmlFor="tt-cfg-end"
            required
          >
            <Input
              id="tt-cfg-end"
              type="time"
              value={dayEndTime}
              onChange={(e) => setDayEndTime(e.target.value)}
              required
            />
          </FormField>
        </div>

        {editingConfig && (
          <FormField
            label="Configuration Status"
            htmlFor="tt-cfg-active"
            hint="Inactive configurations cannot be assigned to new class timetables."
          >
            <Select
              id="tt-cfg-active"
              value={active ? 'true' : 'false'}
              onChange={(e) => setActive(e.target.value === 'true')}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </FormField>
        )}

        <FormField label="Description (Optional)" htmlFor="tt-cfg-desc">
          <Textarea
            id="tt-cfg-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about bell timings or shift..."
            maxLength={500}
          />
        </FormField>
      </form>
    </Dialog>
  );
};

// ============================================================================
// 2. Add / Edit Timetable Period or Break Dialog
// ============================================================================

export interface TimetablePeriodFormDialogProps {
  open: boolean;
  onClose: () => void;
  config: TimetableConfigResponse | null;
  editingPeriod: TimetablePeriodResponse | null;
  hasPublishedDependents?: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (
    payload: CreateTimetablePeriodRequest | UpdateTimetablePeriodRequest
  ) => Promise<void>;
}

function addMinutesToTime(hhmm: string, minutesToAdd: number): string {
  const parts = hhmm.split(':').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return hhmm;
  const totalMins = parts[0] * 60 + parts[1] + minutesToAdd;
  const clamped = Math.min(23 * 60 + 59, Math.max(0, totalMins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const TimetablePeriodFormDialog: React.FC<
  TimetablePeriodFormDialogProps
> = ({
  open,
  onClose,
  config,
  editingPeriod,
  hasPublishedDependents = false,
  isSubmitting,
  errorMessage,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [periodOrder, setPeriodOrder] = useState('1');
  const [periodType, setPeriodType] = useState<PeriodType>('TEACHING');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:45');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !config) return;
    if (editingPeriod) {
      setName(editingPeriod.name || '');
      setPeriodOrder(String(editingPeriod.periodOrder));
      setPeriodType(editingPeriod.periodType);
      setStartTime(toTimeInputValue(editingPeriod.startTime));
      setEndTime(toTimeInputValue(editingPeriod.endTime));
    } else {
      const existing = config.periods || [];
      const nextOrder =
        existing.length > 0
          ? Math.max(...existing.map((p) => p.periodOrder)) + 1
          : 1;
      const teachingCount = existing.filter(
        (p) => p.periodType === 'TEACHING'
      ).length;
      const lastPeriod =
        existing.length > 0 ? existing[existing.length - 1] : null;
      const suggestedStart = lastPeriod
        ? toTimeInputValue(lastPeriod.endTime)
        : toTimeInputValue(config.dayStartTime) || '08:00';
      const maxEnd = toTimeInputValue(config.dayEndTime) || '14:30';
      const suggestedEnd =
        addMinutesToTime(suggestedStart, 45) <= maxEnd
          ? addMinutesToTime(suggestedStart, 45)
          : maxEnd;

      setName(`Period ${teachingCount + 1}`);
      setPeriodOrder(String(nextOrder));
      setPeriodType('TEACHING');
      setStartTime(suggestedStart);
      setEndTime(suggestedEnd);
    }
    setValidationError(null);
  }, [config, editingPeriod, open]);

  if (!config) return null;

  const dayStart = toTimeInputValue(config.dayStartTime);
  const dayEnd = toTimeInputValue(config.dayEndTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError('Period name is required.');
      return;
    }
    if (trimmedName.length > 100) {
      setValidationError('Period name must not exceed 100 characters.');
      return;
    }

    const parsedOrder = Number(periodOrder);
    if (
      !periodOrder.trim() ||
      Number.isNaN(parsedOrder) ||
      !Number.isInteger(parsedOrder) ||
      parsedOrder <= 0
    ) {
      setValidationError('Period order must be a positive whole number.');
      return;
    }

    if (!startTime || !endTime || startTime >= endTime) {
      setValidationError('Period start time must be earlier than period end time.');
      return;
    }

    if (startTime < dayStart || endTime > dayEnd) {
      setValidationError(
        `Period timings (${startTime}–${endTime}) must fall within configured school working hours (${dayStart}–${dayEnd}).`
      );
      return;
    }

    for (const existing of config.periods || []) {
      if (editingPeriod && existing.id === editingPeriod.id) continue;
      if (existing.name.toLowerCase() === trimmedName.toLowerCase()) {
        setValidationError(
          `A period named "${existing.name}" already exists in this configuration.`
        );
        return;
      }
      if (existing.periodOrder === parsedOrder) {
        setValidationError(
          `Period order #${parsedOrder} is already used by "${existing.name}".`
        );
        return;
      }
      if (
        timesOverlap(existing.startTime, existing.endTime, startTime, endTime)
      ) {
        setValidationError(
          `Period timings (${startTime}–${endTime}) overlap with existing period "${
            existing.name
          }" (${toTimeInputValue(existing.startTime)}–${toTimeInputValue(
            existing.endTime
          )}).`
        );
        return;
      }
    }

    setValidationError(null);
    await onSubmit({
      name: trimmedName,
      periodOrder: parsedOrder,
      startTime,
      endTime,
      periodType,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingPeriod ? 'Edit Period / Break' : 'Add Period or Break'}
      description={`Configuration: ${config.name} (Working Hours: ${formatLocalTime(
        config.dayStartTime
      )} – ${formatLocalTime(config.dayEndTime)})`}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="timetable-period-form"
            variant="primary"
            disabled={editingPeriod !== null && hasPublishedDependents}
            isLoading={isSubmitting}
          >
            {editingPeriod ? 'Save Period' : 'Add Period'}
          </Button>
        </>
      }
    >
      <form
        id="timetable-period-form"
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {(errorMessage || validationError) && (
          <InlineAlert variant="error" title="Unable to save period">
            {validationError || errorMessage}
          </InlineAlert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Period / Slot Type" htmlFor="tt-per-type" required>
            <Select
              id="tt-per-type"
              value={periodType}
              onChange={(e) => {
                const nextType = e.target.value as PeriodType;
                setPeriodType(nextType);
                if (!editingPeriod) {
                  if (nextType === 'SHORT_BREAK') setName('Short Break');
                  else if (nextType === 'LUNCH_BREAK') setName('Lunch Break');
                  else if (nextType === 'ASSEMBLY') setName('Morning Assembly');
                }
              }}
            >
              {(Object.keys(PERIOD_TYPE_META) as PeriodType[]).map((t) => (
                <option key={t} value={t}>
                  {PERIOD_TYPE_META[t].label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Display Order"
            htmlFor="tt-per-order"
            required
            hint="Chronological slot order."
          >
            <Input
              id="tt-per-order"
              type="number"
              min={1}
              step={1}
              value={periodOrder}
              onChange={(e) => setPeriodOrder(e.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField
          label="Period / Break Label"
          htmlFor="tt-per-name"
          required
          hint="E.g., Period 1, Recess, Lunch Break, Assembly."
        >
          <Input
            id="tt-per-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Period 1"
            maxLength={100}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField
            label="Start Time"
            htmlFor="tt-per-start"
            required
            hint={`Min: ${dayStart}`}
          >
            <Input
              id="tt-per-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </FormField>

          <FormField
            label="End Time"
            htmlFor="tt-per-end"
            required
            hint={`Max: ${dayEnd}`}
          >
            <Input
              id="tt-per-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
};

// ============================================================================
// 3. Create Draft Class Timetable Dialog
// ============================================================================

export interface CreateClassTimetableDialogProps {
  open: boolean;
  onClose: () => void;
  sessions: AcademicSessionResponse[];
  classes: SchoolClassResponse[];
  sections?: SectionResponse[];
  configs: TimetableConfigResponse[];
  existingTimetables: ClassTimetableResponse[];
  defaultSessionId: number | null;
  defaultClassId: number | null;
  defaultSectionId?: number | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: CreateClassTimetableRequest) => Promise<void>;
}

export const CreateClassTimetableDialog: React.FC<
  CreateClassTimetableDialogProps
> = ({
  open,
  onClose,
  sessions,
  classes,
  sections = [],
  configs,
  existingTimetables,
  defaultSessionId,
  defaultClassId,
  defaultSectionId = null,
  isSubmitting,
  errorMessage,
  onSubmit,
}) => {
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [configId, setConfigId] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeConfigs = useMemo(
    () => configs.filter((c) => c.active),
    [configs]
  );

  const availableClassSections = useMemo(() => {
    const cid = Number(classId);
    const sid = Number(sessionId);
    if (!cid) return [];
    return sections
      .filter(
        (sec) =>
          sec.classId === cid &&
          sec.active &&
          (!sid || sec.academicSessionId === sid)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classId, sections, sessionId]);

  const existingClassTimetables = useMemo(() => {
    const sid = Number(sessionId);
    const cid = Number(classId);
    if (!sid || !cid) return [];
    return existingTimetables.filter(
      (t) => t.academicSessionId === sid && t.classId === cid
    );
  }, [classId, existingTimetables, sessionId]);

  const hasClassWideTimetable = useMemo(
    () => existingClassTimetables.some((t) => t.sectionId == null),
    [existingClassTimetables]
  );

  const scheduledSectionIds = useMemo(
    () =>
      new Set(
        existingClassTimetables
          .map((t) => t.sectionId)
          .filter((id): id is number => id != null)
      ),
    [existingClassTimetables]
  );

  useEffect(() => {
    if (!open) return;
    const initialSession =
      defaultSessionId ||
      sessions.find((s) => s.status === 'ACTIVE')?.id ||
      sessions[0]?.id;
    setSessionId(initialSession ? String(initialSession) : '');
    setClassId(defaultClassId ? String(defaultClassId) : '');
    setSectionId(defaultSectionId ? String(defaultSectionId) : '');
    const preferredConfig =
      activeConfigs.find((c) =>
        c.periods?.some((p) => p.periodType === 'TEACHING')
      ) || activeConfigs[0];
    setConfigId(preferredConfig ? String(preferredConfig.id) : '');
    setNotes('');
    setValidationError(null);
  }, [
    activeConfigs,
    defaultClassId,
    defaultSectionId,
    defaultSessionId,
    open,
    sessions,
  ]);

  // Auto-select first unscheduled section when switching class if sections exist
  useEffect(() => {
    if (!open || !classId) return;
    if (
      sectionId &&
      availableClassSections.some((sec) => String(sec.id) === sectionId) &&
      !scheduledSectionIds.has(Number(sectionId))
    ) {
      return;
    }
    if (availableClassSections.length > 0) {
      const firstUnscheduled = availableClassSections.find(
        (sec) => !scheduledSectionIds.has(sec.id)
      );
      if (firstUnscheduled) {
        setSectionId(String(firstUnscheduled.id));
        return;
      }
    }
    setSectionId('');
  }, [availableClassSections, classId, open, scheduledSectionIds, sectionId]);

  const selectedConfig = useMemo(
    () => activeConfigs.find((c) => c.id === Number(configId)) || null,
    [activeConfigs, configId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      setValidationError('Please select an academic session.');
      return;
    }
    if (!classId) {
      setValidationError('Please select a school class.');
      return;
    }
    if (!configId) {
      setValidationError('Please select an active timetable configuration.');
      return;
    }
    const targetSectionId = sectionId ? Number(sectionId) : null;
    if (targetSectionId != null) {
      if (scheduledSectionIds.has(targetSectionId)) {
        setValidationError(
          'A timetable already exists for this section in the selected academic session.'
        );
        return;
      }
    } else if (hasClassWideTimetable) {
      setValidationError(
        'A class-wide timetable already exists for this class in the selected academic session.'
      );
      return;
    }

    setValidationError(null);
    await onSubmit({
      academicSessionId: Number(sessionId),
      classId: Number(classId),
      sectionId: targetSectionId,
      timetableConfigId: Number(configId),
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Initialize Class Timetable (Draft)"
      description="Create a draft weekly class timetable linked to an academic session and timetable configuration."
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-class-timetable-form"
            variant="primary"
            disabled={activeConfigs.length === 0}
            isLoading={isSubmitting}
          >
            Create Draft Timetable
          </Button>
        </>
      }
    >
      <form
        id="create-class-timetable-form"
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {(errorMessage || validationError) && (
          <InlineAlert variant="error" title="Unable to create class timetable">
            {validationError || errorMessage}
          </InlineAlert>
        )}

        {activeConfigs.length === 0 && (
          <InlineAlert
            variant="warning"
            title="No Active Timetable Configuration Found"
          >
            Create an active Timetable Configuration with working days and
            teaching periods before initializing a class timetable.
          </InlineAlert>
        )}

        <FormField
          label="Academic Session"
          htmlFor="ct-session"
          required
        >
          <Select
            id="ct-session"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            required
          >
            <option value="">Select academic session...</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status}) {s.status === 'ACTIVE' ? '• Active' : ''}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label="School Class"
            htmlFor="ct-class"
            required
          >
            <Select
              id="ct-class"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId('');
              }}
              required
            >
              <option value="">Select class...</option>
              {classes
                .filter((c) => c.active)
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
            </Select>
          </FormField>

          <FormField
            label="Section / Timetable Scope"
            htmlFor="ct-section"
            hint={
              availableClassSections.length > 0
                ? 'Create a schedule for a specific section or class-wide.'
                : 'No sections configured for this class (class-wide).'
            }
          >
            <Select
              id="ct-section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!classId}
            >
              {availableClassSections.map((sec) => {
                const exists = scheduledSectionIds.has(sec.id);
                return (
                  <option key={sec.id} value={sec.id} disabled={exists}>
                    Section {sec.name}{' '}
                    {exists ? '— Timetable already exists' : ''}
                  </option>
                );
              })}
              <option value="" disabled={hasClassWideTimetable}>
                Class-wide (All Sections){' '}
                {hasClassWideTimetable ? '— Already exists' : ''}
              </option>
            </Select>
          </FormField>
        </div>

        <FormField
          label="Timetable Configuration (Bell Schedule)"
          htmlFor="ct-config"
          required
        >
          <Select
            id="ct-config"
            value={configId}
            onChange={(e) => setConfigId(e.target.value)}
            required
          >
            <option value="">Select configuration...</option>
            {activeConfigs.map((cfg) => {
              const teachingCount = (cfg.periods || []).filter(
                (p) => p.periodType === 'TEACHING'
              ).length;
              return (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.name} ({formatLocalTime(cfg.dayStartTime)}–
                  {formatLocalTime(cfg.dayEndTime)} • {teachingCount} teaching
                  periods)
                </option>
              );
            })}
          </Select>
        </FormField>

        {selectedConfig && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">
                Selected Structure Summary
              </span>
              <span className="text-slate-500">
                {formatLocalTime(selectedConfig.dayStartTime)} –{' '}
                {formatLocalTime(selectedConfig.dayEndTime)}
              </span>
            </div>
            <div className="text-[11px] text-slate-600">
              Working days:{' '}
              <span className="font-medium text-slate-800">
                {sortWorkingDays(selectedConfig.workingDays || [])
                  .map((d) => DAY_OF_WEEK_LABELS[d].shortLabel)
                  .join(', ')}
              </span>
            </div>
            {(selectedConfig.periods || []).filter(
              (p) => p.periodType === 'TEACHING'
            ).length === 0 && (
              <p className="text-[11px] font-medium text-amber-700">
                Note: This configuration has no TEACHING periods yet. Add
                teaching periods in the Configurations tab to schedule classes.
              </p>
            )}
          </div>
        )}

        <FormField label="Notes (Optional)" htmlFor="ct-notes">
          <Textarea
            id="ct-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes (e.g., Effective from Term 1, includes section room notes)..."
            maxLength={500}
          />
        </FormField>
      </form>
    </Dialog>
  );
};

// ============================================================================
// 4. Add / Edit Timetable Slot Dialog (Streamlined 1-Step Teacher & Subject Assignment)
// ============================================================================

export interface TimetableSlotSubmitMeta {
  selectedStaffId?: number | null;
  needsSubjectClassLink?: boolean;
  needsTeacherSubjectLink?: boolean;
  needsTeacherEnablement?: boolean;
}

export interface TimetableSlotFormDialogProps {
  open: boolean;
  onClose: () => void;
  timetable: ClassTimetableResponse | null;
  config: TimetableConfigResponse | null;
  editingSlot: TimetableSlotResponse | null;
  defaultDayOfWeek: DayOfWeek | null;
  defaultPeriodId: number | null;
  classSubjects: ClassSubjectResponse[];
  allSubjects: SubjectResponse[];
  teacherAssignments: TeacherSubjectAssignmentResponse[];
  teachers: TeacherResponse[];
  staffList?: StaffResponse[];
  classSections: SectionResponse[];
  allSessionTimetables: ClassTimetableResponse[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (
    payload: CreateTimetableSlotRequest | UpdateTimetableSlotRequest,
    meta?: TimetableSlotSubmitMeta
  ) => Promise<void>;
  onQuickCreateSubject?: (
    name: string,
    code: string
  ) => Promise<SubjectResponse>;
  onRequestDelete?: (slot: TimetableSlotResponse) => void;
}

export const TimetableSlotFormDialog: React.FC<
  TimetableSlotFormDialogProps
> = ({
  open,
  onClose,
  timetable,
  config,
  editingSlot,
  defaultDayOfWeek,
  defaultPeriodId,
  classSubjects,
  allSubjects,
  teacherAssignments,
  teachers,
  staffList = [],
  classSections,
  allSessionTimetables,
  isSubmitting,
  errorMessage,
  onSubmit,
  onQuickCreateSubject,
  onRequestDelete,
}) => {
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('MONDAY');
  const [periodId, setPeriodId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherSelection, setTeacherSelection] = useState('');
  const [room, setRoom] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showSlotSelectors, setShowSlotSelectors] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Quick-create subject inline state
  const [showQuickSubject, setShowQuickSubject] = useState(false);
  const [quickSubjectName, setQuickSubjectName] = useState('');
  const [quickSubjectCode, setQuickSubjectCode] = useState('');
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  const workingDays = useMemo(
    () =>
      config?.workingDays?.length
        ? sortWorkingDays(config.workingDays)
        : (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as DayOfWeek[]),
    [config]
  );

  const teachingPeriods = useMemo(
    () =>
      (config?.periods || [])
        .filter((p) => p.periodType === 'TEACHING')
        .sort((a, b) => a.periodOrder - b.periodOrder),
    [config]
  );

  const classSubjectIds = useMemo(() => {
    if (!timetable) return new Set<number>();
    return new Set(
      classSubjects
        .filter(
          (cs) =>
            cs.academicSessionId === timetable.academicSessionId &&
            cs.classId === timetable.classId
        )
        .map((cs) => cs.subjectId)
    );
  }, [classSubjects, timetable]);

  // 1) Subjects already assigned to this class, and 2) All other active subjects in the school
  const { assignedClassSubjects, otherSchoolSubjects } = useMemo(() => {
    const activeSubs = allSubjects
      .filter((s) => s.active)
      .sort((a, b) => a.name.localeCompare(b.name));

    const assigned: SubjectResponse[] = [];
    const others: SubjectResponse[] = [];
    for (const s of activeSubs) {
      if (classSubjectIds.has(s.id)) {
        assigned.push(s);
      } else {
        others.push(s);
      }
    }
    return { assignedClassSubjects: assigned, otherSchoolSubjects: others };
  }, [allSubjects, classSubjectIds]);

  const allSelectableSubjects = useMemo(
    () => [...assignedClassSubjects, ...otherSchoolSubjects],
    [assignedClassSubjects, otherSchoolSubjects]
  );

  // Teachers mapped to the selected (session, class, subject), plus all other active teachers, plus unmapped active staff
  const {
    mappedSubjectTeachers,
    otherActiveTeachers,
    unmappedActiveStaff,
    mappedTeacherIds,
  } = useMemo(() => {
    if (!timetable) {
      return {
        mappedSubjectTeachers: [] as TeacherResponse[],
        otherActiveTeachers: [] as TeacherResponse[],
        unmappedActiveStaff: [] as StaffResponse[],
        mappedTeacherIds: new Set<number>(),
      };
    }

    const selectedSubId = Number(subjectId);
    const assignedIds = new Set<number>(
      selectedSubId
        ? teacherAssignments
            .filter(
              (ta) =>
                ta.academicSessionId === timetable.academicSessionId &&
                ta.classId === timetable.classId &&
                ta.subjectId === selectedSubId
            )
            .map((ta) => ta.teacherId)
        : []
    );

    // Merge teachers from directory AND any teachers referenced in teacherAssignments
    const mergedTeacherMap = new Map<number, TeacherResponse>();
    for (const t of teachers) {
      if (!t.employmentStatus || t.employmentStatus === 'ACTIVE') {
        mergedTeacherMap.set(t.id, t);
      }
    }
    for (const ta of teacherAssignments) {
      if (!mergedTeacherMap.has(ta.teacherId)) {
        mergedTeacherMap.set(ta.teacherId, {
          id: ta.teacherId,
          organizationId: ta.organizationId,
          staffId: ta.staffId ?? 0,
          userId: null,
          employeeId: ta.teacherEmployeeId,
          firstName: ta.teacherFirstName || `Teacher #${ta.teacherId}`,
          middleName: null,
          lastName: ta.teacherLastName,
          dateOfBirth: null,
          gender: null,
          email: null,
          phoneNumber: null,
          alternatePhoneNumber: null,
          address: null,
          city: null,
          state: null,
          postalCode: null,
          joiningDate: null,
          leavingDate: null,
          designation: 'Subject Teacher',
          department: null,
          employmentType: null,
          employmentStatus: 'ACTIVE',
          qualifications: null,
          specialization: ta.subjectName || null,
          experienceYears: null,
          registrationNumber: null,
          certifications: null,
          teachingNotes: null,
          availableForAssignment: true,
          createdAt: ta.createdAt,
          updatedAt: ta.updatedAt,
        });
      }
    }

    const activeTeachers = Array.from(mergedTeacherMap.values()).sort((a, b) =>
      `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(
        `${b.firstName || ''} ${b.lastName || ''}`
      )
    );

    const mapped: TeacherResponse[] = [];
    const others: TeacherResponse[] = [];
    const staffIdsWithTeacherProfile = new Set<number>();

    for (const t of activeTeachers) {
      if (t.staffId) staffIdsWithTeacherProfile.add(t.staffId);
      if (assignedIds.has(t.id)) {
        mapped.push(t);
      } else {
        others.push(t);
      }
    }

    const extraStaff = staffList
      .filter(
        (s) =>
          s.employmentStatus === 'ACTIVE' &&
          !staffIdsWithTeacherProfile.has(s.id)
      )
      .sort((a, b) =>
        `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(
          `${b.firstName || ''} ${b.lastName || ''}`
        )
      );

    return {
      mappedSubjectTeachers: mapped,
      otherActiveTeachers: others,
      unmappedActiveStaff: extraStaff,
      mappedTeacherIds: assignedIds,
    };
  }, [staffList, subjectId, teacherAssignments, teachers, timetable]);

  useEffect(() => {
    if (!open || !timetable) return;
    if (editingSlot) {
      setDayOfWeek(editingSlot.dayOfWeek);
      setPeriodId(String(editingSlot.periodId));
      setSubjectId(String(editingSlot.subjectId));
      setTeacherSelection(`teacher:${editingSlot.teacherId}`);
      setRoom(editingSlot.room || '');
      setRemarks(editingSlot.remarks || '');
      setShowSlotSelectors(false);
    } else {
      setDayOfWeek(
        defaultDayOfWeek && workingDays.includes(defaultDayOfWeek)
          ? defaultDayOfWeek
          : workingDays[0] || 'MONDAY'
      );
      setPeriodId(
        defaultPeriodId
          ? String(defaultPeriodId)
          : teachingPeriods[0]
          ? String(teachingPeriods[0].id)
          : ''
      );
      const firstSub = allSelectableSubjects[0];
      setSubjectId(firstSub ? String(firstSub.id) : '');
      setTeacherSelection('');
      setRoom('');
      setRemarks('');
      setShowSlotSelectors(!(defaultDayOfWeek && defaultPeriodId));
    }
    setShowQuickSubject(false);
    setQuickSubjectName('');
    setQuickSubjectCode('');
    setValidationError(null);
  }, [
    allSelectableSubjects,
    defaultDayOfWeek,
    defaultPeriodId,
    editingSlot,
    open,
    teachingPeriods,
    timetable,
    workingDays,
  ]);

  // Auto-select the assigned subject teacher whenever subjectId changes (or when only 1 teacher exists)
  useEffect(() => {
    if (!open || editingSlot) return;
    if (mappedSubjectTeachers.length > 0) {
      const currentIsMapped = mappedSubjectTeachers.some(
        (t) => `teacher:${t.id}` === teacherSelection
      );
      if (!currentIsMapped) {
        setTeacherSelection(`teacher:${mappedSubjectTeachers[0].id}`);
      }
    } else if (
      !teacherSelection &&
      otherActiveTeachers.length === 1 &&
      unmappedActiveStaff.length === 0
    ) {
      setTeacherSelection(`teacher:${otherActiveTeachers[0].id}`);
    }
  }, [
    editingSlot,
    mappedSubjectTeachers,
    open,
    otherActiveTeachers,
    subjectId,
    teacherSelection,
    unmappedActiveStaff.length,
  ]);

  const selectedPeriod = useMemo(
    () => teachingPeriods.find((p) => p.id === Number(periodId)) || null,
    [periodId, teachingPeriods]
  );

  // Parse teacherSelection ("teacher:12" or "staff:34")
  const parsedTeacher = useMemo(() => {
    if (!teacherSelection) {
      return { teacherId: null as number | null, staffId: null as number | null };
    }
    if (teacherSelection.startsWith('staff:')) {
      return {
        teacherId: null,
        staffId: Number(teacherSelection.slice('staff:'.length)) || null,
      };
    }
    const raw = teacherSelection.startsWith('teacher:')
      ? teacherSelection.slice('teacher:'.length)
      : teacherSelection;
    return { teacherId: Number(raw) || null, staffId: null };
  }, [teacherSelection]);

  // Helper to check if any teacherId is busy during (dayOfWeek, selectedPeriod)
  const busyTeacherMap = useMemo(() => {
    const map = new Map<
      number,
      { slot: TimetableSlotResponse; className: string; status: string }
    >();
    if (!selectedPeriod) return map;

    for (const ct of allSessionTimetables) {
      for (const slot of ct.slots || []) {
        if (editingSlot && slot.id === editingSlot.id) continue;
        if (slot.dayOfWeek !== dayOfWeek) continue;
        if (
          timesOverlap(
            slot.startTime,
            slot.endTime,
            selectedPeriod.startTime,
            selectedPeriod.endTime
          )
        ) {
          const baseClassName =
            slot.className || ct.className || `Class #${ct.classId}`;
          const secLabel = slot.sectionName || ct.sectionName;
          map.set(slot.teacherId, {
            slot,
            className: secLabel
              ? `${baseClassName} - Section ${secLabel}`
              : baseClassName,
            status: ct.status,
          });
        }
      }
    }
    return map;
  }, [allSessionTimetables, dayOfWeek, editingSlot, selectedPeriod]);

  // Live conflict check
  const detectedConflicts = useMemo(() => {
    if (!timetable || !selectedPeriod) {
      return { classConflict: null, teacherConflict: null };
    }

    let classConflict: TimetableSlotResponse | null = null;
    for (const slot of timetable.slots || []) {
      if (editingSlot && slot.id === editingSlot.id) continue;
      if (slot.dayOfWeek !== dayOfWeek) continue;
      if (
        slot.periodId === selectedPeriod.id ||
        timesOverlap(
          slot.startTime,
          slot.endTime,
          selectedPeriod.startTime,
          selectedPeriod.endTime
        )
      ) {
        classConflict = slot;
        break;
      }
    }

    const teacherConflict = parsedTeacher.teacherId
      ? busyTeacherMap.get(parsedTeacher.teacherId) || null
      : null;

    return { classConflict, teacherConflict };
  }, [
    busyTeacherMap,
    dayOfWeek,
    editingSlot,
    parsedTeacher.teacherId,
    selectedPeriod,
    timetable,
  ]);

  if (!timetable || !config) return null;

  const isDraft = timetable.status === 'DRAFT';
  const hasBlockingConflict =
    Boolean(detectedConflicts.classConflict) ||
    Boolean(detectedConflicts.teacherConflict);

  const handleQuickCreateSubjectClick = async () => {
    if (!onQuickCreateSubject) return;
    const trimmedName = quickSubjectName.trim();
    const trimmedCode =
      quickSubjectCode.trim() ||
      trimmedName
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 6)
        .toUpperCase();
    if (!trimmedName) {
      setValidationError('Enter a subject name to quick-create a subject.');
      return;
    }
    setIsCreatingSubject(true);
    setValidationError(null);
    try {
      const created = await onQuickCreateSubject(trimmedName, trimmedCode);
      setSubjectId(String(created.id));
      setShowQuickSubject(false);
      setQuickSubjectName('');
      setQuickSubjectCode('');
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Failed to create subject.'
      );
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDraft) {
      setValidationError(
        'Cannot modify slots while timetable is PUBLISHED. Reopen to DRAFT first.'
      );
      return;
    }
    if (!dayOfWeek || !workingDays.includes(dayOfWeek)) {
      setValidationError('Please select a valid working day.');
      return;
    }
    if (!periodId) {
      setValidationError('Please select a teaching period.');
      return;
    }
    if (!subjectId) {
      setValidationError('Please select or quick-create a subject.');
      return;
    }
    if (!parsedTeacher.teacherId && !parsedTeacher.staffId) {
      setValidationError('Please select a teacher for this period.');
      return;
    }
    if (detectedConflicts.classConflict) {
      setValidationError(
        `Class conflict: ${
          timetable.className || `Class #${timetable.classId}`
        } already has "${
          detectedConflicts.classConflict.subjectName || 'a subject'
        }" scheduled during this period on ${
          DAY_OF_WEEK_LABELS[dayOfWeek].fullLabel
        }.`
      );
      return;
    }
    if (detectedConflicts.teacherConflict) {
      const tc = detectedConflicts.teacherConflict;
      setValidationError(
        `Teacher schedule conflict: ${formatSlotTeacherName(
          tc.slot
        )} is already scheduled for ${tc.className} (${
          tc.slot.subjectName || 'Subject'
        }) on ${DAY_OF_WEEK_LABELS[dayOfWeek].fullLabel} from ${formatLocalTime(
          tc.slot.startTime
        )} to ${formatLocalTime(tc.slot.endTime)}.`
      );
      return;
    }

    const numericSubjectId = Number(subjectId);
    const chosenTeacherObj = parsedTeacher.teacherId
      ? teachers.find((t) => t.id === parsedTeacher.teacherId) || null
      : null;

    setValidationError(null);
    await onSubmit(
      {
        dayOfWeek,
        periodId: Number(periodId),
        subjectId: numericSubjectId,
        teacherId: parsedTeacher.teacherId || 0,
        room: room.trim() || null,
        remarks: remarks.trim() || null,
      },
      {
        selectedStaffId: parsedTeacher.staffId,
        needsSubjectClassLink: !classSubjectIds.has(numericSubjectId),
        needsTeacherSubjectLink: parsedTeacher.teacherId
          ? !mappedTeacherIds.has(parsedTeacher.teacherId)
          : true,
        needsTeacherEnablement: Boolean(
          chosenTeacherObj && !chosenTeacherObj.availableForAssignment
        ),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        editingSlot
          ? 'Edit Period Assignment'
          : 'Assign Teacher & Subject to Period'
      }
      description={`${
        timetable.className || `Class #${timetable.classId}`
      }${
        timetable.sectionName ? ` — Section ${timetable.sectionName}` : ''
      } • ${
        timetable.academicSessionName || `Session #${timetable.academicSessionId}`
      } (${config.name})`}
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            {editingSlot && isDraft && onRequestDelete && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => onRequestDelete(editingSlot)}
                disabled={isSubmitting}
              >
                Remove Slot
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="timetable-slot-form"
              variant="primary"
              disabled={!isDraft || hasBlockingConflict}
              isLoading={isSubmitting}
            >
              {editingSlot ? 'Save Changes' : 'Assign to Period'}
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="timetable-slot-form"
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {(errorMessage || validationError) && (
          <InlineAlert
            variant="error"
            title="Scheduling Conflict / Validation Error"
          >
            {validationError || errorMessage}
          </InlineAlert>
        )}

        {/* Selected Period Summary Banner (1-click cell context) */}
        {selectedPeriod && !showSlotSelectors ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/60 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                #{selectedPeriod.periodOrder}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">
                  {DAY_OF_WEEK_LABELS[dayOfWeek].fullLabel} •{' '}
                  {selectedPeriod.name}
                </div>
                <div className="text-[11px] text-indigo-700 font-medium">
                  {formatLocalTime(selectedPeriod.startTime)} –{' '}
                  {formatLocalTime(selectedPeriod.endTime)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSlotSelectors(true)}
              className="shrink-0 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 cursor-pointer"
            >
              Change Day / Period
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Working Day" htmlFor="slot-day" required>
              <Select
                id="slot-day"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                required
              >
                {workingDays.map((day) => (
                  <option key={day} value={day}>
                    {DAY_OF_WEEK_LABELS[day].fullLabel}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Teaching Period" htmlFor="slot-period" required>
              <Select
                id="slot-period"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
                required
              >
                <option value="">Select teaching period...</option>
                {teachingPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.periodOrder} {p.name} ({formatLocalTime(p.startTime)}–
                    {formatLocalTime(p.endTime)})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        )}

        {detectedConflicts.classConflict && (
          <InlineAlert variant="error" title="Class Period Conflict Detected">
            <strong>
              {timetable.className || `Class #${timetable.classId}`}
              {timetable.sectionName ? ` (Section ${timetable.sectionName})` : ''}
            </strong>{' '}
            already has{' '}
            <strong>
              {detectedConflicts.classConflict.subjectName ||
                `Subject #${detectedConflicts.classConflict.subjectId}`}
            </strong>{' '}
            with{' '}
            <strong>
              {formatSlotTeacherName(detectedConflicts.classConflict)}
            </strong>{' '}
            on{' '}
            <strong>{DAY_OF_WEEK_LABELS[dayOfWeek].fullLabel}</strong> during{' '}
            <strong>
              {formatLocalTime(detectedConflicts.classConflict.startTime)} –{' '}
              {formatLocalTime(detectedConflicts.classConflict.endTime)}
            </strong>
            .
          </InlineAlert>
        )}

        {detectedConflicts.teacherConflict && (
          <InlineAlert
            variant="error"
            title="Teacher Double-Booking Conflict Detected"
          >
            <strong>
              {formatSlotTeacherName(detectedConflicts.teacherConflict.slot)}
            </strong>{' '}
            is already scheduled to teach{' '}
            <strong>
              {detectedConflicts.teacherConflict.slot.subjectName || 'a subject'}
            </strong>{' '}
            in <strong>{detectedConflicts.teacherConflict.className}</strong> (
            {detectedConflicts.teacherConflict.status}) on{' '}
            <strong>{DAY_OF_WEEK_LABELS[dayOfWeek].fullLabel}</strong> from{' '}
            <strong>
              {formatLocalTime(detectedConflicts.teacherConflict.slot.startTime)}{' '}
              –{' '}
              {formatLocalTime(detectedConflicts.teacherConflict.slot.endTime)}
            </strong>
            .
          </InlineAlert>
        )}

        {/* 1. Subject Selector + Inline Quick Create */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="slot-subject"
              className="block text-xs font-semibold text-slate-700"
            >
              1. Subject <span className="text-rose-500">*</span>
            </label>
            {onQuickCreateSubject && (
              <button
                type="button"
                onClick={() => setShowQuickSubject((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                {showQuickSubject ? 'Close Quick Create' : 'Quick Add Subject'}
              </button>
            )}
          </div>

          {showQuickSubject && onQuickCreateSubject && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-indigo-900">
                Create &amp; Select a New Subject Instantly
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <Input
                    value={quickSubjectName}
                    onChange={(e) => setQuickSubjectName(e.target.value)}
                    placeholder="Subject name (e.g., Mathematics)"
                    maxLength={100}
                  />
                </div>
                <div>
                  <Input
                    value={quickSubjectCode}
                    onChange={(e) => setQuickSubjectCode(e.target.value)}
                    placeholder="Code (e.g., MATH)"
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickSubject(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => void handleQuickCreateSubjectClick()}
                  isLoading={isCreatingSubject}
                >
                  Add &amp; Select Subject
                </Button>
              </div>
            </div>
          )}

          <Select
            id="slot-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
          >
            <option value="">
              {allSelectableSubjects.length > 0
                ? 'Select subject...'
                : 'No subjects yet — click "Quick Add Subject" above'}
            </option>
            {assignedClassSubjects.length > 0 && (
              <optgroup label="★ Assigned to This Class">
                {assignedClassSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {otherSchoolSubjects.length > 0 && (
              <optgroup label="All School Subjects (Auto-links to Class on Save)">
                {otherSchoolSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ''} • Auto-link to
                    class
                  </option>
                ))}
              </optgroup>
            )}
          </Select>

          {subjectId && !classSubjectIds.has(Number(subjectId)) && (
            <p className="text-[11px] font-medium text-indigo-600">
              ✦ This subject will be automatically linked to{' '}
              <strong>
                {timetable.className || `Class #${timetable.classId}`}
              </strong>{' '}
              when you save.
            </p>
          )}
        </div>

        {/* 2. Teacher Selector (Shows ALL Active Teachers & Staff + Live Availability) */}
        <FormField
          label="2. Teacher"
          htmlFor="slot-teacher"
          required
          hint="Pick any active teacher or staff member. If they aren't mapped to this subject yet, they will be mapped automatically when you save."
        >
          <Select
            id="slot-teacher"
            value={teacherSelection}
            onChange={(e) => setTeacherSelection(e.target.value)}
            required
          >
            <option value="">
              {mappedSubjectTeachers.length +
                otherActiveTeachers.length +
                unmappedActiveStaff.length >
              0
                ? 'Select teacher for this period...'
                : 'No active teachers or staff found — add staff in Staff & Teachers'}
            </option>

            {mappedSubjectTeachers.length > 0 && (
              <optgroup label="★ Assigned to Teach This Subject">
                {mappedSubjectTeachers.map((t) => {
                  const busy = busyTeacherMap.get(t.id);
                  return (
                    <option key={`teacher:${t.id}`} value={`teacher:${t.id}`}>
                      {t.firstName} {t.lastName || ''}{' '}
                      {t.employeeId ? `(${t.employeeId})` : ''} —{' '}
                      {busy
                        ? `⚠ Busy in ${busy.className}`
                        : '✓ Available this period'}
                    </option>
                  );
                })}
              </optgroup>
            )}

            {otherActiveTeachers.length > 0 && (
              <optgroup label="All Active Teachers (Auto-maps to Subject on Save)">
                {otherActiveTeachers.map((t) => {
                  const busy = busyTeacherMap.get(t.id);
                  return (
                    <option key={`teacher:${t.id}`} value={`teacher:${t.id}`}>
                      {t.firstName} {t.lastName || ''}{' '}
                      {t.employeeId ? `(${t.employeeId})` : ''}{' '}
                      {t.specialization ? `• ${t.specialization}` : ''} —{' '}
                      {busy
                        ? `⚠ Busy in ${busy.className}`
                        : '✓ Available (Auto-map)'}
                    </option>
                  );
                })}
              </optgroup>
            )}

            {unmappedActiveStaff.length > 0 && (
              <optgroup label="Active Staff Members (Auto-enables Teacher Profile & Maps)">
                {unmappedActiveStaff.map((s) => (
                  <option key={`staff:${s.id}`} value={`staff:${s.id}`}>
                    {s.firstName} {s.lastName || ''}{' '}
                    {s.employeeId ? `(${s.employeeId})` : ''}{' '}
                    {s.designation ? `• ${s.designation}` : ''} — ✓ Auto-enable
                    as Teacher
                  </option>
                ))}
              </optgroup>
            )}
          </Select>

          {teacherSelection &&
            (parsedTeacher.staffId ||
              (parsedTeacher.teacherId &&
                !mappedTeacherIds.has(parsedTeacher.teacherId))) && (
              <p className="mt-1 text-[11px] font-medium text-indigo-600">
                ✦{' '}
                {parsedTeacher.staffId
                  ? 'A Teacher Profile and Subject Assignment will be created automatically on save.'
                  : 'This teacher will be automatically mapped to this subject & class on save.'}
              </p>
            )}
        </FormField>

        <FormField
          label="Room / Lab / Section Location (Optional)"
          htmlFor="slot-room"
          hint="E.g., Room 204, Physics Lab, Section A Room."
        >
          <div className="space-y-1.5">
            <Input
              id="slot-room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g., Room 102 or Chemistry Lab"
              maxLength={50}
            />
            {classSections.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-400">
                  Class sections:
                </span>
                {classSections
                  .filter((sec) => sec.active)
                  .map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() =>
                        setRoom((prev) =>
                          prev ? prev : `Section ${sec.name}`
                        )
                      }
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                    >
                      Section {sec.name}
                      {sec.capacity ? ` (Cap: ${sec.capacity})` : ''}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </FormField>

        <FormField label="Remarks / Topic Note (Optional)" htmlFor="slot-remarks">
          <Input
            id="slot-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional instruction or lab group note..."
            maxLength={255}
          />
        </FormField>
      </form>
    </Dialog>
  );
};

// ============================================================================
// 5. Timetable Lifecycle Confirmation Dialog (Publish / Reopen / Delete Slot)
// ============================================================================

export type TimetableLifecycleAction = 'PUBLISH' | 'REOPEN' | 'DELETE_SLOT';

export interface TimetableLifecycleConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  action: TimetableLifecycleAction | null;
  timetable: ClassTimetableResponse | null;
  targetSlot?: TimetableSlotResponse | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => Promise<void>;
}

export const TimetableLifecycleConfirmDialog: React.FC<
  TimetableLifecycleConfirmDialogProps
> = ({
  open,
  onClose,
  action,
  timetable,
  targetSlot,
  isSubmitting,
  errorMessage,
  onConfirm,
}) => {
  if (!action || !timetable) return null;

  const isPublish = action === 'PUBLISH';
  const isReopen = action === 'REOPEN';
  const isDeleteSlot = action === 'DELETE_SLOT';

  const title = isPublish
    ? 'Publish Class Timetable'
    : isReopen
    ? 'Reopen Timetable for Revision (Draft)'
    : 'Remove Scheduled Teaching Slot';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={`${
        timetable.className || `Class #${timetable.classId}`
      }${
        timetable.sectionName ? ` — Section ${timetable.sectionName}` : ''
      } • ${
        timetable.academicSessionName || `Session #${timetable.academicSessionId}`
      } (Revision v${timetable.revisionNumber})`}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={isDeleteSlot ? 'danger' : 'primary'}
            leftIcon={
              isPublish ? (
                <Send className="h-3.5 w-3.5" />
              ) : isReopen ? (
                <RotateCcw className="h-3.5 w-3.5" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )
            }
            onClick={onConfirm}
            isLoading={isSubmitting}
          >
            {isPublish
              ? 'Publish Timetable'
              : isReopen
              ? 'Reopen as Draft'
              : 'Remove Slot'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-slate-600">
        {errorMessage && (
          <InlineAlert variant="error" title="Action failed">
            {errorMessage}
          </InlineAlert>
        )}

        {isPublish && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2 text-emerald-950">
            <div className="flex items-center gap-2 font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              Ready to Publish ({timetable.slots?.length || 0} scheduled slots)
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Publishing locks this timetable against accidental edits, validates
              all teacher and subject assignments, and notifies scheduled
              teachers of their finalized class schedule.
            </p>
          </div>
        )}

        {isReopen && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 space-y-2 text-amber-950">
            <div className="flex items-center gap-2 font-semibold text-amber-900">
              <RotateCcw className="h-4 w-4 text-amber-600 shrink-0" />
              Transition from PUBLISHED to DRAFT (Revision v
              {timetable.revisionNumber + 1})
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Reopening moves this timetable back to <strong>DRAFT</strong>{' '}
              status and increments its revision number so you can add, update,
              or remove teaching slots before republishing.
            </p>
          </div>
        )}

        {isDeleteSlot && targetSlot && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 space-y-1.5 text-rose-950">
            <div className="font-semibold text-rose-900">
              Remove {targetSlot.subjectName || `Subject #${targetSlot.subjectId}`}?
            </div>
            <p className="text-[11px] text-rose-800">
              Day: <strong>{DAY_OF_WEEK_LABELS[targetSlot.dayOfWeek].fullLabel}</strong> •{' '}
              Period: <strong>{targetSlot.periodName || `#${targetSlot.periodId}`}</strong> (
              {formatLocalTime(targetSlot.startTime)} –{' '}
              {formatLocalTime(targetSlot.endTime)})
            </p>
            <p className="text-[11px] text-rose-800">
              Teacher: <strong>{formatSlotTeacherName(targetSlot)}</strong>
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
};










