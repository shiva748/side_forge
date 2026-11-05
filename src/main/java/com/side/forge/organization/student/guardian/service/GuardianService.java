package com.side.forge.organization.student.guardian.service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.student.guardian.dto.*;
import com.side.forge.organization.student.guardian.entity.*;
import com.side.forge.organization.student.guardian.mapper.GuardianMapper;
import com.side.forge.organization.student.guardian.repository.GuardianRepository;
import com.side.forge.organization.student.guardian.repository.StudentGuardianRepository;
import com.side.forge.organization.student.profile.dto.StudentResponse;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.mapper.StudentMapper;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.student.profile.service.StudentService;
import com.side.forge.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GuardianService {

	private final GuardianRepository guardianRepository;
	private final StudentGuardianRepository studentGuardianRepository;
	private final GuardianMapper guardianMapper;
	private final StudentService studentService;
	private final StudentRepository studentRepository;
	private final StudentMapper studentMapper;
	private final AcademicTenantAccessValidator validator;
	private final UserRepository userRepository;

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@Transactional
	public GuardianResponse createGuardian(Long orgId, CreateGuardianRequest request) {
		validator.requireOrganization(orgId);
		validateOptionalUserId(request.userId());

		Guardian guardian = guardianMapper.toEntity(request);
		guardian.setOrganizationId(orgId);
		applyNormalizedFields(guardian, request.firstName(), request.lastName(), request.email(),
				request.phoneNumber(), request.alternatePhoneNumber(), request.address(), request.occupation());
		guardian.setActive(true);
		return guardianMapper.toResponse(guardianRepository.save(guardian));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public List<GuardianResponse> getGuardians(Long orgId) {
		validator.requireOrganization(orgId);
		return guardianRepository.findAllByOrganizationIdOrderByFirstNameAscLastNameAsc(orgId)
				.stream().map(guardianMapper::toResponse).toList();
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public GuardianResponse getGuardianById(Long orgId, Long guardianId) {
		validator.requireOrganization(orgId);
		return guardianMapper.toResponse(requireGuardian(orgId, guardianId));
	}

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@Transactional
	public GuardianResponse updateGuardian(Long orgId, Long guardianId, UpdateGuardianRequest request) {
		validator.requireOrganization(orgId);
		Guardian guardian = requireGuardian(orgId, guardianId);
		validateOptionalUserId(request.userId());

		guardian.setUserId(request.userId());
		applyNormalizedFields(guardian, request.firstName(), request.lastName(), request.email(),
				request.phoneNumber(), request.alternatePhoneNumber(), request.address(), request.occupation());
		return guardianMapper.toResponse(guardianRepository.save(guardian));
	}

	public Guardian requireGuardian(Long orgId, Long guardianId) {
		return guardianRepository.findByIdAndOrganizationId(guardianId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Guardian not found"));
	}

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@Transactional
	public StudentGuardianResponse linkGuardianToStudent(
			Long orgId, Long studentId, LinkStudentGuardianRequest request) {
		validator.requireOrganization(orgId);
		Student student = studentService.requireStudentForUpdate(orgId, studentId);
		Guardian guardian = requireGuardian(orgId, request.guardianId());

		if (studentGuardianRepository.existsByOrganizationIdAndStudentIdAndGuardianId(
				orgId, student.getId(), guardian.getId())) {
			throw new IllegalStateException("Guardian is already associated with this student");
		}

		boolean primary = Boolean.TRUE.equals(request.primaryContact());
		boolean emergency = Boolean.TRUE.equals(request.emergencyContact());
		boolean notify = request.receiveNotifications() == null || request.receiveNotifications();

		if (primary) {
			clearPrimaryContactForStudent(orgId, student.getId(), null);
		}

		StudentGuardian link = new StudentGuardian();
		link.setOrganizationId(orgId);
		link.setStudentId(student.getId());
		link.setGuardianId(guardian.getId());
		link.setRelationshipType(request.relationshipType());
		link.setPrimaryContact(primary);
		link.setEmergencyContact(emergency);
		link.setReceiveNotifications(notify);

		StudentGuardian saved = studentGuardianRepository.save(link);
		return toStudentGuardianResponse(saved, guardianMapper.toResponse(guardian));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public List<StudentGuardianResponse> getStudentGuardians(Long orgId, Long studentId) {
		validator.requireOrganization(orgId);
		studentService.requireStudent(orgId, studentId);

		List<StudentGuardian> links = studentGuardianRepository
				.findAllByOrganizationIdAndStudentIdOrderByPrimaryContactDescIdAsc(orgId, studentId);
		if (links.isEmpty()) {
			return List.of();
		}

		List<Long> guardianIds = links.stream().map(StudentGuardian::getGuardianId).toList();
		Map<Long, GuardianResponse> guardianMap = guardianRepository.findAllByOrganizationIdAndIdIn(orgId, guardianIds)
				.stream()
				.map(guardianMapper::toResponse)
				.collect(Collectors.toMap(GuardianResponse::id, Function.identity()));

		return links.stream()
				.map(link -> toStudentGuardianResponse(link, guardianMap.get(link.getGuardianId())))
				.toList();
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public List<GuardianStudentLinkResponse> getGuardianStudents(Long orgId, Long guardianId) {
		validator.requireOrganization(orgId);
		requireGuardian(orgId, guardianId);

		List<StudentGuardian> links = studentGuardianRepository
				.findAllByOrganizationIdAndGuardianIdOrderByIdAsc(orgId, guardianId);
		if (links.isEmpty()) {
			return List.of();
		}

		List<Long> studentIds = links.stream().map(StudentGuardian::getStudentId).toList();
		Map<Long, StudentResponse> studentMap = studentRepository
				.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(orgId, studentIds)
				.stream()
				.map(studentMapper::toResponse)
				.collect(Collectors.toMap(StudentResponse::id, Function.identity()));

		return links.stream()
				.map(link -> new GuardianStudentLinkResponse(
						link.getId(), link.getOrganizationId(), link.getStudentId(), link.getGuardianId(),
						link.getRelationshipType(), link.isPrimaryContact(), link.isEmergencyContact(),
						link.isReceiveNotifications(), studentMap.get(link.getStudentId()),
						link.getCreatedAt(), link.getUpdatedAt()))
				.toList();
	}

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@Transactional
	public StudentGuardianResponse updateStudentGuardianLink(
			Long orgId, Long studentId, Long guardianId, UpdateStudentGuardianRequest request) {
		validator.requireOrganization(orgId);
		studentService.requireStudentForUpdate(orgId, studentId);
		Guardian guardian = requireGuardian(orgId, guardianId);

		StudentGuardian link = studentGuardianRepository
				.findByOrganizationIdAndStudentIdAndGuardianId(orgId, studentId, guardianId)
				.orElseThrow(() -> new EntityNotFoundException("Student-guardian association not found"));

		boolean primary = request.primaryContact() != null ? request.primaryContact() : link.isPrimaryContact();
		boolean emergency = request.emergencyContact() != null ? request.emergencyContact() : link.isEmergencyContact();
		boolean notify = request.receiveNotifications() != null
				? request.receiveNotifications()
				: link.isReceiveNotifications();

		if (primary) {
			clearPrimaryContactForStudent(orgId, studentId, guardianId);
		}

		link.setRelationshipType(request.relationshipType());
		link.setPrimaryContact(primary);
		link.setEmergencyContact(emergency);
		link.setReceiveNotifications(notify);

		StudentGuardian saved = studentGuardianRepository.save(link);
		return toStudentGuardianResponse(saved, guardianMapper.toResponse(guardian));
	}

	@RequirePermission(PermissionCode.STUDENT_GUARDIAN_MANAGE)
	@Transactional
	public void unlinkGuardianFromStudent(Long orgId, Long studentId, Long guardianId) {
		validator.requireOrganization(orgId);
		studentService.requireStudent(orgId, studentId);
		requireGuardian(orgId, guardianId);

		StudentGuardian link = studentGuardianRepository
				.findByOrganizationIdAndStudentIdAndGuardianId(orgId, studentId, guardianId)
				.orElseThrow(() -> new EntityNotFoundException("Student-guardian association not found"));

		studentGuardianRepository.delete(link);
	}

	private void clearPrimaryContactForStudent(Long orgId, Long studentId, Long excludedGuardianId) {
		List<StudentGuardian> existingPrimary = studentGuardianRepository
				.findAllByOrganizationIdAndStudentIdAndPrimaryContactTrue(orgId, studentId);
		for (StudentGuardian sg : existingPrimary) {
			if (excludedGuardianId == null || !sg.getGuardianId().equals(excludedGuardianId)) {
				sg.setPrimaryContact(false);
				studentGuardianRepository.save(sg);
			}
		}
	}

	private StudentGuardianResponse toStudentGuardianResponse(StudentGuardian link, GuardianResponse guardian) {
		return new StudentGuardianResponse(
				link.getId(), link.getOrganizationId(), link.getStudentId(), link.getGuardianId(),
				link.getRelationshipType(), link.isPrimaryContact(), link.isEmergencyContact(),
				link.isReceiveNotifications(), guardian, link.getCreatedAt(), link.getUpdatedAt());
	}

	private void validateOptionalUserId(Long userId) {
		if (userId != null && !userRepository.existsById(userId)) {
			throw new EntityNotFoundException("Referenced user account not found");
		}
	}

	private void applyNormalizedFields(
			Guardian g, String firstName, String lastName, String email,
			String phone, String altPhone, String address, String occupation) {
		g.setFirstName(validator.normalizeRequiredText(firstName, "First name"));
		g.setLastName(validator.normalizeOptionalText(lastName));
		g.setEmail(validator.normalizeOptionalText(email));
		g.setPhoneNumber(validator.normalizeRequiredText(phone, "Phone number"));
		g.setAlternatePhoneNumber(validator.normalizeOptionalText(altPhone));
		g.setAddress(validator.normalizeOptionalText(address));
		g.setOccupation(validator.normalizeOptionalText(occupation));
	}
}
