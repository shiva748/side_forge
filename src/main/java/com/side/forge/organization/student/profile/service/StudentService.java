package com.side.forge.organization.student.profile.service;

import java.time.LocalDate;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.service.SchoolClassService;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.student.profile.dto.ChangeStudentStatusRequest;
import com.side.forge.organization.student.profile.dto.CreateStudentRequest;
import com.side.forge.organization.student.profile.dto.StudentResponse;
import com.side.forge.organization.student.profile.dto.UpdateStudentRequest;
import com.side.forge.organization.student.profile.entity.Gender;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.entity.StudentStatus;
import com.side.forge.organization.student.profile.mapper.StudentMapper;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.student.profile.repository.StudentSpecifications;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;
import com.side.forge.storage.entity.FileResourceCategory;
import com.side.forge.storage.service.FileManagementService;
import com.side.forge.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StudentService {

	public static final String RESOURCE_STUDENT_PHOTO = "STUDENT_PROFILE_PHOTO";
	public static final String RESOURCE_STUDENT_DOCUMENT = "STUDENT_DOCUMENT";

	private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
			"id", "admissionNumber", "firstName", "lastName", "dateOfBirth", "admissionDate", "status", "createdAt"
	);

	private final StudentRepository studentRepository;
	private final StudentMapper studentMapper;
	private final AcademicTenantAccessValidator validator;
	private final AcademicSessionService sessionService;
	private final SchoolClassService classService;
	private final UserRepository userRepository;
	private final FileManagementService fileManagementService;

	@RequirePermission(PermissionCode.STUDENT_CREATE)
	@Transactional
	public StudentResponse createStudent(Long orgId, CreateStudentRequest request) {
		Organization org = validator.requireOrganization(orgId);
		String admissionNumber = validator.normalizeCode(request.admissionNumber(), "Admission number");
		String firstName = validator.normalizeRequiredText(request.firstName(), "First name");
		validateStudentDates(request.dateOfBirth(), request.admissionDate(), org);
		validateOptionalUserId(request.userId());

		if (studentRepository.existsByOrganizationIdAndAdmissionNumberIgnoreCase(orgId, admissionNumber)) {
			throw new IllegalStateException("Student with this admission number already exists in the organization");
		}

		Student student = studentMapper.toEntity(request);
		student.setOrganizationId(orgId);
		applyNormalizedFields(student, admissionNumber, firstName, request.middleName(), request.lastName(),
				request.email(), request.phoneNumber(), request.address(), request.city(), request.state(),
				request.postalCode(), request.bloodGroup(), request.nationality());
		student.setStatus(StudentStatus.ACTIVE);
		return studentMapper.toResponse(studentRepository.save(student));
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<StudentResponse> getStudents(
			Long orgId, String search, String admissionNumber, StudentStatus status, Gender gender,
			Long academicSessionId, Long classId, int page, int size, String sortBy, String sortDir) {
		validator.requireOrganization(orgId);
		if (academicSessionId != null) {
			sessionService.requireSession(orgId, academicSessionId);
		}
		if (classId != null) {
			classService.requireClass(orgId, classId);
		}

		Pageable pageable = buildPageable(page, size, sortBy, sortDir);
		Specification<Student> spec = StudentSpecifications.withFilters(
				orgId, search, admissionNumber, status, gender, academicSessionId, classId);
		Page<StudentResponse> result = studentRepository.findAll(spec, pageable).map(studentMapper::toResponse);
		return PagedResponse.from(result);
	}

	@RequirePermission(PermissionCode.STUDENT_VIEW)
	@Transactional(readOnly = true)
	public StudentResponse getStudentById(Long orgId, Long studentId) {
		validator.requireOrganization(orgId);
		return studentMapper.toResponse(requireStudent(orgId, studentId));
	}

	@RequirePermission(PermissionCode.STUDENT_UPDATE)
	@Transactional
	public StudentResponse updateStudent(Long orgId, Long studentId, UpdateStudentRequest request) {
		Organization org = validator.requireOrganization(orgId);
		Student student = requireStudent(orgId, studentId);
		String admissionNumber = validator.normalizeCode(request.admissionNumber(), "Admission number");
		String firstName = validator.normalizeRequiredText(request.firstName(), "First name");
		validateStudentDates(request.dateOfBirth(), request.admissionDate(), org);
		validateOptionalUserId(request.userId());

		if (studentRepository.existsByOrganizationIdAndAdmissionNumberIgnoreCaseAndIdNot(
				orgId, admissionNumber, studentId)) {
			throw new IllegalStateException("Student with this admission number already exists in the organization");
		}

		student.setDateOfBirth(request.dateOfBirth());
		student.setGender(request.gender());
		student.setAdmissionDate(request.admissionDate());
		student.setUserId(request.userId());
		applyNormalizedFields(student, admissionNumber, firstName, request.middleName(), request.lastName(),
				request.email(), request.phoneNumber(), request.address(), request.city(), request.state(),
				request.postalCode(), request.bloodGroup(), request.nationality());
		return studentMapper.toResponse(studentRepository.save(student));
	}

	@RequirePermission(PermissionCode.STUDENT_UPDATE)
	@Transactional
	public StudentResponse changeStudentStatus(Long orgId, Long studentId, ChangeStudentStatusRequest request) {
		validator.requireOrganization(orgId);
		Student student = requireStudent(orgId, studentId);
		student.setStatus(request.status());
		return studentMapper.toResponse(studentRepository.save(student));
	}

	@RequirePermission(PermissionCode.STUDENT_UPDATE)
	@Transactional
	public StoredFileResponse uploadStudentPhoto(Long orgId, Long studentId, MultipartFile file) {
		validator.requireOrganization(orgId);
		Student student = requireStudentForUpdate(orgId, studentId);
		fileManagementService.detachAllReferencesForResource(orgId, RESOURCE_STUDENT_PHOTO, student.getId());
		return fileManagementService.storeOrganizationFile(
				orgId, FileResourceCategory.STUDENT_DOCUMENT, file, RESOURCE_STUDENT_PHOTO, student.getId());
	}

	@RequirePermission(PermissionCode.STUDENT_UPDATE)
	@Transactional
	public StoredFileResponse uploadStudentDocument(Long orgId, Long studentId, MultipartFile file) {
		validator.requireOrganization(orgId);
		Student student = requireStudentForUpdate(orgId, studentId);
		return fileManagementService.storeOrganizationFile(
				orgId, FileResourceCategory.STUDENT_DOCUMENT, file, RESOURCE_STUDENT_DOCUMENT, student.getId());
	}

	public Student requireStudent(Long orgId, Long studentId) {
		return studentRepository.findByIdAndOrganizationId(studentId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Student not found"));
	}

	public Student requireStudentForUpdate(Long orgId, Long studentId) {
		return studentRepository.findByIdAndOrganizationIdForUpdate(studentId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Student not found"));
	}

	private void validateStudentDates(LocalDate dob, LocalDate admissionDate, Organization org) {
		LocalDate today = LocalDate.now(validator.resolveZoneId(org));
		if (dob == null || !dob.isBefore(today)) {
			throw new IllegalArgumentException("Date of birth must be in the past");
		}
		if (admissionDate == null) {
			throw new IllegalArgumentException("Admission date is required");
		}
		if (admissionDate.isBefore(dob)) {
			throw new IllegalArgumentException("Admission date cannot be earlier than date of birth");
		}
	}

	private void validateOptionalUserId(Long userId) {
		if (userId != null && !userRepository.existsById(userId)) {
			throw new EntityNotFoundException("Referenced user account not found");
		}
	}

	private void applyNormalizedFields(
			Student s, String admNo, String firstName, String middleName, String lastName,
			String email, String phone, String address, String city, String state,
			String postalCode, String bloodGroup, String nationality) {
		s.setAdmissionNumber(admNo);
		s.setFirstName(firstName);
		s.setMiddleName(validator.normalizeOptionalText(middleName));
		s.setLastName(validator.normalizeOptionalText(lastName));
		s.setEmail(validator.normalizeOptionalText(email));
		s.setPhoneNumber(validator.normalizeOptionalText(phone));
		s.setAddress(validator.normalizeOptionalText(address));
		s.setCity(validator.normalizeOptionalText(city));
		s.setState(validator.normalizeOptionalText(state));
		s.setPostalCode(validator.normalizeOptionalText(postalCode));
		s.setBloodGroup(validator.normalizeOptionalText(bloodGroup));
		s.setNationality(validator.normalizeOptionalText(nationality));
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
}
