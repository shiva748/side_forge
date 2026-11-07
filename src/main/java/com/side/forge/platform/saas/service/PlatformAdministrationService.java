package com.side.forge.platform.saas.service;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.annotation.RequirePermission;
import com.side.forge.authorization.entity.MembershipStatus;
import com.side.forge.authorization.entity.Role;
import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.authorization.repository.OrganizationMembershipRepository;
import com.side.forge.authorization.repository.RoleRepository;
import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.authorization.service.RoleAssignmentService;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.organization.entity.Organization;
import com.side.forge.organization.entity.OrganizationStatus;
import com.side.forge.organization.onboarding.entity.OnboardingStatus;
import com.side.forge.organization.onboarding.repository.OnboardingRequestRepository;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.platform.saas.dto.SaaSDtos.*;
import com.side.forge.platform.saas.entity.*;
import com.side.forge.platform.saas.enums.*;
import com.side.forge.platform.saas.repository.*;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlatformAdministrationService {

	private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Kolkata");

	private final OrganizationRepository organizationRepository;
	private final OnboardingRequestRepository onboardingRequestRepository;
	private final OrganizationMembershipRepository membershipRepository;
	private final OrganizationSubscriptionRepository subscriptionRepository;
	private final OrganizationStatusHistoryRepository statusHistoryRepository;
	private final SubscriptionPaymentRepository paymentRepository;
	private final PlatformSubscriptionService subscriptionService;
	private final SubscriptionEntitlementService entitlementService;
	private final PlatformAuditService auditService;
	private final UserRepository userRepository;
	private final RoleRepository roleRepository;
	private final RoleAssignmentService roleAssignmentService;
	private final CurrentUserContext currentUser;
	private final NamedParameterJdbcTemplate jdbc;

	@RequirePermission(PermissionCode.PLATFORM_DASHBOARD_VIEW)
	@Transactional(readOnly = true)
	public PlatformDashboardResponse getPlatformDashboard() {
		List<Organization> allOrgs = organizationRepository.findAll();
		long totalOrgs = allOrgs.size();
		long activeOrgs = allOrgs.stream().filter(o -> o.getStatus() == OrganizationStatus.ACTIVE).count();
		long suspendedOrgs = allOrgs.stream().filter(o -> o.getStatus() == OrganizationStatus.SUSPENDED).count();
		long deactivatedOrgs = allOrgs.stream().filter(o -> o.getStatus() == OrganizationStatus.DEACTIVATED).count();
		long pendingOnboarding = onboardingRequestRepository.findByStatus(OnboardingStatus.PENDING).size();

		List<OrganizationSubscription> currentSubs = subscriptionRepository
				.findAllByCurrentSubscriptionTrueOrderByOrganizationIdAsc();
		Map<Long, Organization> orgById = allOrgs.stream()
				.collect(Collectors.toMap(Organization::getId, Function.identity()));

		long trialSubs = 0, activeSubs = 0, pastDueSubs = 0, suspendedSubs = 0, expiredSubs = 0, cancelledSubs = 0;
		BigDecimal totalOutstanding = BigDecimal.ZERO;
		LocalDate today = LocalDate.now(DEFAULT_ZONE);
		LocalDate thirtyDaysOut = today.plusDays(30);
		List<OrganizationAdminListItemResponse> expiringWithin30Days = new ArrayList<>();
		List<OrganizationAdminListItemResponse> overdueSubscriptions = new ArrayList<>();

		for (OrganizationSubscription sub : currentSubs) {
			Organization org = orgById.get(sub.getOrganizationId());
			if (org == null) continue;
			LocalDate orgToday = entitlementService.today(org);
			SubscriptionStatus effStatus = entitlementService.resolveEffectiveStatus(sub, orgToday);
			switch (effStatus) {
				case TRIAL -> trialSubs++;
				case ACTIVE -> activeSubs++;
				case PAST_DUE -> pastDueSubs++;
				case SUSPENDED -> suspendedSubs++;
				case EXPIRED -> expiredSubs++;
				case CANCELLED -> cancelledSubs++;
			}
			totalOutstanding = totalOutstanding.add(sub.resolveOutstandingAmount());
			if ((effStatus == SubscriptionStatus.TRIAL || effStatus == SubscriptionStatus.ACTIVE)
					&& sub.getExpiryDate() != null && !sub.getExpiryDate().isBefore(orgToday)
					&& !sub.getExpiryDate().isAfter(thirtyDaysOut)) {
				expiringWithin30Days.add(buildListItem(org, sub));
			}
			if (effStatus == SubscriptionStatus.PAST_DUE || effStatus == SubscriptionStatus.EXPIRED
					|| sub.resolveOutstandingAmount().compareTo(BigDecimal.ZERO) > 0) {
				overdueSubscriptions.add(buildListItem(org, sub));
			}
		}

		long totalPlatformUsers = userRepository.count();
		long totalActiveEnrolledStudents = queryScalarLong("""
				SELECT COUNT(DISTINCT se.student_id)
				FROM student_enrollments se
				JOIN students s ON s.id = se.student_id AND s.organization_id = se.organization_id
				JOIN academic_sessions a ON a.id = se.academic_session_id AND a.organization_id = se.organization_id
				WHERE se.status = 'ACTIVE' AND s.status = 'ACTIVE' AND a.status <> 'COMPLETED'
				""");
		long totalActiveProfiles = queryScalarLong("SELECT COUNT(*) FROM students WHERE status = 'ACTIVE'");
		long totalStoredFiles = queryScalarLong("SELECT COUNT(*) FROM stored_files");
		long totalStorageBytes = queryScalarLong("SELECT COALESCE(SUM(size_bytes), 0) FROM stored_files");

		BigDecimal totalRevenue = paymentRepository.sumTotalRevenue();

		return new PlatformDashboardResponse(
				totalOrgs, activeOrgs, suspendedOrgs, deactivatedOrgs, pendingOnboarding,
				trialSubs, activeSubs, pastDueSubs, suspendedSubs, expiredSubs, cancelledSubs,
				totalPlatformUsers, totalActiveEnrolledStudents, totalActiveProfiles,
				totalStoredFiles, totalStorageBytes,
				totalRevenue, totalOutstanding,
				expiringWithin30Days, overdueSubscriptions
		);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_VIEW)
	@Transactional(readOnly = true)
	public PagedResponse<OrganizationAdminListItemResponse> listOrganizations(
			OrganizationStatus status, SubscriptionStatus subscriptionStatus,
			String planCode, String search, int page, int size) {
		int safePage = Math.max(0, page);
		int safeSize = Math.min(100, Math.max(1, size));

		List<Organization> allOrgs = organizationRepository.findAll();
		allOrgs.sort(Comparator.comparing(Organization::getId).reversed());

		Map<Long, OrganizationSubscription> subByOrgId = subscriptionRepository
				.findAllByCurrentSubscriptionTrueOrderByOrganizationIdAsc()
				.stream()
				.collect(Collectors.toMap(OrganizationSubscription::getOrganizationId, Function.identity(), (a, b) -> a));

		String normalizedPlan = planCode != null && !planCode.isBlank()
				? planCode.trim().toUpperCase(Locale.ROOT)
				: null;
		String normalizedSearch = search != null && !search.isBlank()
				? search.trim().toLowerCase(Locale.ROOT)
				: null;

		List<OrganizationAdminListItemResponse> filtered = new ArrayList<>();
		for (Organization org : allOrgs) {
			if (status != null && org.getStatus() != status) {
				continue;
			}
			if (normalizedSearch != null) {
				boolean match = (org.getName() != null && org.getName().toLowerCase(Locale.ROOT).contains(normalizedSearch))
						|| (org.getEmail() != null && org.getEmail().toLowerCase(Locale.ROOT).contains(normalizedSearch))
						|| (org.getCity() != null && org.getCity().toLowerCase(Locale.ROOT).contains(normalizedSearch));
				if (!match) {
					continue;
				}
			}

			OrganizationSubscription sub = subByOrgId.get(org.getId());
			LocalDate orgToday = entitlementService.today(org);
			SubscriptionStatus effSubStatus = sub != null ? entitlementService.resolveEffectiveStatus(sub, orgToday) : null;

			if (subscriptionStatus != null && effSubStatus != subscriptionStatus) {
				continue;
			}
			if (normalizedPlan != null) {
				if (sub == null || !normalizedPlan.equalsIgnoreCase(sub.getPlanCodeSnapshot())) {
					continue;
				}
			}
			filtered.add(buildListItem(org, sub));
		}

		int totalElements = filtered.size();
		int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);
		int fromIndex = Math.min(safePage * safeSize, totalElements);
		int toIndex = Math.min(fromIndex + safeSize, totalElements);
		List<OrganizationAdminListItemResponse> slice = filtered.subList(fromIndex, toIndex);

		return new PagedResponse<>(
				slice,
				safePage,
				safeSize,
				totalElements,
				totalPages,
				safePage == 0,
				totalPages == 0 || safePage >= totalPages - 1
		);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_VIEW)
	@Transactional(readOnly = true)
	public OrganizationAdminDetailResponse getOrganizationDetails(Long organizationId) {
		Organization org = requireOrganization(organizationId);
		return buildOrganizationDetail(org);
	}

	@RequirePermission(PermissionCode.PLATFORM_ORGANIZATION_MANAGE)
	@Transactional
	public OrganizationAdminDetailResponse changeOrganizationStatus(
			Long organizationId, ChangeOrganizationStatusRequest request) {
		Organization org = requireOrganization(organizationId);
		OrganizationStatus prevStatus = org.getStatus();
		OrganizationStatus nextStatus = request.status();
		if (prevStatus == nextStatus) {
			throw new IllegalStateException("Organization is already in status: " + nextStatus);
		}

		Long actorId = resolveCurrentUserIdSafely();
		org.setStatus(nextStatus);
		Organization savedOrg = organizationRepository.save(org);

		OrganizationStatusHistory hist = new OrganizationStatusHistory();
		hist.setOrganizationId(organizationId);
		hist.setPreviousStatus(prevStatus);
		hist.setNewStatus(nextStatus);
		hist.setReason(request.reason().trim());
		hist.setChangedBy(actorId);
		statusHistoryRepository.save(hist);

		PlatformAuditAction action = switch (nextStatus) {
			case SUSPENDED -> PlatformAuditAction.ORGANIZATION_SUSPENDED;
			case DEACTIVATED -> PlatformAuditAction.ORGANIZATION_DEACTIVATED;
			case ACTIVE -> PlatformAuditAction.ORGANIZATION_REACTIVATED;
			default -> throw new IllegalArgumentException("Unsupported organization status transition: " + nextStatus);
		};

		auditService.recordAction(
				actorId,
				action,
				"ORGANIZATION",
				organizationId,
				organizationId,
				"Changed organization status from " + prevStatus + " to " + nextStatus + " for " + savedOrg.getName(),
				"reason=" + request.reason().trim());

		return buildOrganizationDetail(savedOrg);
	}

	private record ActivePlatformRoleRow(
			Long userId,
			Long roleId,
			Instant assignedAt,
			Long assignedBy
	) {
	}

	@RequirePermission(PermissionCode.PLATFORM_ROLE_MANAGE)
	@Transactional(readOnly = true)
	public List<PlatformAdminUserResponse> listPlatformAdmins() {
		List<ActivePlatformRoleRow> rows = queryActivePlatformRoleRows(null);
		Map<Long, List<ActivePlatformRoleRow>> byUser = rows.stream()
				.collect(Collectors.groupingBy(ActivePlatformRoleRow::userId));
		if (byUser.isEmpty()) {
			return List.of();
		}

		Map<Long, Users> users = userRepository.findAllById(byUser.keySet()).stream()
				.collect(Collectors.toMap(Users::getId, Function.identity()));
		Map<Long, Role> roles = roleRepository.findAll().stream()
				.collect(Collectors.toMap(Role::getId, Function.identity()));

		List<PlatformAdminUserResponse> result = new ArrayList<>();
		for (Map.Entry<Long, List<ActivePlatformRoleRow>> entry : byUser.entrySet()) {
			Users u = users.get(entry.getKey());
			if (u == null) continue;
			result.add(buildPlatformAdminUser(u, entry.getValue(), roles));
		}
		result.sort(Comparator.comparing(PlatformAdminUserResponse::userId));
		return result;
	}

	@RequirePermission(PermissionCode.PLATFORM_ROLE_MANAGE)
	@Transactional
	public PlatformAdminUserResponse assignPlatformAdminRole(AssignPlatformAdminRoleRequest request) {
		Users user = userRepository.findById(request.userId())
				.orElseThrow(() -> new EntityNotFoundException("User not found: " + request.userId()));
		String roleCode = request.roleCode().trim().toUpperCase(Locale.ROOT);
		Long actorId = resolveCurrentUserIdSafely();

		roleAssignmentService.assignPlatformRole(user.getId(), roleCode);
		auditService.recordAction(
				actorId,
				PlatformAuditAction.PLATFORM_ROLE_ASSIGNED,
				"PLATFORM_USER_ROLE",
				user.getId(),
				null,
				"Assigned platform role " + roleCode + " to user " + user.getEmail(),
				"userId=" + user.getId() + ", roleCode=" + roleCode);

		Map<Long, Role> roles = roleRepository.findAll().stream()
				.collect(Collectors.toMap(Role::getId, Function.identity()));
		List<ActivePlatformRoleRow> activeRoles = queryActivePlatformRoleRows(user.getId());
		return buildPlatformAdminUser(user, activeRoles, roles);
	}

	@RequirePermission(PermissionCode.PLATFORM_ROLE_MANAGE)
	@Transactional
	public PlatformAdminUserResponse revokePlatformAdminRole(Long userId, String roleCode) {
		Users user = userRepository.findById(userId)
				.orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
		String normalizedRole = roleCode != null ? roleCode.trim().toUpperCase(Locale.ROOT) : "";
		Long actorId = resolveCurrentUserIdSafely();

		roleAssignmentService.revokePlatformRole(userId, normalizedRole);
		auditService.recordAction(
				actorId,
				PlatformAuditAction.PLATFORM_ROLE_REVOKED,
				"PLATFORM_USER_ROLE",
				userId,
				null,
				"Revoked platform role " + normalizedRole + " from user " + user.getEmail(),
				"userId=" + userId + ", roleCode=" + normalizedRole);

		Map<Long, Role> roles = roleRepository.findAll().stream()
				.collect(Collectors.toMap(Role::getId, Function.identity()));
		List<ActivePlatformRoleRow> activeRoles = queryActivePlatformRoleRows(userId);
		return buildPlatformAdminUser(user, activeRoles, roles);
	}

	private List<ActivePlatformRoleRow> queryActivePlatformRoleRows(Long filterUserId) {
		String sql = filterUserId == null
				? "SELECT user_id, role_id, assigned_at, assigned_by FROM platform_user_roles ORDER BY id ASC"
				: "SELECT user_id, role_id, assigned_at, assigned_by FROM platform_user_roles WHERE user_id = :uid ORDER BY id ASC";
		Map<String, Object> params = filterUserId == null ? Map.of() : Map.of("uid", filterUserId);
		return jdbc.query(sql, params, (rs, rowNum) -> {
			Timestamp ts = rs.getTimestamp("assigned_at");
			Long assignedBy = rs.getObject("assigned_by") != null ? rs.getLong("assigned_by") : null;
			return new ActivePlatformRoleRow(
					rs.getLong("user_id"),
					rs.getLong("role_id"),
					ts != null ? ts.toInstant() : null,
					assignedBy);
		});
	}

	private OrganizationAdminListItemResponse buildListItem(Organization org, OrganizationSubscription sub) {
		LocalDate orgToday = entitlementService.today(org);
		long enrolledStudents = entitlementService.getActiveEnrolledStudentCount(org.getId());
		OrganizationStorageUsageResponse storage = entitlementService.getOrganizationStorageUsage(org.getId());

		SubscriptionStatus effStatus = sub != null ? entitlementService.resolveEffectiveStatus(sub, orgToday) : null;
		Integer effectiveLimit = sub != null ? sub.resolveEffectiveStudentLimit(orgToday) : null;
		boolean limitReached = effectiveLimit != null && effectiveLimit > 0 && enrolledStudents >= effectiveLimit;

		return new OrganizationAdminListItemResponse(
				org.getId(),
				org.getName(),
				org.getBoardAffiliation(),
				org.getStatus(),
				org.getEmail(),
				org.getPhoneNumber(),
				org.getCity(),
				org.getState(),
				org.getPostalCode(),
				sub != null ? sub.getPlanCodeSnapshot() : null,
				sub != null ? sub.getPlanNameSnapshot() : null,
				effStatus,
				sub != null ? sub.getBillingInterval() : null,
				sub != null ? sub.getExpiryDate() : null,
				enrolledStudents,
				effectiveLimit,
				limitReached,
				storage.totalStorageBytes(),
				org.getCreatedAt()
		);
	}

	private OrganizationAdminDetailResponse buildOrganizationDetail(Organization org) {
		long memberCount = membershipRepository
				.findAllByOrganizationIdAndStatusOrderByIdAsc(org.getId(), MembershipStatus.ACTIVE).size();
		Optional<OrganizationSubscription> subOpt = subscriptionRepository
				.findByOrganizationIdAndCurrentSubscriptionTrue(org.getId());
		OrganizationSubscriptionResponse currentSub = subOpt
				.map(s -> subscriptionService.toResponse(s, org))
				.orElse(null);

		OrganizationUsageResponse usage = entitlementService.getOrganizationUsage(org.getId());
		OrganizationEntitlementsResponse entitlements = entitlementService.getOrganizationEntitlements(org.getId());
		List<OrganizationStatusHistoryItem> statusHistory = statusHistoryRepository
				.findAllByOrganizationIdOrderByCreatedAtDescIdDesc(org.getId())
				.stream()
				.map(h -> new OrganizationStatusHistoryItem(
						h.getId(), h.getOrganizationId(), h.getPreviousStatus(),
						h.getNewStatus(), h.getReason(), h.getChangedBy(), h.getCreatedAt()))
				.toList();
		List<OrganizationSubscriptionHistoryItem> subHistory = subscriptionService.getSubscriptionHistory(org.getId());

		return new OrganizationAdminDetailResponse(
				org.getId(),
				org.getName(),
				org.getBoardAffiliation(),
				org.getStatus(),
				org.getAddress(),
				org.getCity(),
				org.getState(),
				org.getPostalCode(),
				org.getEmail(),
				org.getPhoneNumber(),
				org.getTimezone(),
				org.getCreatedAt(),
				org.getUpdatedAt(),
				memberCount,
				currentSub,
				usage,
				entitlements,
				statusHistory,
				subHistory
		);
	}

	private PlatformAdminUserResponse buildPlatformAdminUser(
			Users user, List<ActivePlatformRoleRow> activeRoles, Map<Long, Role> roles) {
		List<PlatformRoleBadge> badges = activeRoles.stream()
				.map(pur -> {
					Role r = roles.get(pur.roleId());
					return new PlatformRoleBadge(
							pur.roleId(),
							r != null ? r.getCode() : "UNKNOWN",
							r != null ? r.getName() : "Unknown",
							pur.assignedAt(),
							pur.assignedBy());
				})
				.toList();
		String fullName = ((user.getFirstName() != null ? user.getFirstName() : "") + " "
				+ (user.getLastName() != null ? user.getLastName() : "")).trim();
		return new PlatformAdminUserResponse(
				user.getId(),
				fullName,
				user.getEmail(),
				user.getStatus().name(),
				badges
		);
	}

	private long queryScalarLong(String sql) {
		Long val = jdbc.queryForObject(sql, Map.of(), Long.class);
		return val != null ? val : 0L;
	}

	private Organization requireOrganization(Long organizationId) {
		if (organizationId == null || organizationId <= 0) {
			throw new IllegalArgumentException("Organization ID must be a positive number");
		}
		return organizationRepository.findById(organizationId)
				.orElseThrow(() -> new EntityNotFoundException("Organization not found: " + organizationId));
	}

	private Long resolveCurrentUserIdSafely() {
		try {
			return currentUser.getUserId();
		} catch (Exception ex) {
			return null;
		}
	}
}
