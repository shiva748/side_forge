package com.side.forge.platform.saas;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.side.forge.authorization.entity.PlatformUserRole;
import com.side.forge.authorization.entity.Role;
import com.side.forge.authorization.entity.RoleScope;
import com.side.forge.authorization.repository.PlatformUserRoleRepository;
import com.side.forge.authorization.repository.RoleRepository;
import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;
import com.side.forge.organization.academic.schoolclass.repository.SchoolClassRepository;
import com.side.forge.organization.academic.session.entity.AcademicSession;
import com.side.forge.organization.academic.session.entity.AcademicSessionStatus;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.entity.BoardAffiliation;
import com.side.forge.organization.entity.CurrentManagementSystem;
import com.side.forge.organization.entity.OrganizationStatus;
import com.side.forge.organization.entity.StudentStrength;
import com.side.forge.organization.onboarding.dto.OnboardingRequestDto;
import com.side.forge.organization.onboarding.entity.OnboardingRequest;
import com.side.forge.organization.onboarding.service.OrganizationOnboardingService;
import com.side.forge.organization.student.profile.entity.Gender;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.entity.StudentStatus;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.platform.saas.dto.SaaSDtos.*;
import com.side.forge.platform.saas.entity.SubscriptionPlan;
import com.side.forge.platform.saas.enums.*;
import com.side.forge.platform.saas.repository.SubscriptionPlanRepository;
import com.side.forge.security.jwt.JwtService;
import com.side.forge.user.entity.UserStatus;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SaaSAdministrationIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	private ObjectMapper objectMapper;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private RoleRepository roleRepository;

	@Autowired
	private PlatformUserRoleRepository platformUserRoleRepository;

	@Autowired
	private OrganizationOnboardingService onboardingService;

	@Autowired
	private SubscriptionPlanRepository planRepository;

	@Autowired
	private AcademicSessionRepository sessionRepository;

	@Autowired
	private SchoolClassRepository classRepository;

	@Autowired
	private StudentRepository studentRepository;

	@Autowired
	private JwtService jwtService;

	private Users systemAdmin;
	private Users supportAdmin;
	private Users schoolAdmin;
	private Long orgId;
	private AcademicSession activeSession;
	private SchoolClass grade10;

	@BeforeEach
	void setUp() throws Exception {
		objectMapper = new ObjectMapper().findAndRegisterModules();

		String suffix = UUID.randomUUID().toString().substring(0, 8);
		systemAdmin = createUser("sysadmin." + suffix + "@forge.test", "System", "Admin", "+91900001" + suffix.substring(0, 4));
		seedPlatformRole(systemAdmin.getId(), "SYSTEM_ADMIN");

		supportAdmin = createUser("support." + suffix + "@forge.test", "Platform", "Support", "+91900002" + suffix.substring(0, 4));
		seedPlatformRole(supportAdmin.getId(), "PLATFORM_SUPPORT");

		schoolAdmin = createUser("schooladmin." + suffix + "@forge.test", "School", "Admin", "+91900003" + suffix.substring(0, 4));

		OnboardingRequestDto onboardingDto = new OnboardingRequestDto(
				"Apex International School " + suffix,
				BoardAffiliation.CBSE,
				"contact." + suffix + "@apex.edu",
				"+919876543210",
				"100 Knowledge Park",
				"Bengaluru",
				"Karnataka",
				"560001",
				"Dr. Meera Nair",
				"Principal",
				"meera." + suffix + "@apex.edu",
				"9876543210",
				StudentStrength.FROM_500_TO_1000,
				1,
				CurrentManagementSystem.PAPER_REGISTERS,
				"Full ERP migration"
		);

		OnboardingRequest req = onboardingService.submitOnboardingRequest(onboardingDto, schoolAdmin.getId());

		MvcResult approveRes = mockMvc.perform(post("/api/platform/onboarding/organizations/{id}/approve", req.getId())
				.with(auth(systemAdmin)))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode orgNode = objectMapper.readTree(approveRes.getResponse().getContentAsString());
		orgId = orgNode.get("id").asLong();

		activeSession = new AcademicSession();
		activeSession.setOrganizationId(orgId);
		activeSession.setName("2026-2027");
		activeSession.setStartDate(LocalDate.of(2026, 4, 1));
		activeSession.setEndDate(LocalDate.of(2027, 3, 31));
		activeSession.setStatus(AcademicSessionStatus.ACTIVE);
		activeSession.setActiveOrganizationId(orgId);
		activeSession = sessionRepository.save(activeSession);

		grade10 = new SchoolClass();
		grade10.setOrganizationId(orgId);
		grade10.setName("Grade 10");
		grade10.setCode("G10");
		grade10.setDisplayOrder(10);
		grade10.setActive(true);
		grade10 = classRepository.save(grade10);
	}

	@Test
	void defaultPlansAndCustomPlanLifecycle_shouldSucceedAndEnforcePlatformPermissions() throws Exception {
		// 1. Both SYSTEM_ADMIN and PLATFORM_SUPPORT can view seeded plans
		MvcResult plansRes = mockMvc.perform(get("/api/platform/plans")
				.with(auth(supportAdmin)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andReturn();
		JsonNode plansData = objectMapper.readTree(plansRes.getResponse().getContentAsString()).get("data");
		assertThat(plansData.size()).isGreaterThanOrEqualTo(4);

		// 2. PLATFORM_SUPPORT is forbidden from creating a plan
		CreateSubscriptionPlanRequest createReq = new CreateSubscriptionPlanRequest(
				"MINI_CAMPUS",
				"Mini Campus Plan",
				"Compact tier for micro schools",
				new BigDecimal("1999.00"),
				new BigDecimal("19990.00"),
				2,
				Set.of(
						PlatformFeature.ACADEMIC_MANAGEMENT,
						PlatformFeature.STUDENT_MANAGEMENT,
						PlatformFeature.STAFF_MANAGEMENT,
						PlatformFeature.ATTENDANCE
				),
				false,
				14,
				10,
				null
		);
		mockMvc.perform(post("/api/platform/plans")
				.with(auth(supportAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(createReq)))
				.andExpect(status().isForbidden());

		// 3. SYSTEM_ADMIN creates, updates, and toggles status of custom plan
		MvcResult createdPlanRes = mockMvc.perform(post("/api/platform/plans")
				.with(auth(systemAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(createReq)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.code").value("MINI_CAMPUS"))
				.andExpect(jsonPath("$.data.maxStudents").value(2))
				.andReturn();
		Long planId = objectMapper.readTree(createdPlanRes.getResponse().getContentAsString())
				.path("data").path("id").asLong();

		UpdateSubscriptionPlanRequest updateReq = new UpdateSubscriptionPlanRequest(
				"Mini Campus Plus",
				"Updated description",
				new BigDecimal("2499.00"),
				new BigDecimal("24990.00"),
				3,
				Set.of(
						PlatformFeature.ACADEMIC_MANAGEMENT,
						PlatformFeature.STUDENT_MANAGEMENT,
						PlatformFeature.STAFF_MANAGEMENT,
						PlatformFeature.ATTENDANCE,
						PlatformFeature.TIMETABLE
				),
				false,
				21,
				10,
				null
		);
		mockMvc.perform(put("/api/platform/plans/{planId}", planId)
				.with(auth(systemAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(updateReq)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.name").value("Mini Campus Plus"))
				.andExpect(jsonPath("$.data.maxStudents").value(3));
	}

	@Test
	void onboardingApprovalAndFeatureEntitlementsWithOverrides_shouldEnforceSubscriptionSeparatelyFromRbac() throws Exception {
		// 1. Verify onboarding approval automatically provisioned a STARTER TRIAL subscription
		mockMvc.perform(get("/api/platform/organizations/{orgId}/subscriptions/current", orgId)
				.with(auth(systemAdmin)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.planCode").value("STARTER"))
				.andExpect(jsonPath("$.data.status").value("TRIAL"))
				.andExpect(jsonPath("$.data.trial").value(true))
				.andExpect(jsonPath("$.data.planStudentLimit").value(150));

		// 2. Core modules included in STARTER (e.g., Students, Academic Sessions) work for SCHOOL_ADMIN
		mockMvc.perform(get("/api/organizations/{orgId}/students", orgId)
				.with(auth(schoolAdmin)))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions", orgId)
				.with(auth(schoolAdmin)))
				.andExpect(status().isOk());

		// 3. Modules NOT included in STARTER (Homework, Fees, Examinations) are blocked (403 Forbidden)
		// even though SCHOOL_ADMIN has the RBAC permissions for them!
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sessionId}/homework", orgId, activeSession.getId())
				.with(auth(schoolAdmin)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Homework & Assignments")));

		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sessionId}/fee-structures", orgId, activeSession.getId())
				.with(auth(schoolAdmin)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Fees & Finance")));

		mockMvc.perform(get("/api/organizations/{orgId}/grading-scales", orgId)
				.with(auth(schoolAdmin)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Examination & Results")));

		// 4. Platform Admin enables an organization-level feature override for HOMEWORK_AND_ASSIGNMENTS
		UpdateFeatureEntitlementOverrideRequest overrideReq = new UpdateFeatureEntitlementOverrideRequest(
				true,
				"Granted pilot access to Homework module during trial",
				LocalDate.now().plusDays(15)
		);
		mockMvc.perform(put("/api/platform/organizations/{orgId}/entitlements/{feature}",
				orgId, PlatformFeature.HOMEWORK_AND_ASSIGNMENTS)
				.with(auth(systemAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(overrideReq)))
				.andExpect(status().isOk());

		// 5. Now SCHOOL_ADMIN can access Homework!
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sessionId}/homework", orgId, activeSession.getId())
				.with(auth(schoolAdmin)))
				.andExpect(status().isOk());

		// 6. Removing the feature override blocks Homework again
		mockMvc.perform(delete("/api/platform/organizations/{orgId}/entitlements/{feature}",
				orgId, PlatformFeature.HOMEWORK_AND_ASSIGNMENTS)
				.with(auth(systemAdmin))
				.with(csrf()))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sessionId}/homework", orgId, activeSession.getId())
				.with(auth(schoolAdmin)))
				.andExpect(status().isForbidden());
	}

	@Test
	void studentLimitEnforcement_withdrawalCapacityRelease_andTemporaryOverride_shouldWorkEndToEnd() throws Exception {
		// 1. Create a plan with maxStudents = 2 and assign it to the organization
		SubscriptionPlan twoStudentPlan = new SubscriptionPlan();
		twoStudentPlan.setCode("MICRO_2");
		twoStudentPlan.setName("Micro 2 Plan");
		twoStudentPlan.setMonthlyPrice(new BigDecimal("1000.00"));
		twoStudentPlan.setYearlyPrice(new BigDecimal("10000.00"));
		twoStudentPlan.setMaxStudents(2);
		twoStudentPlan.setDefaultTrialDays(14);
		twoStudentPlan.setActive(true);
		twoStudentPlan.setIncludedFeatures(Set.of(
				PlatformFeature.ACADEMIC_MANAGEMENT,
				PlatformFeature.STUDENT_MANAGEMENT,
				PlatformFeature.STAFF_MANAGEMENT,
				PlatformFeature.ATTENDANCE
		));
		twoStudentPlan = planRepository.save(twoStudentPlan);

		AssignSubscriptionRequest assignReq = new AssignSubscriptionRequest(
				twoStudentPlan.getId(),
				BillingInterval.MONTHLY,
				false,
				null,
				LocalDate.now(),
				new BigDecimal("1000.00"),
				"Assigned 2-student micro plan"
		);
		mockMvc.perform(post("/api/platform/organizations/{orgId}/subscriptions", orgId)
				.with(auth(systemAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(assignReq)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.effectiveStudentLimit").value(2));

		Student s1 = createStudent("ADM-001", "Aarav");
		Student s2 = createStudent("ADM-002", "Diya");
		Student s3 = createStudent("ADM-003", "Kabir");
		Student s4 = createStudent("ADM-004", "Meera");

		// 2. Enroll Student 1 & Student 2 -> both succeed
		Long enrollment1Id = enrollStudentViaApi(s1.getId(), "R-01");
		enrollStudentViaApi(s2.getId(), "R-02");

		// 3. Attempting to enroll Student 3 is blocked (limit = 2 reached!)
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
				.with(auth(schoolAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "studentId": %d,
						  "academicSessionId": %d,
						  "classId": %d,
						  "rollNumber": "R-03"
						}
						""".formatted(s3.getId(), activeSession.getId(), grade10.getId())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("enrollment limit reached")));

		// 4. Existing student records remain accessible
		mockMvc.perform(get("/api/organizations/{orgId}/students", orgId)
				.with(auth(schoolAdmin)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(4));

		// 5. Withdraw Student 1 -> frees 1 active enrollment slot, allowing Student 3 to enroll!
		mockMvc.perform(patch("/api/organizations/{orgId}/enrollments/{enrollmentId}/status", orgId, enrollment1Id)
				.with(auth(schoolAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"status": "WITHDRAWN", "remarks": "Family relocated"}
						"""))
				.andExpect(status().isOk());

		enrollStudentViaApi(s3.getId(), "R-03");

		// 6. Grant a temporary student limit override (limit = 3) -> Student 4 can now enroll!
		UpdateStudentLimitOverrideRequest limitOverride = new UpdateStudentLimitOverrideRequest(
				3,
				"Approved mid-term expansion buffer",
				LocalDate.now().plusDays(30)
		);
		mockMvc.perform(put("/api/platform/organizations/{orgId}/student-limit-override", orgId)
				.with(auth(systemAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(limitOverride)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.effectiveStudentLimit").value(3));

		enrollStudentViaApi(s4.getId(), "R-04");
	}

	@Test
	void subscriptionUpgrade_manualBillingAndReceiptExport_andHistoricalPreservation_shouldWorkEndToEnd() throws Exception {
		SubscriptionPlan proPlan = planRepository.findByCodeIgnoreCase("PROFESSIONAL").orElseThrow();

		// 1. Upgrade organization subscription from STARTER trial to PROFESSIONAL Yearly
		ChangeSubscriptionPlanRequest upgradeReq = new ChangeSubscriptionPlanRequest(
				proPlan.getId(),
				BillingInterval.YEARLY,
				LocalDate.now(),
				new BigDecimal("199990.00"),
				"Upgraded to Professional annual contract"
		);
		mockMvc.perform(post("/api/platform/organizations/{orgId}/subscriptions/change-plan", orgId)
				.with(auth(systemAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(upgradeReq)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.planCode").value("PROFESSIONAL"))
				.andExpect(jsonPath("$.data.status").value("ACTIVE"))
				.andExpect(jsonPath("$.data.outstandingAmount").value(199990.00));

		// 2. Verify previous subscription row is preserved alongside current subscription
		MvcResult recordsRes = mockMvc.perform(get("/api/platform/organizations/{orgId}/subscriptions/records", orgId)
				.with(auth(systemAdmin)))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode records = objectMapper.readTree(recordsRes.getResponse().getContentAsString()).path("data");
		assertThat(records.size()).isEqualTo(2);

		// 3. Record manual payment via BANK_TRANSFER
		RecordSubscriptionPaymentRequest paymentReq = new RecordSubscriptionPaymentRequest(
				LocalDate.now(),
				new BigDecimal("199990.00"),
				new BigDecimal("199990.00"),
				SubscriptionPaymentMethod.BANK_TRANSFER,
				"NEFT-UTR-99887766",
				LocalDate.now(),
				LocalDate.now().plusYears(1).minusDays(1),
				false,
				"Annual subscription wire transfer received"
		);
		MvcResult payRes = mockMvc.perform(post("/api/platform/organizations/{orgId}/billing/payments", orgId)
				.with(auth(systemAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(paymentReq)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status").value("PAID"))
				.andExpect(jsonPath("$.data.amountReceived").value(199990.00))
				.andReturn();
		Long paymentId = objectMapper.readTree(payRes.getResponse().getContentAsString())
				.path("data").path("id").asLong();

		// 4. Verify billing summary & export receipt as PDF from both platform and school endpoints
		mockMvc.perform(get("/api/platform/organizations/{orgId}/billing", orgId)
				.with(auth(systemAdmin)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.currentPeriodPaidAmount").value(199990.00))
				.andExpect(jsonPath("$.data.currentPeriodOutstandingAmount").value(0.00));

		MvcResult pdfRes = mockMvc.perform(
				get("/api/platform/organizations/{orgId}/billing/payments/{paymentId}/receipt/export", orgId, paymentId)
						.param("format", "PDF")
						.with(auth(systemAdmin)))
				.andExpect(status().isOk())
				.andExpect(header().string("Content-Type", "application/pdf"))
				.andReturn();
		assertThat(pdfRes.getResponse().getContentAsByteArray()).isNotEmpty();

		// 5. School Admin can view their subscription, entitlements, usage, and export their receipt
		mockMvc.perform(get("/api/organizations/{orgId}/subscription", orgId)
				.with(auth(schoolAdmin)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.planCode").value("PROFESSIONAL"));
		mockMvc.perform(get("/api/organizations/{orgId}/subscription/usage", orgId)
				.with(auth(schoolAdmin)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.effectiveStudentLimit").value(1500));
		mockMvc.perform(get("/api/organizations/{orgId}/subscription/payments/{paymentId}/receipt/export", orgId, paymentId)
				.param("format", "CSV")
				.with(auth(schoolAdmin)))
				.andExpect(status().isOk());
	}

	@Test
	void organizationSuspension_reactivation_platformDashboard_andAuditLogs_shouldWorkEndToEnd() throws Exception {
		// 1. Suspend organization with a mandatory reason
		ChangeOrganizationStatusRequest suspendReq = new ChangeOrganizationStatusRequest(
				OrganizationStatus.SUSPENDED,
				"Invoice overdue beyond 45-day grace period"
		);
		mockMvc.perform(patch("/api/platform/organizations/{orgId}/status", orgId)
				.with(auth(systemAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(suspendReq)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("SUSPENDED"));

		// 2. School operations are immediately rejected while organization is SUSPENDED
		mockMvc.perform(get("/api/organizations/{orgId}/students", orgId)
				.with(auth(schoolAdmin)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("SUSPENDED")));

		// 3. Reactivate organization -> school operations resume working immediately
		ChangeOrganizationStatusRequest reactivateReq = new ChangeOrganizationStatusRequest(
				OrganizationStatus.ACTIVE,
				"Overdue balance settled and account reactivated"
		);
		MvcResult detailRes = mockMvc.perform(patch("/api/platform/organizations/{orgId}/status", orgId)
				.with(auth(systemAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(reactivateReq)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("ACTIVE"))
				.andReturn();

		JsonNode statusHistory = objectMapper.readTree(detailRes.getResponse().getContentAsString())
				.path("data").path("statusHistory");
		assertThat(statusHistory.size()).isEqualTo(3);

		mockMvc.perform(get("/api/organizations/{orgId}/students", orgId)
				.with(auth(schoolAdmin)))
				.andExpect(status().isOk());

		// 4. Platform Dashboard, Organization Search, and Audit Logs return accurate operational data
		mockMvc.perform(get("/api/platform/dashboard")
				.with(auth(systemAdmin)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalOrganizations").isNumber())
				.andExpect(jsonPath("$.data.activeOrganizations").isNumber());

		mockMvc.perform(get("/api/platform/organizations")
				.param("status", "ACTIVE")
				.param("planCode", "STARTER")
				.with(auth(systemAdmin)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").isNumber());

		mockMvc.perform(get("/api/platform/audit-logs")
				.param("targetOrganizationId", orgId.toString())
				.with(auth(systemAdmin)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.content").isArray())
				.andExpect(jsonPath("$.data.totalElements").value(org.hamcrest.Matchers.greaterThanOrEqualTo(4)));
	}

	private Long enrollStudentViaApi(Long studentId, String rollNumber) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
				.with(auth(schoolAdmin))
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "studentId": %d,
						  "academicSessionId": %d,
						  "classId": %d,
						  "rollNumber": "%s"
						}
						""".formatted(studentId, activeSession.getId(), grade10.getId(), rollNumber)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString())
				.path("data").path("id").asLong();
	}

	private Users createUser(String email, String firstName, String lastName, String phone) {
		Users u = new Users();
		u.setEmail(email);
		u.setFirstName(firstName);
		u.setLastName(lastName);
		u.setPhoneNumber(phone);
		u.setPasswordHash("hashed");
		u.setStatus(UserStatus.ACTIVE);
		u.setEmailVerified(true);
		return userRepository.save(u);
	}

	private Student createStudent(String admissionNumber, String firstName) {
		Student s = new Student();
		s.setOrganizationId(orgId);
		s.setAdmissionNumber(admissionNumber);
		s.setFirstName(firstName);
		s.setLastName("Sharma");
		s.setDateOfBirth(LocalDate.of(2012, 5, 10));
		s.setGender(Gender.MALE);
		s.setAdmissionDate(LocalDate.of(2026, 4, 1));
		s.setStatus(StudentStatus.ACTIVE);
		return studentRepository.save(s);
	}

	private void seedPlatformRole(Long userId, String roleCode) {
		Role role = roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.PLATFORM, null)
				.orElseThrow(() -> new IllegalStateException("Platform role not found: " + roleCode));
		if (platformUserRoleRepository.findByUserIdAndRoleId(userId, role.getId()).isEmpty()) {
			platformUserRoleRepository.save(new PlatformUserRole(userId, role.getId(), userId));
		}
	}

	private static RequestPostProcessor csrf() {
		return request -> request;
	}

	private RequestPostProcessor auth(Users user) {
		String token = jwtService.generateToken(user);
		return request -> {
			request.setCookies(new Cookie("jwt", token));
			return request;
		};
	}
}
