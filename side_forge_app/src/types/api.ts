/**
 * Standard backend response envelopes aligned with `com.side.forge.common.dto.ApiResponse`
 * and `com.side.forge.common.dto.ErrorResponse`.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ErrorResponse {
  status: number;
  message: string;
  errors?: string[];
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page?: number;
  number?: number;
  size: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}
