import { apiClient } from '../lib/api-client';
import type { TeacherResponse } from '../types/staffManagement';
import type {
  ClassTimetableResponse,
  CreateClassTimetableRequest,
  CreateTimetableConfigRequest,
  CreateTimetablePeriodRequest,
  CreateTimetableSlotRequest,
  DayOfWeek,
  TimetableConfigResponse,
  TimetablePeriodResponse,
  TimetableSlotResponse,
  UpdateTimetableConfigRequest,
  UpdateTimetablePeriodRequest,
  UpdateTimetableSlotRequest,
} from '../types/timetableManagement';

export const timetableManagementApi = {
  // =========================================================================
  // 1. Timetable Configurations (`/api/organizations/{orgId}/timetable-configs`)
  // =========================================================================

  getConfigs(
    organizationId: number,
    signal?: AbortSignal
  ): Promise<TimetableConfigResponse[]> {
    return apiClient.get<TimetableConfigResponse[]>(
      `/api/organizations/${organizationId}/timetable-configs`,
      { signal }
    );
  },

  getConfigById(
    organizationId: number,
    configId: number,
    signal?: AbortSignal
  ): Promise<TimetableConfigResponse> {
    return apiClient.get<TimetableConfigResponse>(
      `/api/organizations/${organizationId}/timetable-configs/${configId}`,
      { signal }
    );
  },

  createConfig(
    organizationId: number,
    payload: CreateTimetableConfigRequest
  ): Promise<TimetableConfigResponse> {
    return apiClient.post<TimetableConfigResponse>(
      `/api/organizations/${organizationId}/timetable-configs`,
      payload
    );
  },

  updateConfig(
    organizationId: number,
    configId: number,
    payload: UpdateTimetableConfigRequest
  ): Promise<TimetableConfigResponse> {
    return apiClient.put<TimetableConfigResponse>(
      `/api/organizations/${organizationId}/timetable-configs/${configId}`,
      payload
    );
  },

  // =========================================================================
  // 2. Timetable Periods & Breaks (`/api/organizations/{orgId}/timetable-configs/{configId}/periods`)
  // =========================================================================

  getPeriods(
    organizationId: number,
    configId: number,
    signal?: AbortSignal
  ): Promise<TimetablePeriodResponse[]> {
    return apiClient.get<TimetablePeriodResponse[]>(
      `/api/organizations/${organizationId}/timetable-configs/${configId}/periods`,
      { signal }
    );
  },

  addPeriod(
    organizationId: number,
    configId: number,
    payload: CreateTimetablePeriodRequest
  ): Promise<TimetablePeriodResponse> {
    return apiClient.post<TimetablePeriodResponse>(
      `/api/organizations/${organizationId}/timetable-configs/${configId}/periods`,
      payload
    );
  },

  updatePeriod(
    organizationId: number,
    configId: number,
    periodId: number,
    payload: UpdateTimetablePeriodRequest
  ): Promise<TimetablePeriodResponse> {
    return apiClient.put<TimetablePeriodResponse>(
      `/api/organizations/${organizationId}/timetable-configs/${configId}/periods/${periodId}`,
      payload
    );
  },

  // =========================================================================
  // 3. Class Timetables (`/api/organizations/{orgId}/timetables` & session/class lookups)
  // =========================================================================

  createClassTimetable(
    organizationId: number,
    payload: CreateClassTimetableRequest
  ): Promise<ClassTimetableResponse> {
    return apiClient.post<ClassTimetableResponse>(
      `/api/organizations/${organizationId}/timetables`,
      payload
    );
  },

  getClassTimetableById(
    organizationId: number,
    timetableId: number,
    dayOfWeek?: DayOfWeek,
    signal?: AbortSignal
  ): Promise<ClassTimetableResponse> {
    return apiClient.get<ClassTimetableResponse>(
      `/api/organizations/${organizationId}/timetables/${timetableId}`,
      {
        signal,
        params: { dayOfWeek: dayOfWeek || undefined },
      }
    );
  },

  getSessionTimetables(
    organizationId: number,
    sessionId: number,
    signal?: AbortSignal
  ): Promise<ClassTimetableResponse[]> {
    return apiClient.get<ClassTimetableResponse[]>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/timetables`,
      { signal }
    );
  },

  getClassTimetableBySessionAndClass(
    organizationId: number,
    sessionId: number,
    classId: number,
    dayOfWeek?: DayOfWeek,
    signal?: AbortSignal,
    sectionId?: number | null
  ): Promise<ClassTimetableResponse> {
    return apiClient.get<ClassTimetableResponse>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/timetable`,
      {
        signal,
        params: {
          sectionId: sectionId || undefined,
          dayOfWeek: dayOfWeek || undefined,
        },
      }
    );
  },

  // =========================================================================
  // 4. Timetable Teaching Slots (`/api/organizations/{orgId}/timetables/{timetableId}/slots`)
  // =========================================================================

  addSlot(
    organizationId: number,
    timetableId: number,
    payload: CreateTimetableSlotRequest
  ): Promise<TimetableSlotResponse> {
    return apiClient.post<TimetableSlotResponse>(
      `/api/organizations/${organizationId}/timetables/${timetableId}/slots`,
      payload
    );
  },

  updateSlot(
    organizationId: number,
    timetableId: number,
    slotId: number,
    payload: UpdateTimetableSlotRequest
  ): Promise<TimetableSlotResponse> {
    return apiClient.put<TimetableSlotResponse>(
      `/api/organizations/${organizationId}/timetables/${timetableId}/slots/${slotId}`,
      payload
    );
  },

  removeSlot(
    organizationId: number,
    timetableId: number,
    slotId: number
  ): Promise<void> {
    return apiClient.delete<void>(
      `/api/organizations/${organizationId}/timetables/${timetableId}/slots/${slotId}`
    );
  },

  // =========================================================================
  // 5. Draft & Publish Lifecycle (`/publish` & `/reopen`)
  // =========================================================================

  publishTimetable(
    organizationId: number,
    timetableId: number
  ): Promise<ClassTimetableResponse> {
    return apiClient.patch<ClassTimetableResponse>(
      `/api/organizations/${organizationId}/timetables/${timetableId}/publish`
    );
  },

  reopenTimetable(
    organizationId: number,
    timetableId: number
  ): Promise<ClassTimetableResponse> {
    return apiClient.patch<ClassTimetableResponse>(
      `/api/organizations/${organizationId}/timetables/${timetableId}/reopen`
    );
  },

  // =========================================================================
  // 6. Teacher Timetable & Unscheduled Teachers
  // =========================================================================

  getTeacherTimetable(
    organizationId: number,
    teacherId: number,
    params?: { academicSessionId?: number; dayOfWeek?: DayOfWeek },
    signal?: AbortSignal
  ): Promise<TimetableSlotResponse[]> {
    return apiClient.get<TimetableSlotResponse[]>(
      `/api/organizations/${organizationId}/teachers/${teacherId}/timetable`,
      {
        signal,
        params: {
          academicSessionId: params?.academicSessionId || undefined,
          dayOfWeek: params?.dayOfWeek || undefined,
        },
      }
    );
  },

  getUnscheduledTeachers(
    organizationId: number,
    sessionId: number,
    signal?: AbortSignal
  ): Promise<TeacherResponse[]> {
    return apiClient.get<TeacherResponse[]>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/timetables/unscheduled-teachers`,
      { signal }
    );
  },
};

