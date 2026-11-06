package com.side.forge.organization.communication.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.academic.session.service.AcademicSessionService;
import com.side.forge.organization.communication.dto.AnnouncementDtos.*;
import com.side.forge.organization.communication.entity.*;
import com.side.forge.organization.communication.repository.*;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.Staff;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;
import com.side.forge.organization.student.enrollment.entity.StudentEnrollment;
import com.side.forge.organization.student.enrollment.repository.StudentEnrollmentRepository;
import com.side.forge.organization.student.guardian.entity.Guardian;
import com.side.forge.organization.student.guardian.entity.StudentGuardian;
import com.side.forge.organization.student.guardian.repository.GuardianRepository;
import com.side.forge.organization.student.guardian.repository.StudentGuardianRepository;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.teacher.entity.TeacherProfile;
import com.side.forge.organization.teacher.repository.TeacherClassAssignmentRepository;
import com.side.forge.organization.teacher.repository.TeacherProfileRepository;
import com.side.forge.organization.teacher.repository.TeacherSubjectAssignmentRepository;
import com.side.forge.storage.dto.StorageDtos.DownloadedFilePayload;
import com.side.forge.storage.dto.StorageDtos.StoredFileResponse;
import com.side.forge.storage.entity.FileResourceCategory;
import com.side.forge.storage.service.FileManagementService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

	public static final String RESOURCE_ANNOUNCEMENT_ATTACHMENT = "ANNOUNCEMENT_ATTACHMENT";

	private final AnnouncementRepository announcementRepository;
	private final AnnouncementTargetClassRepository targetClassRepository;
	private final AnnouncementTargetStudentRepository targetStudentRepository;
	private final AcademicTenantAccessValidator validator;
	private final CurrentUserContext currentUser;
	private final AcademicSessionService sessionService;
	private final AcademicSessionRepository sessionRepository;
	private final SchoolClassRepository classRepository;
	private final StudentRepository studentRepository;
	private final StudentEnrollmentRepository enrollmentRepository;
	private final GuardianRepository guardianRepository;
	private final StudentGuardianRepository studentGuardianRepository;
	private final StaffRepository staffRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final TeacherClassAssignmentRepository teacherClassAssignmentRepository;
	private final TeacherSubjectAssignmentRepository teacherSubjectAssignmentRepository;
	private final FileManagementService fileManagementService;
	private final NotificationService notificationService;

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@Transactional
	public AnnouncementResponse createAnnouncement(Long orgId, CreateAnnouncementRequest request) {
		Organization org = validator.requireOrganization(orgId);
		if (request.academicSessionId() != null) {
			sessionService.requireSession(orgId, request.academicSessionId());
		}

		Set<Long> classIds = normalizeIds(request.targetClassIds());
		Set<Long> studentIds = normalizeIds(request.targetStudentIds());
		validateAndAuthorizeAudienceTargets(
				orgId, request.academicSessionId(), request.targetAudience(), classIds, studentIds);

		boolean publishNow = Boolean.TRUE.equals(request.publishImmediately());
		LocalDate pubDate = request.publicationDate() != null
				? request.publicationDate()
				: (publishNow ? LocalDate.now(validator.resolveZoneId(org)) : null);
		validateDates(pubDate, request.expiryDate());

		Announcement ann = new Announcement();
		ann.setOrganizationId(orgId);
		ann.setAcademicSessionId(request.academicSessionId());
		ann.setTitle(validator.normalizeRequiredText(request.title(), "Announcement title"));
		ann.setDescription(validator.normalizeRequiredText(request.description(), "Announcement description"));
		ann.setTargetAudience(request.targetAudience());
		ann.setImportant(Boolean.TRUE.equals(request.important()));
		ann.setPublicationDate(pubDate);
		ann.setExpiryDate(request.expiryDate());
		ann.setCreatedBy(currentUser.getUserId());

		if (publishNow) {
			ann.setStatus(AnnouncementStatus.PUBLISHED);
			ann.setPublishedAt(Instant.now());
			ann.setPublishedBy(currentUser.getUserId());
		} else {
			ann.setStatus(AnnouncementStatus.DRAFT);
		}

		Announcement saved = announcementRepository.saveAndFlush(ann);
		saveTargetMappings(orgId, saved.getId(), saved.getTargetAudience(), classIds, studentIds);

		if (request.attachmentFileIds() != null) {
			for (Long fileId : normalizeIds(request.attachmentFileIds())) {
				fileManagementService.attachReference(
						orgId, fileId, RESOURCE_ANNOUNCEMENT_ATTACHMENT, saved.getId());
			}
		}

		if (saved.getStatus() == AnnouncementStatus.PUBLISHED) {
			notificationService.notifyAnnouncementPublished(saved, classIds, studentIds);
		}

		return toResponse(orgId, saved, classIds, studentIds);
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@Transactional
	public AnnouncementResponse updateAnnouncement(
			Long orgId, Long announcementId, UpdateAnnouncementRequest request) {
		validator.requireOrganization(orgId);
		Announcement ann = announcementRepository.findByIdAndOrganizationIdForUpdate(announcementId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Announcement not found"));
		verifyCanManageExistingAnnouncement(ann);

		if (request.academicSessionId() != null) {
			sessionService.requireSession(orgId, request.academicSessionId());
		}

		Set<Long> classIds = normalizeIds(request.targetClassIds());
		Set<Long> studentIds = normalizeIds(request.targetStudentIds());
		validateAndAuthorizeAudienceTargets(
				orgId, request.academicSessionId(), request.targetAudience(), classIds, studentIds);

		LocalDate pubDate = request.publicationDate() != null
				? request.publicationDate()
				: ann.getPublicationDate();
		validateDates(pubDate, request.expiryDate());

		ann.setAcademicSessionId(request.academicSessionId());
		ann.setTitle(validator.normalizeRequiredText(request.title(), "Announcement title"));
		ann.setDescription(validator.normalizeRequiredText(request.description(), "Announcement description"));
		ann.setTargetAudience(request.targetAudience());
		if (request.important() != null) {
			ann.setImportant(request.important());
		}
		ann.setPublicationDate(pubDate);
		ann.setExpiryDate(request.expiryDate());

		Announcement saved = announcementRepository.saveAndFlush(ann);
		targetClassRepository.deleteAllByOrganizationIdAndAnnouncementId(orgId, saved.getId());
		targetStudentRepository.deleteAllByOrganizationIdAndAnnouncementId(orgId, saved.getId());
		targetClassRepository.flush();
		targetStudentRepository.flush();
		saveTargetMappings(orgId, saved.getId(), saved.getTargetAudience(), classIds, studentIds);

		if (request.attachmentFileIds() != null) {
			for (Long fileId : normalizeIds(request.attachmentFileIds())) {
				fileManagementService.attachReference(
						orgId, fileId, RESOURCE_ANNOUNCEMENT_ATTACHMENT, saved.getId());
			}
		}

		return toResponse(orgId, saved, classIds, studentIds);
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@Transactional
	public AnnouncementResponse publishAnnouncement(Long orgId, Long announcementId, LocalDate publicationDate) {
		Organization org = validator.requireOrganization(orgId);
		Announcement ann = announcementRepository.findByIdAndOrganizationIdForUpdate(announcementId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Announcement not found"));
		verifyCanManageExistingAnnouncement(ann);

		if (ann.getStatus() == AnnouncementStatus.PUBLISHED) {
			throw new IllegalStateException("Announcement is already published");
		}

		Set<Long> classIds = loadTargetClassIds(orgId, ann.getId());
		Set<Long> studentIds = loadTargetStudentIds(orgId, ann.getId());
		validateAndAuthorizeAudienceTargets(
				orgId, ann.getAcademicSessionId(), ann.getTargetAudience(), classIds, studentIds);

		LocalDate pubDate = publicationDate != null
				? publicationDate
				: (ann.getPublicationDate() != null
						? ann.getPublicationDate()
						: LocalDate.now(validator.resolveZoneId(org)));
		validateDates(pubDate, ann.getExpiryDate());

		ann.setPublicationDate(pubDate);
		ann.setStatus(AnnouncementStatus.PUBLISHED);
		ann.setPublishedAt(Instant.now());
		ann.setPublishedBy(currentUser.getUserId());
		Announcement saved = announcementRepository.saveAndFlush(ann);

		notificationService.notifyAnnouncementPublished(saved, classIds, studentIds);
		return toResponse(orgId, saved, classIds, studentIds);
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@Transactional
	public void deleteAnnouncement(Long orgId, Long announcementId) {
		validator.requireOrganization(orgId);
		Announcement ann = announcementRepository.findByIdAndOrganizationIdForUpdate(announcementId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Announcement not found"));
		verifyCanManageExistingAnnouncement(ann);

		targetClassRepository.deleteAllByOrganizationIdAndAnnouncementId(orgId, ann.getId());
		targetStudentRepository.deleteAllByOrganizationIdAndAnnouncementId(orgId, ann.getId());
		fileManagementService.detachAllReferencesForResource(
				orgId, RESOURCE_ANNOUNCEMENT_ATTACHMENT, ann.getId());
		announcementRepository.delete(ann);
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@Transactional(readOnly = true)
	public List<AnnouncementResponse> getVisibleAnnouncements(
			Long orgId, LocalDate referenceDate, Boolean importantOnly) {
		Organization org = validator.requireOrganization(orgId);
		LocalDate refDate = referenceDate != null ? referenceDate : LocalDate.now(validator.resolveZoneId(org));

		List<Announcement> published = announcementRepository
				.findAllByOrganizationIdAndStatusOrderByImportantDescPublicationDateDescIdDesc(
						orgId, AnnouncementStatus.PUBLISHED);
		if (published.isEmpty()) {
			return List.of();
		}

		List<Long> annIds = published.stream().map(Announcement::getId).toList();
		Map<Long, Set<Long>> classesByAnn = targetClassRepository
				.findAllByOrganizationIdAndAnnouncementIdInOrderByClassIdAsc(orgId, annIds).stream()
				.collect(Collectors.groupingBy(
						AnnouncementTargetClass::getAnnouncementId,
						Collectors.mapping(AnnouncementTargetClass::getClassId, Collectors.toCollection(LinkedHashSet::new))));
		Map<Long, Set<Long>> studentsByAnn = targetStudentRepository
				.findAllByOrganizationIdAndAnnouncementIdInOrderByStudentIdAsc(orgId, annIds).stream()
				.collect(Collectors.groupingBy(
						AnnouncementTargetStudent::getAnnouncementId,
						Collectors.mapping(AnnouncementTargetStudent::getStudentId, Collectors.toCollection(LinkedHashSet::new))));

		List<AnnouncementResponse> visible = new ArrayList<>();
		for (Announcement ann : published) {
			if (Boolean.TRUE.equals(importantOnly) && !ann.isImportant()) {
				continue;
			}
			if (ann.getPublicationDate() != null && ann.getPublicationDate().isAfter(refDate)) {
				continue;
			}
			if (ann.getExpiryDate() != null && ann.getExpiryDate().isBefore(refDate)) {
				continue;
			}
			Set<Long> cIds = classesByAnn.getOrDefault(ann.getId(), Set.of());
			Set<Long> sIds = studentsByAnn.getOrDefault(ann.getId(), Set.of());
			if (isCurrentUserInAudience(orgId, ann, cIds, sIds)) {
				visible.add(toResponse(orgId, ann, cIds, sIds));
			}
		}
		return visible;
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@Transactional(readOnly = true)
	public List<AnnouncementResponse> getManageableAnnouncements(Long orgId, AnnouncementStatus statusFilter) {
		validator.requireOrganization(orgId);
		boolean adminOrPrincipal = isSchoolAdminOrPrincipal();
		List<Announcement> all = announcementRepository.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(orgId);

		return all.stream()
				.filter(a -> adminOrPrincipal || a.getCreatedBy().equals(currentUser.getUserId()))
				.filter(a -> statusFilter == null || a.getStatus() == statusFilter)
				.map(a -> toResponse(
						orgId, a,
						loadTargetClassIds(orgId, a.getId()),
						loadTargetStudentIds(orgId, a.getId())))
				.toList();
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@Transactional(readOnly = true)
	public AnnouncementResponse getAnnouncementById(Long orgId, Long announcementId) {
		validator.requireOrganization(orgId);
		Announcement ann = announcementRepository.findByIdAndOrganizationId(announcementId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Announcement not found"));
		Set<Long> classIds = loadTargetClassIds(orgId, ann.getId());
		Set<Long> studentIds = loadTargetStudentIds(orgId, ann.getId());

		if (ann.getStatus() == AnnouncementStatus.DRAFT) {
			if (!isSchoolAdminOrPrincipal() && !ann.getCreatedBy().equals(currentUser.getUserId())) {
				throw new AccessDeniedException("Only the creator or school administrators can view draft announcements");
			}
		} else if (!isCurrentUserInAudience(orgId, ann, classIds, studentIds)) {
			throw new AccessDeniedException("You are not in the target audience for this announcement");
		}
		return toResponse(orgId, ann, classIds, studentIds);
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@Transactional
	public StoredFileResponse uploadAttachment(Long orgId, Long announcementId, MultipartFile file) {
		validator.requireOrganization(orgId);
		Announcement ann = announcementRepository.findByIdAndOrganizationIdForUpdate(announcementId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Announcement not found"));
		verifyCanManageExistingAnnouncement(ann);
		return fileManagementService.storeOrganizationFile(
				orgId, FileResourceCategory.NOTICE_ATTACHMENT, file,
				RESOURCE_ANNOUNCEMENT_ATTACHMENT, ann.getId());
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@Transactional
	public StoredFileResponse linkExistingAttachment(Long orgId, Long announcementId, Long fileId) {
		validator.requireOrganization(orgId);
		Announcement ann = announcementRepository.findByIdAndOrganizationIdForUpdate(announcementId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Announcement not found"));
		verifyCanManageExistingAnnouncement(ann);
		fileManagementService.attachReference(orgId, fileId, RESOURCE_ANNOUNCEMENT_ATTACHMENT, ann.getId());
		return fileManagementService.getOrganizationFileMetadata(orgId, fileId);
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@Transactional(readOnly = true)
	public List<StoredFileResponse> getAttachments(Long orgId, Long announcementId) {
		getAnnouncementById(orgId, announcementId);
		return fileManagementService.getFilesForResource(
				orgId, RESOURCE_ANNOUNCEMENT_ATTACHMENT, announcementId);
	}

	@RequirePermission(PermissionCode.COMMUNICATION_VIEW)
	@Transactional(readOnly = true)
	public DownloadedFilePayload downloadAttachment(Long orgId, Long announcementId, Long fileId) {
		getAnnouncementById(orgId, announcementId);
		return fileManagementService.downloadOrganizationFileForAuthorizedResource(
				orgId, fileId, RESOURCE_ANNOUNCEMENT_ATTACHMENT, announcementId);
	}

	@RequirePermission(PermissionCode.COMMUNICATION_MANAGE)
	@Transactional
	public void deleteAttachment(Long orgId, Long announcementId, Long fileId) {
		validator.requireOrganization(orgId);
		Announcement ann = announcementRepository.findByIdAndOrganizationIdForUpdate(announcementId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Announcement not found"));
		verifyCanManageExistingAnnouncement(ann);
		fileManagementService.detachReference(fileId, RESOURCE_ANNOUNCEMENT_ATTACHMENT, ann.getId());
	}

	private void validateAndAuthorizeAudienceTargets(
			Long orgId, Long academicSessionId, AnnouncementAudience audience,
			Set<Long> classIds, Set<Long> studentIds) {
		if (audience == null) {
			throw new IllegalArgumentException("Target audience is required");
		}
		if (audience == AnnouncementAudience.SPECIFIC_CLASSES) {
			if (classIds.isEmpty()) {
				throw new IllegalArgumentException("targetClassIds must not be empty for SPECIFIC_CLASSES audience");
			}
			for (Long classId : classIds) {
				if (classRepository.findByIdAndOrganizationId(classId, orgId).isEmpty()) {
					throw new EntityNotFoundException("Target class not found in organization: " + classId);
				}
			}
		} else if (!classIds.isEmpty()) {
			throw new IllegalArgumentException("targetClassIds can only be specified for SPECIFIC_CLASSES audience");
		}

		if (audience == AnnouncementAudience.SPECIFIC_STUDENTS) {
			if (studentIds.isEmpty()) {
				throw new IllegalArgumentException("targetStudentIds must not be empty for SPECIFIC_STUDENTS audience");
			}
			for (Long studentId : studentIds) {
				if (studentRepository.findByIdAndOrganizationId(studentId, orgId).isEmpty()) {
					throw new EntityNotFoundException("Target student not found in organization: " + studentId);
				}
			}
		} else if (!studentIds.isEmpty()) {
			throw new IllegalArgumentException("targetStudentIds can only be specified for SPECIFIC_STUDENTS audience");
		}

		if (isSchoolAdminOrPrincipal()) {
			return;
		}

		Optional<TeacherProfile> ownTeacher = resolveCurrentTeacherOptional(orgId);
		if (ownTeacher.isEmpty()) {
			throw new AccessDeniedException("Only authorized administrators or teachers can create or publish announcements");
		}
		if (audience != AnnouncementAudience.SPECIFIC_CLASSES
				&& audience != AnnouncementAudience.SPECIFIC_STUDENTS) {
			throw new AccessDeniedException(
					"Teachers can only target SPECIFIC_CLASSES or SPECIFIC_STUDENTS for their assigned classes");
		}

		Set<Long> teacherAssignedClassIds = resolveTeacherAssignedClassIds(
				orgId, academicSessionId, ownTeacher.get().getId());
		if (audience == AnnouncementAudience.SPECIFIC_CLASSES) {
			if (!teacherAssignedClassIds.containsAll(classIds)) {
				throw new AccessDeniedException(
						"Teachers can only target classes they are assigned to teach");
			}
		} else {
			Long sessionId = resolveSessionIdOptional(orgId, academicSessionId);
			if (sessionId == null) {
				throw new AccessDeniedException("Active academic session is required to verify student class assignment");
			}
			for (Long studentId : studentIds) {
				Optional<StudentEnrollment> enr = enrollmentRepository
						.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, sessionId, studentId);
				if (enr.isEmpty() || enr.get().getStatus() != EnrollmentStatus.ACTIVE
						|| !teacherAssignedClassIds.contains(enr.get().getClassId())) {
					throw new AccessDeniedException(
							"Teachers can only target students enrolled in classes they are assigned to teach");
				}
			}
		}
	}

	private boolean isCurrentUserInAudience(
			Long orgId, Announcement ann, Set<Long> targetClassIds, Set<Long> targetStudentIds) {
		if (isSchoolAdminOrPrincipal() || ann.getCreatedBy().equals(currentUser.getUserId())) {
			return true;
		}
		Long userId = currentUser.getUserId();
		if (userId == null) {
			return false;
		}
		return switch (ann.getTargetAudience()) {
			case ALL -> true;
			case TEACHERS -> currentUser.hasRole("TEACHER")
					|| resolveCurrentTeacherOptional(orgId).isPresent();
			case STAFF -> currentUser.hasRole("SCHOOL_STAFF")
					|| currentUser.hasRole("ACCOUNTANT")
					|| currentUser.hasRole("RECEPTIONIST")
					|| currentUser.hasRole("TEACHER")
					|| staffRepository.findByOrganizationIdAndUserId(orgId, userId).isPresent();
			case STUDENTS -> currentUser.hasRole("STUDENT")
					|| studentRepository.findByOrganizationIdAndUserId(orgId, userId).isPresent();
			case PARENTS -> currentUser.hasRole("PARENT")
					|| guardianRepository.findByOrganizationIdAndUserId(orgId, userId).isPresent();
			case SPECIFIC_CLASSES -> isUserAssociatedWithAnyClass(orgId, ann.getAcademicSessionId(), userId, targetClassIds);
			case SPECIFIC_STUDENTS -> isUserAssociatedWithAnyStudent(orgId, ann.getAcademicSessionId(), userId, targetStudentIds);
		};
	}

	private boolean isUserAssociatedWithAnyClass(
			Long orgId, Long academicSessionId, Long userId, Set<Long> targetClassIds) {
		if (targetClassIds == null || targetClassIds.isEmpty()) {
			return false;
		}
		Long sessionId = resolveSessionIdOptional(orgId, academicSessionId);
		Optional<Student> ownStudent = studentRepository.findByOrganizationIdAndUserId(orgId, userId);
		if (ownStudent.isPresent() && sessionId != null) {
			Optional<StudentEnrollment> enr = enrollmentRepository
					.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, sessionId, ownStudent.get().getId());
			if (enr.isPresent() && enr.get().getStatus() == EnrollmentStatus.ACTIVE
					&& targetClassIds.contains(enr.get().getClassId())) {
				return true;
			}
		}

		Optional<Guardian> ownGuardian = guardianRepository.findByOrganizationIdAndUserId(orgId, userId);
		if (ownGuardian.isPresent() && sessionId != null) {
			List<StudentGuardian> children = studentGuardianRepository
					.findAllByOrganizationIdAndGuardianIdOrderByIdAsc(orgId, ownGuardian.get().getId());
			for (StudentGuardian sg : children) {
				Optional<StudentEnrollment> enr = enrollmentRepository
						.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, sessionId, sg.getStudentId());
				if (enr.isPresent() && enr.get().getStatus() == EnrollmentStatus.ACTIVE
						&& targetClassIds.contains(enr.get().getClassId())) {
					return true;
				}
			}
		}

		Optional<TeacherProfile> ownTeacher = resolveCurrentTeacherOptional(orgId);
		if (ownTeacher.isPresent()) {
			Set<Long> teacherClassIds = resolveTeacherAssignedClassIds(orgId, academicSessionId, ownTeacher.get().getId());
			for (Long cId : targetClassIds) {
				if (teacherClassIds.contains(cId)) {
					return true;
				}
			}
		}
		return false;
	}

	private boolean isUserAssociatedWithAnyStudent(
			Long orgId, Long academicSessionId, Long userId, Set<Long> targetStudentIds) {
		if (targetStudentIds == null || targetStudentIds.isEmpty()) {
			return false;
		}
		Optional<Student> ownStudent = studentRepository.findByOrganizationIdAndUserId(orgId, userId);
		if (ownStudent.isPresent() && targetStudentIds.contains(ownStudent.get().getId())) {
			return true;
		}

		Optional<Guardian> ownGuardian = guardianRepository.findByOrganizationIdAndUserId(orgId, userId);
		if (ownGuardian.isPresent()) {
			List<StudentGuardian> children = studentGuardianRepository
					.findAllByOrganizationIdAndGuardianIdOrderByIdAsc(orgId, ownGuardian.get().getId());
			for (StudentGuardian sg : children) {
				if (targetStudentIds.contains(sg.getStudentId())) {
					return true;
				}
			}
		}

		Optional<TeacherProfile> ownTeacher = resolveCurrentTeacherOptional(orgId);
		Long sessionId = resolveSessionIdOptional(orgId, academicSessionId);
		if (ownTeacher.isPresent() && sessionId != null) {
			Set<Long> teacherClassIds = resolveTeacherAssignedClassIds(orgId, sessionId, ownTeacher.get().getId());
			for (Long sId : targetStudentIds) {
				Optional<StudentEnrollment> enr = enrollmentRepository
						.findByOrganizationIdAndAcademicSessionIdAndStudentId(orgId, sessionId, sId);
				if (enr.isPresent() && enr.get().getStatus() == EnrollmentStatus.ACTIVE
						&& teacherClassIds.contains(enr.get().getClassId())) {
					return true;
				}
			}
		}
		return false;
	}

	private void verifyCanManageExistingAnnouncement(Announcement ann) {
		if (isSchoolAdminOrPrincipal()) {
			return;
		}
		if (!ann.getCreatedBy().equals(currentUser.getUserId())) {
			throw new AccessDeniedException("You can only modify or delete announcements you created");
		}
	}

	private boolean isSchoolAdminOrPrincipal() {
		return currentUser.hasRole("SCHOOL_ADMIN")
				|| currentUser.hasRole("PRINCIPAL")
				|| currentUser.hasPermission(PermissionCode.SCHOOL_UPDATE.getValue())
				|| currentUser.hasPermission(PermissionCode.CLASS_MANAGE.getValue());
	}

	private Optional<TeacherProfile> resolveCurrentTeacherOptional(Long orgId) {
		if (currentUser.getUserId() == null) {
			return Optional.empty();
		}
		return staffRepository.findByOrganizationIdAndUserId(orgId, currentUser.getUserId())
				.filter(s -> s.getEmploymentStatus() == EmploymentStatus.ACTIVE)
				.flatMap(s -> teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, s.getId()));
	}

	private Set<Long> resolveTeacherAssignedClassIds(Long orgId, Long academicSessionId, Long teacherId) {
		Long sessionId = resolveSessionIdOptional(orgId, academicSessionId);
		if (sessionId == null) {
			return Set.of();
		}
		Set<Long> classIds = new LinkedHashSet<>();
		teacherClassAssignmentRepository
				.findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdOrderByClassIdAsc(orgId, teacherId, sessionId)
				.forEach(a -> classIds.add(a.getClassId()));
		teacherSubjectAssignmentRepository
				.findAllByOrganizationIdAndTeacherIdAndAcademicSessionIdOrderByClassIdAscSubjectIdAsc(orgId, teacherId, sessionId)
				.forEach(a -> classIds.add(a.getClassId()));
		return classIds;
	}

	private Long resolveSessionIdOptional(Long orgId, Long academicSessionId) {
		if (academicSessionId != null) {
			return academicSessionId;
		}
		List<AcademicSession> active = sessionRepository
				.findAllByOrganizationIdAndStatusOrderByCreatedAtDescIdDesc(orgId, AcademicSessionStatus.ACTIVE);
		if (!active.isEmpty()) {
			return active.getFirst().getId();
		}
		List<AcademicSession> all = sessionRepository.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(orgId);
		return all.isEmpty() ? null : all.getFirst().getId();
	}

	private void saveTargetMappings(
			Long orgId, Long announcementId, AnnouncementAudience audience,
			Set<Long> classIds, Set<Long> studentIds) {
		if (audience == AnnouncementAudience.SPECIFIC_CLASSES) {
			for (Long cId : classIds) {
				AnnouncementTargetClass tc = new AnnouncementTargetClass();
				tc.setOrganizationId(orgId);
				tc.setAnnouncementId(announcementId);
				tc.setClassId(cId);
				targetClassRepository.saveAndFlush(tc);
			}
		} else if (audience == AnnouncementAudience.SPECIFIC_STUDENTS) {
			for (Long sId : studentIds) {
				AnnouncementTargetStudent ts = new AnnouncementTargetStudent();
				ts.setOrganizationId(orgId);
				ts.setAnnouncementId(announcementId);
				ts.setStudentId(sId);
				targetStudentRepository.saveAndFlush(ts);
			}
		}
	}

	private Set<Long> loadTargetClassIds(Long orgId, Long announcementId) {
		return targetClassRepository
				.findAllByOrganizationIdAndAnnouncementIdOrderByClassIdAsc(orgId, announcementId).stream()
				.map(AnnouncementTargetClass::getClassId)
				.collect(Collectors.toCollection(LinkedHashSet::new));
	}

	private Set<Long> loadTargetStudentIds(Long orgId, Long announcementId) {
		return targetStudentRepository
				.findAllByOrganizationIdAndAnnouncementIdOrderByStudentIdAsc(orgId, announcementId).stream()
				.map(AnnouncementTargetStudent::getStudentId)
				.collect(Collectors.toCollection(LinkedHashSet::new));
	}

	private void validateDates(LocalDate publicationDate, LocalDate expiryDate) {
		if (publicationDate != null && expiryDate != null && expiryDate.isBefore(publicationDate)) {
			throw new IllegalArgumentException("Expiry date cannot be earlier than publication date");
		}
	}

	private Set<Long> normalizeIds(List<Long> ids) {
		if (ids == null || ids.isEmpty()) {
			return Set.of();
		}
		return ids.stream().filter(Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
	}

	private AnnouncementResponse toResponse(
			Long orgId, Announcement ann, Set<Long> classIds, Set<Long> studentIds) {
		List<StoredFileResponse> attachments = fileManagementService.getFilesForResource(
				orgId, RESOURCE_ANNOUNCEMENT_ATTACHMENT, ann.getId());
		return new AnnouncementResponse(
				ann.getId(),
				ann.getOrganizationId(),
				ann.getAcademicSessionId(),
				ann.getTitle(),
				ann.getDescription(),
				ann.getStatus(),
				ann.getTargetAudience(),
				List.copyOf(classIds),
				List.copyOf(studentIds),
				ann.isImportant(),
				ann.getPublicationDate(),
				ann.getExpiryDate(),
				ann.getPublishedAt(),
				ann.getPublishedBy(),
				ann.getCreatedBy(),
				attachments,
				ann.getCreatedAt(),
				ann.getUpdatedAt()
		);
	}
}
