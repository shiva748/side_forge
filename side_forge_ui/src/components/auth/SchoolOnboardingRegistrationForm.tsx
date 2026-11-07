import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  CheckCircle2,
  Clock,
  LogIn,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  User,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { submitSchoolOnboarding } from '../../services/onboardingApi';
import {
  BoardAffiliation,
  CurrentManagementSystem,
  INDIAN_STATES,
  OnboardingRequestResponse,
  StudentStrength,
} from '../../types/onboarding';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { FormField, Input, Select, Textarea } from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

const schoolOnboardingSchema = z.object({
  schoolName: z
    .string()
    .trim()
    .min(1, 'School name is required')
    .max(150, 'School name cannot exceed 150 characters'),
  boardAffiliation: z.enum(['CBSE', 'ICSE', 'STATE_BOARD', 'IB', 'CAMBRIDGE', 'OTHER'], {
    message: 'Select a valid board affiliation',
  }),
  schoolEmail: z
    .string()
    .trim()
    .min(1, 'Official school email is required')
    .email('Enter a valid school email address')
    .max(255, 'Email cannot exceed 255 characters'),
  schoolPhone: z
    .string()
    .trim()
    .min(6, 'School phone number is required')
    .max(15, 'School phone number cannot exceed 15 characters'),
  address: z
    .string()
    .trim()
    .min(5, 'Campus street address is required')
    .max(500, 'Address cannot exceed 500 characters'),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City cannot exceed 100 characters'),
  state: z
    .string()
    .trim()
    .min(1, 'State is required')
    .max(100, 'State cannot exceed 100 characters'),
  postalCode: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Enter a valid 6-digit Indian PIN code'),
  contactPersonName: z
    .string()
    .trim()
    .min(1, 'Contact person name is required')
    .max(150, 'Contact person name cannot exceed 150 characters'),
  designation: z
    .string()
    .trim()
    .min(1, 'Designation is required')
    .max(100, 'Designation cannot exceed 100 characters'),
  contactEmail: z
    .string()
    .trim()
    .min(1, 'Contact email is required')
    .email('Enter a valid contact email address')
    .max(255, 'Email cannot exceed 255 characters'),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number (starting with 6–9)'),
  studentStrength: z.enum(
    [
      'BELOW_250',
      'FROM_250_TO_500',
      'FROM_500_TO_1000',
      'FROM_1000_TO_2500',
      'FROM_2500_TO_5000',
      'ABOVE_5000',
    ],
    { message: 'Select estimated student strength' }
  ),
  campusCount: z.coerce
    .number()
    .int('Campus count must be a whole number')
    .min(1, 'Campus count must be at least 1'),
  managementSystem: z.enum(
    ['PAPER_REGISTERS', 'EXCEL_SPREADSHEETS', 'DESKTOP_SOFTWARE', 'NO_EXISTING_SYSTEM'],
    { message: 'Select current management system' }
  ),
  additionalRequirements: z
    .string()
    .trim()
    .max(2000, 'Additional requirements cannot exceed 2000 characters')
    .optional()
    .or(z.literal('')),
});

type SchoolOnboardingFormValues = z.infer<typeof schoolOnboardingSchema>;

export interface SchoolOnboardingRegistrationFormProps {
  prefill?: {
    contactPersonName?: string;
    contactEmail?: string;
    mobileNumber?: string;
  };
  onSwitchToUserAccount: () => void;
}

export const SchoolOnboardingRegistrationForm: React.FC<
  SchoolOnboardingRegistrationFormProps
> = ({ prefill, onSwitchToUserAccount }) => {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<OnboardingRequestResponse | null>(null);

  const defaultContactName =
    prefill?.contactPersonName ||
    (user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '');
  const defaultContactEmail = prefill?.contactEmail || user?.email || '';
  const defaultMobile =
    prefill?.mobileNumber || (user?.phoneNumber ? user.phoneNumber.replace(/^\+91/, '') : '');

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SchoolOnboardingFormValues>({
    resolver: zodResolver(schoolOnboardingSchema) as never,
    defaultValues: {
      schoolName: '',
      boardAffiliation: 'CBSE',
      schoolEmail: '',
      schoolPhone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      contactPersonName: defaultContactName,
      designation: 'Principal',
      contactEmail: defaultContactEmail,
      mobileNumber: defaultMobile,
      studentStrength: 'FROM_250_TO_500',
      campusCount: 1,
      managementSystem: 'EXCEL_SPREADSHEETS',
      additionalRequirements: '',
    },
  });

  useEffect(() => {
    if (defaultContactName) setValue('contactPersonName', defaultContactName);
    if (defaultContactEmail) setValue('contactEmail', defaultContactEmail);
    if (defaultMobile) setValue('mobileNumber', defaultMobile);
  }, [defaultContactName, defaultContactEmail, defaultMobile, setValue]);

  const onSubmit = async (values: SchoolOnboardingFormValues) => {
    setServerError(null);
    const res = await submitSchoolOnboarding({
      schoolName: values.schoolName,
      boardAffiliation: values.boardAffiliation as BoardAffiliation,
      schoolEmail: values.schoolEmail,
      schoolPhone: values.schoolPhone,
      address: values.address,
      city: values.city,
      state: values.state,
      postalCode: values.postalCode,
      contactPersonName: values.contactPersonName,
      designation: values.designation,
      contactEmail: values.contactEmail,
      mobileNumber: values.mobileNumber,
      studentStrength: values.studentStrength as StudentStrength,
      campusCount: values.campusCount,
      managementSystem: values.managementSystem as CurrentManagementSystem,
      additionalRequirements: values.additionalRequirements || '',
    });

    if (res.success && res.data) {
      setSubmittedRequest(res.data);
      toast.success(
        'Onboarding request submitted',
        `Application #ONB-${res.data.id} is now pending platform approval.`
      );
      return;
    }

    if (res.fieldErrors) {
      for (const [field, msg] of Object.entries(res.fieldErrors)) {
        if (field in values) {
          setError(field as keyof SchoolOnboardingFormValues, {
            type: 'server',
            message: msg,
          });
        }
      }
    }
    setServerError(res.message || 'Unable to submit school onboarding request.');
  };

  if (submittedRequest) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  School Onboarding Request Submitted
                </h2>
                <Badge variant="warning" dot>
                  {submittedRequest.status || 'PENDING'} • Awaiting Platform Approval
                </Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your onboarding application for{' '}
                <span className="font-semibold text-slate-900">{submittedRequest.schoolName}</span>{' '}
                has been recorded. Submitting an application does{' '}
                <span className="font-semibold text-slate-900">not</span> immediately activate an
                organization or grant <span className="font-mono font-semibold">SCHOOL_ADMIN</span>{' '}
                privileges until approved by Platform Administration.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Reference ID</span>
              <span className="font-mono font-bold text-indigo-700">
                #ONB-{submittedRequest.id}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Institution</span>
              <span className="font-semibold text-slate-900">{submittedRequest.schoolName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Primary Contact</span>
              <span className="font-semibold text-slate-900 break-all">
                {submittedRequest.contactEmail}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Applicant Account</span>
              <span className="font-semibold text-slate-900">
                {submittedRequest.requestedBy
                  ? `Linked (User #${submittedRequest.requestedBy})`
                  : 'Invitation on Approval'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>What Happens Next</span>
          </h3>
          <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
            <li>
              <span className="font-semibold text-slate-900">Platform Verification:</span> A
              SchoolForge Platform Administrator reviews your school details and board affiliation.
            </li>
            <li>
              <span className="font-semibold text-slate-900">Tenant &amp; Plan Provisioning:</span>{' '}
              Upon approval, your school organization and initial subscription plan are activated.
            </li>
            <li>
              <span className="font-semibold text-slate-900">Initial Administrator Access:</span>{' '}
              {submittedRequest.requestedBy ? (
                <>
                  Because you submitted this request while signed in, your account (
                  <span className="font-mono">{user?.email}</span>) will automatically be
                  provisioned as the initial <span className="font-mono">SCHOOL_ADMIN</span> upon
                  approval.
                </>
              ) : (
                <>
                  Once approved, a single-use <span className="font-mono">SCHOOL_ADMIN</span>{' '}
                  invitation link is automatically dispatched to{' '}
                  <span className="font-mono">{submittedRequest.contactEmail}</span> to activate
                  your administrator account.
                </>
              )}
            </li>
          </ol>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Button variant="primary" onClick={() => navigate('/onboarding-status')}>
                View Account &amp; Approval Status
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  onClick={() => navigate('/login')}
                  leftIcon={<LogIn className="w-4 h-4" />}
                >
                  Go to Sign In
                </Button>
                <Button
                  variant="outline"
                  onClick={onSwitchToUserAccount}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Create Personal User Account
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setSubmittedRequest(null);
                reset();
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Submit Another Application
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 flex items-start gap-2.5 text-xs text-indigo-950">
        <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold">Approval Workflow:</span> Submitting this form creates a{' '}
          <span className="font-mono font-semibold">PENDING</span> school onboarding request.
          Workspace access and <span className="font-mono font-semibold">SCHOOL_ADMIN</span>{' '}
          privileges are provisioned only after Platform Administration approves your institution.
          {isAuthenticated && user && (
            <span className="block mt-1 font-medium text-indigo-800">
              • Signed in as <span className="font-mono">{user.email}</span>: your account will be
              linked as the applicant (<span className="font-mono">requestedBy</span>).
            </span>
          )}
        </div>
      </div>

      {serverError && (
        <InlineAlert variant="error" title="Submission failed">
          {serverError}
        </InlineAlert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            1. Institution &amp; Operational Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="School Name"
              htmlFor="onb-schoolName"
              required
              error={errors.schoolName?.message}
              className="sm:col-span-2"
            >
              <Input
                id="onb-schoolName"
                placeholder="Sunrise Public School"
                leftIcon={<Building2 className="w-4 h-4" />}
                hasError={Boolean(errors.schoolName)}
                {...register('schoolName')}
              />
            </FormField>

            <FormField
              label="Board Affiliation"
              htmlFor="onb-boardAffiliation"
              required
              error={errors.boardAffiliation?.message}
            >
              <Select
                id="onb-boardAffiliation"
                hasError={Boolean(errors.boardAffiliation)}
                {...register('boardAffiliation')}
              >
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE / CISCE</option>
                <option value="STATE_BOARD">State Board</option>
                <option value="IB">IB (International Baccalaureate)</option>
                <option value="CAMBRIDGE">Cambridge (IGCSE)</option>
                <option value="OTHER">Other / Independent</option>
              </Select>
            </FormField>

            <FormField
              label="Estimated Student Strength"
              htmlFor="onb-studentStrength"
              required
              error={errors.studentStrength?.message}
            >
              <Select
                id="onb-studentStrength"
                hasError={Boolean(errors.studentStrength)}
                {...register('studentStrength')}
              >
                <option value="BELOW_250">Below 250 Students</option>
                <option value="FROM_250_TO_500">250 – 500 Students</option>
                <option value="FROM_500_TO_1000">500 – 1,000 Students</option>
                <option value="FROM_1000_TO_2500">1,000 – 2,500 Students</option>
                <option value="FROM_2500_TO_5000">2,500 – 5,000 Students</option>
                <option value="ABOVE_5000">Above 5,000 Students</option>
              </Select>
            </FormField>

            <FormField
              label="Official School Email"
              htmlFor="onb-schoolEmail"
              required
              error={errors.schoolEmail?.message}
            >
              <Input
                id="onb-schoolEmail"
                type="email"
                placeholder="info@sunriseschool.edu.in"
                leftIcon={<Mail className="w-4 h-4" />}
                hasError={Boolean(errors.schoolEmail)}
                {...register('schoolEmail')}
              />
            </FormField>

            <FormField
              label="School Phone / Landline"
              htmlFor="onb-schoolPhone"
              required
              error={errors.schoolPhone?.message}
            >
              <Input
                id="onb-schoolPhone"
                type="tel"
                maxLength={15}
                placeholder="02025551234"
                leftIcon={<Phone className="w-4 h-4" />}
                hasError={Boolean(errors.schoolPhone)}
                {...register('schoolPhone')}
              />
            </FormField>

            <FormField
              label="Number of Campuses"
              htmlFor="onb-campusCount"
              required
              error={errors.campusCount?.message}
            >
              <Input
                id="onb-campusCount"
                type="number"
                min={1}
                hasError={Boolean(errors.campusCount)}
                {...register('campusCount')}
              />
            </FormField>

            <FormField
              label="Current Management System"
              htmlFor="onb-managementSystem"
              required
              error={errors.managementSystem?.message}
            >
              <Select
                id="onb-managementSystem"
                hasError={Boolean(errors.managementSystem)}
                {...register('managementSystem')}
              >
                <option value="EXCEL_SPREADSHEETS">Excel / Spreadsheets</option>
                <option value="PAPER_REGISTERS">Paper Registers / Manual Ledgers</option>
                <option value="DESKTOP_SOFTWARE">Local Desktop Software</option>
                <option value="NO_EXISTING_SYSTEM">No Existing System</option>
              </Select>
            </FormField>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            2. Campus Location
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Street Address"
              htmlFor="onb-address"
              required
              error={errors.address?.message}
              className="sm:col-span-3"
            >
              <Input
                id="onb-address"
                placeholder="123 Education Lane, Kothrud"
                leftIcon={<MapPin className="w-4 h-4" />}
                hasError={Boolean(errors.address)}
                {...register('address')}
              />
            </FormField>

            <FormField
              label="City"
              htmlFor="onb-city"
              required
              error={errors.city?.message}
            >
              <Input
                id="onb-city"
                placeholder="Pune"
                hasError={Boolean(errors.city)}
                {...register('city')}
              />
            </FormField>

            <FormField
              label="State / UT"
              htmlFor="onb-state"
              required
              error={errors.state?.message}
            >
              <Select
                id="onb-state"
                hasError={Boolean(errors.state)}
                {...register('state')}
              >
                <option value="">Select state...</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="PIN Code (6 digits)"
              htmlFor="onb-postalCode"
              required
              error={errors.postalCode?.message}
            >
              <Input
                id="onb-postalCode"
                inputMode="numeric"
                maxLength={6}
                placeholder="411038"
                hasError={Boolean(errors.postalCode)}
                {...register('postalCode')}
              />
            </FormField>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            3. Primary Contact / Applicant Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Contact Person Name"
              htmlFor="onb-contactPersonName"
              required
              error={errors.contactPersonName?.message}
            >
              <Input
                id="onb-contactPersonName"
                placeholder="Rajesh Sharma"
                leftIcon={<User className="w-4 h-4" />}
                hasError={Boolean(errors.contactPersonName)}
                {...register('contactPersonName')}
              />
            </FormField>

            <FormField
              label="Designation / Role"
              htmlFor="onb-designation"
              required
              error={errors.designation?.message}
            >
              <Input
                id="onb-designation"
                placeholder="Principal / Director"
                hasError={Boolean(errors.designation)}
                {...register('designation')}
              />
            </FormField>

            <FormField
              label="Contact Email"
              htmlFor="onb-contactEmail"
              required
              hint="Initial SCHOOL_ADMIN invitation will be sent here if not signed in"
              error={errors.contactEmail?.message}
            >
              <Input
                id="onb-contactEmail"
                type="email"
                placeholder="principal@sunriseschool.edu.in"
                leftIcon={<Mail className="w-4 h-4" />}
                hasError={Boolean(errors.contactEmail)}
                {...register('contactEmail')}
              />
            </FormField>

            <FormField
              label="Contact Mobile (10-digit Indian Mobile)"
              htmlFor="onb-mobileNumber"
              required
              hint="10 digits starting with 6, 7, 8, or 9"
              error={errors.mobileNumber?.message}
            >
              <Input
                id="onb-mobileNumber"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                leftIcon={<Phone className="w-4 h-4" />}
                hasError={Boolean(errors.mobileNumber)}
                {...register('mobileNumber')}
              />
            </FormField>

            <FormField
              label="Additional Requirements (Optional)"
              htmlFor="onb-additionalRequirements"
              error={errors.additionalRequirements?.message}
              className="sm:col-span-2"
            >
              <Textarea
                id="onb-additionalRequirements"
                rows={2}
                placeholder="Any migration notes, preferred academic session start date, or specific module requirements..."
                hasError={Boolean(errors.additionalRequirements)}
                {...register('additionalRequirements')}
              />
            </FormField>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
          >
            Submit School Onboarding Application
          </Button>
        </div>
      </form>

      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Sign in here
        </Link>
      </div>
    </div>
  );
};
