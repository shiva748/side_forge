package com.side.forge.organization.parentportal.security;

import java.util.List;
import java.util.Optional;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.student.guardian.entity.Guardian;
import com.side.forge.organization.student.guardian.entity.StudentGuardian;
import com.side.forge.organization.student.guardian.repository.GuardianRepository;
import com.side.forge.organization.student.guardian.repository.StudentGuardianRepository;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.repository.StudentRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

/**
 * Enforces verified guardian identity and parent-child relationship checks
 * for all Parent Portal and student-specific operations.
 */
@Component
@RequiredArgsConstructor
public class ParentChildAccessValidator {

	public record LinkedChildContext(
			Guardian guardian,
			StudentGuardian link,
			Student student
	) {
	}

	private final AcademicTenantAccessValidator tenantValidator;
	private final CurrentUserContext currentUser;
	private final GuardianRepository guardianRepository;
	private final StudentGuardianRepository studentGuardianRepository;
	private final StudentRepository studentRepository;

	public Guardian requireVerifiedGuardian(Long orgId) {
		tenantValidator.requireOrganization(orgId);
		Long userId = currentUser.getUserId();
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		Guardian guardian = guardianRepository.findByOrganizationIdAndUserId(orgId, userId)
				.orElseThrow(() -> new AccessDeniedException(
						"No verified guardian profile is linked to your account in this organization"));
		if (!guardian.isActive()) {
			throw new AccessDeniedException("Your guardian profile in this organization is inactive");
		}
		return guardian;
	}

	public List<StudentGuardian> getVerifiedChildLinks(Long orgId, Guardian guardian) {
		return studentGuardianRepository.findAllByOrganizationIdAndGuardianIdOrderByIdAsc(
				orgId, guardian.getId());
	}

	public LinkedChildContext requireLinkedChild(Long orgId, Long studentId) {
		Guardian guardian = requireVerifiedGuardian(orgId);
		if (studentId == null || studentId <= 0) {
			throw new IllegalArgumentException("Student ID is required");
		}
		StudentGuardian link = studentGuardianRepository
				.findByOrganizationIdAndStudentIdAndGuardianId(orgId, studentId, guardian.getId())
				.orElseThrow(() -> new AccessDeniedException(
						"Access denied: you do not have a verified guardian relationship with this student"));
		Student student = studentRepository.findByIdAndOrganizationId(studentId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Student not found in organization"));
		return new LinkedChildContext(guardian, link, student);
	}

	public boolean isGuardianLinkedToStudent(Long orgId, Long userId, Long studentId) {
		if (userId == null || studentId == null) {
			return false;
		}
		Optional<Guardian> guardianOpt = guardianRepository.findByOrganizationIdAndUserId(orgId, userId);
		if (guardianOpt.isEmpty() || !guardianOpt.get().isActive()) {
			return false;
		}
		return studentGuardianRepository.existsByOrganizationIdAndStudentIdAndGuardianId(
				orgId, studentId, guardianOpt.get().getId());
	}

	/**
	 * Enforces resource-level student isolation when the caller is a Parent or Student
	 * (i.e. does not hold school-wide student/teacher/admin view permissions).
	 */
	public void verifyStudentAccessForCurrentUser(Long orgId, Long targetStudentId) {
		if (targetStudentId == null) {
			throw new IllegalArgumentException("Student ID is required");
		}
		if (hasSchoolStaffOrAdminStudentAccess()) {
			return;
		}
		Long userId = currentUser.getUserId();
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		Optional<Student> ownStudent = studentRepository.findByOrganizationIdAndUserId(orgId, userId);
		if (ownStudent.isPresent() && ownStudent.get().getId().equals(targetStudentId)) {
			return;
		}
		if (isGuardianLinkedToStudent(orgId, userId, targetStudentId)) {
			return;
		}
		throw new AccessDeniedException("Access denied: you are not authorized to access this student's records");
	}

	public boolean hasSchoolStaffOrAdminStudentAccess() {
		return currentUser.hasRole("SCHOOL_ADMIN")
				|| currentUser.hasRole("PRINCIPAL")
				|| currentUser.hasPermission(PermissionCode.STUDENT_VIEW.getValue())
				|| currentUser.hasPermission(PermissionCode.TEACHER_VIEW.getValue())
				|| currentUser.hasPermission(PermissionCode.SCHOOL_UPDATE.getValue());
	}
}
