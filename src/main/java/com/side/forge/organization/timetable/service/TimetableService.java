package com.side.forge.organization.timetable.service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.organization.academic.classsubject.repository.ClassSubjectRepository;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.academic.subject.entity.Subject;
import com.side.forge.organization.academic.subject.repository.SubjectRepository;
import com.side.forge.organization.academic.subject.service.SubjectService;
import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.Staff;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.teacher.dto.TeacherResponse;
import com.side.forge.organization.teacher.entity.TeacherProfile;
import com.side.forge.organization.teacher.repository.TeacherProfileRepository;
import com.side.forge.organization.teacher.repository.TeacherSubjectAssignmentRepository;
import com.side.forge.organization.teacher.service.TeacherService;
import com.side.forge.organization.teacher.service.TeacherService.ActiveTeacherPair;
import com.side.forge.organization.timetable.dto.*;
import com.side.forge.organization.timetable.entity.*;
import com.side.forge.organization.timetable.repository.*;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TimetableService {

	private final TimetableConfigRepository configRepository;
	private final TimetablePeriodRepository periodRepository;
	private final ClassTimetableRepository timetableRepository;
	private final TimetableSlotRepository slotRepository;
	private final AcademicSessionService sessionService;
	private final AcademicSessionRepository sessionRepository;
	private final SchoolClassService classService;
	private final SchoolClassRepository classRepository;
	private final SubjectService subjectService;
	private final SubjectRepository subjectRepository;
	private final ClassSubjectRepository classSubjectRepository;
	private final TeacherService teacherService;
	private final TeacherProfileRepository teacherProfileRepository;
	private final StaffRepository staffRepository;
	private final TeacherSubjectAssignmentRepository teacherSubjectAssignmentRepository;
	private final AcademicTenantAccessValidator validator;
	private final CurrentUserContext currentUser;
	private final NotificationService notificationService;

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@Transactional
	public TimetableConfigResponse createConfig(Long orgId, CreateTimetableConfigRequest request) {
		validator.requireOrganization(orgId);
		String name = validator.normalizeRequiredText(request.name(), "Configuration name");
		validateConfigTimings(request.dayStartTime(), request.dayEndTime(), request.workingDays());

		if (configRepository.existsByOrganizationIdAndNameIgnoreCase(orgId, name)) {
			throw new IllegalStateException("Timetable configuration with this name already exists in the organization");
		}

		TimetableConfig config = new TimetableConfig();
		config.setOrganizationId(orgId);
		config.setName(name);
		config.setWorkingDays(serializeWorkingDays(request.workingDays()));
		config.setDayStartTime(request.dayStartTime());
		config.setDayEndTime(request.dayEndTime());
		config.setDescription(validator.normalizeOptionalText(request.description()));
		config.setActive(true);

		return toConfigResponse(configRepository.save(config), List.of());
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@Transactional(readOnly = true)
	public List<TimetableConfigResponse> getConfigs(Long orgId) {
		validator.requireOrganization(orgId);
		return configRepository.findAllByOrganizationIdOrderByNameAsc(orgId).stream()
				.map(c -> toConfigResponse(c, periodRepository
						.findAllByOrganizationIdAndTimetableConfigIdOrderByPeriodOrderAscStartTimeAsc(orgId, c.getId())))
				.toList();
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@Transactional(readOnly = true)
	public TimetableConfigResponse getConfigById(Long orgId, Long configId) {
		validator.requireOrganization(orgId);
		TimetableConfig config = requireConfig(orgId, configId);
		List<TimetablePeriod> periods = periodRepository
				.findAllByOrganizationIdAndTimetableConfigIdOrderByPeriodOrderAscStartTimeAsc(orgId, configId);
		return toConfigResponse(config, periods);
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@Transactional
	public TimetableConfigResponse updateConfig(Long orgId, Long configId, UpdateTimetableConfigRequest request) {
		validator.requireOrganization(orgId);
		TimetableConfig config = requireConfigForUpdate(orgId, configId);
		String name = validator.normalizeRequiredText(request.name(), "Configuration name");
		validateConfigTimings(request.dayStartTime(), request.dayEndTime(), request.workingDays());

		if (configRepository.existsByOrganizationIdAndNameIgnoreCaseAndIdNot(orgId, name, configId)) {
			throw new IllegalStateException("Timetable configuration with this name already exists in the organization");
		}
		if (timetableRepository.existsByOrganizationIdAndTimetableConfigIdAndStatus(
				orgId, configId, TimetableStatus.PUBLISHED)) {
			throw new IllegalStateException(
					"Cannot modify timetable configuration while a published timetable depends on it");
		}

		List<TimetablePeriod> periods = periodRepository
				.findAllByOrganizationIdAndTimetableConfigIdOrderByPeriodOrderAscStartTimeAsc(orgId, configId);
		for (TimetablePeriod p : periods) {
			if (p.getStartTime().isBefore(request.dayStartTime()) || p.getEndTime().isAfter(request.dayEndTime())) {
				throw new IllegalStateException(
						"Updated working hours would invalidate existing period: " + p.getName());
			}
		}

		config.setName(name);
		config.setWorkingDays(serializeWorkingDays(request.workingDays()));
		config.setDayStartTime(request.dayStartTime());
		config.setDayEndTime(request.dayEndTime());
		config.setDescription(validator.normalizeOptionalText(request.description()));
		if (request.active() != null) {
			config.setActive(request.active());
		}

		return toConfigResponse(configRepository.save(config), periods);
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@Transactional
	public TimetablePeriodResponse addPeriod(Long orgId, Long configId, CreateTimetablePeriodRequest request) {
		validator.requireOrganization(orgId);
		TimetableConfig config = requireConfigForUpdate(orgId, configId);
		String name = validator.normalizeRequiredText(request.name(), "Period name");
		validatePeriodTimings(config, request.startTime(), request.endTime(), request.periodOrder(), null);

		if (periodRepository.existsByOrganizationIdAndTimetableConfigIdAndNameIgnoreCase(orgId, configId, name)) {
			throw new IllegalStateException("Period with this name already exists in the configuration");
		}
		if (periodRepository.existsByOrganizationIdAndTimetableConfigIdAndPeriodOrder(
				orgId, configId, request.periodOrder())) {
			throw new IllegalStateException("Period with this display order already exists in the configuration");
		}

		TimetablePeriod period = new TimetablePeriod();
		period.setOrganizationId(orgId);
		period.setTimetableConfigId(configId);
		period.setName(name);
		period.setPeriodOrder(request.periodOrder());
		period.setStartTime(request.startTime());
		period.setEndTime(request.endTime());
		period.setPeriodType(request.periodType());

		return toPeriodResponse(periodRepository.save(period));
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@Transactional(readOnly = true)
	public List<TimetablePeriodResponse> getPeriods(Long orgId, Long configId) {
		validator.requireOrganization(orgId);
		requireConfig(orgId, configId);
		return periodRepository
				.findAllByOrganizationIdAndTimetableConfigIdOrderByPeriodOrderAscStartTimeAsc(orgId, configId)
				.stream().map(this::toPeriodResponse).toList();
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@Transactional
	public TimetablePeriodResponse updatePeriod(
			Long orgId, Long configId, Long periodId, UpdateTimetablePeriodRequest request) {
		validator.requireOrganization(orgId);
		TimetableConfig config = requireConfigForUpdate(orgId, configId);
		if (timetableRepository.existsByOrganizationIdAndTimetableConfigIdAndStatus(
				orgId, configId, TimetableStatus.PUBLISHED)) {
			throw new IllegalStateException("Cannot modify periods while a published timetable depends on this configuration");
		}

		TimetablePeriod period = periodRepository
				.findByIdAndOrganizationIdAndTimetableConfigId(periodId, orgId, configId)
				.orElseThrow(() -> new EntityNotFoundException("Timetable period not found"));

		if (!request.periodType().isTeaching() && slotRepository.existsByOrganizationIdAndPeriodId(orgId, periodId)) {
			throw new IllegalStateException("Cannot change a period with scheduled teaching slots into a non-teaching/break period");
		}

		String name = validator.normalizeRequiredText(request.name(), "Period name");
		validatePeriodTimings(config, request.startTime(), request.endTime(), request.periodOrder(), periodId);

		if (periodRepository.existsByOrganizationIdAndTimetableConfigIdAndNameIgnoreCaseAndIdNot(
				orgId, configId, name, periodId)) {
			throw new IllegalStateException("Period with this name already exists in the configuration");
		}
		if (periodRepository.existsByOrganizationIdAndTimetableConfigIdAndPeriodOrderAndIdNot(
				orgId, configId, request.periodOrder(), periodId)) {
			throw new IllegalStateException("Period with this display order already exists in the configuration");
		}

		period.setName(name);
		period.setPeriodOrder(request.periodOrder());
		period.setStartTime(request.startTime());
		period.setEndTime(request.endTime());
		period.setPeriodType(request.periodType());

		return toPeriodResponse(periodRepository.save(period));
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@Transactional
	public ClassTimetableResponse createClassTimetable(Long orgId, CreateClassTimetableRequest request) {
		AcademicSession session = requireModifiableSession(orgId, request.academicSessionId());
		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, request.classId());
		TimetableConfig config = requireConfig(orgId, request.timetableConfigId());
		if (!config.isActive()) {
			throw new IllegalStateException("Cannot create a timetable using an inactive timetable configuration");
		}

		if (timetableRepository.existsByOrganizationIdAndAcademicSessionIdAndClassId(
				orgId, session.getId(), schoolClass.getId())) {
			throw new IllegalStateException("Timetable already exists for this class in the academic session");
		}

		ClassTimetable timetable = new ClassTimetable();
		timetable.setOrganizationId(orgId);
		timetable.setAcademicSessionId(session.getId());
		timetable.setClassId(schoolClass.getId());
		timetable.setTimetableConfigId(config.getId());
		timetable.setStatus(TimetableStatus.DRAFT);
		timetable.setRevisionNumber(1);
		timetable.setNotes(validator.normalizeOptionalText(request.notes()));

		ClassTimetable saved = timetableRepository.save(timetable);
		return toTimetableResponse(saved, session, schoolClass, config, List.of());
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@Transactional(readOnly = true)
	public List<ClassTimetableResponse> getSessionTimetables(Long orgId, Long academicSessionId) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, academicSessionId);
		List<ClassTimetable> timetables = timetableRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAsc(orgId, academicSessionId);
		return timetables.stream()
				.map(t -> buildFullTimetableResponse(orgId, t, session, null))
				.toList();
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@Transactional(readOnly = true)
	public ClassTimetableResponse getClassTimetableById(Long orgId, Long timetableId, DayOfWeek dayOfWeek) {
		validator.requireOrganization(orgId);
		ClassTimetable timetable = requireTimetable(orgId, timetableId);
		AcademicSession session = sessionService.requireSession(orgId, timetable.getAcademicSessionId());
		return buildFullTimetableResponse(orgId, timetable, session, dayOfWeek);
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@Transactional(readOnly = true)
	public ClassTimetableResponse getClassTimetableBySessionAndClass(
			Long orgId, Long academicSessionId, Long classId, DayOfWeek dayOfWeek) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, academicSessionId);
		classService.requireClass(orgId, classId);
		ClassTimetable timetable = timetableRepository
				.findByOrganizationIdAndAcademicSessionIdAndClassId(orgId, academicSessionId, classId)
				.orElseThrow(() -> new EntityNotFoundException("Class timetable not found"));
		return buildFullTimetableResponse(orgId, timetable, session, dayOfWeek);
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@Transactional
	public TimetableSlotResponse addSlot(Long orgId, Long timetableId, CreateTimetableSlotRequest request) {
		validator.requireOrganization(orgId);
		ClassTimetable timetable = requireTimetableForUpdate(orgId, timetableId);
		AcademicSession session = requireModifiableSession(orgId, timetable.getAcademicSessionId());
		ensureDraftState(timetable);

		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, timetable.getClassId());
		TimetableConfig config = requireConfig(orgId, timetable.getTimetableConfigId());
		TimetablePeriod period = validateSlotDependenciesAndConflicts(
				orgId, session.getId(), schoolClass.getId(), config,
				request.dayOfWeek(), request.periodId(), request.subjectId(), request.teacherId(), null);

		TimetableSlot slot = new TimetableSlot();
		slot.setOrganizationId(orgId);
		slot.setAcademicSessionId(session.getId());
		slot.setClassTimetableId(timetable.getId());
		slot.setClassId(schoolClass.getId());
		slot.setDayOfWeek(request.dayOfWeek());
		slot.setPeriodId(period.getId());
		slot.setStartTime(period.getStartTime());
		slot.setEndTime(period.getEndTime());
		slot.setSubjectId(request.subjectId());
		slot.setTeacherId(request.teacherId());
		slot.setRoom(validator.normalizeOptionalText(request.room()));
		slot.setRemarks(validator.normalizeOptionalText(request.remarks()));

		TimetableSlot saved = slotRepository.saveAndFlush(slot);
		return mapSlots(orgId, List.of(saved)).getFirst();
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@Transactional
	public TimetableSlotResponse updateSlot(
			Long orgId, Long timetableId, Long slotId, UpdateTimetableSlotRequest request) {
		validator.requireOrganization(orgId);
		ClassTimetable timetable = requireTimetableForUpdate(orgId, timetableId);
		AcademicSession session = requireModifiableSession(orgId, timetable.getAcademicSessionId());
		ensureDraftState(timetable);

		TimetableSlot slot = slotRepository
				.findByIdAndOrganizationIdAndClassTimetableId(slotId, orgId, timetableId)
				.orElseThrow(() -> new EntityNotFoundException("Scheduled timetable period not found"));

		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, timetable.getClassId());
		TimetableConfig config = requireConfig(orgId, timetable.getTimetableConfigId());
		TimetablePeriod period = validateSlotDependenciesAndConflicts(
				orgId, session.getId(), schoolClass.getId(), config,
				request.dayOfWeek(), request.periodId(), request.subjectId(), request.teacherId(), slotId);

		slot.setDayOfWeek(request.dayOfWeek());
		slot.setPeriodId(period.getId());
		slot.setStartTime(period.getStartTime());
		slot.setEndTime(period.getEndTime());
		slot.setSubjectId(request.subjectId());
		slot.setTeacherId(request.teacherId());
		slot.setRoom(validator.normalizeOptionalText(request.room()));
		slot.setRemarks(validator.normalizeOptionalText(request.remarks()));

		TimetableSlot saved = slotRepository.saveAndFlush(slot);
		return mapSlots(orgId, List.of(saved)).getFirst();
	}

	@RequirePermission(PermissionCode.TIMETABLE_MANAGE)
	@Transactional
	public void removeSlot(Long orgId, Long timetableId, Long slotId) {
		validator.requireOrganization(orgId);
		ClassTimetable timetable = requireTimetableForUpdate(orgId, timetableId);
		requireModifiableSession(orgId, timetable.getAcademicSessionId());
		ensureDraftState(timetable);

		TimetableSlot slot = slotRepository
				.findByIdAndOrganizationIdAndClassTimetableId(slotId, orgId, timetableId)
				.orElseThrow(() -> new EntityNotFoundException("Scheduled timetable period not found"));
		slotRepository.delete(slot);
	}

	@RequirePermission(PermissionCode.TIMETABLE_PUBLISH)
	@Transactional
	public ClassTimetableResponse publishTimetable(Long orgId, Long timetableId) {
		validator.requireOrganization(orgId);
		ClassTimetable timetable = requireTimetableForUpdate(orgId, timetableId);
		AcademicSession session = requireModifiableSession(orgId, timetable.getAcademicSessionId());

		if (timetable.getStatus() == TimetableStatus.PUBLISHED) {
			throw new IllegalStateException("Timetable is already published");
		}

		List<TimetableSlot> slots = slotRepository
				.findAllByOrganizationIdAndClassTimetableIdOrderByDayOfWeekAscStartTimeAsc(orgId, timetableId);
		if (slots.isEmpty()) {
			throw new IllegalStateException("Cannot publish an empty timetable without scheduled periods");
		}

		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, timetable.getClassId());
		TimetableConfig config = requireConfig(orgId, timetable.getTimetableConfigId());
		for (TimetableSlot s : slots) {
			validateSlotDependenciesAndConflicts(
					orgId, session.getId(), schoolClass.getId(), config,
					s.getDayOfWeek(), s.getPeriodId(), s.getSubjectId(), s.getTeacherId(), s.getId());
		}

		timetable.setStatus(TimetableStatus.PUBLISHED);
		timetable.setPublishedAt(Instant.now());
		timetable.setPublishedBy(currentUser.getUserId());
		ClassTimetable saved = timetableRepository.save(timetable);
		notificationService.notifyTimetablePublished(
				saved, schoolClass.getName(),
				slots.stream().map(TimetableSlot::getTeacherId).collect(Collectors.toSet()));
		return buildFullTimetableResponse(orgId, saved, session, null);
	}

	@RequirePermission(PermissionCode.TIMETABLE_PUBLISH)
	@Transactional
	public ClassTimetableResponse reopenTimetableForRevision(Long orgId, Long timetableId) {
		validator.requireOrganization(orgId);
		ClassTimetable timetable = requireTimetableForUpdate(orgId, timetableId);
		AcademicSession session = requireModifiableSession(orgId, timetable.getAcademicSessionId());

		if (timetable.getStatus() != TimetableStatus.PUBLISHED) {
			throw new IllegalStateException("Only a published timetable can be reopened for revision");
		}

		timetable.setStatus(TimetableStatus.DRAFT);
		timetable.setRevisionNumber(timetable.getRevisionNumber() + 1);
		ClassTimetable saved = timetableRepository.save(timetable);
		return buildFullTimetableResponse(orgId, saved, session, null);
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@Transactional(readOnly = true)
	public List<TimetableSlotResponse> getTeacherTimetable(
			Long orgId, Long teacherId, Long academicSessionId, DayOfWeek dayOfWeek) {
		validator.requireOrganization(orgId);
		teacherService.requireTeacher(orgId, teacherId);
		if (academicSessionId != null) {
			sessionService.requireSession(orgId, academicSessionId);
		}

		List<TimetableSlot> slots;
		if (academicSessionId != null && dayOfWeek != null) {
			slots = slotRepository.findAllByOrganizationIdAndAcademicSessionIdAndTeacherIdAndDayOfWeek(
					orgId, academicSessionId, teacherId, dayOfWeek);
			slots.sort(Comparator.comparing(TimetableSlot::getStartTime));
		} else if (academicSessionId != null) {
			slots = slotRepository.findAllByOrganizationIdAndAcademicSessionIdAndTeacherIdOrderByDayOfWeekAscStartTimeAsc(
					orgId, academicSessionId, teacherId);
		} else {
			slots = slotRepository.findAllByOrganizationIdAndTeacherIdOrderByAcademicSessionIdDescDayOfWeekAscStartTimeAsc(
					orgId, teacherId);
		}
		return mapSlots(orgId, slots);
	}

	@RequirePermission(PermissionCode.TIMETABLE_VIEW)
	@Transactional(readOnly = true)
	public List<TeacherResponse> getUnscheduledTeachers(Long orgId, Long academicSessionId) {
		validator.requireOrganization(orgId);
		sessionService.requireSession(orgId, academicSessionId);

		Set<Long> scheduledIds = slotRepository.findScheduledTeacherIdsInSession(orgId, academicSessionId);
		List<TeacherProfile> allProfiles = teacherProfileRepository.findAll(
				(root, query, cb) -> cb.and(
						cb.equal(root.get("organizationId"), orgId),
						cb.isTrue(root.get("availableForAssignment"))
				));

		Set<Long> staffIds = allProfiles.stream().map(TeacherProfile::getStaffId).collect(Collectors.toSet());
		Map<Long, Staff> staffMap = staffIds.isEmpty() ? Map.of() : staffRepository
				.findAllByOrganizationIdAndIdIn(orgId, staffIds)
				.stream().collect(Collectors.toMap(Staff::getId, Function.identity()));

		return allProfiles.stream()
				.filter(tp -> !scheduledIds.contains(tp.getId()))
				.filter(tp -> {
					Staff s = staffMap.get(tp.getStaffId());
					return s != null && s.isTeachingStaff() && s.getEmploymentStatus() == EmploymentStatus.ACTIVE;
				})
				.map(tp -> teacherService.toResponse(tp, staffMap.get(tp.getStaffId())))
				.toList();
	}

	private TimetablePeriod validateSlotDependenciesAndConflicts(
			Long orgId, Long sessionId, Long classId, TimetableConfig config,
			DayOfWeek dayOfWeek, Long periodId, Long subjectId, Long teacherId, Long excludedSlotId) {
		List<DayOfWeek> workingDays = parseWorkingDays(config.getWorkingDays());
		if (!workingDays.contains(dayOfWeek)) {
			throw new IllegalStateException("Day " + dayOfWeek + " is not a configured working day for this timetable");
		}

		TimetablePeriod period = periodRepository
				.findByIdAndOrganizationIdAndTimetableConfigId(periodId, orgId, config.getId())
				.orElseThrow(() -> new EntityNotFoundException("Timetable period not found in this configuration"));
		if (!period.getPeriodType().isTeaching()) {
			throw new IllegalStateException("Break or non-teaching periods cannot be scheduled as teaching periods");
		}

		Subject subject = subjectService.requireSubject(orgId, subjectId);
		if (!subject.isActive()) {
			throw new IllegalStateException("Cannot schedule an inactive subject");
		}
		if (!classSubjectRepository.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectId(
				orgId, sessionId, classId, subject.getId())) {
			throw new IllegalStateException("Subject is not assigned to this class in the academic session");
		}

		ActiveTeacherPair activeTeacher = teacherService.requireActiveAssignableTeacherForUpdate(orgId, teacherId);
		if (!teacherSubjectAssignmentRepository
				.existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectIdAndTeacherId(
						orgId, sessionId, classId, subject.getId(), activeTeacher.teacher().getId())) {
			throw new IllegalStateException(
					"Teacher is not assigned to teach this subject for the class in the academic session");
		}

		// Check class time-slot overlap on the same day in the same session
		List<TimetableSlot> classSlots = slotRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndDayOfWeek(orgId, sessionId, classId, dayOfWeek);
		for (TimetableSlot existing : classSlots) {
			if (excludedSlotId != null && existing.getId().equals(excludedSlotId)) {
				continue;
			}
			if (timesOverlap(existing.getStartTime(), existing.getEndTime(),
					period.getStartTime(), period.getEndTime())) {
				throw new IllegalStateException(
						"Class already has a scheduled period overlapping with this time slot on " + dayOfWeek);
			}
		}

		// Check teacher time-slot overlap across all classes on the same day in the same session
		List<TimetableSlot> teacherSlots = slotRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndTeacherIdAndDayOfWeek(
						orgId, sessionId, activeTeacher.teacher().getId(), dayOfWeek);
		for (TimetableSlot existing : teacherSlots) {
			if (excludedSlotId != null && existing.getId().equals(excludedSlotId)) {
				continue;
			}
			if (timesOverlap(existing.getStartTime(), existing.getEndTime(),
					period.getStartTime(), period.getEndTime())) {
				throw new IllegalStateException(
						"Teacher is already scheduled for an overlapping period on " + dayOfWeek);
			}
		}

		return period;
	}

	private void validateConfigTimings(LocalTime start, LocalTime end, Set<DayOfWeek> workingDays) {
		if (start == null || end == null || !start.isBefore(end)) {
			throw new IllegalArgumentException("Day start time must be earlier than day end time");
		}
		if (workingDays == null || workingDays.isEmpty()) {
			throw new IllegalArgumentException("At least one working day is required");
		}
	}

	private void validatePeriodTimings(
			TimetableConfig config, LocalTime start, LocalTime end, Integer order, Long excludedPeriodId) {
		if (order == null || order <= 0) {
			throw new IllegalArgumentException("Period order must be a positive number");
		}
		if (start == null || end == null || !start.isBefore(end)) {
			throw new IllegalArgumentException("Period start time must be earlier than period end time");
		}
		if (start.isBefore(config.getDayStartTime()) || end.isAfter(config.getDayEndTime())) {
			throw new IllegalArgumentException("Period timings must fall within configured school working hours");
		}

		List<TimetablePeriod> existingPeriods = periodRepository
				.findAllByOrganizationIdAndTimetableConfigIdOrderByPeriodOrderAscStartTimeAsc(
						config.getOrganizationId(), config.getId());
		for (TimetablePeriod existing : existingPeriods) {
			if (excludedPeriodId != null && existing.getId().equals(excludedPeriodId)) {
				continue;
			}
			if (timesOverlap(existing.getStartTime(), existing.getEndTime(), start, end)) {
				throw new IllegalStateException("Period timings overlap with existing period: " + existing.getName());
			}
		}
	}

	private boolean timesOverlap(LocalTime s1, LocalTime e1, LocalTime s2, LocalTime e2) {
		return s1.isBefore(e2) && s2.isBefore(e1);
	}

	public TimetableConfig requireConfig(Long orgId, Long configId) {
		return configRepository.findByIdAndOrganizationId(configId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Timetable configuration not found"));
	}

	private TimetableConfig requireConfigForUpdate(Long orgId, Long configId) {
		return configRepository.findByIdAndOrganizationIdForUpdate(configId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Timetable configuration not found"));
	}

	public ClassTimetable requireTimetable(Long orgId, Long timetableId) {
		return timetableRepository.findByIdAndOrganizationId(timetableId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class timetable not found"));
	}

	private ClassTimetable requireTimetableForUpdate(Long orgId, Long timetableId) {
		return timetableRepository.findByIdAndOrganizationIdForUpdate(timetableId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class timetable not found"));
	}

	private AcademicSession requireModifiableSession(Long orgId, Long sessionId) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Cannot modify timetables of a completed academic session");
		}
		return session;
	}

	private SchoolClass requireActiveClassForUpdate(Long orgId, Long classId) {
		SchoolClass schoolClass = classRepository.findByIdAndOrganizationIdForUpdate(classId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class not found"));
		if (!schoolClass.isActive()) {
			throw new IllegalStateException("Cannot schedule timetable for an inactive class");
		}
		return schoolClass;
	}

	private void ensureDraftState(ClassTimetable timetable) {
		if (timetable.getStatus() != TimetableStatus.DRAFT) {
			throw new IllegalStateException(
					"Published timetable cannot be modified directly; reopen it for revision first");
		}
	}

	private String serializeWorkingDays(Set<DayOfWeek> days) {
		return days.stream()
				.sorted(Comparator.comparingInt(DayOfWeek::getValue))
				.map(DayOfWeek::name)
				.collect(Collectors.joining(","));
	}

	public List<DayOfWeek> parseWorkingDays(String serialized) {
		if (serialized == null || serialized.isBlank()) {
			return List.of();
		}
		return Arrays.stream(serialized.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.map(DayOfWeek::valueOf)
				.toList();
	}

	private ClassTimetableResponse buildFullTimetableResponse(
			Long orgId, ClassTimetable timetable, AcademicSession session, DayOfWeek dayOfWeek) {
		SchoolClass schoolClass = classService.requireClass(orgId, timetable.getClassId());
		TimetableConfig config = requireConfig(orgId, timetable.getTimetableConfigId());
		List<TimetableSlot> slots = dayOfWeek == null
				? slotRepository.findAllByOrganizationIdAndClassTimetableIdOrderByDayOfWeekAscStartTimeAsc(
						orgId, timetable.getId())
				: slotRepository.findAllByOrganizationIdAndClassTimetableIdAndDayOfWeekOrderByStartTimeAsc(
						orgId, timetable.getId(), dayOfWeek);
		return toTimetableResponse(timetable, session, schoolClass, config, mapSlots(orgId, slots));
	}

	private List<TimetableSlotResponse> mapSlots(Long orgId, List<TimetableSlot> slots) {
		if (slots.isEmpty()) {
			return List.of();
		}
		Map<Long, SchoolClass> classMap = classRepository.findAllById(
				slots.stream().map(TimetableSlot::getClassId).collect(Collectors.toSet())).stream()
				.filter(c -> orgId.equals(c.getOrganizationId()))
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		Map<Long, TimetablePeriod> periodMap = periodRepository.findAllByOrganizationIdAndIdIn(
				orgId, slots.stream().map(TimetableSlot::getPeriodId).collect(Collectors.toSet())).stream()
				.collect(Collectors.toMap(TimetablePeriod::getId, Function.identity()));
		Map<Long, Subject> subjectMap = subjectRepository.findAllById(
				slots.stream().map(TimetableSlot::getSubjectId).collect(Collectors.toSet())).stream()
				.filter(s -> orgId.equals(s.getOrganizationId()))
				.collect(Collectors.toMap(Subject::getId, Function.identity()));
		Map<Long, TeacherProfile> teacherMap = teacherProfileRepository.findAllByOrganizationIdAndIdIn(
				orgId, slots.stream().map(TimetableSlot::getTeacherId).collect(Collectors.toSet())).stream()
				.collect(Collectors.toMap(TeacherProfile::getId, Function.identity()));
		Map<Long, Staff> staffMap = teacherMap.isEmpty() ? Map.of() : staffRepository.findAllByOrganizationIdAndIdIn(
				orgId, teacherMap.values().stream().map(TeacherProfile::getStaffId).collect(Collectors.toSet())).stream()
				.collect(Collectors.toMap(Staff::getId, Function.identity()));

		return slots.stream().map(s -> {
			SchoolClass sc = classMap.get(s.getClassId());
			TimetablePeriod p = periodMap.get(s.getPeriodId());
			Subject sub = subjectMap.get(s.getSubjectId());
			TeacherProfile tp = teacherMap.get(s.getTeacherId());
			Staff st = tp != null ? staffMap.get(tp.getStaffId()) : null;
			return new TimetableSlotResponse(
					s.getId(), s.getOrganizationId(), s.getAcademicSessionId(), s.getClassTimetableId(),
					s.getClassId(), sc != null ? sc.getName() : null,
					s.getDayOfWeek(), s.getPeriodId(), p != null ? p.getName() : null,
					p != null ? p.getPeriodOrder() : null, s.getStartTime(), s.getEndTime(),
					s.getSubjectId(), sub != null ? sub.getName() : null, sub != null ? sub.getCode() : null,
					s.getTeacherId(), st != null ? st.getFirstName() : null, st != null ? st.getLastName() : null,
					s.getRoom(), s.getRemarks(), s.getCreatedAt(), s.getUpdatedAt()
			);
		}).toList();
	}

	private TimetableConfigResponse toConfigResponse(TimetableConfig c, List<TimetablePeriod> periods) {
		return new TimetableConfigResponse(
				c.getId(), c.getOrganizationId(), c.getName(), parseWorkingDays(c.getWorkingDays()),
				c.getDayStartTime(), c.getDayEndTime(), c.getDescription(), c.isActive(),
				periods.stream().map(this::toPeriodResponse).toList(), c.getCreatedAt(), c.getUpdatedAt()
		);
	}

	private TimetablePeriodResponse toPeriodResponse(TimetablePeriod p) {
		return new TimetablePeriodResponse(
				p.getId(), p.getOrganizationId(), p.getTimetableConfigId(), p.getName(),
				p.getPeriodOrder(), p.getStartTime(), p.getEndTime(), p.getPeriodType(),
				p.getPeriodType().isBreak(), p.getCreatedAt(), p.getUpdatedAt()
		);
	}

	private ClassTimetableResponse toTimetableResponse(
			ClassTimetable t, AcademicSession session, SchoolClass sc,
			TimetableConfig config, List<TimetableSlotResponse> slots) {
		return new ClassTimetableResponse(
				t.getId(), t.getOrganizationId(), t.getAcademicSessionId(),
				session != null ? session.getName() : null,
				t.getClassId(), sc != null ? sc.getName() : null, sc != null ? sc.getCode() : null,
				t.getTimetableConfigId(), config != null ? config.getName() : null,
				t.getStatus(), t.getRevisionNumber(), t.getPublishedAt(), t.getPublishedBy(),
				t.getNotes(), slots, t.getCreatedAt(), t.getUpdatedAt()
		);
	}
}
