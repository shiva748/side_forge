package com.side.forge.organization.fees.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.fees.dto.*;
import com.side.forge.organization.fees.dto.CreateClassFeeStructureRequest.*;
import com.side.forge.organization.fees.dto.GenerateFeeDemandsRequest.*;
import com.side.forge.organization.fees.dto.RecordFeePaymentRequest.*;
import com.side.forge.organization.fees.dto.StudentFinancialProfileResponse.*;
import com.side.forge.organization.fees.entity.*;
import com.side.forge.organization.fees.repository.*;
import com.side.forge.organization.parentportal.security.ParentChildAccessValidator;
import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;
import com.side.forge.organization.student.enrollment.entity.StudentEnrollment;
import com.side.forge.organization.student.enrollment.repository.StudentEnrollmentRepository;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.student.profile.service.StudentService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FeeManagementService {

	private static final List<Integer> DEFAULT_SESSION_MONTHS = List.of(4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3);

	private final ClassFeeStructureRepository structureRepository;
	private final ClassFeeStructureComponentRepository componentRepository;
	private final StudentFeeAssignmentRepository assignmentRepository;
	private final StudentFeeConcessionRepository concessionRepository;
	private final StudentFeeDemandRepository demandRepository;
	private final FeePaymentRepository paymentRepository;
	private final FeePaymentAllocationRepository allocationRepository;
	private final FeeAuditLogRepository auditLogRepository;
	private final AcademicSessionService sessionService;
	private final SchoolClassService classService;
	private final SchoolClassRepository classRepository;
	private final StudentService studentService;
	private final StudentRepository studentRepository;
	private final StudentEnrollmentRepository enrollmentRepository;
	private final AcademicTenantAccessValidator validator;
	private final CurrentUserContext currentUser;
	private final NotificationService notificationService;
	private final ParentChildAccessValidator parentChildValidator;

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@Transactional
	public ClassFeeStructureResponse createFeeStructure(Long orgId, CreateClassFeeStructureRequest request) {
		Organization org = validator.requireOrganization(orgId);
		AcademicSession session = requireModifiableSession(orgId, request.academicSessionId());
		SchoolClass schoolClass = requireActiveClassForUpdate(orgId, request.classId());

		List<ClassFeeStructure> existing = structureRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByVersionNumberDesc(
						orgId, session.getId(), schoolClass.getId());
		if (!existing.isEmpty()) {
			throw new IllegalStateException(
					"A fee structure already exists for this class and academic session; use revision for changes");
		}

		ClassFeeStructure structure = new ClassFeeStructure();
		structure.setOrganizationId(orgId);
		structure.setAcademicSessionId(session.getId());
		structure.setClassId(schoolClass.getId());
		structure.setName(validator.normalizeRequiredText(request.name(), "Fee structure name"));
		structure.setVersionNumber(1);
		structure.setStatus(FeeStructureStatus.DRAFT);
		structure.setEffectiveFromDate(request.effectiveFromDate() != null
				? request.effectiveFromDate()
				: (session.getStartDate() != null ? session.getStartDate() : LocalDate.now(validator.resolveZoneId(org))));
		structure.setNotes(validator.normalizeOptionalText(request.notes()));
		structure = structureRepository.save(structure);

		List<ClassFeeStructureComponent> savedComponents = saveComponents(
				orgId, session, structure.getId(), request.components());
		recordAudit(orgId, session.getId(), null, "CLASS_FEE_STRUCTURE", structure.getId(),
				"CREATE_DRAFT", null, "Version 1 DRAFT", "Initial class fee structure created");

		return toStructureResponse(structure, session, schoolClass, savedComponents);
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@Transactional
	public ClassFeeStructureResponse updateDraftFeeStructure(
			Long orgId, Long structureId, CreateClassFeeStructureRequest request) {
		validator.requireOrganization(orgId);
		ClassFeeStructure structure = requireStructureForUpdate(orgId, structureId);
		AcademicSession session = requireModifiableSession(orgId, structure.getAcademicSessionId());
		SchoolClass schoolClass = classService.requireClass(orgId, structure.getClassId());

		if (structure.getStatus() != FeeStructureStatus.DRAFT
				|| demandRepository.existsByOrganizationIdAndFeeStructureId(orgId, structure.getId())) {
			throw new IllegalStateException(
					"Cannot directly modify a published fee structure or one with generated demands; create a revision instead");
		}

		structure.setName(validator.normalizeRequiredText(request.name(), "Fee structure name"));
		if (request.effectiveFromDate() != null) {
			structure.setEffectiveFromDate(request.effectiveFromDate());
		}
		structure.setNotes(validator.normalizeOptionalText(request.notes()));
		structure = structureRepository.save(structure);

		List<ClassFeeStructureComponent> oldComponents = componentRepository
				.findAllByOrganizationIdAndFeeStructureIdOrderByDisplayOrderAscIdAsc(orgId, structure.getId());
		componentRepository.deleteAll(oldComponents);
		componentRepository.flush();

		List<ClassFeeStructureComponent> savedComponents = saveComponents(
				orgId, session, structure.getId(), request.components());
		recordAudit(orgId, session.getId(), null, "CLASS_FEE_STRUCTURE", structure.getId(),
				"UPDATE_DRAFT", "DRAFT", "DRAFT", "Updated draft fee structure");

		return toStructureResponse(structure, session, schoolClass, savedComponents);
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@Transactional
	public ClassFeeStructureResponse publishFeeStructure(Long orgId, Long structureId) {
		validator.requireOrganization(orgId);
		ClassFeeStructure structure = requireStructureForUpdate(orgId, structureId);
		AcademicSession session = requireModifiableSession(orgId, structure.getAcademicSessionId());
		SchoolClass schoolClass = classService.requireClass(orgId, structure.getClassId());

		if (structure.getStatus() == FeeStructureStatus.PUBLISHED) {
			throw new IllegalStateException("Fee structure is already published");
		}
		if (structure.getStatus() == FeeStructureStatus.ARCHIVED) {
			throw new IllegalStateException("Cannot publish an archived fee structure");
		}

		List<ClassFeeStructureComponent> components = componentRepository
				.findAllByOrganizationIdAndFeeStructureIdOrderByDisplayOrderAscIdAsc(orgId, structure.getId());
		if (components.isEmpty()) {
			throw new IllegalStateException("Cannot publish a fee structure with no fee components");
		}

		// Archive any previous PUBLISHED version for this class & session
		structureRepository.findFirstByOrganizationIdAndAcademicSessionIdAndClassIdAndStatusOrderByVersionNumberDesc(
				orgId, session.getId(), schoolClass.getId(), FeeStructureStatus.PUBLISHED)
				.ifPresent(prev -> {
					prev.setStatus(FeeStructureStatus.ARCHIVED);
					structureRepository.save(prev);
				});

		structure.setStatus(FeeStructureStatus.PUBLISHED);
		structure.setPublishedAt(Instant.now());
		structure.setPublishedBy(currentUser.getUserId());
		structure = structureRepository.saveAndFlush(structure);

		recordAudit(orgId, session.getId(), null, "CLASS_FEE_STRUCTURE", structure.getId(),
				"PUBLISH", "DRAFT", "PUBLISHED v" + structure.getVersionNumber(),
				"Published class fee structure and applied to enrolled students");

		// Automatically apply to all currently active enrolled students in this class & session
		List<StudentEnrollment> activeEnrollments = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(
						orgId, session.getId(), schoolClass.getId())
				.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).toList();

		for (StudentEnrollment enrollment : activeEnrollments) {
			applyStructureToEnrollmentInternal(orgId, session, enrollment, structure, components, null, null, false);
		}

		return toStructureResponse(structure, session, schoolClass, components);
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@Transactional
	public ClassFeeStructureResponse reviseFeeStructure(
			Long orgId, Long structureId, ReviseFeeStructureRequest request) {
		validator.requireOrganization(orgId);
		ClassFeeStructure current = requireStructureForUpdate(orgId, structureId);
		AcademicSession session = requireModifiableSession(orgId, current.getAcademicSessionId());
		SchoolClass schoolClass = classService.requireClass(orgId, current.getClassId());

		if (current.getStatus() != FeeStructureStatus.PUBLISHED) {
			throw new IllegalStateException("Only a currently PUBLISHED fee structure can be revised");
		}
		if (request.effectiveFromDate() == null) {
			throw new IllegalArgumentException("Effective from date is required for a fee structure revision");
		}

		current.setStatus(FeeStructureStatus.ARCHIVED);
		structureRepository.saveAndFlush(current);

		ClassFeeStructure revised = new ClassFeeStructure();
		revised.setOrganizationId(orgId);
		revised.setAcademicSessionId(session.getId());
		revised.setClassId(schoolClass.getId());
		revised.setName(validator.normalizeRequiredText(request.name(), "Revised fee structure name"));
		revised.setVersionNumber(current.getVersionNumber() + 1);
		revised.setStatus(FeeStructureStatus.PUBLISHED);
		revised.setEffectiveFromDate(request.effectiveFromDate());
		revised.setPublishedAt(Instant.now());
		revised.setPublishedBy(currentUser.getUserId());
		revised.setNotes(validator.normalizeOptionalText(request.notes()));
		revised = structureRepository.saveAndFlush(revised);

		List<ClassFeeStructureComponent> newComponents = saveComponents(
				orgId, session, revised.getId(), request.components());

		recordAudit(orgId, session.getId(), null, "CLASS_FEE_STRUCTURE", revised.getId(),
				"REVISE_STRUCTURE",
				"v" + current.getVersionNumber() + " (id=" + current.getId() + ")",
				"v" + revised.getVersionNumber() + " effective " + request.effectiveFromDate(),
				"Created published fee structure revision");

		// Apply revision to active enrolled students for unpaid future obligations on/after effectiveFromDate
		List<StudentEnrollment> activeEnrollments = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(
						orgId, session.getId(), schoolClass.getId())
				.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).toList();

		for (StudentEnrollment enrollment : activeEnrollments) {
			applyRevisionToEnrollment(orgId, session, enrollment, revised, newComponents, request.effectiveFromDate());
		}

		return toStructureResponse(revised, session, schoolClass, newComponents);
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@Transactional(readOnly = true)
	public List<ClassFeeStructureResponse> getSessionFeeStructures(
			Long orgId, Long sessionId, Long classId) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		List<ClassFeeStructure> list;
		if (classId != null) {
			classService.requireClass(orgId, classId);
			list = structureRepository.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByVersionNumberDesc(
					orgId, sessionId, classId);
		} else {
			list = structureRepository.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscVersionNumberDesc(
					orgId, sessionId);
		}
		return list.stream()
				.map(s -> toStructureResponse(
						s, session, classService.requireClass(orgId, s.getClassId()),
						componentRepository.findAllByOrganizationIdAndFeeStructureIdOrderByDisplayOrderAscIdAsc(
								orgId, s.getId())))
				.toList();
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@Transactional(readOnly = true)
	public ClassFeeStructureResponse getFeeStructureById(Long orgId, Long structureId) {
		validator.requireOrganization(orgId);
		ClassFeeStructure s = requireStructure(orgId, structureId);
		AcademicSession session = sessionService.requireSession(orgId, s.getAcademicSessionId());
		SchoolClass sc = classService.requireClass(orgId, s.getClassId());
		List<ClassFeeStructureComponent> comps = componentRepository
				.findAllByOrganizationIdAndFeeStructureIdOrderByDisplayOrderAscIdAsc(orgId, s.getId());
		return toStructureResponse(s, session, sc, comps);
	}

	/**
	 * Invoked automatically when a student is enrolled in a class for an academic session.
	 * If a PUBLISHED fee structure exists for that class and session, assigns it and generates
	 * all applicable fee demands idempotently.
	 */
	@Transactional
	public void applyPublishedFeeStructureOnEnrollment(
			Long orgId, AcademicSession session, StudentEnrollment enrollment) {
		Optional<ClassFeeStructure> publishedOpt = structureRepository
				.findFirstByOrganizationIdAndAcademicSessionIdAndClassIdAndStatusOrderByVersionNumberDesc(
						orgId, session.getId(), enrollment.getClassId(), FeeStructureStatus.PUBLISHED);
		if (publishedOpt.isEmpty()) {
			return;
		}
		ClassFeeStructure structure = publishedOpt.get();
		List<ClassFeeStructureComponent> components = componentRepository
				.findAllByOrganizationIdAndFeeStructureIdOrderByDisplayOrderAscIdAsc(orgId, structure.getId());
		applyStructureToEnrollmentInternal(orgId, session, enrollment, structure, components, null, null, false);
	}

	/**
	 * Invoked when a student's enrollment changes class within the same academic session.
	 * Cancels unpaid future demands from the previous class, preserves paid/partially-paid demands,
	 * and applies the new class's PUBLISHED fee structure.
	 */
	@Transactional
	public void handleClassChangeFeeAdjustment(
			Long orgId, AcademicSession session, StudentEnrollment enrollment,
			Long previousClassId, Long newClassId, LocalDate effectiveDate) {
		if (Objects.equals(previousClassId, newClassId)) {
			return;
		}
		LocalDate cutoff = effectiveDate != null ? effectiveDate : enrollment.getEnrollmentDate();

		// Deactivate previous class fee assignments
		List<StudentFeeAssignment> existingAssignments = assignmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByIdDesc(
						orgId, session.getId(), enrollment.getStudentId());
		for (StudentFeeAssignment a : existingAssignments) {
			if (a.isActive() && Objects.equals(a.getClassId(), previousClassId)) {
				a.setActive(false);
				assignmentRepository.save(a);
			}
		}

		// Cancel unpaid demands of the previous class whose dueDate >= cutoff
		List<StudentFeeDemand> currentDemands = demandRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByDueDateAscIdAsc(
						orgId, session.getId(), enrollment.getStudentId());
		int cancelledCount = 0;
		for (StudentFeeDemand d : currentDemands) {
			if (Objects.equals(d.getClassId(), previousClassId)
					&& d.getPaidAmount().compareTo(BigDecimal.ZERO) == 0
					&& (d.getStatus() == FeeDemandStatus.PENDING || d.getStatus() == FeeDemandStatus.OVERDUE)
					&& (cutoff == null || !d.getDueDate().isBefore(cutoff))) {
				d.setStatus(FeeDemandStatus.CANCELLED);
				d.setOutstandingAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
				d.setRemarks("Cancelled due to class change from classId=" + previousClassId + " to classId=" + newClassId);
				demandRepository.save(d);
				cancelledCount++;
			}
		}

		recordAudit(orgId, session.getId(), enrollment.getStudentId(),
				"STUDENT_ENROLLMENT", enrollment.getId(), "CLASS_CHANGE_FEE_ADJUSTMENT",
				"classId=" + previousClassId, "classId=" + newClassId + " (cancelledDemands=" + cancelledCount + ")",
				"Adjusted student fee obligations on class change");

		applyPublishedFeeStructureOnEnrollment(orgId, session, enrollment);
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@Transactional
	public List<StudentFeeDemandResponse> generateDemandsForEnrollment(
			Long orgId, Long enrollmentId, GenerateFeeDemandsRequest request) {
		validator.requireOrganization(orgId);
		StudentEnrollment enrollment = enrollmentRepository.findByIdAndOrganizationId(enrollmentId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Student enrollment not found"));
		if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
			throw new IllegalStateException("Fee demands can only be generated for an ACTIVE enrollment");
		}
		AcademicSession session = requireModifiableSession(orgId, enrollment.getAcademicSessionId());
		ClassFeeStructure structure = structureRepository
				.findFirstByOrganizationIdAndAcademicSessionIdAndClassIdAndStatusOrderByVersionNumberDesc(
						orgId, session.getId(), enrollment.getClassId(), FeeStructureStatus.PUBLISHED)
				.orElseThrow(() -> new IllegalStateException(
						"No PUBLISHED fee structure exists for this class and academic session"));
		List<ClassFeeStructureComponent> components = componentRepository
				.findAllByOrganizationIdAndFeeStructureIdOrderByDisplayOrderAscIdAsc(orgId, structure.getId());

		Integer fromMonth = request != null ? request.applicableFromMonth() : null;
		Boolean newAdm = request != null ? request.newAdmission() : null;
		boolean includeManual = request != null && Boolean.TRUE.equals(request.includeOneTimeManualCharges());

		applyStructureToEnrollmentInternal(
				orgId, session, enrollment, structure, components, fromMonth, newAdm, includeManual);

		List<StudentFeeDemand> demands = demandRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByDueDateAscIdAsc(
						orgId, session.getId(), enrollment.getStudentId());
		return mapDemandResponses(orgId, demands);
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@Transactional
	public ConcessionResponse applyConcession(
			Long orgId, Long studentId, ApplyConcessionRequest request) {
		validator.requireOrganization(orgId);
		Student student = studentService.requireStudentForUpdate(orgId, studentId);
		AcademicSession session = requireModifiableSession(orgId, request.academicSessionId());
		StudentEnrollment enrollment = enrollmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, session.getId(), student.getId())
				.orElseThrow(() -> new IllegalStateException("Student is not enrolled in this academic session"));

		BigDecimal value = validateAndNormalizeConcessionValue(request.concessionType(), request.value());
		String componentCode = request.componentCode() == null || request.componentCode().isBlank()
				? null
				: validator.normalizeCode(request.componentCode(), "Component code");

		StudentFeeConcession concession = new StudentFeeConcession();
		concession.setOrganizationId(orgId);
		concession.setAcademicSessionId(session.getId());
		concession.setStudentId(student.getId());
		concession.setEnrollmentId(enrollment.getId());
		concession.setComponentCode(componentCode);
		concession.setConcessionType(request.concessionType());
		concession.setConcessionValue(value);
		concession.setApplicableFromMonth(request.applicableFromMonth());
		concession.setApplicableToMonth(request.applicableToMonth());
		concession.setReason(validator.normalizeRequiredText(request.reason(), "Concession reason"));
		concession.setApprovedBy(currentUser.getUserId());
		concession.setApprovedAt(Instant.now());
		concession.setActive(true);
		concession = concessionRepository.saveAndFlush(concession);

		recordAudit(orgId, session.getId(), student.getId(), "STUDENT_FEE_CONCESSION", concession.getId(),
				"APPLY_CONCESSION", null,
				request.concessionType() + " " + value + (componentCode != null ? " on " + componentCode : " on ALL"),
				concession.getReason());

		recalculateStudentConcessions(orgId, session.getId(), student.getId());
		return toConcessionResponse(concession);
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@Transactional
	public StudentFeeDemandResponse waiveDemand(
			Long orgId, Long demandId, WaiveDemandRequest request) {
		validator.requireOrganization(orgId);
		StudentFeeDemand demand = demandRepository.findByIdAndOrganizationIdForUpdate(demandId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Student fee demand not found"));
		requireModifiableSession(orgId, demand.getAcademicSessionId());

		if (demand.getStatus() == FeeDemandStatus.CANCELLED || demand.getStatus() == FeeDemandStatus.PAID) {
			throw new IllegalStateException("Cannot waive a fee demand in status " + demand.getStatus());
		}

		BigDecimal currentOutstanding = demand.getOutstandingAmount();
		BigDecimal waiverAmount = request.waiverAmount() == null
				? currentOutstanding
				: request.waiverAmount().setScale(2, RoundingMode.HALF_UP);
		if (waiverAmount.compareTo(currentOutstanding) > 0) {
			throw new IllegalStateException("Waiver amount cannot exceed current outstanding balance (" + currentOutstanding + ")");
		}

		String prevState = "concession=" + demand.getConcessionAmount()
				+ ", outstanding=" + demand.getOutstandingAmount() + ", status=" + demand.getStatus();

		demand.setConcessionAmount(demand.getConcessionAmount().add(waiverAmount).setScale(2, RoundingMode.HALF_UP));
		recomputeDemandBalances(demand, null);
		demand.setRemarks(validator.normalizeRequiredText(request.reason(), "Waiver reason"));
		StudentFeeDemand saved = demandRepository.saveAndFlush(demand);

		recordAudit(orgId, saved.getAcademicSessionId(), saved.getStudentId(),
				"STUDENT_FEE_DEMAND", saved.getId(), "WAIVE_DEMAND", prevState,
				"concession=" + saved.getConcessionAmount() + ", outstanding=" + saved.getOutstandingAmount()
						+ ", status=" + saved.getStatus(),
				saved.getRemarks());

		return mapDemandResponses(orgId, List.of(saved)).get(0);
	}

	@RequirePermission(PermissionCode.FEES_MANAGE)
	@Transactional
	public List<StudentFeeDemandResponse> evaluateAndApplyLateFees(
			Long orgId, Long sessionId, LocalDate evaluationDate) {
		Organization org = validator.requireOrganization(orgId);
		AcademicSession session = requireModifiableSession(orgId, sessionId);
		LocalDate evalDate = evaluationDate != null
				? evaluationDate
				: LocalDate.now(validator.resolveZoneId(org));

		List<StudentFeeDemand> demands = demandRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscStudentIdAscDueDateAscIdAsc(
						orgId, session.getId());
		if (demands.isEmpty()) {
			return List.of();
		}

		Set<Long> compIds = demands.stream().map(StudentFeeDemand::getComponentId).collect(Collectors.toSet());
		Map<Long, ClassFeeStructureComponent> compMap = componentRepository.findAllById(compIds).stream()
				.filter(c -> orgId.equals(c.getOrganizationId()))
				.collect(Collectors.toMap(ClassFeeStructureComponent::getId, Function.identity()));

		List<StudentFeeDemand> updated = new ArrayList<>();
		for (StudentFeeDemand d : demands) {
			if (d.getStatus() == FeeDemandStatus.PAID
					|| d.getStatus() == FeeDemandStatus.WAIVED
					|| d.getStatus() == FeeDemandStatus.CANCELLED) {
				continue;
			}
			if (d.getDueDate().isBefore(evalDate)) {
				BigDecimal oldLate = d.getLateFeeAmount();
				ClassFeeStructureComponent comp = compMap.get(d.getComponentId());
				BigDecimal computedLate = computeLateFee(comp, d.getDueDate(), evalDate);
				if (computedLate.compareTo(oldLate) > 0 || d.getStatus() == FeeDemandStatus.PENDING) {
					d.setLateFeeAmount(computedLate);
					recomputeDemandBalances(d, evalDate);
					updated.add(demandRepository.save(d));
					if (computedLate.compareTo(oldLate) > 0) {
						recordAudit(orgId, session.getId(), d.getStudentId(),
								"STUDENT_FEE_DEMAND", d.getId(), "APPLY_LATE_FEE",
								"lateFee=" + oldLate, "lateFee=" + computedLate,
								"Late fee evaluated as of " + evalDate);
					}
				}
			}
		}
		return mapDemandResponses(orgId, updated);
	}

	@RequirePermission(PermissionCode.FEES_COLLECT)
	@Transactional
	public FeePaymentReceiptResponse recordPayment(Long orgId, RecordFeePaymentRequest request) {
		validator.requireOrganization(orgId);
		Student student = studentService.requireStudentForUpdate(orgId, request.studentId());
		AcademicSession session = sessionService.requireSession(orgId, request.academicSessionId());
		StudentEnrollment enrollment = enrollmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, session.getId(), student.getId())
				.orElseThrow(() -> new IllegalStateException("Student is not enrolled in this academic session"));

		String idempotencyKey = validator.normalizeOptionalText(request.idempotencyKey());
		if (idempotencyKey != null
				&& paymentRepository.findByOrganizationIdAndIdempotencyKey(orgId, idempotencyKey).isPresent()) {
			throw new IllegalStateException("Duplicate payment request detected for idempotencyKey: " + idempotencyKey);
		}

		Set<Long> demandIds = new LinkedHashSet<>();
		for (DemandAllocationItem item : request.allocations()) {
			if (!demandIds.add(item.demandId())) {
				throw new IllegalArgumentException("Duplicate demand ID in payment allocations: " + item.demandId());
			}
		}

		List<StudentFeeDemand> lockedDemands = demandRepository
				.findAllByOrganizationIdAndIdInForUpdate(orgId, demandIds);
		if (lockedDemands.size() != demandIds.size()) {
			throw new EntityNotFoundException("One or more fee demands not found in this organization");
		}
		Map<Long, StudentFeeDemand> demandMap = lockedDemands.stream()
				.collect(Collectors.toMap(StudentFeeDemand::getId, Function.identity()));

		for (StudentFeeDemand d : lockedDemands) {
			if (!d.getStudentId().equals(student.getId()) || !d.getAcademicSessionId().equals(session.getId())) {
				throw new IllegalStateException("Fee demand does not belong to the specified student and academic session");
			}
			if (d.getStatus() == FeeDemandStatus.PAID
					|| d.getStatus() == FeeDemandStatus.WAIVED
					|| d.getStatus() == FeeDemandStatus.CANCELLED) {
				throw new IllegalStateException("Cannot allocate payment to demand in status " + d.getStatus());
			}
		}

		return executePaymentAllocation(orgId, session, enrollment, student, idempotencyKey, request, demandMap);
	}

	private FeePaymentReceiptResponse executePaymentAllocation(
			Long orgId, AcademicSession session, StudentEnrollment enrollment,
			Student student, String idempotencyKey, RecordFeePaymentRequest request,
			Map<Long, StudentFeeDemand> demandMap) {
		BigDecimal totalPayment = request.totalAmount().setScale(2, RoundingMode.HALF_UP);
		BigDecimal remainingToAllocate = totalPayment;
		BigDecimal totalAllocated = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		Map<Long, BigDecimal> resolvedAllocations = new LinkedHashMap<>();

		for (DemandAllocationItem item : request.allocations()) {
			StudentFeeDemand d = demandMap.get(item.demandId());
			BigDecimal allocAmount;
			if (item.amount() != null) {
				allocAmount = item.amount().setScale(2, RoundingMode.HALF_UP);
				if (allocAmount.compareTo(d.getOutstandingAmount()) > 0) {
					throw new IllegalStateException(
							"Allocated amount (" + allocAmount + ") exceeds demand outstanding balance ("
									+ d.getOutstandingAmount() + ") for " + d.getComponentCode() + " " + d.getPeriodLabel());
				}
				if (allocAmount.compareTo(remainingToAllocate) > 0) {
					throw new IllegalStateException(
							"Total allocated amounts exceed payment totalAmount (" + totalPayment + ")");
				}
			} else {
				allocAmount = remainingToAllocate.min(d.getOutstandingAmount()).setScale(2, RoundingMode.HALF_UP);
				if (allocAmount.compareTo(BigDecimal.ZERO) <= 0) {
					throw new IllegalStateException("Insufficient payment amount to allocate across all specified demands");
				}
			}
			resolvedAllocations.put(d.getId(), allocAmount);
			remainingToAllocate = remainingToAllocate.subtract(allocAmount).setScale(2, RoundingMode.HALF_UP);
			totalAllocated = totalAllocated.add(allocAmount).setScale(2, RoundingMode.HALF_UP);
		}

		BigDecimal unappliedCredit = totalPayment.subtract(totalAllocated).setScale(2, RoundingMode.HALF_UP);

		FeePayment payment = new FeePayment();
		payment.setOrganizationId(orgId);
		payment.setAcademicSessionId(session.getId());
		payment.setStudentId(student.getId());
		payment.setEnrollmentId(enrollment.getId());
		payment.setReceiptNumber(generateUniqueReceiptNumber(orgId, session.getId()));
		payment.setIdempotencyKey(idempotencyKey);
		payment.setPaymentDate(request.paymentDate());
		payment.setTotalAmount(totalPayment);
		payment.setAllocatedAmount(totalAllocated);
		payment.setUnappliedCreditAmount(unappliedCredit);
		payment.setRefundedAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		payment.setPaymentMethod(request.paymentMethod());
		payment.setReferenceNumber(validator.normalizeOptionalText(request.referenceNumber()));
		payment.setStatus(PaymentStatus.COMPLETED);
		payment.setRecordedBy(currentUser.getUserId());
		payment.setRemarks(validator.normalizeOptionalText(request.remarks()));
		payment = paymentRepository.saveAndFlush(payment);

		List<FeePaymentAllocation> savedAllocations = new ArrayList<>();
		for (Map.Entry<Long, BigDecimal> entry : resolvedAllocations.entrySet()) {
			StudentFeeDemand d = demandMap.get(entry.getKey());
			BigDecimal amt = entry.getValue();

			d.setPaidAmount(d.getPaidAmount().add(amt).setScale(2, RoundingMode.HALF_UP));
			recomputeDemandBalances(d, null);
			demandRepository.save(d);

			FeePaymentAllocation alloc = new FeePaymentAllocation();
			alloc.setOrganizationId(orgId);
			alloc.setPaymentId(payment.getId());
			alloc.setDemandId(d.getId());
			alloc.setStudentId(student.getId());
			alloc.setAllocatedAmount(amt);
			alloc.setReversed(false);
			savedAllocations.add(allocationRepository.save(alloc));
		}

		recordAudit(orgId, session.getId(), student.getId(), "FEE_PAYMENT", payment.getId(),
				"RECORD_PAYMENT", null,
				"receipt=" + payment.getReceiptNumber() + ", total=" + totalPayment
						+ ", allocated=" + totalAllocated + ", unappliedCredit=" + unappliedCredit,
				payment.getRemarks());
		notificationService.notifyFeePaymentRecordedAndReceiptAvailable(payment);

		return toPaymentReceiptResponse(payment, session, student, savedAllocations, demandMap);
	}

	@RequirePermission(PermissionCode.FEES_REFUND)
	@Transactional
	public FeePaymentReceiptResponse reversePayment(
			Long orgId, Long paymentId, ReverseOrRefundPaymentRequest request) {
		validator.requireOrganization(orgId);
		FeePayment payment = paymentRepository.findByIdAndOrganizationIdForUpdate(paymentId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Fee payment not found"));
		AcademicSession session = sessionService.requireSession(orgId, payment.getAcademicSessionId());
		Student student = studentService.requireStudentForUpdate(orgId, payment.getStudentId());

		if (payment.getStatus() != PaymentStatus.COMPLETED) {
			throw new IllegalStateException("Only a COMPLETED payment can be reversed (current: " + payment.getStatus() + ")");
		}

		String reason = validator.normalizeRequiredText(request.reason(), "Reversal reason");
		List<FeePaymentAllocation> allocations = allocationRepository
				.findAllByOrganizationIdAndPaymentIdOrderByIdAsc(orgId, payment.getId());
		Set<Long> demandIds = allocations.stream().map(FeePaymentAllocation::getDemandId).collect(Collectors.toSet());
		Map<Long, StudentFeeDemand> demandMap = demandIds.isEmpty() ? Map.of() : demandRepository
				.findAllByOrganizationIdAndIdInForUpdate(orgId, demandIds).stream()
				.collect(Collectors.toMap(StudentFeeDemand::getId, Function.identity()));

		for (FeePaymentAllocation alloc : allocations) {
			if (!alloc.isReversed()) {
				StudentFeeDemand d = demandMap.get(alloc.getDemandId());
				if (d != null) {
					d.setPaidAmount(d.getPaidAmount().subtract(alloc.getAllocatedAmount())
							.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
					recomputeDemandBalances(d, null);
					demandRepository.save(d);
				}
				alloc.setReversed(true);
				allocationRepository.save(alloc);
			}
		}

		payment.setStatus(PaymentStatus.REVERSED);
		payment.setUnappliedCreditAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		payment.setReversedBy(currentUser.getUserId());
		payment.setReversedAt(Instant.now());
		payment.setReversalReason(reason);
		FeePayment saved = paymentRepository.saveAndFlush(payment);

		recordAudit(orgId, session.getId(), student.getId(), "FEE_PAYMENT", saved.getId(),
				"REVERSE_PAYMENT", "COMPLETED", "REVERSED (receipt=" + saved.getReceiptNumber() + ")", reason);
		notificationService.notifyFeePaymentReversedOrRefunded(saved);

		return toPaymentReceiptResponse(saved, session, student, allocations, demandMap);
	}

	@RequirePermission(PermissionCode.FEES_REFUND)
	@Transactional
	public FeePaymentReceiptResponse refundPayment(
			Long orgId, Long paymentId, ReverseOrRefundPaymentRequest request) {
		validator.requireOrganization(orgId);
		FeePayment payment = paymentRepository.findByIdAndOrganizationIdForUpdate(paymentId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Fee payment not found"));
		AcademicSession session = sessionService.requireSession(orgId, payment.getAcademicSessionId());
		Student student = studentService.requireStudentForUpdate(orgId, payment.getStudentId());

		if (payment.getStatus() == PaymentStatus.REVERSED || payment.getStatus() == PaymentStatus.REFUNDED) {
			throw new IllegalStateException("Cannot refund a payment in status " + payment.getStatus());
		}

		String reason = validator.normalizeRequiredText(request.reason(), "Refund reason");
		BigDecimal maxRefundable = payment.getTotalAmount().subtract(payment.getRefundedAmount())
				.setScale(2, RoundingMode.HALF_UP);
		BigDecimal refundAmt = request.refundAmount() == null
				? maxRefundable
				: request.refundAmount().setScale(2, RoundingMode.HALF_UP);
		if (refundAmt.compareTo(maxRefundable) > 0) {
			throw new IllegalStateException("Refund amount (" + refundAmt + ") exceeds refundable balance (" + maxRefundable + ")");
		}

		List<FeePaymentAllocation> allocations = allocationRepository
				.findAllByOrganizationIdAndPaymentIdOrderByIdAsc(orgId, payment.getId());
		Set<Long> demandIds = allocations.stream().map(FeePaymentAllocation::getDemandId).collect(Collectors.toSet());
		Map<Long, StudentFeeDemand> demandMap = demandIds.isEmpty() ? Map.of() : demandRepository
				.findAllByOrganizationIdAndIdInForUpdate(orgId, demandIds).stream()
				.collect(Collectors.toMap(StudentFeeDemand::getId, Function.identity()));

		BigDecimal fromCredit = refundAmt.min(payment.getUnappliedCreditAmount()).setScale(2, RoundingMode.HALF_UP);
		payment.setUnappliedCreditAmount(payment.getUnappliedCreditAmount().subtract(fromCredit).setScale(2, RoundingMode.HALF_UP));
		BigDecimal remainingToDeduct = refundAmt.subtract(fromCredit).setScale(2, RoundingMode.HALF_UP);

		for (int i = allocations.size() - 1; i >= 0 && remainingToDeduct.compareTo(BigDecimal.ZERO) > 0; i--) {
			FeePaymentAllocation alloc = allocations.get(i);
			if (!alloc.isReversed()) {
				StudentFeeDemand d = demandMap.get(alloc.getDemandId());
				BigDecimal deduct = remainingToDeduct.min(alloc.getAllocatedAmount()).setScale(2, RoundingMode.HALF_UP);
				if (d != null && deduct.compareTo(BigDecimal.ZERO) > 0) {
					d.setPaidAmount(d.getPaidAmount().subtract(deduct).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
					recomputeDemandBalances(d, null);
					demandRepository.save(d);
				}
				if (deduct.compareTo(alloc.getAllocatedAmount()) == 0) {
					alloc.setReversed(true);
				} else {
					alloc.setAllocatedAmount(alloc.getAllocatedAmount().subtract(deduct).setScale(2, RoundingMode.HALF_UP));
				}
				allocationRepository.save(alloc);
				remainingToDeduct = remainingToDeduct.subtract(deduct).setScale(2, RoundingMode.HALF_UP);
			}
		}

		payment.setRefundedAmount(payment.getRefundedAmount().add(refundAmt).setScale(2, RoundingMode.HALF_UP));
		payment.setAllocatedAmount(payment.getTotalAmount()
				.subtract(payment.getUnappliedCreditAmount())
				.subtract(payment.getRefundedAmount())
				.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
		payment.setStatus(payment.getRefundedAmount().compareTo(payment.getTotalAmount()) >= 0
				? PaymentStatus.REFUNDED
				: PaymentStatus.PARTIALLY_REFUNDED);
		payment.setReversedBy(currentUser.getUserId());
		payment.setReversedAt(Instant.now());
		payment.setReversalReason(reason);
		FeePayment saved = paymentRepository.saveAndFlush(payment);

		recordAudit(orgId, session.getId(), student.getId(), "FEE_PAYMENT", saved.getId(),
				"REFUND_PAYMENT", "refunded=" + saved.getRefundedAmount().subtract(refundAmt),
				"refunded=" + saved.getRefundedAmount() + ", status=" + saved.getStatus(), reason);
		notificationService.notifyFeePaymentReversedOrRefunded(saved);

		return toPaymentReceiptResponse(saved, session, student, allocations, demandMap);
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@Transactional(readOnly = true)
	public FeePaymentReceiptResponse getReceiptById(Long orgId, Long paymentId) {
		validator.requireOrganization(orgId);
		FeePayment payment = paymentRepository.findByIdAndOrganizationId(paymentId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Fee payment receipt not found"));
		parentChildValidator.verifyStudentAccessForCurrentUser(orgId, payment.getStudentId());
		AcademicSession session = sessionService.requireSession(orgId, payment.getAcademicSessionId());
		Student student = studentService.requireStudent(orgId, payment.getStudentId());
		List<FeePaymentAllocation> allocations = allocationRepository
				.findAllByOrganizationIdAndPaymentIdOrderByIdAsc(orgId, payment.getId());
		Set<Long> demandIds = allocations.stream().map(FeePaymentAllocation::getDemandId).collect(Collectors.toSet());
		Map<Long, StudentFeeDemand> demandMap = demandIds.isEmpty() ? Map.of() : demandRepository.findAllById(demandIds)
				.stream().filter(d -> orgId.equals(d.getOrganizationId()))
				.collect(Collectors.toMap(StudentFeeDemand::getId, Function.identity()));
		return toPaymentReceiptResponse(payment, session, student, allocations, demandMap);
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@Transactional(readOnly = true)
	public StudentFinancialProfileResponse getStudentFinancialProfile(
			Long orgId, Long studentId, Long sessionId) {
		validator.requireOrganization(orgId);
		parentChildValidator.verifyStudentAccessForCurrentUser(orgId, studentId);
		Student student = studentService.requireStudent(orgId, studentId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		StudentEnrollment enrollment = enrollmentRepository
				.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, session.getId(), student.getId())
				.orElseThrow(() -> new EntityNotFoundException("Student is not enrolled in this academic session"));
		SchoolClass sc = classService.requireClass(orgId, enrollment.getClassId());

		Optional<StudentFeeAssignment> assignmentOpt = assignmentRepository
				.findFirstByOrganizationIdAndAcademicSessionIdAndStudentIdAndActiveTrueOrderByIdDesc(
						orgId, session.getId(), student.getId());
		ClassFeeStructureResponse assignedStructureDto = null;
		Integer assignedVersion = null;
		if (assignmentOpt.isPresent()) {
			StudentFeeAssignment a = assignmentOpt.get();
			assignedVersion = a.getFeeStructureVersion();
			ClassFeeStructure s = requireStructure(orgId, a.getFeeStructureId());
			List<ClassFeeStructureComponent> comps = componentRepository
					.findAllByOrganizationIdAndFeeStructureIdOrderByDisplayOrderAscIdAsc(orgId, s.getId());
			assignedStructureDto = toStructureResponse(s, session, sc, comps);
		}

		List<StudentFeeDemand> allDemands = demandRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByDueDateAscIdAsc(
						orgId, session.getId(), student.getId());
		List<StudentFeeDemandResponse> mappedDemands = mapDemandResponses(orgId, allDemands);

		List<StudentFeeDemandResponse> monthlyDemands = mappedDemands.stream()
				.filter(d -> d.frequency() == FeeFrequency.MONTHLY && d.status() != FeeDemandStatus.CANCELLED)
				.toList();
		List<StudentFeeDemandResponse> yearlyAndOneTimeDemands = mappedDemands.stream()
				.filter(d -> d.frequency() != FeeFrequency.MONTHLY && d.status() != FeeDemandStatus.CANCELLED)
				.toList();

		BigDecimal totalBase = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalConc = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalLate = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalNet = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalPaid = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalOut = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalOverdue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

		for (StudentFeeDemand d : allDemands) {
			if (d.getStatus() == FeeDemandStatus.CANCELLED) {
				continue;
			}
			totalBase = totalBase.add(d.getBaseAmount());
			totalConc = totalConc.add(d.getConcessionAmount());
			totalLate = totalLate.add(d.getLateFeeAmount());
			totalNet = totalNet.add(d.getNetPayableAmount());
			totalPaid = totalPaid.add(d.getPaidAmount());
			totalOut = totalOut.add(d.getOutstandingAmount());
			if (d.getStatus() == FeeDemandStatus.OVERDUE) {
				totalOverdue = totalOverdue.add(d.getOutstandingAmount());
			}
		}

		List<ConcessionResponse> concessions = concessionRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdAndActiveTrueOrderByIdAsc(
						orgId, session.getId(), student.getId())
				.stream().map(this::toConcessionResponse).toList();

		List<FeePayment> payments = paymentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByPaymentDateDescIdDesc(
						orgId, session.getId(), student.getId());
		Map<Long, StudentFeeDemand> demandById = allDemands.stream()
				.collect(Collectors.toMap(StudentFeeDemand::getId, Function.identity()));
		List<FeePaymentReceiptResponse> paymentDtos = new ArrayList<>();
		BigDecimal unappliedCredit = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

		for (FeePayment p : payments) {
			if (p.getStatus() == PaymentStatus.COMPLETED || p.getStatus() == PaymentStatus.PARTIALLY_REFUNDED) {
				unappliedCredit = unappliedCredit.add(p.getUnappliedCreditAmount());
			}
			List<FeePaymentAllocation> allocs = allocationRepository
					.findAllByOrganizationIdAndPaymentIdOrderByIdAsc(orgId, p.getId());
			paymentDtos.add(toPaymentReceiptResponse(p, session, student, allocs, demandById));
		}

		String fullName = student.getFirstName() + (student.getLastName() != null ? " " + student.getLastName() : "");
		return new StudentFinancialProfileResponse(
				orgId, session.getId(), session.getName(), sc.getId(), sc.getName(),
				enrollment.getId(), student.getId(), student.getAdmissionNumber(), fullName,
				assignedStructureDto, assignedVersion, monthlyDemands, yearlyAndOneTimeDemands,
				concessions, totalBase, totalConc, totalLate, totalNet, totalPaid,
				unappliedCredit, totalOut, totalOverdue, paymentDtos);
	}

	@RequirePermission(PermissionCode.FEES_REPORT_VIEW)
	@Transactional(readOnly = true)
	public SessionFeeDashboardReportResponse getSessionFeeDashboardReport(Long orgId, Long sessionId) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);

		List<StudentFeeDemand> allDemands = demandRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscStudentIdAscDueDateAscIdAsc(
						orgId, session.getId())
				.stream().filter(d -> d.getStatus() != FeeDemandStatus.CANCELLED).toList();

		BigDecimal totalBase = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalConc = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalLate = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalNet = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal monthlyDemanded = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal monthlyCollected = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal monthlyOut = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal yearlyDemanded = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal yearlyCollected = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal yearlyOut = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalCollected = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalOut = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalOverdue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

		Map<String, List<StudentFeeDemand>> monthlyGroups = new LinkedHashMap<>();
		Map<Long, List<StudentFeeDemand>> classGroups = new LinkedHashMap<>();

		for (StudentFeeDemand d : allDemands) {
			totalBase = totalBase.add(d.getBaseAmount());
			totalConc = totalConc.add(d.getConcessionAmount());
			totalLate = totalLate.add(d.getLateFeeAmount());
			totalNet = totalNet.add(d.getNetPayableAmount());
			totalCollected = totalCollected.add(d.getPaidAmount());
			totalOut = totalOut.add(d.getOutstandingAmount());
			if (d.getStatus() == FeeDemandStatus.OVERDUE) {
				totalOverdue = totalOverdue.add(d.getOutstandingAmount());
			}

			if (d.getFrequency() == FeeFrequency.MONTHLY) {
				monthlyDemanded = monthlyDemanded.add(d.getNetPayableAmount());
				monthlyCollected = monthlyCollected.add(d.getPaidAmount());
				monthlyOut = monthlyOut.add(d.getOutstandingAmount());
				monthlyGroups.computeIfAbsent(d.getPeriodLabel(), k -> new ArrayList<>()).add(d);
			} else {
				yearlyDemanded = yearlyDemanded.add(d.getNetPayableAmount());
				yearlyCollected = yearlyCollected.add(d.getPaidAmount());
				yearlyOut = yearlyOut.add(d.getOutstandingAmount());
			}
			classGroups.computeIfAbsent(d.getClassId(), k -> new ArrayList<>()).add(d);
		}

		List<MonthlyFeeCollectionItem> monthlyBreakdown = buildMonthlyBreakdown(monthlyGroups);
		List<ClassFeeReportItem> classBreakdown = buildClassBreakdown(orgId, session.getId(), classGroups);

		List<FeePayment> payments = paymentRepository
				.findAllByOrganizationIdAndAcademicSessionIdOrderByPaymentDateDescIdDesc(orgId, session.getId());
		Map<PaymentMethod, BigDecimal> methodMap = new EnumMap<>(PaymentMethod.class);
		for (PaymentMethod pm : PaymentMethod.values()) {
			methodMap.put(pm, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		}
		BigDecimal totalCredit = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalRefunded = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

		for (FeePayment p : payments) {
			totalRefunded = totalRefunded.add(p.getRefundedAmount());
			if (p.getStatus() == PaymentStatus.COMPLETED || p.getStatus() == PaymentStatus.PARTIALLY_REFUNDED) {
				BigDecimal netCollected = p.getTotalAmount().subtract(p.getRefundedAmount()).setScale(2, RoundingMode.HALF_UP);
				methodMap.put(p.getPaymentMethod(), methodMap.get(p.getPaymentMethod()).add(netCollected));
				totalCredit = totalCredit.add(p.getUnappliedCreditAmount());
			}
		}

		return new SessionFeeDashboardReportResponse(
				orgId, session.getId(), session.getName(),
				totalBase, totalConc, totalLate, totalNet,
				monthlyDemanded, monthlyCollected, monthlyOut,
				yearlyDemanded, yearlyCollected, yearlyOut,
				totalCollected, totalCredit, totalRefunded, totalOut, totalOverdue,
				methodMap, monthlyBreakdown, classBreakdown);
	}

	@RequirePermission(PermissionCode.FEES_VIEW)
	@Transactional(readOnly = true)
	public List<FeeAuditLogResponse> getStudentAuditLogs(Long orgId, Long sessionId, Long studentId) {
		validator.requireOrganization(orgId);
		parentChildValidator.verifyStudentAccessForCurrentUser(orgId, studentId);
		sessionService.requireSession(orgId, sessionId);
		studentService.requireStudent(orgId, studentId);
		return auditLogRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByPerformedAtDescIdDesc(
						orgId, sessionId, studentId)
				.stream()
				.map(a -> new FeeAuditLogResponse(
						a.getId(), a.getOrganizationId(), a.getAcademicSessionId(), a.getStudentId(),
						a.getEntityType(), a.getEntityId(), a.getAction(), a.getPreviousState(),
						a.getNewState(), a.getReason(), a.getPerformedBy(), a.getPerformedAt()))
				.toList();
	}

	private void applyStructureToEnrollmentInternal(
			Long orgId, AcademicSession session, StudentEnrollment enrollment,
			ClassFeeStructure structure, List<ClassFeeStructureComponent> components,
			Integer explicitFromMonth, Boolean explicitNewAdmission, boolean includeManualOneTime) {
		int fallbackYear = enrollment.getEnrollmentDate() != null
				? enrollment.getEnrollmentDate().getYear()
				: LocalDate.now().getYear();
		LocalDate sessionStart = session.getStartDate() != null
				? session.getStartDate()
				: LocalDate.of(fallbackYear, 4, 1);
		int startYear = sessionStart.getYear();
		int sessionStartMonth = sessionStart.getMonthValue();

		int fromMonth;
		if (explicitFromMonth != null) {
			fromMonth = explicitFromMonth;
		} else if (enrollment.getEnrollmentDate() != null
				&& enrollment.getEnrollmentDate().isAfter(sessionStart)) {
			fromMonth = enrollment.getEnrollmentDate().getMonthValue();
		} else {
			fromMonth = sessionStartMonth;
		}

		boolean isNewAdmission = explicitNewAdmission != null
				? explicitNewAdmission
				: (enrollmentRepository.findAllByOrganizationIdAndStudentIdOrderByEnrollmentDateDescIdDesc(
						orgId, enrollment.getStudentId()).size() <= 1);

		StudentFeeAssignment assignment = assignmentRepository
				.findByOrganizationIdAndEnrollmentIdAndFeeStructureId(orgId, enrollment.getId(), structure.getId())
				.orElseGet(StudentFeeAssignment::new);
		assignment.setOrganizationId(orgId);
		assignment.setAcademicSessionId(session.getId());
		assignment.setClassId(enrollment.getClassId());
		assignment.setEnrollmentId(enrollment.getId());
		assignment.setStudentId(enrollment.getStudentId());
		assignment.setFeeStructureId(structure.getId());
		assignment.setFeeStructureVersion(structure.getVersionNumber());
		assignment.setApplicableFromMonth(fromMonth);
		assignment.setNewAdmission(isNewAdmission);
		assignment.setActive(true);
		assignment.setAssignedAt(Instant.now());
		assignmentRepository.saveAndFlush(assignment);

		for (ClassFeeStructureComponent comp : components) {
			if (comp.getFrequency() == FeeFrequency.MONTHLY) {
				List<Integer> months = parseMonths(comp.getApplicableMonths());
				for (int m : months) {
					if (!isMonthApplicableFrom(m, fromMonth, sessionStartMonth)) {
						continue;
					}
					int billingYear = m >= sessionStartMonth ? startYear : startYear + 1;
					int dueDay = comp.getDueDayOfMonth() != null ? comp.getDueDayOfMonth() : 10;
					LocalDate dueDate = YearMonth.of(billingYear, m).atDay(Math.min(dueDay, 28));
					String periodLabel = String.format("%04d-%02d", billingYear, m);
					createDemandIfAbsent(
							orgId, session.getId(), enrollment, structure, comp,
							billingYear, m, periodLabel, dueDate);
				}
			} else if (comp.getFrequency() == FeeFrequency.YEARLY) {
				LocalDate dueDate = comp.getDueDate() != null
						? comp.getDueDate()
						: (session.getStartDate() != null ? session.getStartDate().plusDays(15) : LocalDate.of(startYear, sessionStartMonth, 15));
				createDemandIfAbsent(
						orgId, session.getId(), enrollment, structure, comp,
						startYear, 0, "ANNUAL", dueDate);
			} else if (comp.getFrequency() == FeeFrequency.ONE_TIME) {
				OneTimeTriggerCondition trigger = comp.getOneTimeTrigger() != null
						? comp.getOneTimeTrigger()
						: OneTimeTriggerCondition.ON_ADMISSION;
				boolean shouldGenerate = trigger == OneTimeTriggerCondition.ON_ENROLLMENT
						|| (trigger == OneTimeTriggerCondition.ON_ADMISSION && isNewAdmission)
						|| (trigger == OneTimeTriggerCondition.MANUAL && includeManualOneTime);
				if (shouldGenerate) {
					LocalDate dueDate = comp.getDueDate() != null
							? comp.getDueDate()
							: (enrollment.getEnrollmentDate() != null ? enrollment.getEnrollmentDate() : LocalDate.of(startYear, sessionStartMonth, 15));
					createDemandIfAbsent(
							orgId, session.getId(), enrollment, structure, comp,
							startYear, 0, "ONE_TIME", dueDate);
				}
			}
		}

		recalculateStudentConcessions(orgId, session.getId(), enrollment.getStudentId());
	}

	private void applyRevisionToEnrollment(
			Long orgId, AcademicSession session, StudentEnrollment enrollment,
			ClassFeeStructure revised, List<ClassFeeStructureComponent> newComponents,
			LocalDate effectiveFromDate) {
		// Deactivate older assignments for this enrollment
		List<StudentFeeAssignment> existingAssignments = assignmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByIdDesc(
						orgId, session.getId(), enrollment.getStudentId());
		int fromMonth = session.getStartDate() != null ? session.getStartDate().getMonthValue() : 4;
		boolean newAdm = true;
		for (StudentFeeAssignment a : existingAssignments) {
			if (a.isActive() && Objects.equals(a.getEnrollmentId(), enrollment.getId())) {
				fromMonth = a.getApplicableFromMonth();
				newAdm = a.isNewAdmission();
				a.setActive(false);
				assignmentRepository.save(a);
			}
		}

		// Update unpaid future demands (dueDate >= effectiveFromDate and paidAmount == 0 and status == PENDING)
		Map<String, ClassFeeStructureComponent> newCompByCode = newComponents.stream()
				.collect(Collectors.toMap(ClassFeeStructureComponent::getCode, Function.identity()));

		List<StudentFeeDemand> currentDemands = demandRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByDueDateAscIdAsc(
						orgId, session.getId(), enrollment.getStudentId());
		for (StudentFeeDemand d : currentDemands) {
			if (Objects.equals(d.getClassId(), enrollment.getClassId())
					&& !d.getDueDate().isBefore(effectiveFromDate)
					&& d.getPaidAmount().compareTo(BigDecimal.ZERO) == 0
					&& d.getStatus() == FeeDemandStatus.PENDING) {
				ClassFeeStructureComponent matching = newCompByCode.get(d.getComponentCode());
				if (matching != null && matching.getFrequency() == d.getFrequency()) {
					d.setFeeStructureId(revised.getId());
					d.setFeeStructureVersion(revised.getVersionNumber());
					d.setComponentId(matching.getId());
					d.setComponentName(matching.getName());
					d.setBaseAmount(matching.getAmount().setScale(2, RoundingMode.HALF_UP));
					recomputeDemandBalances(d, null);
					demandRepository.save(d);
				}
			}
		}

		// Also generate any newly added components whose dueDate >= effectiveFromDate
		applyStructureToEnrollmentInternal(
				orgId, session, enrollment, revised,
				newComponents, fromMonth, newAdm, false);
	}

	private void createDemandIfAbsent(
			Long orgId, Long sessionId, StudentEnrollment enrollment,
			ClassFeeStructure structure, ClassFeeStructureComponent comp,
			int billingYear, int billingMonth, String periodLabel, LocalDate dueDate) {
		if (demandRepository
				.existsByOrganizationIdAndAcademicSessionIdAndStudentIdAndClassIdAndComponentCodeAndFrequencyAndBillingYearAndBillingMonth(
						orgId, sessionId, enrollment.getStudentId(), enrollment.getClassId(),
						comp.getCode(), comp.getFrequency(), billingYear, billingMonth)) {
			return;
		}
		BigDecimal base = comp.getAmount().setScale(2, RoundingMode.HALF_UP);
		StudentFeeDemand d = new StudentFeeDemand();
		d.setOrganizationId(orgId);
		d.setAcademicSessionId(sessionId);
		d.setClassId(enrollment.getClassId());
		d.setEnrollmentId(enrollment.getId());
		d.setStudentId(enrollment.getStudentId());
		d.setFeeStructureId(structure.getId());
		d.setFeeStructureVersion(structure.getVersionNumber());
		d.setComponentId(comp.getId());
		d.setComponentCode(comp.getCode());
		d.setComponentName(comp.getName());
		d.setCategory(comp.getCategory());
		d.setFrequency(comp.getFrequency());
		d.setBillingYear(billingYear);
		d.setBillingMonth(billingMonth);
		d.setPeriodLabel(periodLabel);
		d.setDueDate(dueDate);
		d.setBaseAmount(base);
		d.setConcessionAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		d.setLateFeeAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		d.setNetPayableAmount(base);
		d.setPaidAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
		d.setOutstandingAmount(base);
		d.setStatus(FeeDemandStatus.PENDING);
		StudentFeeDemand savedDemand = demandRepository.saveAndFlush(d);
		notificationService.notifyFeeDemandGenerated(savedDemand);
	}

	private void recalculateStudentConcessions(Long orgId, Long sessionId, Long studentId) {
		List<StudentFeeConcession> concessions = concessionRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdAndActiveTrueOrderByIdAsc(
						orgId, sessionId, studentId);
		if (concessions.isEmpty()) {
			return;
		}
		List<StudentFeeDemand> demands = demandRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndStudentIdOrderByDueDateAscIdAsc(
						orgId, sessionId, studentId);

		for (StudentFeeDemand d : demands) {
			if (d.getStatus() == FeeDemandStatus.CANCELLED || d.getStatus() == FeeDemandStatus.PAID) {
				continue;
			}
			BigDecimal totalDiscount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			for (StudentFeeConcession c : concessions) {
				if (c.getComponentCode() != null && !c.getComponentCode().equalsIgnoreCase(d.getComponentCode())) {
					continue;
				}
				if (d.getFrequency() == FeeFrequency.MONTHLY && d.getBillingMonth() > 0) {
					if (c.getApplicableFromMonth() != null && d.getBillingMonth() < c.getApplicableFromMonth()) {
						continue;
					}
					if (c.getApplicableToMonth() != null && d.getBillingMonth() > c.getApplicableToMonth()) {
						continue;
					}
				}
				BigDecimal disc = switch (c.getConcessionType()) {
					case FULL_WAIVER -> d.getBaseAmount();
					case PERCENTAGE -> d.getBaseAmount().multiply(c.getConcessionValue())
							.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
					case FIXED_AMOUNT, PARTIAL_WAIVER -> c.getConcessionValue().min(d.getBaseAmount());
				};
				totalDiscount = totalDiscount.add(disc).min(d.getBaseAmount()).setScale(2, RoundingMode.HALF_UP);
			}
			if (totalDiscount.compareTo(d.getConcessionAmount()) > 0) {
				d.setConcessionAmount(totalDiscount);
				recomputeDemandBalances(d, null);
				demandRepository.save(d);
			}
		}
	}

	private void recomputeDemandBalances(StudentFeeDemand d, LocalDate evaluationDate) {
		BigDecimal netBase = d.getBaseAmount().subtract(d.getConcessionAmount())
				.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
		BigDecimal netPayable = netBase.add(d.getLateFeeAmount()).setScale(2, RoundingMode.HALF_UP);
		BigDecimal outstanding = netPayable.subtract(d.getPaidAmount())
				.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

		d.setNetPayableAmount(netPayable);
		d.setOutstandingAmount(outstanding);

		if (netPayable.compareTo(BigDecimal.ZERO) == 0) {
			d.setStatus(FeeDemandStatus.WAIVED);
		} else if (outstanding.compareTo(BigDecimal.ZERO) == 0) {
			d.setStatus(FeeDemandStatus.PAID);
		} else if (d.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
			d.setStatus(FeeDemandStatus.PARTIALLY_PAID);
		} else if (evaluationDate != null && d.getDueDate().isBefore(evaluationDate)) {
			d.setStatus(FeeDemandStatus.OVERDUE);
		} else if (d.getStatus() != FeeDemandStatus.OVERDUE) {
			d.setStatus(FeeDemandStatus.PENDING);
		}
	}

	private BigDecimal computeLateFee(ClassFeeStructureComponent comp, LocalDate dueDate, LocalDate evalDate) {
		if (comp == null || comp.getLateFeeType() == null || comp.getLateFeeType() == LateFeeType.NONE) {
			return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		}
		LocalDate effectiveDue = dueDate.plusDays(Math.max(0, comp.getLateFeeGraceDays()));
		if (!evalDate.isAfter(effectiveDue)) {
			return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		}
		BigDecimal rate = comp.getLateFeeAmount() != null ? comp.getLateFeeAmount() : BigDecimal.ZERO;
		BigDecimal fee;
		if (comp.getLateFeeType() == LateFeeType.FIXED_AMOUNT) {
			fee = rate.setScale(2, RoundingMode.HALF_UP);
		} else {
			long daysLate = ChronoUnit.DAYS.between(effectiveDue, evalDate);
			fee = rate.multiply(BigDecimal.valueOf(daysLate)).setScale(2, RoundingMode.HALF_UP);
		}
		if (comp.getLateFeeCap() != null && comp.getLateFeeCap().compareTo(BigDecimal.ZERO) > 0) {
			fee = fee.min(comp.getLateFeeCap()).setScale(2, RoundingMode.HALF_UP);
		}
		return fee;
	}

	private List<ClassFeeStructureComponent> saveComponents(
			Long orgId, AcademicSession session, Long structureId, List<ComponentItem> items) {
		Set<String> codes = new HashSet<>();
		List<ClassFeeStructureComponent> saved = new ArrayList<>();
		int idx = 1;
		for (ComponentItem item : items) {
			String code = validator.normalizeCode(item.code(), "Component code");
			if (!codes.add(code)) {
				throw new IllegalStateException("Duplicate fee component code in structure: " + code);
			}
			ClassFeeStructureComponent c = new ClassFeeStructureComponent();
			c.setOrganizationId(orgId);
			c.setFeeStructureId(structureId);
			c.setName(validator.normalizeRequiredText(item.name(), "Component name"));
			c.setCode(code);
			c.setCategory(item.category());
			c.setFrequency(item.frequency());
			c.setAmount(item.amount().setScale(2, RoundingMode.HALF_UP));

			if (item.frequency() == FeeFrequency.MONTHLY) {
				List<Integer> months = (item.applicableMonths() == null || item.applicableMonths().isEmpty())
						? DEFAULT_SESSION_MONTHS
						: item.applicableMonths().stream().distinct().toList();
				c.setApplicableMonths(months.stream().map(String::valueOf).collect(Collectors.joining(",")));
				c.setDueDayOfMonth(item.dueDayOfMonth() != null ? item.dueDayOfMonth() : 10);
			} else {
				c.setDueDate(item.dueDate() != null
						? item.dueDate()
						: (session.getStartDate() != null ? session.getStartDate().plusDays(15) : LocalDate.now().plusDays(15)));
				if (item.frequency() == FeeFrequency.ONE_TIME) {
					c.setOneTimeTrigger(item.oneTimeTrigger() != null
							? item.oneTimeTrigger()
							: OneTimeTriggerCondition.ON_ADMISSION);
				}
			}

			c.setLateFeeType(item.lateFeeType() != null ? item.lateFeeType() : LateFeeType.NONE);
			c.setLateFeeAmount(item.lateFeeAmount() != null
					? item.lateFeeAmount().setScale(2, RoundingMode.HALF_UP)
					: BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
			c.setLateFeeGraceDays(item.lateFeeGraceDays() != null ? item.lateFeeGraceDays() : 0);
			c.setLateFeeCap(item.lateFeeCap() != null ? item.lateFeeCap().setScale(2, RoundingMode.HALF_UP) : null);
			c.setOptionalComponent(Boolean.TRUE.equals(item.optionalComponent()));
			c.setDisplayOrder(validator.resolveDisplayOrder(item.displayOrder(), idx++));
			saved.add(componentRepository.save(c));
		}
		return saved;
	}

	private List<MonthlyFeeCollectionItem> buildMonthlyBreakdown(
			Map<String, List<StudentFeeDemand>> monthlyGroups) {
		List<MonthlyFeeCollectionItem> list = new ArrayList<>();
		for (Map.Entry<String, List<StudentFeeDemand>> e : monthlyGroups.entrySet()) {
			List<StudentFeeDemand> demands = e.getValue();
			StudentFeeDemand first = demands.get(0);
			BigDecimal mDem = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			BigDecimal mCol = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			BigDecimal mPen = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			BigDecimal mOvr = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			for (StudentFeeDemand d : demands) {
				mDem = mDem.add(d.getNetPayableAmount());
				mCol = mCol.add(d.getPaidAmount());
				mPen = mPen.add(d.getOutstandingAmount());
				if (d.getStatus() == FeeDemandStatus.OVERDUE) {
					mOvr = mOvr.add(d.getOutstandingAmount());
				}
			}
			list.add(new MonthlyFeeCollectionItem(
					first.getBillingYear(), first.getBillingMonth(), e.getKey(), mDem, mCol, mPen, mOvr));
		}
		return list;
	}

	private List<ClassFeeReportItem> buildClassBreakdown(
			Long orgId, Long sessionId, Map<Long, List<StudentFeeDemand>> classGroups) {
		if (classGroups.isEmpty()) {
			return List.of();
		}
		Map<Long, SchoolClass> classMap = classRepository.findAllById(classGroups.keySet()).stream()
				.filter(c -> orgId.equals(c.getOrganizationId()))
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));

		List<ClassFeeReportItem> list = new ArrayList<>();
		for (Map.Entry<Long, List<StudentFeeDemand>> e : classGroups.entrySet()) {
			Long cId = e.getKey();
			List<StudentFeeDemand> demands = e.getValue();
			int enrolled = (int) enrollmentRepository
					.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(orgId, sessionId, cId)
					.stream().filter(en -> en.getStatus() == EnrollmentStatus.ACTIVE).count();

			BigDecimal exp = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			BigDecimal conc = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			BigDecimal late = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			BigDecimal net = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			BigDecimal col = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			BigDecimal out = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			BigDecimal ovr = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
			for (StudentFeeDemand d : demands) {
				exp = exp.add(d.getBaseAmount());
				conc = conc.add(d.getConcessionAmount());
				late = late.add(d.getLateFeeAmount());
				net = net.add(d.getNetPayableAmount());
				col = col.add(d.getPaidAmount());
				out = out.add(d.getOutstandingAmount());
				if (d.getStatus() == FeeDemandStatus.OVERDUE) {
					ovr = ovr.add(d.getOutstandingAmount());
				}
			}
			SchoolClass sc = classMap.get(cId);
			list.add(new ClassFeeReportItem(
					cId, sc != null ? sc.getName() : null, enrolled,
					exp, conc, late, net, col, out, ovr));
		}
		return list;
	}

	private List<StudentFeeDemandResponse> mapDemandResponses(Long orgId, List<StudentFeeDemand> demands) {
		if (demands.isEmpty()) {
			return List.of();
		}
		Map<Long, SchoolClass> classMap = classRepository.findAllById(
				demands.stream().map(StudentFeeDemand::getClassId).collect(Collectors.toSet())).stream()
				.filter(c -> orgId.equals(c.getOrganizationId()))
				.collect(Collectors.toMap(SchoolClass::getId, Function.identity()));
		Map<Long, Student> studentMap = studentRepository.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(
				orgId, demands.stream().map(StudentFeeDemand::getStudentId).collect(Collectors.toSet())).stream()
				.collect(Collectors.toMap(Student::getId, Function.identity()));

		return demands.stream().map(d -> {
			SchoolClass sc = classMap.get(d.getClassId());
			Student st = studentMap.get(d.getStudentId());
			String fullName = st == null ? "" : (st.getFirstName() + (st.getLastName() != null ? " " + st.getLastName() : ""));
			return new StudentFeeDemandResponse(
					d.getId(), d.getOrganizationId(), d.getAcademicSessionId(),
					d.getClassId(), sc != null ? sc.getName() : null,
					d.getEnrollmentId(), d.getStudentId(),
					st != null ? st.getAdmissionNumber() : null, fullName,
					d.getFeeStructureId(), d.getFeeStructureVersion(),
					d.getComponentId(), d.getComponentCode(), d.getComponentName(),
					d.getCategory(), d.getFrequency(), d.getBillingYear(), d.getBillingMonth(),
					d.getPeriodLabel(), d.getDueDate(), d.getBaseAmount(), d.getConcessionAmount(),
					d.getLateFeeAmount(), d.getNetPayableAmount(), d.getPaidAmount(),
					d.getOutstandingAmount(), d.getStatus(), d.getRemarks(),
					d.getCreatedAt(), d.getUpdatedAt());
		}).toList();
	}

	private ClassFeeStructureResponse toStructureResponse(
			ClassFeeStructure s, AcademicSession session, SchoolClass sc,
			List<ClassFeeStructureComponent> components) {
		BigDecimal totalMonthly = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalYearly = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalOneTime = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalAnnualEst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		List<FeeComponentResponse> compDtos = new ArrayList<>();

		for (ClassFeeStructureComponent c : components) {
			List<Integer> months = c.getFrequency() == FeeFrequency.MONTHLY
					? parseMonths(c.getApplicableMonths())
					: List.of();
			if (c.getFrequency() == FeeFrequency.MONTHLY) {
				totalMonthly = totalMonthly.add(c.getAmount());
				totalAnnualEst = totalAnnualEst.add(
						c.getAmount().multiply(BigDecimal.valueOf(months.size())).setScale(2, RoundingMode.HALF_UP));
			} else if (c.getFrequency() == FeeFrequency.YEARLY) {
				totalYearly = totalYearly.add(c.getAmount());
				totalAnnualEst = totalAnnualEst.add(c.getAmount());
			} else {
				totalOneTime = totalOneTime.add(c.getAmount());
				totalAnnualEst = totalAnnualEst.add(c.getAmount());
			}
			compDtos.add(new FeeComponentResponse(
					c.getId(), c.getName(), c.getCode(), c.getCategory(), c.getFrequency(),
					c.getAmount(), months, c.getDueDayOfMonth(), c.getDueDate(),
					c.getOneTimeTrigger(), c.getLateFeeType(), c.getLateFeeAmount(),
					c.getLateFeeGraceDays(), c.getLateFeeCap(), c.isOptionalComponent(), c.getDisplayOrder()));
		}

		return new ClassFeeStructureResponse(
				s.getId(), s.getOrganizationId(), s.getAcademicSessionId(),
				session != null ? session.getName() : null,
				s.getClassId(), sc != null ? sc.getName() : null,
				s.getName(), s.getVersionNumber(), s.getStatus(), s.getEffectiveFromDate(),
				s.getPublishedAt(), s.getPublishedBy(), s.getNotes(),
				totalMonthly, totalYearly, totalOneTime, totalAnnualEst,
				compDtos, s.getCreatedAt(), s.getUpdatedAt());
	}

	private ConcessionResponse toConcessionResponse(StudentFeeConcession c) {
		return new ConcessionResponse(
				c.getId(), c.getOrganizationId(), c.getAcademicSessionId(),
				c.getStudentId(), c.getEnrollmentId(), c.getComponentCode(),
				c.getConcessionType(), c.getConcessionValue(),
				c.getApplicableFromMonth(), c.getApplicableToMonth(),
				c.getReason(), c.getApprovedBy(), c.getApprovedAt(), c.isActive());
	}

	private FeePaymentReceiptResponse toPaymentReceiptResponse(
			FeePayment p, AcademicSession session, Student st,
			List<FeePaymentAllocation> allocs, Map<Long, StudentFeeDemand> demandMap) {
		List<PaymentAllocationResponse> allocDtos = allocs.stream().map(a -> {
			StudentFeeDemand d = demandMap.get(a.getDemandId());
			return new PaymentAllocationResponse(
					a.getId(), a.getDemandId(),
					d != null ? d.getComponentCode() : null,
					d != null ? d.getComponentName() : null,
					d != null ? d.getPeriodLabel() : null,
					a.getAllocatedAmount(), a.isReversed());
		}).toList();
		String fullName = st == null ? "" : (st.getFirstName() + (st.getLastName() != null ? " " + st.getLastName() : ""));
		return new FeePaymentReceiptResponse(
				p.getId(), p.getOrganizationId(), p.getAcademicSessionId(),
				session != null ? session.getName() : null,
				p.getStudentId(), st != null ? st.getAdmissionNumber() : null, fullName,
				p.getEnrollmentId(), p.getReceiptNumber(), p.getIdempotencyKey(),
				p.getPaymentDate(), p.getTotalAmount(), p.getAllocatedAmount(),
				p.getUnappliedCreditAmount(), p.getRefundedAmount(),
				p.getPaymentMethod(), p.getReferenceNumber(), p.getStatus(),
				p.getRecordedBy(), p.getReversedBy(), p.getReversedAt(),
				p.getReversalReason(), p.getRemarks(), allocDtos, p.getCreatedAt());
	}

	private BigDecimal validateAndNormalizeConcessionValue(ConcessionType type, BigDecimal val) {
		if (type == ConcessionType.FULL_WAIVER) {
			return BigDecimal.valueOf(100.00).setScale(2, RoundingMode.HALF_UP);
		}
		if (val == null || val.compareTo(BigDecimal.ZERO) <= 0) {
			throw new IllegalArgumentException("Concession value must be positive for " + type);
		}
		if (type == ConcessionType.PERCENTAGE && val.compareTo(BigDecimal.valueOf(100)) > 0) {
			throw new IllegalArgumentException("Percentage concession cannot exceed 100%");
		}
		return val.setScale(2, RoundingMode.HALF_UP);
	}

	private List<Integer> parseMonths(String csv) {
		if (csv == null || csv.isBlank()) {
			return DEFAULT_SESSION_MONTHS;
		}
		return Arrays.stream(csv.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.map(Integer::parseInt)
				.toList();
	}

	private boolean isMonthApplicableFrom(int month, int fromMonth, int sessionStartMonth) {
		int monthOrder = (month - sessionStartMonth + 12) % 12;
		int fromOrder = (fromMonth - sessionStartMonth + 12) % 12;
		return monthOrder >= fromOrder;
	}

	private String generateUniqueReceiptNumber(Long orgId, Long sessionId) {
		String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
		return "RCP-" + orgId + "-" + sessionId + "-" + suffix;
	}

	private void recordAudit(
			Long orgId, Long sessionId, Long studentId,
			String entityType, Long entityId, String action,
			String prevState, String newState, String reason) {
		FeeAuditLog log = new FeeAuditLog();
		log.setOrganizationId(orgId);
		log.setAcademicSessionId(sessionId);
		log.setStudentId(studentId);
		log.setEntityType(entityType);
		log.setEntityId(entityId);
		log.setAction(action);
		log.setPreviousState(prevState);
		log.setNewState(newState);
		log.setReason(reason);
		log.setPerformedBy(currentUser.getUserId() != null ? currentUser.getUserId() : 0L);
		log.setPerformedAt(Instant.now());
		auditLogRepository.save(log);
	}

	private ClassFeeStructure requireStructure(Long orgId, Long id) {
		return structureRepository.findByIdAndOrganizationId(id, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class fee structure not found"));
	}

	private ClassFeeStructure requireStructureForUpdate(Long orgId, Long id) {
		return structureRepository.findByIdAndOrganizationIdForUpdate(id, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class fee structure not found"));
	}

	private AcademicSession requireModifiableSession(Long orgId, Long sessionId) {
		validator.requireOrganization(orgId);
		AcademicSession session = sessionService.requireSession(orgId, sessionId);
		if (session.getStatus() == AcademicSessionStatus.COMPLETED) {
			throw new IllegalStateException("Cannot modify fee configurations in a completed academic session");
		}
		return session;
	}

	private SchoolClass requireActiveClassForUpdate(Long orgId, Long classId) {
		SchoolClass sc = classRepository.findByIdAndOrganizationIdForUpdate(classId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Class not found"));
		if (!sc.isActive()) {
			throw new IllegalStateException("Cannot configure fee structure for an inactive class");
		}
		return sc;
	}
}
