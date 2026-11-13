package com.side.forge.notification.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.entity.MembershipStatus;
import com.side.forge.authorization.repository.AuthorizationQueryRepository;
import com.side.forge.authorization.repository.OrganizationMembershipRepository;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.invitation.entity.OrganizationInvitation;
import com.side.forge.notification.dto.NotificationDtos.CategoryPreferenceItem;
import com.side.forge.notification.dto.NotificationDtos.CategoryPreferenceState;
import com.side.forge.notification.dto.NotificationDtos.CreateNotificationCommand;
import com.side.forge.notification.dto.NotificationDtos.MarkAllReadResponse;
import com.side.forge.notification.dto.NotificationDtos.NotificationPreferenceResponse;
import com.side.forge.notification.dto.NotificationDtos.NotificationResponse;
import com.side.forge.notification.dto.NotificationDtos.UnreadNotificationCountResponse;
import com.side.forge.notification.dto.NotificationDtos.UpdateNotificationPreferencesRequest;
import com.side.forge.notification.entity.InAppNotification;
import com.side.forge.notification.entity.NotificationCategory;
import com.side.forge.notification.entity.NotificationDeliveryChannel;
import com.side.forge.notification.entity.NotificationType;
import com.side.forge.notification.entity.UserNotificationPreference;
import com.side.forge.notification.repository.InAppNotificationRepository;
import com.side.forge.notification.repository.UserNotificationPreferenceRepository;
import com.side.forge.notification.spi.NotificationDeliveryGateway;
import com.side.forge.notification.spi.NotificationDeliveryGateway.NotificationDispatchEvent;
import com.side.forge.notification.websocket.RealtimeNotificationPresenceRegistry;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.attendance.entity.StudentAttendance;
import com.side.forge.organization.attendance.entity.StudentAttendanceStatus;
import com.side.forge.organization.communication.entity.Announcement;
import com.side.forge.organization.communication.entity.AnnouncementAudience;
import com.side.forge.organization.examination.entity.ExamSchedule;
import com.side.forge.organization.examination.entity.Examination;
import com.side.forge.organization.fees.entity.FeePayment;
import com.side.forge.organization.fees.entity.StudentFeeDemand;
import com.side.forge.organization.homework.entity.HomeworkAssignment;
import com.side.forge.organization.homework.entity.StudentHomeworkSubmission;
import com.side.forge.organization.reporting.entity.SchoolNotice;
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
import com.side.forge.organization.student.profile.entity.StudentStatus;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.teacher.repository.TeacherProfileRepository;
import com.side.forge.organization.timetable.entity.ClassTimetable;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

	private static final Long GLOBAL_ORG_PREFERENCE_ID = 0L;

	private final InAppNotificationRepository notificationRepository;
	private final UserNotificationPreferenceRepository preferenceRepository;
	private final OrganizationMembershipRepository membershipRepository;
	private final AuthorizationQueryRepository authorizationQueryRepository;
	private final AcademicTenantAccessValidator validator;
	private final AcademicSessionRepository sessionRepository;
	private final StudentRepository studentRepository;
	private final StudentEnrollmentRepository enrollmentRepository;
	private final StudentGuardianRepository studentGuardianRepository;
	private final GuardianRepository guardianRepository;
	private final StaffRepository staffRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final UserRepository userRepository;
	private final List<NotificationDeliveryGateway> deliveryGateways;
	private final RealtimeNotificationPresenceRegistry presenceRegistry;

	@Transactional(readOnly = true)
	public PagedResponse<NotificationResponse> getUserNotifications(
			Long userId, Long orgId, NotificationCategory category,
			NotificationType type, Boolean unreadOnly, int page, int size) {
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		if (orgId != null) {
			validator.requireOrganization(orgId);
		}
		if (page < 0) {
			throw new IllegalArgumentException("Page index must not be negative");
		}
		if (size <= 0 || size > 100) {
			throw new IllegalArgumentException("Page size must be between 1 and 100");
		}

		Pageable pageable = PageRequest.of(
				page, size, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));

		Specification<InAppNotification> spec = (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(cb.equal(root.get("recipientUserId"), userId));
			if (orgId != null) {
				predicates.add(cb.equal(root.get("organizationId"), orgId));
			}
			if (category != null) {
				predicates.add(cb.equal(root.get("category"), category));
			}
			if (type != null) {
				predicates.add(cb.equal(root.get("type"), type));
			}
			if (Boolean.TRUE.equals(unreadOnly)) {
				predicates.add(cb.isFalse(root.get("read")));
			}
			return cb.and(predicates.toArray(new Predicate[0]));
		};

		Page<InAppNotification> rawPage = notificationRepository.findAll(spec, pageable);
		List<NotificationResponse> items = rawPage.getContent().stream()
				.map(this::toResponse)
				.toList();
		return new PagedResponse<>(
				items, rawPage.getNumber(), rawPage.getSize(),
				rawPage.getTotalElements(), rawPage.getTotalPages(),
				rawPage.isFirst(), rawPage.isLast());
	}

	@Transactional(readOnly = true)
	public UnreadNotificationCountResponse getUnreadCount(Long userId, Long orgId) {
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		if (orgId != null) {
			validator.requireOrganization(orgId);
			long count = notificationRepository.countByRecipientUserIdAndOrganizationIdAndReadFalse(userId, orgId);
			return new UnreadNotificationCountResponse(orgId, count);
		}
		long count = notificationRepository.countByRecipientUserIdAndReadFalse(userId);
		return new UnreadNotificationCountResponse(null, count);
	}

	@Transactional
	public NotificationResponse markAsRead(Long userId, Long orgId, Long notificationId) {
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		InAppNotification notif;
		if (orgId != null) {
			validator.requireOrganization(orgId);
			notif = notificationRepository.findByIdAndOrganizationIdAndRecipientUserId(notificationId, orgId, userId)
					.orElseThrow(() -> new EntityNotFoundException("Notification not found"));
		} else {
			notif = notificationRepository.findByIdAndRecipientUserId(notificationId, userId)
					.orElseThrow(() -> new EntityNotFoundException("Notification not found"));
		}
		if (!notif.isRead()) {
			notif.setRead(true);
			notif.setReadAt(Instant.now());
			notif = notificationRepository.saveAndFlush(notif);
			broadcastUnreadCountIfConnected(userId, notif.getOrganizationId());
		}
		return toResponse(notif);
	}

	@Transactional
	public MarkAllReadResponse markAllAsRead(Long userId, Long orgId) {
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		List<InAppNotification> unread;
		if (orgId != null) {
			validator.requireOrganization(orgId);
			unread = notificationRepository.findAllByRecipientUserIdAndOrganizationIdAndReadFalseOrderByIdAsc(
					userId, orgId);
		} else {
			unread = notificationRepository.findAllByRecipientUserIdAndReadFalseOrderByIdAsc(userId);
		}
		Instant now = Instant.now();
		for (InAppNotification n : unread) {
			n.setRead(true);
			n.setReadAt(now);
		}
		if (!unread.isEmpty()) {
			notificationRepository.saveAllAndFlush(unread);
			broadcastUnreadCountIfConnected(userId, orgId);
		}
		return new MarkAllReadResponse(orgId, unread.size());
	}

	private void broadcastUnreadCountIfConnected(Long userId, Long orgId) {
		if (presenceRegistry == null || userId == null) {
			return;
		}
		long remaining = orgId != null
				? notificationRepository.countByRecipientUserIdAndOrganizationIdAndReadFalse(userId, orgId)
				: notificationRepository.countByRecipientUserIdAndReadFalse(userId);
		presenceRegistry.broadcastUnreadCountToUser(userId, orgId, remaining);
	}

	@Transactional(readOnly = true)
	public NotificationPreferenceResponse getUserPreferences(Long userId, Long orgId) {
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		if (orgId != null) {
			validator.requireOrganization(orgId);
		}
		Long effOrgId = orgId != null ? orgId : GLOBAL_ORG_PREFERENCE_ID;
		Map<NotificationCategory, UserNotificationPreference> orgPrefs = preferenceRepository
				.findAllByUserIdAndOrganizationIdOrderByCategoryAsc(userId, effOrgId).stream()
				.collect(Collectors.toMap(UserNotificationPreference::getCategory, p -> p));
		Map<NotificationCategory, UserNotificationPreference> globalPrefs = effOrgId.equals(GLOBAL_ORG_PREFERENCE_ID)
				? orgPrefs
				: preferenceRepository
						.findAllByUserIdAndOrganizationIdOrderByCategoryAsc(userId, GLOBAL_ORG_PREFERENCE_ID).stream()
						.collect(Collectors.toMap(UserNotificationPreference::getCategory, p -> p));

		List<CategoryPreferenceState> states = new ArrayList<>();
		for (NotificationCategory cat : NotificationCategory.values()) {
			UserNotificationPreference pref = orgPrefs.getOrDefault(cat, globalPrefs.get(cat));
			if (pref != null) {
				states.add(new CategoryPreferenceState(
						cat, pref.isInAppEnabled(), parseChannels(pref.getEnabledChannels()), pref.getUpdatedAt()));
			} else {
				states.add(new CategoryPreferenceState(
						cat, true, Set.of(NotificationDeliveryChannel.IN_APP, NotificationDeliveryChannel.PUSH), null));
			}
		}
		return new NotificationPreferenceResponse(userId, orgId, states);
	}

	@Transactional
	public NotificationPreferenceResponse updateUserPreferences(
			Long userId, Long orgId, UpdateNotificationPreferencesRequest request) {
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		if (orgId != null) {
			validator.requireOrganization(orgId);
		}
		Long effOrgId = orgId != null ? orgId : GLOBAL_ORG_PREFERENCE_ID;

		for (CategoryPreferenceItem item : request.preferences()) {
			UserNotificationPreference pref = preferenceRepository
					.findByUserIdAndOrganizationIdAndCategory(userId, effOrgId, item.category())
					.orElseGet(() -> {
						UserNotificationPreference np = new UserNotificationPreference();
						np.setUserId(userId);
						np.setOrganizationId(effOrgId);
						np.setCategory(item.category());
						return np;
					});
			boolean enabled = Boolean.TRUE.equals(item.enabled());
			pref.setInAppEnabled(enabled);
			Set<NotificationDeliveryChannel> channels = (item.channels() == null || item.channels().isEmpty())
					? (enabled ? Set.of(NotificationDeliveryChannel.IN_APP, NotificationDeliveryChannel.PUSH) : Set.of())
					: item.channels();
			pref.setEnabledChannels(serializeChannels(channels));
			preferenceRepository.saveAndFlush(pref);
		}
		return getUserPreferences(userId, orgId);
	}

	@Transactional
	public void dispatchNotifications(CreateNotificationCommand cmd) {
		if (cmd == null || cmd.organizationId() == null
				|| cmd.recipientUserIds() == null || cmd.recipientUserIds().isEmpty()) {
			return;
		}
		Long orgId = cmd.organizationId();
		for (Long recipientUserId : cmd.recipientUserIds()) {
			if (recipientUserId == null || recipientUserId <= 0) {
				continue;
			}
			try {
				boolean validRecipient = cmd.allowPendingInviteRecipient()
						? userRepository.existsById(recipientUserId)
						: authorizationQueryRepository.hasActiveMembership(recipientUserId, orgId);
				if (!validRecipient) {
					continue;
				}
				if (!isCategoryEnabledForUser(recipientUserId, orgId, cmd.category())) {
					continue;
				}
				String eventKey = cmd.eventKeyPrefix() + ":u:" + recipientUserId;
				if (eventKey.length() > 180) {
					eventKey = eventKey.substring(0, 180);
				}
				if (notificationRepository.existsByRecipientUserIdAndOrganizationIdAndEventKey(
						recipientUserId, orgId, eventKey)) {
					continue;
				}

				InAppNotification notif = new InAppNotification();
				notif.setOrganizationId(orgId);
				notif.setRecipientUserId(recipientUserId);
				notif.setCategory(cmd.category());
				notif.setType(cmd.type());
				notif.setTitle(truncate(cmd.title(), 250));
				notif.setMessage(truncate(cmd.message(), 2000));
				notif.setResourceType(cmd.resourceType());
				notif.setResourceId(cmd.resourceId());
				notif.setNavigationUrl(cmd.navigationUrl());
				notif.setEventKey(eventKey);
				notif.setRead(false);
				InAppNotification saved = notificationRepository.saveAndFlush(notif);

				if (deliveryGateways != null && !deliveryGateways.isEmpty()) {
					Set<NotificationDeliveryChannel> enabledChannels = resolveEnabledChannels(
							recipientUserId, orgId, cmd.category());
					NotificationDispatchEvent dispatchEvent = new NotificationDispatchEvent(
							saved.getId(), orgId, recipientUserId,
							saved.getCategory(), saved.getType(),
							saved.getTitle(), saved.getMessage(),
							saved.getResourceType(), saved.getResourceId(),
							saved.getNavigationUrl(), enabledChannels, saved.getCreatedAt());
					for (NotificationDeliveryGateway gateway : deliveryGateways) {
						if (enabledChannels.contains(gateway.supportedChannel())) {
							gateway.onNotificationPersisted(dispatchEvent);
						}
					}
				}
			} catch (Exception ex) {
				log.warn("Failed to persist notification for user {} in org {}: {}",
						recipientUserId, orgId, ex.getMessage());
			}
		}
	}

	public void notifyInvitationReceived(OrganizationInvitation inv, String orgName) {
		try {
			Optional<Users> userOpt = userRepository.findByEmail(inv.getEmail());
			if (userOpt.isEmpty()) {
				return;
			}
			Long recipientUserId = userOpt.get().getId();
			dispatchNotifications(new CreateNotificationCommand(
					inv.getOrganizationId(),
					Set.of(recipientUserId),
					NotificationCategory.INVITATION,
					NotificationType.INVITATION_RECEIVED,
					"Organization Invitation Received",
					"You have been invited to join " + (orgName != null ? orgName : "the organization")
							+ " as " + inv.getRoleCode() + ".",
					"INVITATION",
					inv.getId(),
					"/api/me/invitations",
					"INV_RECEIVED:" + inv.getId() + ":r:" + inv.getResendCount(),
					true
			));
		} catch (Exception ex) {
			log.warn("Failed to generate invitation received notification: {}", ex.getMessage());
		}
	}

	public void notifyInvitationAccepted(OrganizationInvitation inv, String orgName, Long acceptedUserId) {
		try {
			Set<Long> recipients = new LinkedHashSet<>();
			if (inv.getInvitedByUserId() != null && inv.getInvitedByUserId() > 0) {
				recipients.add(inv.getInvitedByUserId());
			}
			if (acceptedUserId != null) {
				recipients.add(acceptedUserId);
			}
			dispatchNotifications(new CreateNotificationCommand(
					inv.getOrganizationId(),
					recipients,
					NotificationCategory.INVITATION,
					NotificationType.INVITATION_ACCEPTED,
					"Invitation Accepted",
					"Invitation for " + inv.getEmail() + " (" + inv.getRoleCode() + ") in "
							+ (orgName != null ? orgName : "organization") + " has been accepted.",
					"INVITATION",
					inv.getId(),
					"/organizations/" + inv.getOrganizationId() + "/invitations/" + inv.getId(),
					"INV_ACCEPTED:" + inv.getId(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate invitation accepted notification: {}", ex.getMessage());
		}
	}

	public void notifyInvitationRevoked(OrganizationInvitation inv, String orgName) {
		try {
			Optional<Users> userOpt = userRepository.findByEmail(inv.getEmail());
			if (userOpt.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					inv.getOrganizationId(),
					Set.of(userOpt.get().getId()),
					NotificationCategory.INVITATION,
					NotificationType.INVITATION_REVOKED,
					"Invitation Revoked",
					"Your pending invitation to join " + (orgName != null ? orgName : "the organization")
							+ " as " + inv.getRoleCode() + " was revoked.",
					"INVITATION",
					inv.getId(),
					"/api/me/invitations",
					"INV_REVOKED:" + inv.getId(),
					true
			));
		} catch (Exception ex) {
			log.warn("Failed to generate invitation revoked notification: {}", ex.getMessage());
		}
	}

	public void notifyOrganizationRoleChanged(Long orgId, Long targetUserId, String roleCode, boolean assigned) {
		try {
			dispatchNotifications(new CreateNotificationCommand(
					orgId,
					Set.of(targetUserId),
					NotificationCategory.INVITATION,
					assigned ? NotificationType.MEMBERSHIP_ROLE_ASSIGNED : NotificationType.MEMBERSHIP_ROLE_REVOKED,
					assigned ? "Role Assigned" : "Role Revoked",
					assigned
							? "You have been assigned the " + roleCode + " role."
							: "The " + roleCode + " role has been revoked from your membership.",
					"MEMBERSHIP_ROLE",
					targetUserId,
					"/api/me",
					"ROLE_CHANGE:" + (assigned ? "ADD:" : "REV:") + roleCode + ":" + Instant.now().toEpochMilli(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate role change notification: {}", ex.getMessage());
		}
	}

	public void notifyHomeworkAssigned(
			HomeworkAssignment hw, String className, String subjectName, Collection<Long> studentIds) {
		try {
			Set<Long> recipients = resolveStudentsAndGuardiansUserIds(hw.getOrganizationId(), studentIds);
			if (recipients.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					hw.getOrganizationId(),
					recipients,
					NotificationCategory.HOMEWORK,
					NotificationType.HOMEWORK_ASSIGNED,
					"New Homework Assigned: " + hw.getTitle(),
					"New homework \"" + hw.getTitle() + "\" for "
							+ (subjectName != null ? subjectName : "subject")
							+ (className != null ? " (" + className + ")" : "")
							+ " is due on " + hw.getDueDate() + ".",
					"HOMEWORK",
					hw.getId(),
					"/organizations/" + hw.getOrganizationId() + "/homework/" + hw.getId(),
					"HW_ASSIGNED:" + hw.getId(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate homework assigned notification: {}", ex.getMessage());
		}
	}

	public void notifyHomeworkSubmissionReceived(
			HomeworkAssignment hw, StudentHomeworkSubmission sub, String studentName) {
		try {
			Optional<Long> teacherUserId = resolveTeacherUserId(hw.getOrganizationId(), hw.getTeacherId());
			if (teacherUserId.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					hw.getOrganizationId(),
					Set.of(teacherUserId.get()),
					NotificationCategory.HOMEWORK,
					NotificationType.HOMEWORK_SUBMISSION_RECEIVED,
					"Homework Submission Received: " + hw.getTitle(),
					(studentName != null && !studentName.isBlank() ? studentName : "A student")
							+ " submitted work for \"" + hw.getTitle() + "\".",
					"HOMEWORK_SUBMISSION",
					sub.getId(),
					"/organizations/" + hw.getOrganizationId() + "/homework/" + hw.getId() + "/submissions",
					"HW_SUB:" + sub.getId() + ":c:" + sub.getSubmissionCount(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate homework submission notification: {}", ex.getMessage());
		}
	}

	public void notifyHomeworkEvaluated(HomeworkAssignment hw, StudentHomeworkSubmission sub) {
		try {
			Set<Long> recipients = resolveStudentsAndGuardiansUserIds(
					hw.getOrganizationId(), List.of(sub.getStudentId()));
			if (recipients.isEmpty()) {
				return;
			}
			String marksInfo = sub.getMarksAwarded() != null
					? " Marks awarded: " + sub.getMarksAwarded().toPlainString()
							+ (hw.getMaxMarks() != null ? "/" + hw.getMaxMarks().toPlainString() : "") + "."
					: "";
			dispatchNotifications(new CreateNotificationCommand(
					hw.getOrganizationId(),
					recipients,
					NotificationCategory.HOMEWORK,
					NotificationType.HOMEWORK_EVALUATED,
					"Homework Evaluated: " + hw.getTitle(),
					"Your homework submission for \"" + hw.getTitle() + "\" has been evaluated." + marksInfo,
					"HOMEWORK_SUBMISSION",
					sub.getId(),
					"/organizations/" + hw.getOrganizationId() + "/homework/" + hw.getId(),
					"HW_EVAL:" + sub.getId() + ":c:" + sub.getSubmissionCount(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate homework evaluated notification: {}", ex.getMessage());
		}
	}

	public void notifyStudentAttendanceMarked(StudentAttendance record, String className, Student student) {
		try {
			if (record.getStatus() != StudentAttendanceStatus.ABSENT) {
				return;
			}
			Set<Long> recipients = resolveStudentsAndGuardiansUserIds(
					record.getOrganizationId(), List.of(record.getStudentId()));
			if (recipients.isEmpty()) {
				return;
			}
			String stuName = student != null
					? student.getFirstName() + (student.getLastName() != null ? " " + student.getLastName() : "")
					: "Student";
			dispatchNotifications(new CreateNotificationCommand(
					record.getOrganizationId(),
					recipients,
					NotificationCategory.ATTENDANCE,
					NotificationType.STUDENT_MARKED_ABSENT,
					"Attendance Alert: Marked Absent",
					stuName + " was marked ABSENT on " + record.getAttendanceDate()
							+ (className != null ? " in " + className : "") + ".",
					"STUDENT_ATTENDANCE",
					record.getId(),
					"/organizations/" + record.getOrganizationId() + "/students/" + record.getStudentId() + "/attendance",
					"ATT_ABSENT:" + record.getId() + ":" + record.getAttendanceDate(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate student absent notification: {}", ex.getMessage());
		}
	}

	public void notifyStudentAttendanceUpdated(
			StudentAttendance record, String previousStatus, String className, Student student) {
		try {
			Set<Long> recipients = resolveStudentsAndGuardiansUserIds(
					record.getOrganizationId(), List.of(record.getStudentId()));
			if (recipients.isEmpty()) {
				return;
			}
			String stuName = student != null
					? student.getFirstName() + (student.getLastName() != null ? " " + student.getLastName() : "")
					: "Student";
			dispatchNotifications(new CreateNotificationCommand(
					record.getOrganizationId(),
					recipients,
					NotificationCategory.ATTENDANCE,
					record.getStatus() == StudentAttendanceStatus.ABSENT
							? NotificationType.STUDENT_MARKED_ABSENT
							: NotificationType.STUDENT_ATTENDANCE_UPDATED,
					"Attendance Updated",
					"Attendance for " + stuName + " on " + record.getAttendanceDate()
							+ " was updated from " + previousStatus + " to " + record.getStatus() + ".",
					"STUDENT_ATTENDANCE",
					record.getId(),
					"/organizations/" + record.getOrganizationId() + "/students/" + record.getStudentId() + "/attendance",
					"ATT_UPD:" + record.getId() + ":" + previousStatus + "->" + record.getStatus(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate attendance update notification: {}", ex.getMessage());
		}
	}

	public void notifyExamSchedulePublished(Examination exam, ExamSchedule schedule, String subjectName) {
		try {
			Set<Long> recipients = resolveClassStudentAndGuardianUserIds(
					exam.getOrganizationId(), exam.getAcademicSessionId(), exam.getClassId());
			if (recipients.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					exam.getOrganizationId(),
					recipients,
					NotificationCategory.EXAMINATION,
					NotificationType.EXAM_SCHEDULE_PUBLISHED,
					"Exam Schedule Published: " + exam.getName(),
					(subjectName != null ? subjectName : "Subject") + " exam for " + exam.getName()
							+ " is scheduled on " + schedule.getExamDate() + " ("
							+ schedule.getStartTime() + " - " + schedule.getEndTime() + ").",
					"EXAMINATION",
					exam.getId(),
					"/organizations/" + exam.getOrganizationId() + "/examinations/" + exam.getId(),
					"EXAM_SCHED:" + exam.getId() + ":s:" + schedule.getId(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate exam schedule notification: {}", ex.getMessage());
		}
	}

	public void notifyExamResultsPublished(Examination exam, String className) {
		try {
			Set<Long> recipients = resolveClassStudentAndGuardianUserIds(
					exam.getOrganizationId(), exam.getAcademicSessionId(), exam.getClassId());
			if (recipients.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					exam.getOrganizationId(),
					recipients,
					NotificationCategory.EXAMINATION,
					NotificationType.EXAM_RESULTS_PUBLISHED,
					"Exam Results Published: " + exam.getName(),
					"Results for \"" + exam.getName() + "\""
							+ (className != null ? " (" + className + ")" : "")
							+ " have been published.",
					"EXAMINATION",
					exam.getId(),
					"/organizations/" + exam.getOrganizationId() + "/examinations/" + exam.getId(),
					"EXAM_RESULTS_PUB:" + exam.getId(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate exam results published notification: {}", ex.getMessage());
		}
	}

	public void notifyFeeDemandGenerated(StudentFeeDemand demand) {
		try {
			Set<Long> recipients = resolveStudentsAndGuardiansUserIds(
					demand.getOrganizationId(), List.of(demand.getStudentId()));
			if (recipients.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					demand.getOrganizationId(),
					recipients,
					NotificationCategory.FEES,
					NotificationType.FEE_DEMAND_GENERATED,
					"New Fee Demand: " + demand.getComponentName(),
					"Fee demand of " + demand.getNetPayableAmount().toPlainString() + " for "
							+ demand.getComponentName() + " (" + demand.getPeriodLabel()
							+ ") is due on " + demand.getDueDate() + ".",
					"FEE_DEMAND",
					demand.getId(),
					"/organizations/" + demand.getOrganizationId() + "/students/" + demand.getStudentId() + "/financial-profile",
					"FEE_DEMAND:" + demand.getId(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate fee demand notification: {}", ex.getMessage());
		}
	}

	public void notifyFeePaymentRecordedAndReceiptAvailable(FeePayment payment) {
		try {
			Set<Long> recipients = resolveStudentsAndGuardiansUserIds(
					payment.getOrganizationId(), List.of(payment.getStudentId()));
			if (recipients.isEmpty()) {
				return;
			}
			String navUrl = "/organizations/" + payment.getOrganizationId() + "/fee-payments/" + payment.getId() + "/receipt";
			dispatchNotifications(new CreateNotificationCommand(
					payment.getOrganizationId(),
					recipients,
					NotificationCategory.FEES,
					NotificationType.FEE_PAYMENT_RECORDED,
					"Fee Payment Recorded: " + payment.getReceiptNumber(),
					"Payment of " + payment.getTotalAmount().toPlainString() + " ("
							+ payment.getPaymentMethod() + ") was recorded on " + payment.getPaymentDate() + ".",
					"FEE_PAYMENT",
					payment.getId(),
					navUrl,
					"FEE_PAID:" + payment.getId(),
					false
			));
			dispatchNotifications(new CreateNotificationCommand(
					payment.getOrganizationId(),
					recipients,
					NotificationCategory.FEES,
					NotificationType.FEE_RECEIPT_AVAILABLE,
					"Fee Receipt Available: " + payment.getReceiptNumber(),
					"Fee receipt " + payment.getReceiptNumber() + " for amount "
							+ payment.getTotalAmount().toPlainString() + " is now available.",
					"FEE_PAYMENT",
					payment.getId(),
					navUrl,
					"FEE_RECEIPT:" + payment.getId(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate fee payment notification: {}", ex.getMessage());
		}
	}

	public void notifyFeePaymentReversedOrRefunded(FeePayment payment) {
		try {
			Set<Long> recipients = resolveStudentsAndGuardiansUserIds(
					payment.getOrganizationId(), List.of(payment.getStudentId()));
			if (recipients.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					payment.getOrganizationId(),
					recipients,
					NotificationCategory.FEES,
					NotificationType.FEE_PAYMENT_REVERSED_OR_REFUNDED,
					"Fee Payment " + payment.getStatus() + ": " + payment.getReceiptNumber(),
					"Fee payment receipt " + payment.getReceiptNumber() + " has been updated to status "
							+ payment.getStatus() + ".",
					"FEE_PAYMENT",
					payment.getId(),
					"/organizations/" + payment.getOrganizationId() + "/fee-payments/" + payment.getId() + "/receipt",
					"FEE_REV_REF:" + payment.getId() + ":" + payment.getStatus(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate fee reversal/refund notification: {}", ex.getMessage());
		}
	}

	public void notifyAnnouncementPublished(
			Announcement announcement, Collection<Long> targetClassIds, Collection<Long> targetStudentIds) {
		try {
			Set<Long> recipients = resolveAudienceUserIds(
					announcement.getOrganizationId(),
					announcement.getAcademicSessionId(),
					announcement.getTargetAudience(),
					targetClassIds,
					targetStudentIds);
			if (recipients.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					announcement.getOrganizationId(),
					recipients,
					NotificationCategory.ANNOUNCEMENT,
					NotificationType.ANNOUNCEMENT_PUBLISHED,
					(announcement.isImportant() ? "[Important] " : "") + "Announcement: " + announcement.getTitle(),
					announcement.getDescription(),
					"ANNOUNCEMENT",
					announcement.getId(),
					"/organizations/" + announcement.getOrganizationId() + "/announcements/" + announcement.getId(),
					"ANN_PUB:" + announcement.getId(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate announcement published notification: {}", ex.getMessage());
		}
	}

	public void notifySchoolNoticePublished(SchoolNotice notice) {
		try {
			AnnouncementAudience mappedAudience = switch (notice.getAudience()) {
				case ALL -> AnnouncementAudience.ALL;
				case TEACHERS -> AnnouncementAudience.TEACHERS;
				case STAFF -> AnnouncementAudience.STAFF;
				case STUDENTS -> AnnouncementAudience.STUDENTS;
				case PARENTS -> AnnouncementAudience.PARENTS;
			};
			Set<Long> recipients = resolveAudienceUserIds(
					notice.getOrganizationId(), notice.getAcademicSessionId(), mappedAudience, List.of(), List.of());
			if (recipients.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					notice.getOrganizationId(),
					recipients,
					NotificationCategory.ANNOUNCEMENT,
					NotificationType.ANNOUNCEMENT_PUBLISHED,
					(notice.isImportant() ? "[Important] " : "") + "Notice: " + notice.getTitle(),
					notice.getContent(),
					"SCHOOL_NOTICE",
					notice.getId(),
					"/organizations/" + notice.getOrganizationId() + "/notices",
					"NOTICE_PUB:" + notice.getId(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate school notice notification: {}", ex.getMessage());
		}
	}

	public void notifyTimetablePublished(
			ClassTimetable timetable, String className, Collection<Long> scheduledTeacherIds) {
		try {
			Set<Long> recipients = new LinkedHashSet<>(resolveClassStudentAndGuardianUserIds(
					timetable.getOrganizationId(), timetable.getAcademicSessionId(), timetable.getClassId()));
			if (scheduledTeacherIds != null) {
				for (Long tId : scheduledTeacherIds) {
					resolveTeacherUserId(timetable.getOrganizationId(), tId).ifPresent(recipients::add);
				}
			}
			if (recipients.isEmpty()) {
				return;
			}
			dispatchNotifications(new CreateNotificationCommand(
					timetable.getOrganizationId(),
					recipients,
					NotificationCategory.TIMETABLE,
					NotificationType.TIMETABLE_PUBLISHED,
					"Class Timetable Published" + (className != null ? ": " + className : ""),
					"The timetable for " + (className != null ? className : "your class")
							+ " (revision " + timetable.getRevisionNumber() + ") has been published.",
					"TIMETABLE",
					timetable.getId(),
					"/organizations/" + timetable.getOrganizationId() + "/timetables/" + timetable.getId(),
					"TT_PUB:" + timetable.getId() + ":rev:" + timetable.getRevisionNumber(),
					false
			));
		} catch (Exception ex) {
			log.warn("Failed to generate timetable published notification: {}", ex.getMessage());
		}
	}

	public Set<Long> resolveStudentsAndGuardiansUserIds(Long orgId, Collection<Long> studentIds) {
		if (studentIds == null || studentIds.isEmpty()) {
			return Set.of();
		}
		Set<Long> recipients = new LinkedHashSet<>();
		List<Student> students = studentRepository
				.findAllByOrganizationIdAndIdInOrderByFirstNameAscLastNameAsc(orgId, studentIds);
		for (Student s : students) {
			if (s.getStatus() == StudentStatus.ACTIVE && s.getUserId() != null) {
				recipients.add(s.getUserId());
			}
			List<StudentGuardian> links = studentGuardianRepository
					.findAllByOrganizationIdAndStudentIdOrderByPrimaryContactDescIdAsc(orgId, s.getId());
			Set<Long> guardianIds = links.stream()
					.filter(StudentGuardian::isReceiveNotifications)
					.map(StudentGuardian::getGuardianId)
					.collect(Collectors.toSet());
			if (!guardianIds.isEmpty()) {
				List<Guardian> guardians = guardianRepository.findAllByOrganizationIdAndIdIn(orgId, guardianIds);
				for (Guardian g : guardians) {
					if (g.isActive() && g.getUserId() != null) {
						recipients.add(g.getUserId());
					}
				}
			}
		}
		return recipients;
	}

	public Set<Long> resolveClassStudentAndGuardianUserIds(Long orgId, Long academicSessionId, Long classId) {
		Long sessionId = resolveSessionIdOptional(orgId, academicSessionId);
		if (sessionId == null || classId == null) {
			return Set.of();
		}
		Set<Long> studentIds = enrollmentRepository
				.findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByIdAsc(orgId, sessionId, classId)
				.stream()
				.filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
				.map(StudentEnrollment::getStudentId)
				.collect(Collectors.toSet());
		return resolveStudentsAndGuardiansUserIds(orgId, studentIds);
	}

	public Optional<Long> resolveTeacherUserId(Long orgId, Long teacherId) {
		if (teacherId == null) {
			return Optional.empty();
		}
		return teacherProfileRepository.findByIdAndOrganizationId(teacherId, orgId)
				.flatMap(tp -> staffRepository.findByIdAndOrganizationId(tp.getStaffId(), orgId))
				.filter(s -> s.getEmploymentStatus() == EmploymentStatus.ACTIVE && s.getUserId() != null)
				.map(Staff::getUserId);
	}

	public Set<Long> resolveAudienceUserIds(
			Long orgId, Long academicSessionId, AnnouncementAudience audience,
			Collection<Long> targetClassIds, Collection<Long> targetStudentIds) {
		Set<Long> recipients = new LinkedHashSet<>();
		switch (audience) {
			case ALL -> {
				membershipRepository.findAllByOrganizationIdAndStatusOrderByIdAsc(orgId, MembershipStatus.ACTIVE)
						.forEach(m -> recipients.add(m.getUserId()));
			}
			case PARENTS -> {
				guardianRepository.findAllByOrganizationIdOrderByFirstNameAscLastNameAsc(orgId).stream()
						.filter(g -> g.isActive() && g.getUserId() != null)
						.forEach(g -> recipients.add(g.getUserId()));
				membershipRepository.findAllByOrganizationIdAndStatusOrderByIdAsc(orgId, MembershipStatus.ACTIVE)
						.forEach(m -> {
							if (authorizationQueryRepository.findOrganizationRoles(m.getUserId(), orgId).contains("PARENT")) {
								recipients.add(m.getUserId());
							}
						});
			}
			case STUDENTS -> {
				studentRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
						.filter(s -> s.getStatus() == StudentStatus.ACTIVE && s.getUserId() != null)
						.forEach(s -> recipients.add(s.getUserId()));
				membershipRepository.findAllByOrganizationIdAndStatusOrderByIdAsc(orgId, MembershipStatus.ACTIVE)
						.forEach(m -> {
							if (authorizationQueryRepository.findOrganizationRoles(m.getUserId(), orgId).contains("STUDENT")) {
								recipients.add(m.getUserId());
							}
						});
			}
			case TEACHERS -> {
				staffRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
						.filter(s -> s.getEmploymentStatus() == EmploymentStatus.ACTIVE
								&& s.isTeachingStaff() && s.getUserId() != null)
						.forEach(s -> recipients.add(s.getUserId()));
				membershipRepository.findAllByOrganizationIdAndStatusOrderByIdAsc(orgId, MembershipStatus.ACTIVE)
						.forEach(m -> {
							if (authorizationQueryRepository.findOrganizationRoles(m.getUserId(), orgId).contains("TEACHER")) {
								recipients.add(m.getUserId());
							}
						});
			}
			case STAFF -> {
				staffRepository.findAllByOrganizationIdOrderByIdAsc(orgId).stream()
						.filter(s -> s.getEmploymentStatus() == EmploymentStatus.ACTIVE && s.getUserId() != null)
						.forEach(s -> recipients.add(s.getUserId()));
				membershipRepository.findAllByOrganizationIdAndStatusOrderByIdAsc(orgId, MembershipStatus.ACTIVE)
						.forEach(m -> {
							Set<String> roles = authorizationQueryRepository.findOrganizationRoles(m.getUserId(), orgId);
							if (roles.contains("SCHOOL_STAFF") || roles.contains("ACCOUNTANT")
									|| roles.contains("RECEPTIONIST") || roles.contains("TEACHER")
									|| roles.contains("PRINCIPAL") || roles.contains("SCHOOL_ADMIN")) {
								recipients.add(m.getUserId());
							}
						});
			}
			case SPECIFIC_CLASSES -> {
				if (targetClassIds != null) {
					for (Long classId : targetClassIds) {
						recipients.addAll(resolveClassStudentAndGuardianUserIds(orgId, academicSessionId, classId));
					}
				}
			}
			case SPECIFIC_STUDENTS -> {
				if (targetStudentIds != null && !targetStudentIds.isEmpty()) {
					recipients.addAll(resolveStudentsAndGuardiansUserIds(orgId, targetStudentIds));
				}
			}
		}
		return recipients;
	}

	private boolean isCategoryEnabledForUser(Long userId, Long orgId, NotificationCategory category) {
		Optional<UserNotificationPreference> orgPref = preferenceRepository
				.findByUserIdAndOrganizationIdAndCategory(userId, orgId, category);
		if (orgPref.isPresent()) {
			return orgPref.get().isInAppEnabled();
		}
		Optional<UserNotificationPreference> globalPref = preferenceRepository
				.findByUserIdAndOrganizationIdAndCategory(userId, GLOBAL_ORG_PREFERENCE_ID, category);
		return globalPref.map(UserNotificationPreference::isInAppEnabled).orElse(true);
	}

	private Set<NotificationDeliveryChannel> resolveEnabledChannels(
			Long userId, Long orgId, NotificationCategory category) {
		Optional<UserNotificationPreference> orgPref = preferenceRepository
				.findByUserIdAndOrganizationIdAndCategory(userId, orgId, category);
		if (orgPref.isPresent()) {
			return parseChannels(orgPref.get().getEnabledChannels());
		}
		Optional<UserNotificationPreference> globalPref = preferenceRepository
				.findByUserIdAndOrganizationIdAndCategory(userId, GLOBAL_ORG_PREFERENCE_ID, category);
		return globalPref.map(p -> parseChannels(p.getEnabledChannels()))
				.orElse(Set.of(NotificationDeliveryChannel.IN_APP, NotificationDeliveryChannel.PUSH));
	}

	private Set<NotificationDeliveryChannel> parseChannels(String csv) {
		if (csv == null || csv.isBlank()) {
			return Set.of();
		}
		Set<NotificationDeliveryChannel> set = new LinkedHashSet<>();
		for (String part : csv.split(",")) {
			String trimmed = part.trim().toUpperCase(Locale.ROOT);
			if (!trimmed.isEmpty()) {
				try {
					set.add(NotificationDeliveryChannel.valueOf(trimmed));
				} catch (IllegalArgumentException ignored) {
				}
			}
		}
		return set;
	}

	private String serializeChannels(Set<NotificationDeliveryChannel> channels) {
		if (channels == null || channels.isEmpty()) {
			return "";
		}
		return channels.stream()
				.map(Enum::name)
				.collect(Collectors.joining(","));
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

	private String truncate(String val, int maxLen) {
		if (val == null || val.isBlank()) {
			return "-";
		}
		String trimmed = val.trim();
		return trimmed.length() <= maxLen ? trimmed : trimmed.substring(0, maxLen);
	}

	private NotificationResponse toResponse(InAppNotification n) {
		return new NotificationResponse(
				n.getId(),
				n.getOrganizationId(),
				n.getRecipientUserId(),
				n.getCategory(),
				n.getType(),
				n.getTitle(),
				n.getMessage(),
				n.getResourceType(),
				n.getResourceId(),
				n.getNavigationUrl(),
				n.isRead(),
				n.getReadAt(),
				n.getCreatedAt()
		);
	}
}
