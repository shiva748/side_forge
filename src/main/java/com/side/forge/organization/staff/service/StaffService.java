package com.side.forge.organization.staff.service;

import java.time.LocalDate;
import java.util.Set;

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
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.staff.dto.*;
import com.side.forge.organization.staff.entity.*;
import com.side.forge.organization.staff.mapper.StaffMapper;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.staff.repository.StaffSpecifications;
import com.side.forge.organization.teacher.entity.TeacherProfile;
import com.side.forge.organization.teacher.repository.TeacherProfileRepository;
import com.side.forge.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StaffService {

	public static final String RESOURCE_STAFF_DOCUMENT = "STAFF_DOCUMENT";

	private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
			"id", "employeeId", "firstName", "lastName", "joiningDate",
			"designation", "department", "employmentStatus", "createdAt"
	);

	private final StaffRepository staffRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final StaffMapper staffMapper;
	private final AcademicTenantAccessValidator validator;
	private final UserRepository userRepository;
	private final com.side.forge.storage.service.FileManagementService fileManagementService;

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public StaffResponse createStaff(Long orgId, CreateStaffRequest request) {
		Organization org = validator.requireOrganization(orgId);
		Staff saved = createStaffInternal(org, request);
		return staffMapper.toResponse(saved);
	}

	@Transactional
	public Staff createStaffInternal(Organization org, CreateStaffRequest request) {
		Long orgId = org.getId();
		String employeeId = validator.normalizeCode(request.employeeId(), "Employee ID");
		String firstName = validator.normalizeRequiredText(request.firstName(), "First name");
		String phone = validator.normalizeRequiredText(request.phoneNumber(), "Phone number");
		String designation = validator.normalizeRequiredText(request.designation(), "Designation");
		validateStaffDates(request.dateOfBirth(), request.joiningDate(), org);
		validateOptionalUserAssociation(orgId, request.userId(), null);

		if (staffRepository.existsByOrganizationIdAndEmployeeIdIgnoreCase(orgId, employeeId)) {
			throw new IllegalStateException("Staff member with this employee ID already exists in the organization");
		}

		Staff staff = staffMapper.toEntity(request);
		staff.setOrganizationId(orgId);
		staff.setUserId(request.userId());
		staff.setEmploymentType(request.employmentType() != null ? request.employmentType() : EmploymentType.PERMANENT);
		staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
		staff.setTeachingStaff(Boolean.TRUE.equals(request.teachingStaff()));
		applyNormalizedFields(staff, employeeId, firstName, request.middleName(), request.lastName(),
				request.email(), phone, request.alternatePhoneNumber(), request.address(), request.city(),
				request.state(), request.postalCode(), designation, request.department(),
				request.emergencyContactName(), request.emergencyContactPhone(),
				request.emergencyContactRelation(), request.professionalNotes());

		Staff saved = staffRepository.save(staff);

		if (saved.isTeachingStaff()) {
			ensureTeacherProfile(orgId, saved.getId(), request.qualifications(), request.specialization(),
					request.experienceYears(), request.registrationNumber(),
					request.certifications(), request.teachingNotes());
		}

		return saved;
	}

	@RequirePermission(PermissionCode.STAFF_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<StaffResponse> getStaffList(
			Long orgId, String search, String employeeId, String department, String designation,
			EmploymentType employmentType, EmploymentStatus employmentStatus, Boolean teachingStaff,
			int page, int size, String sortBy, String sortDir) {
		validator.requireOrganization(orgId);
		Pageable pageable = buildPageable(page, size, sortBy, sortDir);
		Specification<Staff> spec = StaffSpecifications.withFilters(
				orgId, search, employeeId, department, designation,
				employmentType, employmentStatus, teachingStaff);
		Page<StaffResponse> result = staffRepository.findAll(spec, pageable).map(staffMapper::toResponse);
		return PagedResponse.from(result);
	}

	@RequirePermission(PermissionCode.STAFF_VIEW)
	@Transactional(readOnly = true)
	public StaffResponse getStaffById(Long orgId, Long staffId) {
		validator.requireOrganization(orgId);
		return staffMapper.toResponse(requireStaff(orgId, staffId));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public StaffResponse updateStaff(Long orgId, Long staffId, UpdateStaffRequest request) {
		Organization org = validator.requireOrganization(orgId);
		Staff staff = requireStaff(orgId, staffId);

		String employeeId = validator.normalizeCode(request.employeeId(), "Employee ID");
		String firstName = validator.normalizeRequiredText(request.firstName(), "First name");
		String phone = validator.normalizeRequiredText(request.phoneNumber(), "Phone number");
		String designation = validator.normalizeRequiredText(request.designation(), "Designation");
		validateStaffDates(request.dateOfBirth(), request.joiningDate(), org);
		validateOptionalUserAssociation(orgId, request.userId(), staffId);

		if (staffRepository.existsByOrganizationIdAndEmployeeIdIgnoreCaseAndIdNot(orgId, employeeId, staffId)) {
			throw new IllegalStateException("Staff member with this employee ID already exists in the organization");
		}

		staff.setDateOfBirth(request.dateOfBirth());
		staff.setGender(request.gender());
		staff.setJoiningDate(request.joiningDate());
		staff.setUserId(request.userId());
		if (request.employmentType() != null) {
			staff.setEmploymentType(request.employmentType());
		}
		if (request.teachingStaff() != null) {
			staff.setTeachingStaff(request.teachingStaff());
		}

		applyNormalizedFields(staff, employeeId, firstName, request.middleName(), request.lastName(),
				request.email(), phone, request.alternatePhoneNumber(), request.address(), request.city(),
				request.state(), request.postalCode(), designation, request.department(),
				request.emergencyContactName(), request.emergencyContactPhone(),
				request.emergencyContactRelation(), request.professionalNotes());

		Staff saved = staffRepository.save(staff);
		if (saved.isTeachingStaff()) {
			ensureTeacherProfile(orgId, saved.getId(), null, null, null, null, null, null);
		} else {
			teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, saved.getId())
					.ifPresent(tp -> {
						tp.setAvailableForAssignment(false);
						teacherProfileRepository.save(tp);
					});
		}
		return staffMapper.toResponse(saved);
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public StaffResponse changeStaffStatus(Long orgId, Long staffId, ChangeStaffStatusRequest request) {
		Organization org = validator.requireOrganization(orgId);
		Staff staff = requireStaffForUpdate(orgId, staffId);
		applyEmploymentStatusChange(org, staff, request.employmentStatus(), request.leavingDate());
		if (request.professionalNotes() != null) {
			staff.setProfessionalNotes(validator.normalizeOptionalText(request.professionalNotes()));
		}
		return staffMapper.toResponse(staffRepository.save(staff));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public StaffResponse associateUserAccount(Long orgId, Long staffId, LinkStaffUserRequest request) {
		validator.requireOrganization(orgId);
		Staff staff = requireStaffForUpdate(orgId, staffId);
		validateOptionalUserAssociation(orgId, request.userId(), staffId);
		staff.setUserId(request.userId());
		return staffMapper.toResponse(staffRepository.save(staff));
	}

	public void applyEmploymentStatusChange(
			Organization org, Staff staff, EmploymentStatus targetStatus, LocalDate leavingDate) {
		EmploymentStatus current = staff.getEmploymentStatus();
		if (current == targetStatus) {
			throw new IllegalStateException("Staff member already has employment status " + targetStatus);
		}
		if (current.isTerminal()) {
			throw new IllegalStateException(
					"Cannot transition employment status from historical state " + current + " to " + targetStatus);
		}

		if (targetStatus.isTerminal()) {
			LocalDate effectiveLeavingDate = leavingDate != null
					? leavingDate
					: LocalDate.now(validator.resolveZoneId(org));
			if (effectiveLeavingDate.isBefore(staff.getJoiningDate())) {
				throw new IllegalArgumentException("Leaving date cannot be earlier than joining date");
			}
			staff.setLeavingDate(effectiveLeavingDate);
		} else if (leavingDate != null) {
			staff.setLeavingDate(leavingDate);
		}

		if (targetStatus != EmploymentStatus.ACTIVE) {
			teacherProfileRepository.findByOrganizationIdAndStaffId(org.getId(), staff.getId())
					.ifPresent(tp -> {
						tp.setAvailableForAssignment(false);
						teacherProfileRepository.save(tp);
					});
		}

		staff.setEmploymentStatus(targetStatus);
	}

	public Staff requireStaff(Long orgId, Long staffId) {
		return staffRepository.findByIdAndOrganizationId(staffId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Staff member not found"));
	}

	public Staff requireStaffForUpdate(Long orgId, Long staffId) {
		return staffRepository.findByIdAndOrganizationIdForUpdate(staffId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Staff member not found"));
	}

	public TeacherProfile ensureTeacherProfile(
			Long orgId, Long staffId, String qualifications, String specialization,
			Integer experienceYears, String registrationNumber,
			String certifications, String teachingNotes) {
		return teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, staffId)
				.orElseGet(() -> {
					if (experienceYears != null && experienceYears < 0) {
						throw new IllegalArgumentException("Experience years must not be negative");
					}
					TeacherProfile tp = new TeacherProfile();
					tp.setOrganizationId(orgId);
					tp.setStaffId(staffId);
					tp.setQualifications(validator.normalizeOptionalText(qualifications));
					tp.setSpecialization(validator.normalizeOptionalText(specialization));
					tp.setExperienceYears(experienceYears != null ? experienceYears : 0);
					tp.setRegistrationNumber(validator.normalizeOptionalText(registrationNumber));
					tp.setCertifications(validator.normalizeOptionalText(certifications));
					tp.setTeachingNotes(validator.normalizeOptionalText(teachingNotes));
					tp.setAvailableForAssignment(true);
					return teacherProfileRepository.save(tp);
				});
	}

	private void validateStaffDates(LocalDate dob, LocalDate joiningDate, Organization org) {
		LocalDate today = LocalDate.now(validator.resolveZoneId(org));
		if (joiningDate == null) {
			throw new IllegalArgumentException("Joining date is required");
		}
		if (dob != null) {
			if (!dob.isBefore(today)) {
				throw new IllegalArgumentException("Date of birth must be in the past");
			}
			if (!joiningDate.isAfter(dob)) {
				throw new IllegalArgumentException("Joining date must be after date of birth");
			}
		}
	}

	private void validateOptionalUserAssociation(Long orgId, Long userId, Long excludedStaffId) {
		if (userId == null) {
			return;
		}
		if (!userRepository.existsById(userId)) {
			throw new EntityNotFoundException("Referenced user account not found");
		}
		boolean alreadyLinked = excludedStaffId == null
				? staffRepository.existsByOrganizationIdAndUserId(orgId, userId)
				: staffRepository.existsByOrganizationIdAndUserIdAndIdNot(orgId, userId, excludedStaffId);
		if (alreadyLinked) {
			throw new IllegalStateException("User account is already associated with another staff member in this organization");
		}
	}

	private void applyNormalizedFields(
			Staff s, String empId, String firstName, String middleName, String lastName,
			String email, String phone, String altPhone, String address, String city,
			String state, String postalCode, String designation, String department,
			String emergName, String emergPhone, String emergRelation, String notes) {
		s.setEmployeeId(empId);
		s.setFirstName(firstName);
		s.setMiddleName(validator.normalizeOptionalText(middleName));
		s.setLastName(validator.normalizeOptionalText(lastName));
		s.setEmail(validator.normalizeOptionalText(email));
		s.setPhoneNumber(phone);
		s.setAlternatePhoneNumber(validator.normalizeOptionalText(altPhone));
		s.setAddress(validator.normalizeOptionalText(address));
		s.setCity(validator.normalizeOptionalText(city));
		s.setState(validator.normalizeOptionalText(state));
		s.setPostalCode(validator.normalizeOptionalText(postalCode));
		s.setDesignation(designation);
		s.setDepartment(validator.normalizeOptionalText(department));
		s.setEmergencyContactName(validator.normalizeOptionalText(emergName));
		s.setEmergencyContactPhone(validator.normalizeOptionalText(emergPhone));
		s.setEmergencyContactRelation(validator.normalizeOptionalText(emergRelation));
		s.setProfessionalNotes(validator.normalizeOptionalText(notes));
	}

	private Pageable buildPageable(int page, int size, String sortBy, String sortDir) {
		if (page < 0) {
			throw new IllegalArgumentException("Page index must not be negative");
		}
		if (size <= 0 || size > 100) {
			throw new IllegalArgumentException("Page size must be between 1 and 100");
		}
		String field = (sortBy == null || sortBy.isBlank()) ? "firstName" : sortBy.trim();
		if (!ALLOWED_SORT_FIELDS.contains(field)) {
			throw new IllegalArgumentException("Unsupported sort field: " + field);
		}
		Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
		return PageRequest.of(page, size, Sort.by(direction, field).and(Sort.by(Sort.Direction.ASC, "id")));
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public com.side.forge.storage.dto.StorageDtos.StoredFileResponse uploadStaffDocument(
			Long orgId, Long staffId, org.springframework.web.multipart.MultipartFile file) {
		validator.requireOrganization(orgId);
		Staff staff = staffRepository.findByIdAndOrganizationIdForUpdate(staffId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Staff member not found"));
		return fileManagementService.storeOrganizationFile(
				orgId, com.side.forge.storage.entity.FileResourceCategory.STAFF_DOCUMENT,
				file, RESOURCE_STAFF_DOCUMENT, staff.getId());
	}

	@RequirePermission(PermissionCode.STAFF_VIEW)
	@Transactional(readOnly = true)
	public java.util.List<com.side.forge.storage.dto.StorageDtos.StoredFileResponse> getStaffDocuments(
			Long orgId, Long staffId) {
		validator.requireOrganization(orgId);
		Staff staff = staffRepository.findByIdAndOrganizationId(staffId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Staff member not found"));
		return fileManagementService.getFilesForResource(orgId, RESOURCE_STAFF_DOCUMENT, staff.getId());
	}

	@RequirePermission(PermissionCode.STAFF_VIEW)
	@Transactional(readOnly = true)
	public com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload downloadStaffDocument(
			Long orgId, Long staffId, Long fileId) {
		validator.requireOrganization(orgId);
		Staff staff = staffRepository.findByIdAndOrganizationId(staffId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Staff member not found"));
		return fileManagementService.downloadOrganizationFileForAuthorizedResource(
				orgId, fileId, RESOURCE_STAFF_DOCUMENT, staff.getId());
	}

	@RequirePermission(PermissionCode.STAFF_MANAGE)
	@Transactional
	public void deleteStaffDocument(Long orgId, Long staffId, Long fileId) {
		validator.requireOrganization(orgId);
		Staff staff = staffRepository.findByIdAndOrganizationIdForUpdate(staffId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Staff member not found"));
		fileManagementService.deleteOrganizationFile(orgId, fileId, RESOURCE_STAFF_DOCUMENT, staff.getId());
	}
}
