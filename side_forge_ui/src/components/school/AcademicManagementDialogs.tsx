import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Play,
  PowerOff,
  Trash2,
} from 'lucide-react';
import {
  AcademicSessionResponse,
  AssignClassSubjectRequest,
  CreateSchoolClassRequest,
  CreateSubjectRequest,
  getSessionStatusBadgeMeta,
  SchoolClassResponse,
  SubjectResponse,
  UpdateSchoolClassRequest,
  UpdateSubjectRequest,
} from '../../types/academicManagement';
import { Badge, IdLabel } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { FormField, Input, Select, Textarea } from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

// ============================================================================
// 1. Create / Edit Academic Session Dialog
// ============================================================================

export interface AcademicSessionFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingSession: AcademicSessionResponse | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (name: string) => Promise<void>;
}

export const AcademicSessionFormDialog: React.FC<AcademicSessionFormDialogProps> = ({
  open,
  onClose,
  editingSession,
  isSubmitting,
  errorMessage,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editingSession?.name || '');
    setValidationError(null);
  }, [open, editingSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError('Academic session name is required.');
      return;
    }
    if (trimmed.length > 50) {
      setValidationError('Academic session name must not exceed 50 characters.');
      return;
    }
    setValidationError(null);
    await onSubmit(trimmed);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingSession ? 'Edit Academic Session' : 'Create Academic Session'}
      description={
        editingSession
          ? `Update the name for session "${editingSession.name}".`
          : 'Create a new planned academic session without disturbing the currently active session.'
      }
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="academic-session-form"
            variant="primary"
            isLoading={isSubmitting}
          >
            {editingSession ? 'Save Changes' : 'Create Session'}
          </Button>
        </>
      }
    >
      <form id="academic-session-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <InlineAlert variant="error" title="Unable to save academic session">
            {errorMessage}
          </InlineAlert>
        )}

        <FormField
          label="Session Name"
          htmlFor="session-name-input"
          required
          error={validationError || undefined}
          hint="E.g., 2026-2027 or Academic Year 2026-27 (max 50 characters)."
        >
          <Input
            id="session-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 2026-2027"
            maxLength={50}
            autoFocus
          />
        </FormField>

        {!editingSession && (
          <InlineAlert variant="info" title="Lifecycle Note">
            New sessions are created in <strong className="font-semibold">PLANNED</strong> status so
            you can pre-configure class-subject assignments before activating the session.
          </InlineAlert>
        )}
      </form>
    </Dialog>
  );
};

// ============================================================================
// 2. Academic Session Lifecycle Confirmation Dialog (Start / Complete)
// ============================================================================

export interface AcademicSessionLifecycleDialogProps {
  open: boolean;
  onClose: () => void;
  session: AcademicSessionResponse | null;
  action: 'START' | 'COMPLETE' | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => Promise<void>;
}

export const AcademicSessionLifecycleDialog: React.FC<
  AcademicSessionLifecycleDialogProps
> = ({ open, onClose, session, action, isSubmitting, errorMessage, onConfirm }) => {
  if (!open || !session || !action) return null;

  const isStart = action === 'START';
  const statusMeta = getSessionStatusBadgeMeta(session.status);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isStart ? 'Activate Planned Session' : 'Complete Active Session'}
      description={
        isStart
          ? `Transition "${session.name}" from PLANNED to ACTIVE.`
          : `Transition "${session.name}" from ACTIVE to COMPLETED.`
      }
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant={isStart ? 'primary' : 'danger'}
            onClick={() => void onConfirm()}
            isLoading={isSubmitting}
            leftIcon={
              isStart ? (
                <Play className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )
            }
          >
            {isStart ? 'Confirm & Activate' : 'Confirm & Complete'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMessage && (
          <InlineAlert variant="error" title="Lifecycle transition failed">
            {errorMessage}
          </InlineAlert>
        )}

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-500 block">Academic Session</span>
            <span className="font-semibold text-slate-900 text-sm">{session.name}</span>
          </div>
          <Badge variant={statusMeta.variant} dot>
            {statusMeta.label}
          </Badge>
        </div>

        {isStart ? (
          <InlineAlert variant="info" title="What happens on activation?">
            Activating <strong className="font-semibold">{session.name}</strong> sets its start
            date to today and makes it the organization&apos;s current active academic session. Only
            one session can be active at a time.
          </InlineAlert>
        ) : (
          <InlineAlert variant="warning" title="Important — Permanent Completion">
            Completing <strong className="font-semibold">{session.name}</strong> sets its end date
            to today and permanently locks the session. Completed sessions{' '}
            <strong className="font-semibold">
              cannot be reopened, renamed, or have their class-subject assignments modified
            </strong>
            .
          </InlineAlert>
        )}
      </div>
    </Dialog>
  );
};

// ============================================================================
// 3. Create / Edit School Class Dialog
// ============================================================================

export interface SchoolClassFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingClass: SchoolClassResponse | null;
  defaultDisplayOrder: number;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (
    payload: CreateSchoolClassRequest | UpdateSchoolClassRequest
  ) => Promise<void>;
}

export const SchoolClassFormDialog: React.FC<SchoolClassFormDialogProps> = ({
  open,
  onClose,
  editingClass,
  defaultDisplayOrder,
  isSubmitting,
  errorMessage,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editingClass?.name || '');
    setCode(editingClass?.code || '');
    setDisplayOrder(String(editingClass?.displayOrder ?? defaultDisplayOrder));
    setDescription(editingClass?.description || '');
    setValidationError(null);
  }, [open, editingClass, defaultDisplayOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    const parsedOrder = Number(displayOrder);

    if (!trimmedName) {
      setValidationError('Class name is required.');
      return;
    }
    if (trimmedName.length > 100) {
      setValidationError('Class name must not exceed 100 characters.');
      return;
    }
    if (!trimmedCode) {
      setValidationError('Class code is required.');
      return;
    }
    if (trimmedCode.length > 50) {
      setValidationError('Class code must not exceed 50 characters.');
      return;
    }
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      setValidationError('Display order must be a positive whole number.');
      return;
    }
    if (description.trim().length > 500) {
      setValidationError('Description must not exceed 500 characters.');
      return;
    }

    setValidationError(null);
    await onSubmit({
      name: trimmedName,
      code: trimmedCode,
      displayOrder: parsedOrder,
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingClass ? 'Edit School Class' : 'Create School Class'}
      description="Classes are reusable across all academic sessions in your school."
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="school-class-form"
            variant="primary"
            isLoading={isSubmitting}
          >
            {editingClass ? 'Save Changes' : 'Create Class'}
          </Button>
        </>
      }
    >
      <form id="school-class-form" onSubmit={handleSubmit} className="space-y-4">
        {(errorMessage || validationError) && (
          <InlineAlert variant="error" title="Validation Error">
            {validationError || errorMessage}
          </InlineAlert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField
            label="Class Name"
            htmlFor="class-name-input"
            required
            hint="e.g., Class 10 or Grade 1"
          >
            <Input
              id="class-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Class 10"
              maxLength={100}
              autoFocus
            />
          </FormField>

          <FormField
            label="Class Code"
            htmlFor="class-code-input"
            required
            hint="Unique short code (e.g., C10, G01)"
          >
            <Input
              id="class-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., C10"
              maxLength={50}
            />
          </FormField>
        </div>

        <FormField
          label="Display Order"
          htmlFor="class-order-input"
          required
          hint="Positive integer controlling how classes are ordered in lists (e.g., 1, 2, 10)."
        >
          <Input
            id="class-order-input"
            type="number"
            min={1}
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor="class-desc-input"
          hint="Optional notes or curriculum level description (max 500 characters)."
        >
          <Textarea
            id="class-desc-input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            maxLength={500}
          />
        </FormField>
      </form>
    </Dialog>
  );
};

// ============================================================================
// 4. Create / Edit Subject Dialog
// ============================================================================

export interface SubjectFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingSubject: SubjectResponse | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: CreateSubjectRequest | UpdateSubjectRequest) => Promise<void>;
}

export const SubjectFormDialog: React.FC<SubjectFormDialogProps> = ({
  open,
  onClose,
  editingSubject,
  isSubmitting,
  errorMessage,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editingSubject?.name || '');
    setCode(editingSubject?.code || '');
    setDescription(editingSubject?.description || '');
    setValidationError(null);
  }, [open, editingSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName) {
      setValidationError('Subject name is required.');
      return;
    }
    if (trimmedName.length > 100) {
      setValidationError('Subject name must not exceed 100 characters.');
      return;
    }
    if (!trimmedCode) {
      setValidationError('Subject code is required.');
      return;
    }
    if (trimmedCode.length > 50) {
      setValidationError('Subject code must not exceed 50 characters.');
      return;
    }
    if (description.trim().length > 500) {
      setValidationError('Description must not exceed 500 characters.');
      return;
    }

    setValidationError(null);
    await onSubmit({
      name: trimmedName,
      code: trimmedCode,
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingSubject ? 'Edit Subject' : 'Create Subject'}
      description="Subjects are reusable across all academic sessions and classes."
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="school-subject-form"
            variant="primary"
            isLoading={isSubmitting}
          >
            {editingSubject ? 'Save Changes' : 'Create Subject'}
          </Button>
        </>
      }
    >
      <form id="school-subject-form" onSubmit={handleSubmit} className="space-y-4">
        {(errorMessage || validationError) && (
          <InlineAlert variant="error" title="Validation Error">
            {validationError || errorMessage}
          </InlineAlert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField
            label="Subject Name"
            htmlFor="subject-name-input"
            required
            hint="e.g., Mathematics or English Literature"
          >
            <Input
              id="subject-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Mathematics"
              maxLength={100}
              autoFocus
            />
          </FormField>

          <FormField
            label="Subject Code"
            htmlFor="subject-code-input"
            required
            hint="Unique short code (e.g., MATH101)"
          >
            <Input
              id="subject-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., MATH"
              maxLength={50}
            />
          </FormField>
        </div>

        <FormField
          label="Description"
          htmlFor="subject-desc-input"
          hint="Optional syllabus or department notes (max 500 characters)."
        >
          <Textarea
            id="subject-desc-input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            maxLength={500}
          />
        </FormField>
      </form>
    </Dialog>
  );
};

// ============================================================================
// 5. Deactivate Class or Subject Confirmation Dialog
// ============================================================================

export interface DeactivateEntityDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: 'Class' | 'Subject';
  entityName: string;
  entityCode: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => Promise<void>;
}

export const DeactivateEntityDialog: React.FC<DeactivateEntityDialogProps> = ({
  open,
  onClose,
  entityType,
  entityName,
  entityCode,
  isSubmitting,
  errorMessage,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Deactivate ${entityType}`}
      description={`Confirm deactivating "${entityName}" (${entityCode}).`}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void onConfirm()}
            isLoading={isSubmitting}
            leftIcon={<PowerOff className="w-3.5 h-3.5" />}
          >
            Deactivate {entityType}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMessage && (
          <InlineAlert variant="error" title="Deactivation failed">
            {errorMessage}
          </InlineAlert>
        )}

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-500 block">{entityType}</span>
            <span className="font-semibold text-slate-900 text-sm">{entityName}</span>
          </div>
          <IdLabel>{entityCode}</IdLabel>
        </div>

        <InlineAlert variant="warning" title="Impact of Deactivation">
          Deactivating this {entityType.toLowerCase()} preserves all historical academic records and
          existing session assignments, but prevents it from being newly assigned in active or
          planned academic sessions.
        </InlineAlert>
      </div>
    </Dialog>
  );
};

// ============================================================================
// 6. Remove Class-Subject Assignment Confirmation Dialog
// ============================================================================

export interface RemoveClassSubjectDialogProps {
  open: boolean;
  onClose: () => void;
  sessionName: string;
  className: string;
  subjectName: string;
  subjectCode: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => Promise<void>;
}

export const RemoveClassSubjectDialog: React.FC<RemoveClassSubjectDialogProps> = ({
  open,
  onClose,
  sessionName,
  className,
  subjectName,
  subjectCode,
  isSubmitting,
  errorMessage,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Remove Subject Assignment"
      description={`Remove "${subjectName}" from ${className} in session ${sessionName}.`}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void onConfirm()}
            isLoading={isSubmitting}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Remove Subject
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMessage && (
          <InlineAlert variant="error" title="Could not remove assignment">
            {errorMessage}
          </InlineAlert>
        )}

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Academic Session:</span>
            <span className="font-semibold text-slate-900">{sessionName}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Class:</span>
            <span className="font-semibold text-slate-900">{className}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Subject:</span>
            <span className="font-semibold text-slate-900 inline-flex items-center gap-1.5">
              <span>{subjectName}</span>
              <IdLabel>{subjectCode}</IdLabel>
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

// ============================================================================
// 7. Assign Subject to Class Dialog
// ============================================================================

export interface AssignClassSubjectDialogProps {
  open: boolean;
  onClose: () => void;
  sessionName: string;
  className: string;
  availableSubjects: SubjectResponse[];
  defaultDisplayOrder: number;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: AssignClassSubjectRequest) => Promise<void>;
}

export const AssignClassSubjectDialog: React.FC<AssignClassSubjectDialogProps> = ({
  open,
  onClose,
  sessionName,
  className,
  availableSubjects,
  defaultDisplayOrder,
  isSubmitting,
  errorMessage,
  onSubmit,
}) => {
  const [subjectId, setSubjectId] = useState<string>('');
  const [compulsory, setCompulsory] = useState<boolean>(true);
  const [displayOrder, setDisplayOrder] = useState<string>('1');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubjectId(availableSubjects[0] ? String(availableSubjects[0].id) : '');
    setCompulsory(true);
    setDisplayOrder(String(defaultDisplayOrder));
    setValidationError(null);
  }, [open, availableSubjects, defaultDisplayOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSubjectId = Number(subjectId);
    const parsedOrder = Number(displayOrder);

    if (!parsedSubjectId || Number.isNaN(parsedSubjectId)) {
      setValidationError('Please select a subject to assign.');
      return;
    }
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      setValidationError('Display order must be a positive whole number.');
      return;
    }

    setValidationError(null);
    await onSubmit({
      subjectId: parsedSubjectId,
      compulsory,
      displayOrder: parsedOrder,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Assign Subject to ${className}`}
      description={`Academic Session: ${sessionName}`}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-class-subject-form"
            variant="primary"
            disabled={availableSubjects.length === 0}
            isLoading={isSubmitting}
          >
            Assign Subject
          </Button>
        </>
      }
    >
      <form id="assign-class-subject-form" onSubmit={handleSubmit} className="space-y-4">
        {(errorMessage || validationError) && (
          <InlineAlert variant="error" title="Unable to assign subject">
            {validationError || errorMessage}
          </InlineAlert>
        )}

        {availableSubjects.length === 0 ? (
          <InlineAlert variant="warning" title="No Unassigned Active Subjects Available">
            All active subjects in your school have already been assigned to {className} for this
            session, or no active subjects exist yet.
          </InlineAlert>
        ) : (
          <>
            <FormField
              label="Subject"
              htmlFor="assign-subject-select"
              required
              hint="Only active subjects not yet assigned to this class in the selected session are listed."
            >
              <Select
                id="assign-subject-select"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {availableSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField
                label="Subject Type"
                htmlFor="assign-compulsory-select"
                required
              >
                <Select
                  id="assign-compulsory-select"
                  value={compulsory ? 'true' : 'false'}
                  onChange={(e) => setCompulsory(e.target.value === 'true')}
                >
                  <option value="true">Compulsory</option>
                  <option value="false">Optional / Elective</option>
                </Select>
              </FormField>

              <FormField
                label="Display Order"
                htmlFor="assign-order-input"
                required
              >
                <Input
                  id="assign-order-input"
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                />
              </FormField>
            </div>
          </>
        )}
      </form>
    </Dialog>
  );
};





