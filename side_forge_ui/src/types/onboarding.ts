/**
 * Onboarding form data model and DTO types for Side_forge School Onboarding
 * Matches backend OnboardingRequestDto
 */

export type BoardAffiliation = 
  | 'CBSE'
  | 'ICSE'
  | 'STATE_BOARD'
  | 'IB'
  | 'CAMBRIDGE'
  | 'OTHER';

export type StudentStrength = 
  | 'BELOW_250'
  | 'FROM_250_TO_500'
  | 'FROM_500_TO_1000'
  | 'FROM_1000_TO_2500'
  | 'FROM_2500_TO_5000'
  | 'ABOVE_5000';

export type CurrentManagementSystem = 
  | 'PAPER_REGISTERS'
  | 'EXCEL_SPREADSHEETS'
  | 'DESKTOP_SOFTWARE'
  | 'NO_EXISTING_SYSTEM';

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi NCR',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Chandigarh',
  'Jammu & Kashmir',
  'Ladakh',
  'Puducherry'
] as const;

export type IndianState = typeof INDIAN_STATES[number];

/**
 * Exact payload sent to backend POST /api/organizations/onboarding
 * Matches Spring Boot OnboardingRequestDto
 */
export interface OnboardingRequestDto {
  schoolName: string;
  boardAffiliation: BoardAffiliation;
  schoolEmail: string;
  schoolPhone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  contactPersonName: string;
  designation: string;
  contactEmail: string;
  mobileNumber: string;
  studentStrength: StudentStrength;
  campusCount: number;
  managementSystem: CurrentManagementSystem;
  additionalRequirements?: string;
}

/**
 * Form state model used in the React component
 */
export interface OnboardingFormData {
  // 1. School Information
  schoolName: string;
  boardAffiliation: BoardAffiliation | '';
  schoolEmail: string;
  schoolPhone: string;

  // 2. School Address
  address: string;
  city: string;
  state: IndianState | string;
  postalCode: string;

  // 3. Contact Person Information
  contactPersonName: string;
  designation: string;
  contactEmail: string;
  mobileNumber: string;

  // 4. School Operational Information
  studentStrength: StudentStrength | '';
  campusCount: number | string;
  managementSystem: CurrentManagementSystem | '';

  // 5. Additional Requirements
  additionalRequirements: string;
}

export type FormErrors = Partial<Record<keyof OnboardingFormData, string>> & {
  general?: string;
};

export type OnboardingStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface OnboardingRequestResponse {
  id: number;
  schoolName: string;
  boardAffiliation: BoardAffiliation;
  schoolEmail: string;
  schoolPhone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  contactPersonName: string;
  designation: string;
  contactEmail: string;
  mobileNumber: string;
  studentStrength: StudentStrength;
  campusCount: number;
  managementSystem: CurrentManagementSystem;
  additionalRequirements?: string | null;
  requestedBy?: number | null;
  reviewedBy?: number | null;
  status: OnboardingStatus;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  data?: T;
  message?: string;
  fieldErrors?: Record<string, string>;
}
