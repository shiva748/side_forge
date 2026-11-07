package com.side.forge.invitation.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.entity.*;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.repository.*;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.common.utils.AuthenticationUtils;
import com.side.forge.invitation.dto.InvitationDtos.*;
import com.side.forge.invitation.entity.*;
import com.side.forge.invitation.notification.InvitationNotificationSender;
import com.side.forge.invitation.notification.InvitationNotificationSender.InvitationNotificationPayload;
import com.side.forge.invitation.repository.OrganizationInvitationRepository;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.organization.academic.common.AcademicTenantAccessValidator;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.onboarding.entity.OnboardingRequest;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.Staff;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.student.guardian.entity.Guardian;
import com.side.forge.organization.student.guardian.repository.GuardianRepository;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.entity.StudentStatus;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.organization.teacher.entity.TeacherProfile;
import com.side.forge.organization.teacher.repository.TeacherProfileRepository;
import com.side.forge.security.jwt.JwtService;
import com.side.forge.user.entity.UserStatus;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InvitationService {

	private static final SecureRandom SECURE_RANDOM = new SecureRandom();
	private static final Set<String> SELF_SERVICE_ROLE_PERMISSIONS = Set.of(
			PermissionCode.HOMEWORK_SUBMIT.getValue(),
			PermissionCode.PARENT_CHILD_VIEW.getValue(),
			PermissionCode.PARENT_CHILD_COMMUNICATION.getValue()
	);

	private final OrganizationInvitationRepository invitationRepository;
	private final OrganizationRepository organizationRepository;
	private final AcademicTenantAccessValidator validator;
	private final CurrentUserContext currentUser;
	private final RoleRepository roleRepository;
	private final OrganizationMembershipRepository membershipRepository;
	private final MembershipRoleRepository membershipRoleRepository;
	private final AuthorizationAuditLogRepository auditLogRepository;
	private final AuthorizationQueryRepository authorizationQueryRepository;
	private final UserRepository userRepository;
	private final StaffRepository staffRepository;
	private final TeacherProfileRepository teacherProfileRepository;
	private final GuardianRepository guardianRepository;
	private final StudentRepository studentRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final InvitationNotificationSender notificationSender;
	private final NotificationService notificationService;

	@Value("${forge.invitation.default-expiry-hours:168}")
	private int defaultExpiryHours;

	@Value("${forge.invitation.base-url:/api/invitations/accept}")
	private String invitationBaseUrl;

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public InvitationDispatchResponse createPlatformSchoolAdminInvitation(
			Long orgId, CreateInvitationRequest request) {
		if (!currentUser.isPlatformContext()) {
			throw new AccessDeniedException("Platform context is required to invite an organization school administrator");
		}
		Organization org = requireActiveOrganizationEntity(orgId);
		String roleCode = (request.roleCode() == null || request.roleCode().isBlank())
				? "SCHOOL_ADMIN"
				: request.roleCode().trim().toUpperCase(Locale.ROOT);
		if (!"SCHOOL_ADMIN".equals(roleCode)) {
			throw new IllegalArgumentException("Platform onboarding invitations only support SCHOOL_ADMIN role");
		}
		Role role = findOrganizationRole(roleCode, orgId);
		return createInvitationInternal(
				org, role, InvitationTargetType.SCHOOL_ADMIN, request.targetProfileId(),
				request.email(), request.firstName(), request.lastName(), request.phoneNumber(),
				request.expiryHours(), currentUser.getUserId(), null);
	}

	@Transactional
	public InvitationDispatchResponse createInitialSchoolAdminInvitationOnApproval(
			Organization org, OnboardingRequest onboardingRequest, Long reviewedByUserId) {
		Role role = findOrganizationRole("SCHOOL_ADMIN", org.getId());
		String fullName = onboardingRequest.getContactPersonName() == null
				? "School Admin"
				: onboardingRequest.getContactPersonName().trim();
		String firstName = fullName;
		String lastName = null;
		int spaceIdx = fullName.indexOf(' ');
		if (spaceIdx > 0) {
			firstName = fullName.substring(0, spaceIdx).trim();
			lastName = fullName.substring(spaceIdx + 1).trim();
		}
		Long actorId = reviewedByUserId != null ? reviewedByUserId : currentUser.getUserId();
		return createInvitationInternal(
				org, role, InvitationTargetType.SCHOOL_ADMIN, null,
				onboardingRequest.getContactEmail(), firstName, lastName, onboardingRequest.getMobileNumber(),
				defaultExpiryHours, actorId, onboardingRequest.getId());
	}

	@Transactional
	public InvitationDispatchResponse createOrganizationInvitation(
			Long orgId, CreateInvitationRequest request) {
		Organization org = validator.requireOrganization(orgId);
		String roleCode = normalizeRoleCode(request.roleCode());
		Role role = findOrganizationRole(roleCode, orgId);
		InvitationTargetType targetType = resolveTargetType(request.targetType(), role.getCode());

		authorizeOrganizationSenderForRoleAndTarget(orgId, role, targetType);

		return createInvitationInternal(
				org, role, targetType, request.targetProfileId(),
				request.email(), request.firstName(), request.lastName(), request.phoneNumber(),
				request.expiryHours(), currentUser.getUserId(), null);
	}

	@Transactional
	public InvitationDispatchResponse resendOrganizationInvitation(Long orgId, Long invitationId) {
		Organization org = validator.requireOrganization(orgId);
		OrganizationInvitation inv = invitationRepository.findByIdAndOrganizationIdForUpdate(invitationId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Invitation not found"));
		Role role = findOrganizationRole(inv.getRoleCode(), orgId);
		authorizeOrganizationSenderForRoleAndTarget(orgId, role, inv.getTargetType());
		return resendInvitationInternal(org, inv, defaultExpiryHours);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public InvitationDispatchResponse resendPlatformInvitation(Long orgId, Long invitationId) {
		if (!currentUser.isPlatformContext()) {
			throw new AccessDeniedException("Platform context is required");
		}
		Organization org = requireActiveOrganizationEntity(orgId);
		OrganizationInvitation inv = invitationRepository.findByIdAndOrganizationIdForUpdate(invitationId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Invitation not found"));
		return resendInvitationInternal(org, inv, defaultExpiryHours);
	}

	@Transactional
	public InvitationResponse revokeOrganizationInvitation(Long orgId, Long invitationId) {
		Organization org = validator.requireOrganization(orgId);
		OrganizationInvitation inv = invitationRepository.findByIdAndOrganizationIdForUpdate(invitationId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Invitation not found"));
		Role role = findOrganizationRole(inv.getRoleCode(), orgId);
		authorizeOrganizationSenderForRoleAndTarget(orgId, role, inv.getTargetType());
		return revokeInvitationInternal(org, inv);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public InvitationResponse revokePlatformInvitation(Long orgId, Long invitationId) {
		if (!currentUser.isPlatformContext()) {
			throw new AccessDeniedException("Platform context is required");
		}
		Organization org = requireActiveOrganizationEntity(orgId);
		OrganizationInvitation inv = invitationRepository.findByIdAndOrganizationIdForUpdate(invitationId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Invitation not found"));
		return revokeInvitationInternal(org, inv);
	}

	@Transactional
	public List<InvitationResponse> getOrganizationInvitations(
			Long orgId, InvitationStatus statusFilter, String roleCodeFilter, InvitationTargetType targetTypeFilter) {
		Organization org = validator.requireOrganization(orgId);
		verifyCanViewOrganizationInvitations(orgId);
		List<OrganizationInvitation> list = invitationRepository
				.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(orgId);
		Instant now = Instant.now();
		for (OrganizationInvitation inv : list) {
			refreshExpiredStatusIfNecessary(inv, now);
		}
		return list.stream()
				.filter(i -> statusFilter == null || i.getStatus() == statusFilter)
				.filter(i -> roleCodeFilter == null || roleCodeFilter.isBlank()
						|| i.getRoleCode().equalsIgnoreCase(roleCodeFilter.trim()))
				.filter(i -> targetTypeFilter == null || i.getTargetType() == targetTypeFilter)
				.map(i -> toResponse(i, org.getName()))
				.toList();
	}

	@Transactional
	public InvitationResponse getOrganizationInvitationById(Long orgId, Long invitationId) {
		Organization org = validator.requireOrganization(orgId);
		verifyCanViewOrganizationInvitations(orgId);
		OrganizationInvitation inv = invitationRepository.findByIdAndOrganizationId(invitationId, orgId)
				.orElseThrow(() -> new EntityNotFoundException("Invitation not found"));
		refreshExpiredStatusIfNecessary(inv, Instant.now());
		return toResponse(inv, org.getName());
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public List<InvitationResponse> getPlatformOrganizationInvitations(Long orgId) {
		if (!currentUser.isPlatformContext()) {
			throw new AccessDeniedException("Platform context is required");
		}
		Organization org = requireActiveOrganizationEntity(orgId);
		List<OrganizationInvitation> list = invitationRepository
				.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(orgId);
		Instant now = Instant.now();
		for (OrganizationInvitation inv : list) {
			refreshExpiredStatusIfNecessary(inv, now);
		}
		return list.stream().map(i -> toResponse(i, org.getName())).toList();
	}

	@Transactional
	public InvitationVerificationResponse verifyInvitationToken(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			throw new IllegalArgumentException("Invitation token is required");
		}
		String hash = hashToken(rawToken.trim());
		OrganizationInvitation inv = invitationRepository.findByTokenHash(hash)
				.orElseThrow(() -> new EntityNotFoundException("Invalid invitation token"));
		Organization org = requireActiveOrganizationEntity(inv.getOrganizationId());
		refreshExpiredStatusIfNecessary(inv, Instant.now());

		if (inv.getStatus() != InvitationStatus.PENDING) {
			throw new IllegalStateException(
					"Invitation is " + inv.getStatus().name().toLowerCase(Locale.ROOT) + " and cannot be accepted");
		}
		boolean existingAccount = userRepository.findByEmail(inv.getEmail()).isPresent();
		return new InvitationVerificationResponse(
				inv.getId(),
				inv.getOrganizationId(),
				org.getName(),
				inv.getEmail(),
				inv.getRoleCode(),
				inv.getTargetType(),
				inv.getTargetProfileId(),
				inv.getRecipientFirstName(),
				inv.getRecipientLastName(),
				inv.getRecipientPhone(),
				existingAccount,
				inv.getStatus(),
				inv.getExpiresAt()
		);
	}

	@Transactional(noRollbackFor = IllegalStateException.class)
	public InvitationAcceptanceResponse acceptInvitation(
			AcceptInvitationRequest request, Authentication authentication) {
		if (request.token() == null || request.token().isBlank()) {
			throw new IllegalArgumentException("Invitation token is required");
		}
		String hash = hashToken(request.token().trim());
		OrganizationInvitation inv = invitationRepository.findByTokenHashForUpdate(hash)
				.orElseThrow(() -> new EntityNotFoundException("Invalid invitation token"));
		Organization org = requireActiveOrganizationEntity(inv.getOrganizationId());

		Instant now = Instant.now();
		refreshExpiredStatusIfNecessary(inv, now);
		if (inv.getStatus() == InvitationStatus.REVOKED) {
			throw new IllegalStateException("Invitation has been revoked");
		}
		if (inv.getStatus() == InvitationStatus.ACCEPTED) {
			throw new IllegalStateException("Invitation has already been accepted");
		}
		if (inv.getStatus() == InvitationStatus.EXPIRED) {
			throw new IllegalStateException("Invitation has expired");
		}

		if (request.email() != null && !request.email().isBlank()
				&& !request.email().trim().equalsIgnoreCase(inv.getEmail())) {
			throw new AccessDeniedException("Recipient email does not match the invitation");
		}

		Long authUserId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		if (authUserId != null) {
			Users authUser = userRepository.findById(authUserId)
					.orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
			if (!authUser.getEmail().equalsIgnoreCase(inv.getEmail())) {
				throw new AccessDeniedException("Authenticated user is not the intended recipient of this invitation");
			}
		}

		Users recipientUser = resolveOrCreateRecipientAccount(inv, request, authUserId);
		Role role = findOrganizationRole(inv.getRoleCode(), org.getId());

		OrganizationMembership membership = membershipRepository
				.findByUserIdAndOrganizationId(recipientUser.getId(), org.getId())
				.orElseGet(() -> membershipRepository.save(
						OrganizationMembership.active(recipientUser.getId(), org.getId())));
		if (membership.getStatus() != MembershipStatus.ACTIVE) {
			membership.changeStatus(MembershipStatus.ACTIVE);
			membership = membershipRepository.saveAndFlush(membership);
		}

		if (membershipRoleRepository.findByMembershipIdAndRoleId(membership.getId(), role.getId()).isEmpty()) {
			membershipRoleRepository.saveAndFlush(
					new MembershipRole(membership.getId(), role.getId(), inv.getInvitedByUserId()));
			auditLogRepository.saveAndFlush(new AuthorizationAuditLog(
					inv.getInvitedByUserId(), recipientUser.getId(), org.getId(),
					role.getCode(), AuthorizationAuditLog.Action.ORGANIZATION_ROLE_ASSIGNED));
		}

		Long linkedProfileId = linkDomainProfileOnAcceptance(org.getId(), inv, recipientUser);

		inv.setStatus(InvitationStatus.ACCEPTED);
		inv.setAcceptedByUserId(recipientUser.getId());
		inv.setAcceptedAt(now);
		OrganizationInvitation savedInv = invitationRepository.saveAndFlush(inv);
		notificationService.notifyInvitationAccepted(savedInv, org.getName(), recipientUser.getId());

		String jwt = jwtService.generateToken(recipientUser);
		return new InvitationAcceptanceResponse(
				toResponse(savedInv, org.getName()),
				recipientUser.getId(),
				recipientUser.getEmail(),
				org.getId(),
				role.getCode(),
				membership.getStatus().name(),
				linkedProfileId,
				jwt
		);
	}

	@Transactional
	public List<InvitationResponse> getMyPendingInvitations(Authentication authentication) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		if (userId == null) {
			throw new AccessDeniedException("Authentication is required");
		}
		Users user = userRepository.findById(userId)
				.orElseThrow(() -> new EntityNotFoundException("User not found"));
		List<OrganizationInvitation> list = invitationRepository
				.findAllByEmailIgnoreCaseOrderByCreatedAtDescIdDesc(user.getEmail());
		Instant now = Instant.now();
		for (OrganizationInvitation inv : list) {
			refreshExpiredStatusIfNecessary(inv, now);
		}
		return list.stream()
				.filter(i -> i.getStatus() == InvitationStatus.PENDING)
				.map(i -> {
					String orgName = organizationRepository.findById(i.getOrganizationId())
							.map(Organization::getName).orElse(null);
					return toResponse(i, orgName);
				})
				.toList();
	}

	private record ProfileCandidate(Long profileId, String firstName, String lastName, String phoneNumber) {
	}

	private InvitationDispatchResponse createInvitationInternal(
			Organization org, Role role, InvitationTargetType targetType, Long requestedProfileId,
			String rawEmail, String rawFirstName, String rawLastName, String rawPhone,
			Integer expiryHours, Long actorUserId, Long onboardingRequestId) {
		String email = normalizeEmail(rawEmail);
		if (email == null || email.isBlank()) {
			throw new IllegalArgumentException("Recipient email is required");
		}
		Instant now = Instant.now();

		List<OrganizationInvitation> existingPending = invitationRepository
				.findAllByOrganizationIdAndEmailIgnoreCaseAndRoleCodeIgnoreCaseAndStatusOrderByIdDesc(
						org.getId(), email, role.getCode(), InvitationStatus.PENDING);
		for (OrganizationInvitation pending : existingPending) {
			refreshExpiredStatusIfNecessary(pending, now);
			if (pending.getStatus() == InvitationStatus.PENDING) {
				throw new IllegalStateException(
						"An active pending invitation already exists for this recipient and role in the organization");
			}
		}

		Optional<Users> existingUserOpt = userRepository.findByEmail(email);
		if (existingUserOpt.isPresent()) {
			Users existingUser = existingUserOpt.get();
			Optional<OrganizationMembership> activeMembership = membershipRepository
					.findByUserIdAndOrganizationIdAndStatus(existingUser.getId(), org.getId(), MembershipStatus.ACTIVE);
			if (activeMembership.isPresent()
					&& membershipRoleRepository.findByMembershipIdAndRoleId(
							activeMembership.get().getId(), role.getId()).isPresent()) {
				throw new IllegalStateException(
						"Recipient already has an active membership with role " + role.getCode() + " in this organization");
			}
		}

		ProfileCandidate candidate = resolveAndValidateTargetProfile(
				org.getId(), email, targetType, requestedProfileId, existingUserOpt.map(Users::getId).orElse(null));

		String firstName = (rawFirstName != null && !rawFirstName.isBlank())
				? rawFirstName.trim()
				: (candidate != null ? candidate.firstName() : null);
		String lastName = (rawLastName != null && !rawLastName.isBlank())
				? rawLastName.trim()
				: (candidate != null ? candidate.lastName() : null);
		String phone = (rawPhone != null && !rawPhone.isBlank())
				? normalizePhone(rawPhone)
				: (candidate != null ? candidate.phoneNumber() : null);

		int hours = (expiryHours != null && expiryHours > 0) ? expiryHours : defaultExpiryHours;
		String rawToken = generateRawToken();
		String tokenHash = hashToken(rawToken);
		Instant expiresAt = now.plus(Duration.ofHours(hours));

		OrganizationInvitation inv = new OrganizationInvitation();
		inv.setOrganizationId(org.getId());
		inv.setEmail(email);
		inv.setRoleCode(role.getCode());
		inv.setTargetType(targetType);
		inv.setTargetProfileId(candidate != null ? candidate.profileId() : requestedProfileId);
		inv.setRecipientFirstName(firstName);
		inv.setRecipientLastName(lastName);
		inv.setRecipientPhone(phone);
		inv.setTokenHash(tokenHash);
		inv.setStatus(InvitationStatus.PENDING);
		inv.setExpiresAt(expiresAt);
		inv.setInvitedByUserId(actorUserId != null ? actorUserId : 0L);
		inv.setOnboardingRequestId(onboardingRequestId);
		inv.setResendCount(0);
		inv.setLastSentAt(now);

		OrganizationInvitation saved = invitationRepository.saveAndFlush(inv);
		String link = buildInvitationLink(rawToken);
		notificationSender.sendInvitation(new InvitationNotificationPayload(
				saved.getId(), org.getId(), org.getName(), saved.getEmail(),
				saved.getRecipientFirstName(), saved.getRoleCode(), saved.getTargetType(),
				rawToken, link, saved.getExpiresAt()));
		notificationService.notifyInvitationReceived(saved, org.getName());

		return new InvitationDispatchResponse(toResponse(saved, org.getName()), link, rawToken);
	}

	private InvitationDispatchResponse resendInvitationInternal(
			Organization org, OrganizationInvitation inv, int expiryHours) {
		Instant now = Instant.now();
		refreshExpiredStatusIfNecessary(inv, now);
		if (inv.getStatus() != InvitationStatus.PENDING) {
			throw new IllegalStateException("Only pending invitations can be resent");
		}
		String rawToken = generateRawToken();
		inv.setTokenHash(hashToken(rawToken));
		inv.setExpiresAt(now.plus(Duration.ofHours(expiryHours)));
		inv.setResendCount(inv.getResendCount() + 1);
		inv.setLastSentAt(now);
		OrganizationInvitation saved = invitationRepository.saveAndFlush(inv);

		String link = buildInvitationLink(rawToken);
		notificationSender.sendInvitation(new InvitationNotificationPayload(
				saved.getId(), org.getId(), org.getName(), saved.getEmail(),
				saved.getRecipientFirstName(), saved.getRoleCode(), saved.getTargetType(),
				rawToken, link, saved.getExpiresAt()));
		notificationService.notifyInvitationReceived(saved, org.getName());
		return new InvitationDispatchResponse(toResponse(saved, org.getName()), link, rawToken);
	}

	private InvitationResponse revokeInvitationInternal(Organization org, OrganizationInvitation inv) {
		Instant now = Instant.now();
		refreshExpiredStatusIfNecessary(inv, now);
		if (inv.getStatus() != InvitationStatus.PENDING) {
			throw new IllegalStateException("Only pending invitations can be revoked");
		}
		inv.setStatus(InvitationStatus.REVOKED);
		inv.setRevokedByUserId(currentUser.getUserId());
		inv.setRevokedAt(now);
		OrganizationInvitation saved = invitationRepository.saveAndFlush(inv);
		notificationService.notifyInvitationRevoked(saved, org.getName());
		return toResponse(saved, org.getName());
	}

	private void authorizeOrganizationSenderForRoleAndTarget(
			Long orgId, Role targetRole, InvitationTargetType targetType) {
		if (currentUser.isPlatformContext()
				|| currentUser.getOrganizationId() == null
				|| !currentUser.getOrganizationId().equals(orgId)) {
			throw new AccessDeniedException("Organization authorization context is required");
		}
		if (currentUser.hasRole("SCHOOL_ADMIN")) {
			return;
		}
		if ("SCHOOL_ADMIN".equals(targetRole.getCode()) || "PRINCIPAL".equals(targetRole.getCode())) {
			throw new AccessDeniedException("Only a school administrator can invite a " + targetRole.getCode());
		}

		boolean hasDomainManagePermission = switch (targetType) {
			case SCHOOL_ADMIN -> false;
			case TEACHER -> currentUser.hasPermission(PermissionCode.TEACHER_MANAGE.getValue())
					|| currentUser.hasPermission(PermissionCode.STAFF_MANAGE.getValue());
			case STAFF, MEMBER -> currentUser.hasPermission(PermissionCode.STAFF_MANAGE.getValue());
			case GUARDIAN -> currentUser.hasPermission(PermissionCode.STUDENT_GUARDIAN_MANAGE.getValue());
			case STUDENT -> currentUser.hasPermission(PermissionCode.STUDENT_CREATE.getValue())
					|| currentUser.hasPermission(PermissionCode.STUDENT_UPDATE.getValue())
					|| currentUser.hasPermission(PermissionCode.STUDENT_ENROLLMENT_MANAGE.getValue());
		};
		if (!hasDomainManagePermission) {
			throw new AccessDeniedException("You do not have permission to invite users for " + targetType);
		}

		Set<String> targetRolePermissions = authorizationQueryRepository.findPermissionsForRole(targetRole.getId());
		for (String perm : targetRolePermissions) {
			if (SELF_SERVICE_ROLE_PERMISSIONS.contains(perm)
					&& (targetType == InvitationTargetType.STUDENT || targetType == InvitationTargetType.GUARDIAN)) {
				continue;
			}
			if (!currentUser.hasPermission(perm)) {
				throw new AccessDeniedException(
						"Cannot invite a user with role " + targetRole.getCode()
								+ " because it grants permissions beyond your own (" + perm + ")");
			}
		}
	}

	private void verifyCanViewOrganizationInvitations(Long orgId) {
		if (currentUser.isPlatformContext()
				|| currentUser.getOrganizationId() == null
				|| !currentUser.getOrganizationId().equals(orgId)) {
			throw new AccessDeniedException("Organization authorization context is required");
		}
		boolean allowed = currentUser.hasRole("SCHOOL_ADMIN")
				|| currentUser.hasPermission(PermissionCode.STAFF_MANAGE.getValue())
				|| currentUser.hasPermission(PermissionCode.TEACHER_MANAGE.getValue())
				|| currentUser.hasPermission(PermissionCode.STUDENT_GUARDIAN_MANAGE.getValue())
				|| currentUser.hasPermission(PermissionCode.STUDENT_CREATE.getValue());
		if (!allowed) {
			throw new AccessDeniedException("You do not have permission to view organization invitations");
		}
	}

	private Users resolveOrCreateRecipientAccount(
			OrganizationInvitation inv, AcceptInvitationRequest request, Long authUserId) {
		Optional<Users> existingOpt = userRepository.findByEmail(inv.getEmail());
		if (existingOpt.isPresent()) {
			Users existing = existingOpt.get();
			if (existing.getStatus() != UserStatus.ACTIVE) {
				throw new IllegalStateException("Existing user account is not active");
			}
			if (authUserId == null) {
				if (request.password() == null || request.password().isBlank()
						|| !passwordEncoder.matches(request.password(), existing.getPasswordHash())) {
					throw new AccessDeniedException(
							"Valid password is required to verify recipient identity for an existing account");
				}
			}
			if (!existing.isEmailVerified()) {
				existing.setEmailVerified(true);
				existing = userRepository.saveAndFlush(existing);
			}
			return existing;
		}

		if (request.password() == null || request.password().isBlank() || request.password().length() < 8) {
			throw new IllegalArgumentException("Password (minimum 8 characters) is required to activate a new account");
		}
		String firstName = (request.firstName() != null && !request.firstName().isBlank())
				? request.firstName().trim()
				: inv.getRecipientFirstName();
		if (firstName == null || firstName.isBlank()) {
			throw new IllegalArgumentException("First name is required to create a new account");
		}
		String lastName = (request.lastName() != null && !request.lastName().isBlank())
				? request.lastName().trim()
				: inv.getRecipientLastName();
		String phone = (request.phoneNumber() != null && !request.phoneNumber().isBlank())
				? normalizePhone(request.phoneNumber())
				: inv.getRecipientPhone();
		if (phone == null || phone.isBlank()) {
			throw new IllegalArgumentException("Phone number is required to create a new account");
		}
		if (userRepository.findByPhoneNumber(phone).isPresent()) {
			throw new IllegalStateException("Phone number is already registered to another user account");
		}

		Users newUser = new Users();
		newUser.setFirstName(firstName);
		newUser.setLastName(lastName);
		newUser.setEmail(inv.getEmail());
		newUser.setPhoneNumber(phone);
		newUser.setPasswordHash(passwordEncoder.encode(request.password()));
		newUser.setStatus(UserStatus.ACTIVE);
		newUser.setEmailVerified(true);
		newUser.setPhoneVerified(false);
		return userRepository.saveAndFlush(newUser);
	}

	private ProfileCandidate resolveAndValidateTargetProfile(
			Long orgId, String email, InvitationTargetType targetType,
			Long requestedProfileId, Long existingUserId) {
		return switch (targetType) {
			case STAFF -> {
				Staff staff = null;
				if (requestedProfileId != null) {
					staff = staffRepository.findByIdAndOrganizationId(requestedProfileId, orgId)
							.orElseThrow(() -> new EntityNotFoundException("Target staff profile not found in organization"));
				} else {
					List<Staff> matches = staffRepository.findAllByOrganizationIdAndEmailIgnoreCase(orgId, email);
					if (matches.size() == 1) {
						staff = matches.getFirst();
					}
				}
				if (staff != null) {
					if (staff.getEmploymentStatus().isTerminal()) {
						throw new IllegalStateException("Cannot invite a resigned or terminated staff member");
					}
					if (staff.getUserId() != null
							&& (existingUserId == null || !staff.getUserId().equals(existingUserId))) {
						throw new IllegalStateException("Staff profile is already linked to another user account");
					}
					yield new ProfileCandidate(
							staff.getId(), staff.getFirstName(), staff.getLastName(), staff.getPhoneNumber());
				}
				yield null;
			}
			case TEACHER -> {
				TeacherProfile teacher = null;
				Staff staff = null;
				if (requestedProfileId != null) {
					Optional<TeacherProfile> tpOpt = teacherProfileRepository.findByIdAndOrganizationId(requestedProfileId, orgId);
					if (tpOpt.isPresent()) {
						teacher = tpOpt.get();
						staff = staffRepository.findByIdAndOrganizationId(teacher.getStaffId(), orgId)
								.orElseThrow(() -> new EntityNotFoundException("Underlying staff profile not found"));
					} else {
						staff = staffRepository.findByIdAndOrganizationId(requestedProfileId, orgId)
								.orElseThrow(() -> new EntityNotFoundException("Target teacher/staff profile not found"));
						teacher = teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, staff.getId())
								.orElse(null);
					}
				} else {
					List<Staff> matches = staffRepository.findAllByOrganizationIdAndEmailIgnoreCase(orgId, email);
					if (matches.size() == 1) {
						staff = matches.getFirst();
						teacher = teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, staff.getId())
								.orElse(null);
					}
				}
				if (staff != null) {
					if (staff.getEmploymentStatus().isTerminal()) {
						throw new IllegalStateException("Cannot invite a resigned or terminated teacher");
					}
					if (staff.getUserId() != null
							&& (existingUserId == null || !staff.getUserId().equals(existingUserId))) {
						throw new IllegalStateException("Teacher profile is already linked to another user account");
					}
					Long profileId = teacher != null ? teacher.getId() : staff.getId();
					yield new ProfileCandidate(
							profileId, staff.getFirstName(), staff.getLastName(), staff.getPhoneNumber());
				}
				yield null;
			}
			case GUARDIAN -> {
				Guardian guardian = null;
				if (requestedProfileId != null) {
					guardian = guardianRepository.findByIdAndOrganizationId(requestedProfileId, orgId)
							.orElseThrow(() -> new EntityNotFoundException("Target guardian profile not found in organization"));
				} else {
					List<Guardian> matches = guardianRepository.findAllByOrganizationIdAndEmailIgnoreCase(orgId, email);
					if (matches.size() == 1) {
						guardian = matches.getFirst();
					}
				}
				if (guardian != null) {
					if (!guardian.isActive()) {
						throw new IllegalStateException("Cannot invite an inactive guardian profile");
					}
					if (guardian.getUserId() != null
							&& (existingUserId == null || !guardian.getUserId().equals(existingUserId))) {
						throw new IllegalStateException("Guardian profile is already linked to another user account");
					}
					yield new ProfileCandidate(
							guardian.getId(), guardian.getFirstName(), guardian.getLastName(), guardian.getPhoneNumber());
				}
				yield null;
			}
			case STUDENT -> {
				Student student = null;
				if (requestedProfileId != null) {
					student = studentRepository.findByIdAndOrganizationId(requestedProfileId, orgId)
							.orElseThrow(() -> new EntityNotFoundException("Target student profile not found in organization"));
				} else {
					List<Student> matches = studentRepository.findAllByOrganizationIdAndEmailIgnoreCase(orgId, email);
					if (matches.size() == 1) {
						student = matches.getFirst();
					}
				}
				if (student != null) {
					if (student.getStatus() != StudentStatus.ACTIVE) {
						throw new IllegalStateException("Cannot invite an inactive or withdrawn student");
					}
					if (student.getUserId() != null
							&& (existingUserId == null || !student.getUserId().equals(existingUserId))) {
						throw new IllegalStateException("Student profile is already linked to another user account");
					}
					yield new ProfileCandidate(
							student.getId(), student.getFirstName(), student.getLastName(), student.getPhoneNumber());
				}
				yield null;
			}
			case SCHOOL_ADMIN, MEMBER -> null;
		};
	}

	private Long linkDomainProfileOnAcceptance(Long orgId, OrganizationInvitation inv, Users user) {
		Long targetProfileId = inv.getTargetProfileId();
		return switch (inv.getTargetType()) {
			case STAFF -> {
				Staff staff = null;
				if (targetProfileId != null) {
					staff = staffRepository.findByIdAndOrganizationId(targetProfileId, orgId).orElse(null);
				} else {
					List<Staff> matches = staffRepository.findAllByOrganizationIdAndEmailIgnoreCase(orgId, inv.getEmail());
					if (matches.size() == 1) {
						staff = matches.getFirst();
					}
				}
				if (staff != null && staff.getEmploymentStatus() != EmploymentStatus.TERMINATED
						&& staff.getEmploymentStatus() != EmploymentStatus.RESIGNED) {
					if (staff.getUserId() == null) {
						if (!staffRepository.existsByOrganizationIdAndUserId(orgId, user.getId())) {
							staff.setUserId(user.getId());
							staffRepository.saveAndFlush(staff);
						}
					} else if (!staff.getUserId().equals(user.getId())) {
						throw new IllegalStateException("Staff profile is already linked to another user account");
					}
					yield staff.getId();
				}
				yield null;
			}
			case TEACHER -> {
				TeacherProfile teacher = null;
				Staff staff = null;
				if (targetProfileId != null) {
					Optional<TeacherProfile> tpOpt = teacherProfileRepository.findByIdAndOrganizationId(targetProfileId, orgId);
					if (tpOpt.isPresent()) {
						teacher = tpOpt.get();
						staff = staffRepository.findByIdAndOrganizationId(teacher.getStaffId(), orgId).orElse(null);
					} else {
						staff = staffRepository.findByIdAndOrganizationId(targetProfileId, orgId).orElse(null);
						if (staff != null) {
							teacher = teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, staff.getId()).orElse(null);
						}
					}
				} else {
					List<Staff> matches = staffRepository.findAllByOrganizationIdAndEmailIgnoreCase(orgId, inv.getEmail());
					if (matches.size() == 1) {
						staff = matches.getFirst();
						teacher = teacherProfileRepository.findByOrganizationIdAndStaffId(orgId, staff.getId()).orElse(null);
					}
				}
				if (staff != null) {
					if (staff.getUserId() == null) {
						if (!staffRepository.existsByOrganizationIdAndUserId(orgId, user.getId())) {
							staff.setUserId(user.getId());
							staffRepository.saveAndFlush(staff);
						}
					} else if (!staff.getUserId().equals(user.getId())) {
						throw new IllegalStateException("Teacher profile is already linked to another user account");
					}
					yield teacher != null ? teacher.getId() : staff.getId();
				}
				yield null;
			}
			case GUARDIAN -> {
				Guardian guardian = null;
				if (targetProfileId != null) {
					guardian = guardianRepository.findByIdAndOrganizationId(targetProfileId, orgId).orElse(null);
				} else {
					List<Guardian> matches = guardianRepository.findAllByOrganizationIdAndEmailIgnoreCase(orgId, inv.getEmail());
					if (matches.size() == 1) {
						guardian = matches.getFirst();
					}
				}
				if (guardian != null && guardian.isActive()) {
					if (guardian.getUserId() == null) {
						guardian.setUserId(user.getId());
						guardianRepository.saveAndFlush(guardian);
					} else if (!guardian.getUserId().equals(user.getId())) {
						throw new IllegalStateException("Guardian profile is already linked to another user account");
					}
					yield guardian.getId();
				}
				yield null;
			}
			case STUDENT -> {
				Student student = null;
				if (targetProfileId != null) {
					student = studentRepository.findByIdAndOrganizationId(targetProfileId, orgId).orElse(null);
				} else {
					List<Student> matches = studentRepository.findAllByOrganizationIdAndEmailIgnoreCase(orgId, inv.getEmail());
					if (matches.size() == 1) {
						student = matches.getFirst();
					}
				}
				if (student != null && student.getStatus() == StudentStatus.ACTIVE) {
					if (student.getUserId() == null) {
						student.setUserId(user.getId());
						studentRepository.saveAndFlush(student);
					} else if (!student.getUserId().equals(user.getId())) {
						throw new IllegalStateException("Student profile is already linked to another user account");
					}
					yield student.getId();
				}
				yield null;
			}
			case SCHOOL_ADMIN, MEMBER -> null;
		};
	}

	private void refreshExpiredStatusIfNecessary(OrganizationInvitation inv, Instant now) {
		if (inv.getStatus() == InvitationStatus.PENDING
				&& inv.getExpiresAt() != null
				&& inv.getExpiresAt().isBefore(now)) {
			inv.setStatus(InvitationStatus.EXPIRED);
			invitationRepository.saveAndFlush(inv);
		}
	}

	private Role findOrganizationRole(String roleCode, Long orgId) {
		return roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.ORGANIZATION, orgId)
				.or(() -> roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.ORGANIZATION, null))
				.orElseThrow(() -> new IllegalArgumentException("Organization role not found: " + roleCode));
	}

	private Organization requireActiveOrganizationEntity(Long orgId) {
		if (orgId == null || orgId <= 0) {
			throw new IllegalArgumentException("Organization ID must be a positive number");
		}
		Organization org = organizationRepository.findById(orgId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found"));
		if (org.getStatus() != com.side.forge.organization.entity.OrganizationStatus.ACTIVE) {
			throw new IllegalStateException("Organization is not active");
		}
		return org;
	}

	private InvitationTargetType resolveTargetType(InvitationTargetType requested, String roleCode) {
		if (requested != null) {
			return requested;
		}
		return switch (roleCode) {
			case "SCHOOL_ADMIN" -> InvitationTargetType.SCHOOL_ADMIN;
			case "TEACHER" -> InvitationTargetType.TEACHER;
			case "PARENT" -> InvitationTargetType.GUARDIAN;
			case "STUDENT" -> InvitationTargetType.STUDENT;
			case "PRINCIPAL", "ACCOUNTANT", "RECEPTIONIST", "SCHOOL_STAFF" -> InvitationTargetType.STAFF;
			default -> InvitationTargetType.MEMBER;
		};
	}

	private String normalizeRoleCode(String roleCode) {
		if (roleCode == null || roleCode.isBlank()) {
			throw new IllegalArgumentException("Role code is required");
		}
		return roleCode.trim().toUpperCase(Locale.ROOT);
	}

	private String normalizeEmail(String email) {
		return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
	}

	private String normalizePhone(String phone) {
		String trimmed = phone.trim();
		return trimmed.startsWith("+91") ? trimmed : "+91" + trimmed;
	}

	private String generateRawToken() {
		byte[] bytes = new byte[32];
		SECURE_RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String hashToken(String rawToken) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hash);
		} catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 algorithm not available", ex);
		}
	}

	private String buildInvitationLink(String rawToken) {
		return invitationBaseUrl + "?token=" + rawToken;
	}

	private InvitationResponse toResponse(OrganizationInvitation inv, String orgName) {
		return new InvitationResponse(
				inv.getId(),
				inv.getOrganizationId(),
				orgName,
				inv.getEmail(),
				inv.getRoleCode(),
				inv.getTargetType(),
				inv.getTargetProfileId(),
				inv.getRecipientFirstName(),
				inv.getRecipientLastName(),
				inv.getRecipientPhone(),
				inv.getStatus(),
				inv.getExpiresAt(),
				inv.getInvitedByUserId(),
				inv.getOnboardingRequestId(),
				inv.getResendCount(),
				inv.getLastSentAt(),
				inv.getAcceptedByUserId(),
				inv.getAcceptedAt(),
				inv.getRevokedByUserId(),
				inv.getRevokedAt(),
				inv.getCreatedAt()
		);
	}

	@Transactional(noRollbackFor = IllegalStateException.class)
	public InvitationResponse rejectInvitation(
			RejectInvitationRequest request, Authentication authentication) {
		if (request.token() == null || request.token().isBlank()) {
			throw new IllegalArgumentException("Invitation token is required");
		}
		String tokenHash = hashToken(request.token().trim());
		OrganizationInvitation inv = invitationRepository.findByTokenHashForUpdate(tokenHash)
				.orElseThrow(() -> new EntityNotFoundException("Invalid invitation token"));

		Instant now = Instant.now();
		if (inv.getStatus() == InvitationStatus.PENDING && inv.getExpiresAt() != null
				&& inv.getExpiresAt().isBefore(now)) {
			inv.setStatus(InvitationStatus.EXPIRED);
			invitationRepository.saveAndFlush(inv);
		}

		if (inv.getStatus() != InvitationStatus.PENDING) {
			throw new IllegalStateException("Invitation is no longer valid (status: " + inv.getStatus() + ")");
		}
		if (request.email() != null && !request.email().isBlank()
				&& !normalizeEmail(request.email()).equalsIgnoreCase(inv.getEmail())) {
			throw new AccessDeniedException("Provided email does not match the invited recipient");
		}
		Long authUserId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		if (authUserId != null) {
			Users authUser = userRepository.findById(authUserId)
					.orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
			if (!authUser.getEmail().equalsIgnoreCase(inv.getEmail())) {
				throw new AccessDeniedException("Authenticated user email does not match the invited recipient");
			}
		}

		inv.setStatus(InvitationStatus.REJECTED);
		inv.setRevokedAt(now);
		OrganizationInvitation saved = invitationRepository.saveAndFlush(inv);
		String orgName = organizationRepository.findById(inv.getOrganizationId())
				.map(Organization::getName).orElse(null);
		return toResponse(saved, orgName);
	}
}
