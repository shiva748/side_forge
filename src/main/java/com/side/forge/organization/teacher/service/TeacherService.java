package com.side.forge.organization.teacher.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.academic.subject.service.SubjectService;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.staff.dto.CreateStaffRequest;
import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.EmploymentType;
import com.side.forge.organization.staff.entity.Staff;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.staff.service.StaffService;
import com.side.forge.organization.teacher.dto.*;
import com.side.forge.organization.teacher.entity.TeacherProfile;
import com.side.forge.organization.teacher.repository.TeacherProfileRepository;
import com.side.forge.organization.teacher.repository.TeacherSpecifications;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TeacherService {

	private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
			"id", "staffId", "specialization", "experienceYears", "availableForAssignment", "createdAt"
	);

	private final TeacherProfileRepository teacherProfileRepository;
	private final StaffRepository staffRepository;
	private final StaffService staffService;
	private final AcademicSessionService sessionService;
	private final SchoolClassService classService;
	private final SubjectService subjectService;
	private final AcademicTenantAccessValidator validator;

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@Transactional
	public TeacherResponse createTeacher(Long orgId, CreateTeacherRequest request) {
		Organization org = validator.requireOrganization(orgId);
		if (request.experienceYears() != null && request.experienceYears() < 0) {
			throw new IllegalArgumentException("Experience years must not be negative");
		}

		Staff staff;
		TeacherProfile profile;

		if (request.staffId() != null) {
			staff = staffService.requireStaffForUpdate(orgId, request.staffId());
			if (staff.getEmploymentStatus().isTerminal()) {
				throw new IllegalStateException("Cannot create a teacher profile for a resigned or terminated staff member");
			}
			if (teacherProfileRepository.existsByOrganizationIdAndStaffId(orgId, staff.getId())) {
				throw new IllegalStateException("Teacher profile already exists for this staff member");
			}
			staff.setTeachingStaff(true);
			staff = staffRepository.save(staff);

			profile = new TeacherProfile();
			profile.setOrganizationId(orgId);
			profile.setStaffId(staff.getId());
			applyTeacherFields(profile, request.qualifications(), request.specialization(),
					request.experienceYears(), request.registrationNumber(),
					request.certifications(), request.teachingNotes(),
					request.availableForAssignment(), staff.getEmploymentStatus());
			profile = teacherProfileRepository.save(profile);
		} else {
			CreateStaffRequest staffReq = new CreateStaffRequest(
					request.employeeId(), request.firstName(), request.middleName(), request.lastName(),
					request.dateOfBirth(), request.gender(), request.email(), request.phoneNumber(),
					request.alternatePhoneNumber(), request.address(), request.city(), request.state(),
					request.postalCode(), request.joiningDate(), request.designation(), request.department(),
					request.employmentType(), request.emergencyContactName(), request.emergencyContactPhone(),
					request.emergencyContactRelation(), true, request.professionalNotes(), request.userId(),
					request.qualifications(), request.specialization(), request.experienceYears(),
					request.registrationNumber(), request.certifications(), request.teachingNotes()
			);
			staff = staffService.createStaffInternal(org, staffReq);
			profile = teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, staff.getId())
					.orElseThrow(() -> new EntityNotFoundException("Teacher profile not found"));
			if (request.availableForAssignment() != null) {
				profile.setAvailableForAssignment(request.availableForAssignment());
				profile = teacherProfileRepository.save(profile);
			}
		}

		return toResponse(profile, staff);
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<TeacherResponse> getTeachers(
			Long orgId, String search, String employeeId, String department, String designation,
			EmploymentType employmentType, EmploymentStatus employmentStatus, String specialization,
			Boolean availableForAssignment, Long academicSessionId, Long classId, Long subjectId,
			int page, int size, String sortBy, String sortDir) {
		validator.requireOrganization(orgId);
		if (academicSessionId != null) {
			sessionService.requireSession(orgId, academicSessionId);
		}
		if (classId != null) {
			classService.requireClass(orgId, classId);
		}
		if (subjectId != null) {
			subjectService.requireSubject(orgId, subjectId);
		}

		Pageable pageable = buildPageable(page, size, sortBy, sortDir);
		Specification<TeacherProfile> spec = TeacherSpecifications.withFilters(
				orgId, search, employeeId, department, designation, employmentType,
				employmentStatus, specialization, availableForAssignment,
				academicSessionId, classId, subjectId);

		Page<TeacherProfile> rawPage = teacherProfileRepository.findAll(spec, pageable);
		return toPagedResponses(orgId, rawPage);
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<TeacherResponse> getAvailableTeachers(
			Long orgId, String search, String specialization, int page, int size, String sortBy, String sortDir) {
		return getTeachers(orgId, search, null, null, null, null,
				EmploymentStatus.ACTIVE, specialization, true, null, null, null,
				page, size, sortBy, sortDir);
	}

	@RequirePermission(PermissionCode.TEACHER_VIEW)
	@Transactional(readOnly = true)
	public TeacherResponse getTeacherById(Long orgId, Long teacherId) {
		validator.requireOrganization(orgId);
		TeacherProfile profile = requireTeacher(orgId, teacherId);
		Staff staff = staffService.requireStaff(orgId, profile.getStaffId());
		return toResponse(profile, staff);
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@Transactional
	public TeacherResponse updateTeacherProfile(
			Long orgId, Long teacherId, UpdateTeacherProfileRequest request) {
		validator.requireOrganization(orgId);
		if (request.experienceYears() != null && request.experienceYears() < 0) {
			throw new IllegalArgumentException("Experience years must not be negative");
		}
		TeacherProfile profile = requireTeacherForUpdate(orgId, teacherId);
		Staff staff = staffService.requireStaff(orgId, profile.getStaffId());

		applyTeacherFields(profile, request.qualifications(), request.specialization(),
				request.experienceYears() != null ? request.experienceYears() : profile.getExperienceYears(),
				request.registrationNumber(), request.certifications(), request.teachingNotes(),
				request.availableForAssignment() != null ? request.availableForAssignment() : profile.isAvailableForAssignment(),
				staff.getEmploymentStatus());

		return toResponse(teacherProfileRepository.save(profile), staff);
	}

	@RequirePermission(PermissionCode.TEACHER_MANAGE)
	@Transactional
	public TeacherResponse changeTeacherStatus(
			Long orgId, Long teacherId, ChangeTeacherStatusRequest request) {
		Organization org = validator.requireOrganization(orgId);
		TeacherProfile profile = requireTeacherForUpdate(orgId, teacherId);
		Staff staff = staffService.requireStaffForUpdate(orgId, profile.getStaffId());

		if (request.employmentStatus() != null) {
			staffService.applyEmploymentStatusChange(org, staff, request.employmentStatus(), request.leavingDate());
			staff = staffRepository.save(staff);
		}

		if (request.availableForAssignment() != null) {
			if (request.availableForAssignment() && staff.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
				throw new IllegalStateException("Cannot mark an inactive or former teacher as available for assignment");
			}
			profile.setAvailableForAssignment(request.availableForAssignment());
		} else if (staff.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
			profile.setAvailableForAssignment(false);
		}

		if (request.teachingNotes() != null) {
			profile.setTeachingNotes(validator.normalizeOptionalText(request.teachingNotes()));
		}

		return toResponse(teacherProfileRepository.save(profile), staff);
	}

	public TeacherProfile requireTeacher(Long orgId, Long teacherId) {
		return teacherProfileRepository.findByIdAndOrganizationId(teacherId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Teacher not found"));
	}

	public TeacherProfile requireTeacherForUpdate(Long orgId, Long teacherId) {
		return teacherProfileRepository.findByIdAndOrganizationIdForUpdate(teacherId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Teacher not found"));
	}

	public record ActiveTeacherPair(TeacherProfile teacher, Staff staff) {
	}

	public ActiveTeacherPair requireActiveAssignableTeacherForUpdate(Long orgId, Long teacherId) {
		TeacherProfile teacher = requireTeacherForUpdate(orgId, teacherId);
		Staff staff = staffService.requireStaff(orgId, teacher.getStaffId());
		if (!staff.isTeachingStaff() || staff.getEmploymentStatus() != EmploymentStatus.ACTIVE
				|| !teacher.isAvailableForAssignment()) {
			throw new IllegalStateException("Teacher must be active and available for academic assignment");
		}
		return new ActiveTeacherPair(teacher, staff);
	}

	private void applyTeacherFields(
			TeacherProfile p, String qualifications, String specialization,
			Integer experienceYears, String registrationNumber,
			String certifications, String teachingNotes,
			Boolean availableForAssignment, EmploymentStatus staffStatus) {
		p.setQualifications(validator.normalizeOptionalText(qualifications));
		p.setSpecialization(validator.normalizeOptionalText(specialization));
		p.setExperienceYears(experienceYears != null ? experienceYears : 0);
		p.setRegistrationNumber(validator.normalizeOptionalText(registrationNumber));
		p.setCertifications(validator.normalizeOptionalText(certifications));
		p.setTeachingNotes(validator.normalizeOptionalText(teachingNotes));
		if (staffStatus != EmploymentStatus.ACTIVE) {
			p.setAvailableForAssignment(false);
		} else {
			p.setAvailableForAssignment(availableForAssignment == null || availableForAssignment);
		}
	}

	private PagedResponse<TeacherResponse> toPagedResponses(Long orgId, Page<TeacherProfile> rawPage) {
		List<TeacherProfile> content = rawPage.getContent();
		if (content.isEmpty()) {
			return new PagedResponse<>(
					List.of(), rawPage.getNumber(), rawPage.getSize(),
					rawPage.getTotalElements(), rawPage.getTotalPages(),
					rawPage.isFirst(), rawPage.isLast());
		}

		Set<Long> staffIds = content.stream().map(TeacherProfile::getStaffId).collect(Collectors.toSet());
		Map<Long, Staff> staffMap = staffRepository.findAllByOrganizationIdAndIdIn(orgId, staffIds)
				.stream()
				.collect(Collectors.toMap(Staff::getId, Function.identity()));

		List<TeacherResponse> mapped = content.stream()
				.map(tp -> toResponse(tp, staffMap.get(tp.getStaffId())))
				.toList();

		return new PagedResponse<>(
				mapped, rawPage.getNumber(), rawPage.getSize(),
				rawPage.getTotalElements(), rawPage.getTotalPages(),
				rawPage.isFirst(), rawPage.isLast());
	}

	public TeacherResponse toResponse(TeacherProfile p, Staff s) {
		return new TeacherResponse(
				p.getId(),
				p.getOrganizationId(),
				p.getStaffId(),
				s != null ? s.getUserId() : null,
				s != null ? s.getEmployeeId() : null,
				s != null ? s.getFirstName() : null,
				s != null ? s.getMiddleName() : null,
				s != null ? s.getLastName() : null,
				s != null ? s.getDateOfBirth() : null,
				s != null ? s.getGender() : null,
				s != null ? s.getEmail() : null,
				s != null ? s.getPhoneNumber() : null,
				s != null ? s.getAlternatePhoneNumber() : null,
				s != null ? s.getAddress() : null,
				s != null ? s.getCity() : null,
				s != null ? s.getState() : null,
				s != null ? s.getPostalCode() : null,
				s != null ? s.getJoiningDate() : null,
				s != null ? s.getLeavingDate() : null,
				s != null ? s.getDesignation() : null,
				s != null ? s.getDepartment() : null,
				s != null ? s.getEmploymentType() : null,
				s != null ? s.getEmploymentStatus() : null,
				p.getQualifications(),
				p.getSpecialization(),
				p.getExperienceYears(),
				p.getRegistrationNumber(),
				p.getCertifications(),
				p.getTeachingNotes(),
				p.isAvailableForAssignment(),
				p.getCreatedAt(),
				p.getUpdatedAt()
		);
	}

	private Pageable buildPageable(int page, int size, String sortBy, String sortDir) {
		if (page < 0) {
			throw new IllegalArgumentException("Page index must not be negative");
		}
		if (size <= 0 || size > 100) {
			throw new IllegalArgumentException("Page size must be between 1 and 100");
		}
		String field = (sortBy == null || sortBy.isBlank()) ? "id" : sortBy.trim();
		if (!ALLOWED_SORT_FIELDS.contains(field)) {
			throw new IllegalArgumentException("Unsupported sort field: " + field);
		}
		Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
		return PageRequest.of(page, size, Sort.by(direction, field).and(Sort.by(Sort.Direction.ASC, "id")));
	}
}
