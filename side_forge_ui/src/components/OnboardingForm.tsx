import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  User, 
  Layers, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  Copy, 
  Check, 
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  OnboardingFormData, 
  FormErrors, 
  BoardAffiliation,
  StudentStrength, 
  CurrentManagementSystem,
  INDIAN_STATES,
  ApiResponse 
} from '../types/onboarding';
import { submitSchoolOnboarding } from '../services/onboardingApi';

const initialFormData: OnboardingFormData = {
  // 1. School Information
  schoolName: '',
  boardAffiliation: '',
  schoolEmail: '',
  schoolPhone: '',

  // 2. School Address
  address: '',
  city: '',
  state: '',
  postalCode: '',

  // 3. Contact Person Information
  contactPersonName: '',
  designation: '',
  contactEmail: '',
  mobileNumber: '',

  // 4. School Operational Information
  studentStrength: '',
  campusCount: 1,
  managementSystem: '',

  // 5. Additional Requirements
  additionalRequirements: ''
};

// Enum options with human-friendly display labels and exact backend values
const boardOptions: { value: BoardAffiliation; label: string }[] = [
  { value: 'CBSE', label: 'CBSE (Central Board of Secondary Education)' },
  { value: 'ICSE', label: 'ICSE / CISCE' },
  { value: 'STATE_BOARD', label: 'State Board' },
  { value: 'IB', label: 'IB (International Baccalaureate)' },
  { value: 'CAMBRIDGE', label: 'Cambridge (IGCSE / A-Levels)' },
  { value: 'OTHER', label: 'Other / Independent' }
];

const studentStrengthOptions: { value: StudentStrength; label: string }[] = [
  { value: 'BELOW_250', label: 'Below 250 Students' },
  { value: 'FROM_250_TO_500', label: '250–500 Students' },
  { value: 'FROM_500_TO_1000', label: '500–1,000 Students' },
  { value: 'FROM_1000_TO_2500', label: '1,000–2,500 Students' },
  { value: 'FROM_2500_TO_5000', label: '2,500–5,000 Students' },
  { value: 'ABOVE_5000', label: 'Above 5,000 Students' }
];

const managementSystemOptions: { value: CurrentManagementSystem; label: string; desc: string }[] = [
  { 
    value: 'PAPER_REGISTERS', 
    label: 'Paper Registers / Manual Ledgers',
    desc: 'Attendance logs and fee records maintained physically'
  },
  { 
    value: 'EXCEL_SPREADSHEETS', 
    label: 'Excel / Spreadsheets',
    desc: 'Excel, Google Sheets or local tabular files'
  },
  { 
    value: 'DESKTOP_SOFTWARE', 
    label: 'Local Desktop Software',
    desc: 'Installed single-PC offline school software'
  },
  { 
    value: 'NO_EXISTING_SYSTEM', 
    label: 'No Existing System',
    desc: 'Starting afresh with a new school setup'
  }
];

const standardDesignations = [
  'Principal',
  'Director',
  'Trustee / Owner',
  'Administrator',
  'Correspondent / Secretary',
  'Vice Principal',
  'Other'
];

export const OnboardingForm: React.FC = () => {
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<ApiResponse | null>(null);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<OnboardingFormData | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  // Email format validation regex
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Postal code validation regex (strictly 6 numeric digits)
  const isValidPostalCode = (code: string) => /^\d{6}$/.test(code.trim());

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // 1. School Information
    if (!formData.schoolName.trim()) {
      newErrors.schoolName = 'School name is required';
    } else if (formData.schoolName.trim().length > 150) {
      newErrors.schoolName = 'School name must not exceed 150 characters';
    }

    if (!formData.boardAffiliation) {
      newErrors.boardAffiliation = 'Please select a board affiliation';
    }

    if (!formData.schoolEmail.trim()) {
      newErrors.schoolEmail = 'School email address is required';
    } else if (!isValidEmail(formData.schoolEmail)) {
      newErrors.schoolEmail = 'Please provide a valid school email address';
    }

    if (!formData.schoolPhone.trim()) {
      newErrors.schoolPhone = 'School phone number is required';
    } else if (formData.schoolPhone.trim().length > 15) {
      newErrors.schoolPhone = 'School phone number must not exceed 15 characters';
    }

    // 2. School Address
    if (!formData.address.trim()) {
      newErrors.address = 'Campus street address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    } else if (!isValidPostalCode(formData.postalCode)) {
      newErrors.postalCode = 'Postal code must be exactly 6 numeric digits';
    }

    // 3. Contact Person Information
    if (!formData.contactPersonName.trim()) {
      newErrors.contactPersonName = 'Contact person name is required';
    }

    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation is required';
    }

    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email address is required';
    } else if (!isValidEmail(formData.contactEmail)) {
      newErrors.contactEmail = 'Please provide a valid email address';
    }

    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (formData.mobileNumber.trim().length > 15) {
      newErrors.mobileNumber = 'Mobile number must not exceed 15 characters';
    }

    // 4. School Operational Information
    if (!formData.studentStrength) {
      newErrors.studentStrength = 'Please select approximate student strength';
    }

    const campuses = typeof formData.campusCount === 'number' 
      ? formData.campusCount 
      : parseInt(String(formData.campusCount), 10);

    if (isNaN(campuses) || campuses < 1) {
      newErrors.campusCount = 'Campus count must be an integer of at least 1';
    }

    if (!formData.managementSystem) {
      newErrors.managementSystem = 'Please select your current management system';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setApiErrorMessage(null);

    // Clear field-specific error as user types
    if (errors[name as keyof OnboardingFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiErrorMessage(null);

    if (!validate()) {
      // Smooth scroll to the first validation error field
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.getElementsByName(firstErrorField)[0];
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitSchoolOnboarding(formData);

      if (response.success) {
        // Success: Preserve snapshot for confirmation screen and clear the active form
        setSubmittedSnapshot({ ...formData });
        setSubmissionResult(response);
        setFormData(initialFormData);
        setErrors({});
      } else {
        // Failure: Preserve entered values so user does not lose their progress
        setApiErrorMessage(response.message || 'Unable to submit onboarding request. Please review the form.');
        if (response.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...response.fieldErrors }));
        }
      }
    } catch {
      // General network/client error fallback (do not leak internal exception details)
      setApiErrorMessage('Unable to connect to the onboarding service. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnotherSchool = () => {
    setFormData(initialFormData);
    setErrors({});
    setSubmissionResult(null);
    setSubmittedSnapshot(null);
    setApiErrorMessage(null);
  };

  const handleCopyReference = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Generate a display-friendly reference code if response contains id or reference
  const getReferenceDisplay = () => {
    if (submissionResult?.data && typeof submissionResult.data === 'object') {
      const d = submissionResult.data as Record<string, unknown>;
      if (d.referenceId) return String(d.referenceId);
      if (d.id) return `SF-REQ-${d.id}`;
    }
    return `SF-REQ-${Math.floor(100000 + Math.random() * 900000)}`;
  };

  return (
    <section id="onboarding-form" className="py-20 lg:py-28 bg-stone-50/70 border-b border-slate-200/60 scroll-mt-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <span>Official School Registration</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-balance">
            Bring Your School Onboard.
          </h2>

          <p className="text-base text-slate-600 leading-relaxed">
            Tell us about your educational institution. Your submission will be registered in our onboarding portal 
            for administrative review, followed by personalized workspace setup.
          </p>
        </div>

        {/* Form Container Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 p-6 sm:p-10 lg:p-12 relative">
          
          {submissionResult?.success && submittedSnapshot ? (
            /* ================= Success Confirmation Screen ================= */
            <div className="text-center py-6 space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">
                  Onboarding Request Submitted Successfully
                </h3>
                <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Thank you, <span className="font-semibold text-slate-900">{submittedSnapshot.contactPersonName}</span>. 
                  Your request for <span className="font-semibold text-slate-900">{submittedSnapshot.schoolName}</span> ({submittedSnapshot.city}, {submittedSnapshot.state}) has been registered (HTTP 201 Created).
                </p>
              </div>

              {/* Reference ID Card */}
              {(() => {
                const refCode = getReferenceDisplay();
                return (
                  <div className="max-w-md mx-auto bg-stone-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                        Onboarding Request Reference
                      </span>
                      <span className="font-mono text-sm sm:text-base font-bold text-indigo-900">
                        {refCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyReference(refCode)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {copiedRef ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}

              {/* Workflow Status Note */}
              <div className="max-w-md mx-auto text-left bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-700 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    Administrative Review Process
                  </h4>
                </div>
                <ul className="text-xs text-indigo-900 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span>Your request is queued under <strong className="font-semibold">PENDING</strong> status in the administration portal.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span>Our team will verify your school's board affiliation ({submittedSnapshot.boardAffiliation}) and campus structure.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span>Upon administrator approval, login credentials and mobile deployment assistance will be provided via <strong className="font-semibold">{submittedSnapshot.contactEmail}</strong> and mobile <strong className="font-semibold">{submittedSnapshot.mobileNumber}</strong>.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleResetForAnotherSchool}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Submit request for another school or branch</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= Main Onboarding Form ================= */
            <form onSubmit={handleSubmit} className="space-y-12" noValidate>
              
              {/* Top Global Error Banner */}
              {apiErrorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-semibold">{apiErrorMessage}</p>
                    <p className="text-rose-600 mt-0.5 text-xs">
                      Your entered details have been preserved. Please make any necessary adjustments and submit again.
                    </p>
                  </div>
                </div>
              )}

              {/* ---------------- 1. School Information ---------------- */}
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                  <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">1. School Information</h3>
                    <p className="text-xs text-slate-500">Institutional identity and board affiliation</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* School Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      School Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="schoolName"
                      maxLength={150}
                      value={formData.schoolName}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="e.g. Delhi Public School / St. Xavier's High School"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.schoolName
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.schoolName ? (
                        <p className="text-xs text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{errors.schoolName}</span>
                        </p>
                      ) : <span />}
                      <span className="text-[11px] text-slate-400">
                        {formData.schoolName.length}/150
                      </span>
                    </div>
                  </div>

                  {/* Board Affiliation Dropdown (Enum) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Board Affiliation <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="boardAffiliation"
                      value={formData.boardAffiliation}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.boardAffiliation
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    >
                      <option value="">Select board affiliation...</option>
                      {boardOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.boardAffiliation && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.boardAffiliation}</span>
                      </p>
                    )}
                  </div>

                  {/* School Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      School Official Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="schoolEmail"
                      value={formData.schoolEmail}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="info@dps-example.com"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.schoolEmail
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.schoolEmail && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.schoolEmail}</span>
                      </p>
                    )}
                  </div>

                  {/* School Phone (max 15 chars) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      School Landline / Office Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="schoolPhone"
                      maxLength={15}
                      value={formData.schoolPhone}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="e.g. 01145678901 or 08023456789"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.schoolPhone
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.schoolPhone && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.schoolPhone}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ---------------- 2. School Address ---------------- */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                  <MapPin className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">2. School Address</h3>
                    <p className="text-xs text-slate-500">Campus location and postal coordinates</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Street Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Campus Street Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="e.g. Sector 45, Main Road, Landmark / Campus Gate 1"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.address
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.address && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.address}</span>
                      </p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="e.g. Gurugram, Bengaluru, Pune"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.city
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.city && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.city}</span>
                      </p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      State / Union Territory <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.state
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    >
                      <option value="">Select state...</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.state}</span>
                      </p>
                    )}
                  </div>

                  {/* Postal Code (exactly 6 numeric digits) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Postal Code (PIN Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      maxLength={6}
                      value={formData.postalCode}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="e.g. 122003 or 560001 (6 digits)"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.postalCode
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.postalCode && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.postalCode}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ---------------- 3. Contact Person Information ---------------- */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                  <User className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">3. Contact Person Information</h3>
                    <p className="text-xs text-slate-500">Authorized school representative managing the onboarding process</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Contact Person Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contactPersonName"
                      value={formData.contactPersonName}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.contactPersonName
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.contactPersonName && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.contactPersonName}</span>
                      </p>
                    )}
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Designation in School <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        list="designations-list"
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        placeholder="e.g. Principal, Director, Trustee"
                        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                          errors.designation
                            ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                        }`}
                      />
                      <datalist id="designations-list">
                        {standardDesignations.map((d) => (
                          <option key={d} value={d} />
                        ))}
                      </datalist>
                    </div>
                    {errors.designation && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.designation}</span>
                      </p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="rahul@example.com"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.contactEmail
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.contactEmail && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.contactEmail}</span>
                      </p>
                    )}
                  </div>

                  {/* Mobile Number (max 15 chars) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      maxLength={15}
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="9876543210"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.mobileNumber
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.mobileNumber && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.mobileNumber}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ---------------- 4. School Operational Information ---------------- */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                  <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">4. School Operational Information</h3>
                    <p className="text-xs text-slate-500">Student scale, campus footprint and current record methodology</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Student Strength Dropdown (Enum) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Student Strength <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="studentStrength"
                      value={formData.studentStrength}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.studentStrength
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    >
                      <option value="">Select student count range...</option>
                      {studentStrengthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.studentStrength && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.studentStrength}</span>
                      </p>
                    )}
                  </div>

                  {/* Campus Count (Integer >= 1) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Number of Campuses / Branches <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="campusCount"
                      min={1}
                      step={1}
                      value={formData.campusCount}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        errors.campusCount
                          ? 'border-rose-300 ring-rose-100 focus:border-rose-500'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                      }`}
                    />
                    {errors.campusCount && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.campusCount}</span>
                      </p>
                    )}
                  </div>

                  {/* Current Management System (Enum Radio Selection) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Current School Management System <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {managementSystemOptions.map((sys) => {
                        const isSelected = formData.managementSystem === sys.value;
                        return (
                          <label
                            key={sys.value}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500 text-indigo-950 font-medium'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="managementSystem"
                              value={sys.value}
                              checked={isSelected}
                              onChange={handleChange}
                              disabled={isSubmitting}
                              className="mt-1 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <div>
                              <span className="text-xs font-semibold block">{sys.label}</span>
                              <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">{sys.desc}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {errors.managementSystem && (
                      <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.managementSystem}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ---------------- 5. Additional Requirements ---------------- */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">5. Additional Requirements</h3>
                    <p className="text-xs text-slate-500">Specific operational priorities, module interests or timeline</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Additional Notes or Requirements <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    name="additionalRequirements"
                    rows={3}
                    value={formData.additionalRequirements}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="e.g. Need student, attendance and fee management."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all resize-y disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Submit Area */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-xl transition-all duration-150 shadow-md shadow-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting Onboarding Request to Server...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit School Onboarding Request</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Privacy & Protocol Reassurance */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Direct API transmission to <code className="font-mono text-slate-600">/api/organizations/onboarding</code>. Institutional data is kept strictly confidential.
                  </span>
                </div>
              </div>

            </form>
          )}

        </div>

      </div>
    </section>
  );
};
