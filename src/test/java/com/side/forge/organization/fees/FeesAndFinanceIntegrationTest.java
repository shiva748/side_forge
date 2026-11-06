package com.side.forge.organization.fees;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.side.forge.authorization.entity.*;
import com.side.forge.authorization.repository.*;
import com.side.forge.organization.entity.*;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.security.jwt.JwtService;
import com.side.forge.user.entity.*;
import com.side.forge.user.repository.UserRepository;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
class FeesAndFinanceIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	private final ObjectMapper objectMapper = new ObjectMapper();

	@Autowired
	private UserRepository userRepository;
	@Autowired
	private OrganizationRepository organizationRepository;
	@Autowired
	private RoleRepository roleRepository;
	@Autowired
	private OrganizationMembershipRepository membershipRepository;
	@Autowired
	private MembershipRoleRepository membershipRoleRepository;
	@Autowired
	private JwtService jwtService;
	@Autowired
	private NamedParameterJdbcTemplate jdbc;

	private final List<Long> createdOrgIds = new ArrayList<>();
	private final List<Long> createdUserIds = new ArrayList<>();

	private Organization orgA;
	private Organization orgB;
	private Cookie adminOrgACookie;
	private Cookie accountantOrgACookie;
	private Cookie receptionistOrgACookie;
	private Cookie teacherOrgACookie;
	private Cookie adminOrgBCookie;

	@BeforeEach
	void setUp() {
		orgA = createOrganization("Heritage Public School", "Asia/Kolkata");
		orgB = createOrganization("Metro High School", "UTC");

		Users adminA = createUser("feeAdminA");
		assignOrgRole(adminA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgACookie = jwtCookie(adminA);

		Users accountantA = createUser("feeAccountantA");
		assignOrgRole(accountantA.getId(), orgA.getId(), "ACCOUNTANT", MembershipStatus.ACTIVE);
		accountantOrgACookie = jwtCookie(accountantA);

		Users receptionistA = createUser("feeReceptionistA");
		assignOrgRole(receptionistA.getId(), orgA.getId(), "RECEPTIONIST", MembershipStatus.ACTIVE);
		receptionistOrgACookie = jwtCookie(receptionistA);

		Users teacherA = createUser("feeTeacherA");
		assignOrgRole(teacherA.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacherOrgACookie = jwtCookie(teacherA);

		Users adminB = createUser("feeAdminB");
		assignOrgRole(adminB.getId(), orgB.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgBCookie = jwtCookie(adminB);
	}

	@AfterEach
	void tearDown() {
		for (Long orgId : createdOrgIds) {
			jdbc.update("DELETE FROM fee_audit_logs WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM fee_payment_allocations WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM fee_payments WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM student_fee_demands WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM student_fee_concessions WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM student_fee_assignments WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM class_fee_structure_components WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM class_fee_structures WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM student_enrollments WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM students WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM classes WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM academic_sessions WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("""
					DELETE mr FROM membership_roles mr
					JOIN organization_memberships m ON m.id = mr.membership_id
					WHERE m.organization_id = :orgId
					""", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM organization_memberships WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM organizations WHERE id = :orgId", Map.of("orgId", orgId));
		}
		for (Long userId : createdUserIds) {
			jdbc.update("DELETE FROM users WHERE id = :userId", Map.of("userId", userId));
		}
		createdOrgIds.clear();
		createdUserIds.clear();
	}

	private Organization createOrganization(String namePrefix, String timezone) {
		Organization org = new Organization();
		org.setName(namePrefix + "-" + UUID.randomUUID().toString().substring(0, 8));
		org.setBoardAffiliation(BoardAffiliation.CBSE);
		org.setEmail("info@" + UUID.randomUUID().toString().substring(0, 8) + ".edu");
		org.setPhoneNumber("9876543210");
		org.setAddress("100 Finance Road");
		org.setCity("Bengaluru");
		org.setState("Karnataka");
		org.setPostalCode("560001");
		org.setTimezone(timezone);
		org.setStatus(OrganizationStatus.ACTIVE);
		org = organizationRepository.save(org);
		createdOrgIds.add(org.getId());
		return org;
	}

	private Users createUser(String prefix) {
		String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
		Users user = new Users();
		user.setFirstName(prefix);
		user.setLastName("User");
		user.setEmail(prefix + "." + suffix + "@example.com");
		user.setPhoneNumber("+919" + String.format("%09d", Math.abs(suffix.hashCode()) % 1_000_000_000));
		user.setPasswordHash("$2a$10$abcdefghijklmnopqrstuv");
		user.setStatus(UserStatus.ACTIVE);
		user = userRepository.save(user);
		createdUserIds.add(user.getId());
		return user;
	}

	private void assignOrgRole(Long userId, Long orgId, String roleCode, MembershipStatus status) {
		OrganizationMembership membership = OrganizationMembership.active(userId, orgId);
		membership.changeStatus(status);
		membership = membershipRepository.save(membership);

		Role role = roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.ORGANIZATION, null)
				.orElseThrow();
		membershipRoleRepository.save(new MembershipRole(membership.getId(), role.getId(), userId));
	}

	private Cookie jwtCookie(Users user) {
		return new Cookie("jwt", jwtService.generateToken(user));
	}

	private Long extractId(MvcResult result) throws Exception {
		JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
		return root.path("data").path("id").asLong();
	}

	private Long createStudent(Long orgId, String admNo, String firstName) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/students", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "admissionNumber": "%s",
								  "firstName": "%s",
								  "lastName": "Student",
								  "dateOfBirth": "2015-03-10",
								  "gender": "MALE",
								  "admissionDate": "2026-04-01"
								}
								""".formatted(admNo, firstName)))
				.andExpect(status().isCreated())
				.andReturn();
		return extractId(res);
	}

	@Test
	void feeStructureAndAutomaticStudentApplication_beforeAndAfterPublication_midSessionAdmission_andIdempotency() throws Exception {
		Long orgId = orgA.getId();

		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\",\"startDate\":\"2026-04-01\",\"endDate\":\"2027-03-31\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long class1 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 1\",\"code\":\"C1\",\"displayOrder\":1}"))
				.andExpect(status().isCreated())
				.andReturn());

		// 1. Enroll stuBefore BEFORE fee structure is created/published
		Long stuBefore = createStudent(orgId, "ADM-101", "Rohan");
		Long enrollBefore = extractId(mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"studentId\":" + stuBefore + ",\"academicSessionId\":" + sessionId + ",\"classId\":" + class1 + ",\"enrollmentDate\":\"2026-04-01\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		// 2. Create Class 1 Fee Structure with Monthly Tuition (₹2,000 for months 4,5,6), Yearly Development (₹5,000), and One-Time Admission (₹1,500)
		Long structureId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/fee-structures", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "classId": %d,
								  "name": "Class 1 Standard Fees 2026-27",
								  "effectiveFromDate": "2026-04-01",
								  "components": [
								    {
								      "name": "Tuition Fee",
								      "code": "TUITION",
								      "category": "TUITION",
								      "frequency": "MONTHLY",
								      "amount": 2000.00,
								      "applicableMonths": [4, 5, 6],
								      "dueDayOfMonth": 10,
								      "lateFeeType": "PER_DAY",
								      "lateFeeAmount": 50.00,
								      "lateFeeGraceDays": 5,
								      "lateFeeCap": 300.00
								    },
								    {
								      "name": "Annual Development Fee",
								      "code": "DEV_FEE",
								      "category": "DEVELOPMENT",
								      "frequency": "YEARLY",
								      "amount": 5000.00,
								      "dueDate": "2026-04-20"
								    },
								    {
								      "name": "New Admission Charge",
								      "code": "ADM_FEE",
								      "category": "ADMISSION",
								      "frequency": "ONE_TIME",
								      "amount": 1500.00,
								      "dueDate": "2026-04-15",
								      "oneTimeTrigger": "ON_ADMISSION"
								    }
								  ]
								}
								""".formatted(sessionId, class1)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status").value("DRAFT"))
				.andExpect(jsonPath("$.data.totalMonthlyAmount").value(2000.0))
				.andExpect(jsonPath("$.data.totalYearlyAmount").value(5000.0))
				.andExpect(jsonPath("$.data.totalOneTimeAmount").value(1500.0))
				.andExpect(jsonPath("$.data.totalAnnualEstimatedAmount").value(12500.0))
				.andReturn());

		// 3. Publish structure -> stuBefore automatically receives 3 monthly + 1 yearly + 1 one-time = ₹12,500
		mockMvc.perform(patch("/api/organizations/{orgId}/fee-structures/{id}/publish", orgId, structureId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("PUBLISHED"));

		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/financial-profile", orgId, stuBefore)
						.param("academicSessionId", sessionId.toString())
						.cookie(accountantOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.monthlyDemands.length()").value(3))
				.andExpect(jsonPath("$.data.yearlyAndOneTimeDemands.length()").value(2))
				.andExpect(jsonPath("$.data.totalBaseFees").value(12500.0))
				.andExpect(jsonPath("$.data.totalOutstandingBalance").value(12500.0));

		// 4. Enroll stuAfter AFTER publication -> automatically receives the same 5 demands on enrollment
		Long stuAfter = createStudent(orgId, "ADM-102", "Sneha");
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"studentId\":" + stuAfter + ",\"academicSessionId\":" + sessionId + ",\"classId\":" + class1 + ",\"enrollmentDate\":\"2026-04-01\"}"))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/financial-profile", orgId, stuAfter)
						.param("academicSessionId", sessionId.toString())
						.cookie(receptionistOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.monthlyDemands.length()").value(3))
				.andExpect(jsonPath("$.data.yearlyAndOneTimeDemands.length()").value(2))
				.andExpect(jsonPath("$.data.totalBaseFees").value(12500.0));

		// 5. Enroll stuMidSession in June (2026-06-05) -> receives only June monthly (₹2,000) + Yearly (₹5,000) + One-Time (₹1,500) = ₹8,500
		Long stuMid = createStudent(orgId, "ADM-103", "Kabir");
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"studentId\":" + stuMid + ",\"academicSessionId\":" + sessionId + ",\"classId\":" + class1 + ",\"enrollmentDate\":\"2026-06-05\"}"))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/financial-profile", orgId, stuMid)
						.param("academicSessionId", sessionId.toString())
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.monthlyDemands.length()").value(1))
				.andExpect(jsonPath("$.data.monthlyDemands[0].periodLabel").value("2026-06"))
				.andExpect(jsonPath("$.data.yearlyAndOneTimeDemands.length()").value(2))
				.andExpect(jsonPath("$.data.totalBaseFees").value(8500.0));

		// 6. Triggering fee generation again for enrollBefore does not create duplicate demands
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments/{eId}/generate-fees", orgId, enrollBefore)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(5));
	}

	@Test
	void paymentsAllocationsConcessionsWaiversLateFeesReversalsRefundsAndConcurrency() throws Exception {
		Long orgId = orgA.getId();

		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\",\"startDate\":\"2026-04-01\",\"endDate\":\"2027-03-31\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long class2 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 2\",\"code\":\"C2\",\"displayOrder\":2}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long structureId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/fee-structures", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "classId": %d,
								  "name": "Class 2 Fees",
								  "components": [
								    {
								      "name": "Tuition Fee",
								      "code": "TUITION",
								      "category": "TUITION",
								      "frequency": "MONTHLY",
								      "amount": 2500.00,
								      "applicableMonths": [4, 5, 6],
								      "dueDayOfMonth": 10,
								      "lateFeeType": "PER_DAY",
								      "lateFeeAmount": 50.00,
								      "lateFeeGraceDays": 5,
								      "lateFeeCap": 200.00
								    },
								    {
								      "name": "Annual Fee",
								      "code": "ANNUAL",
								      "category": "DEVELOPMENT",
								      "frequency": "YEARLY",
								      "amount": 6000.00,
								      "dueDate": "2026-04-20"
								    }
								  ]
								}
								""".formatted(sessionId, class2)))
				.andExpect(status().isCreated())
				.andReturn());
		mockMvc.perform(patch("/api/organizations/{orgId}/fee-structures/{id}/publish", orgId, structureId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		Long studentId = createStudent(orgId, "ADM-201", "Ananya");
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"studentId\":" + studentId + ",\"academicSessionId\":" + sessionId + ",\"classId\":" + class2 + ",\"enrollmentDate\":\"2026-04-01\"}"))
				.andExpect(status().isCreated());

		// 1. Apply 20% Scholarship Concession on TUITION -> each ₹2,500 monthly tuition gets ₹500 concession (net ₹2,000)
		mockMvc.perform(post("/api/organizations/{orgId}/students/{sId}/concessions", orgId, studentId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "componentCode": "TUITION",
								  "concessionType": "PERCENTAGE",
								  "value": 20.0,
								  "reason": "Merit Scholarship"
								}
								""".formatted(sessionId)))
				.andExpect(status().isCreated());

		JsonNode profile1 = objectMapper.readTree(mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/financial-profile", orgId, studentId)
						.param("academicSessionId", sessionId.toString())
						.cookie(accountantOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalBaseFees").value(13500.0))
				.andExpect(jsonPath("$.data.totalConcessionsAndWaivers").value(1500.0))
				.andExpect(jsonPath("$.data.totalNetPayableFees").value(12000.0))
				.andReturn().getResponse().getContentAsString()).path("data");

		Long aprDemandId = profile1.path("monthlyDemands").get(0).path("id").asLong();
		Long mayDemandId = profile1.path("monthlyDemands").get(1).path("id").asLong();
		Long junDemandId = profile1.path("monthlyDemands").get(2).path("id").asLong();
		Long annualDemandId = profile1.path("yearlyAndOneTimeDemands").get(0).path("id").asLong();

		// 2. Evaluate late fees as of 2026-04-18 (April due 2026-04-10 + 5 grace days = 2026-04-15 -> 3 days late * ₹50 = ₹150 late fee)
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/fee-demands/evaluate-late-fees", orgId, sessionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"evaluationDate\":\"2026-04-18\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].lateFeeAmount").value(150.0))
				.andExpect(jsonPath("$.data[0].netPayableAmount").value(2150.0))
				.andExpect(jsonPath("$.data[0].status").value("OVERDUE"));

		// 3. Full waiver on June demand (₹2,000) -> status WAIVED, original baseAmount (₹2,500) preserved
		mockMvc.perform(patch("/api/organizations/{orgId}/fee-demands/{dId}/waive", orgId, junDemandId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"reason\":\"Hardship waiver for June\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.baseAmount").value(2500.0))
				.andExpect(jsonPath("$.data.concessionAmount").value(2500.0))
				.andExpect(jsonPath("$.data.outstandingAmount").value(0.0))
				.andExpect(jsonPath("$.data.status").value("WAIVED"));

		// 4. Multi-month + partial payment with overpayment account credit:
		// Pay ₹5,000 via UPI allocated to April (full ₹2,150) + May (full ₹2,000) + Annual (partial ₹500) -> allocated ₹4,650, unapplied credit ₹350
		Long payment1Id = extractId(mockMvc.perform(post("/api/organizations/{orgId}/fee-payments", orgId)
						.cookie(accountantOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "studentId": %d,
								  "paymentDate": "2026-04-19",
								  "totalAmount": 5000.00,
								  "paymentMethod": "UPI",
								  "referenceNumber": "UPI-REF-9001",
								  "idempotencyKey": "IDEM-1001",
								  "allocations": [
								    {"demandId": %d, "amount": 2150.00},
								    {"demandId": %d, "amount": 2000.00},
								    {"demandId": %d, "amount": 500.00}
								  ]
								}
								""".formatted(sessionId, studentId, aprDemandId, mayDemandId, annualDemandId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.allocatedAmount").value(4650.0))
				.andExpect(jsonPath("$.data.unappliedCreditAmount").value(350.0))
				.andExpect(jsonPath("$.data.status").value("COMPLETED"))
				.andReturn());

		// Duplicate payment with same idempotencyKey -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/fee-payments", orgId)
						.cookie(accountantOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "studentId": %d,
								  "paymentDate": "2026-04-19",
								  "totalAmount": 5000.00,
								  "paymentMethod": "UPI",
								  "idempotencyKey": "IDEM-1001",
								  "allocations": [{"demandId": %d, "amount": 500.00}]
								}
								""".formatted(sessionId, studentId, annualDemandId)))
				.andExpect(status().isConflict());

		// 5. Concurrent payment recording against remaining ₹5,500 on annualDemandId -> 1 succeeds (201), 1 fails (409)
		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch startGun = new CountDownLatch(1);
		AtomicInteger createdCount = new AtomicInteger(0);
		AtomicInteger conflictCount = new AtomicInteger(0);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Callable<Void> task = () -> {
				ready.countDown();
				startGun.await(5, TimeUnit.SECONDS);
				int st = mockMvc.perform(post("/api/organizations/{orgId}/fee-payments", orgId)
								.cookie(accountantOrgACookie)
								.contentType(MediaType.APPLICATION_JSON)
								.content("""
										{
										  "academicSessionId": %d,
										  "studentId": %d,
										  "paymentDate": "2026-04-20",
										  "totalAmount": 5500.00,
										  "paymentMethod": "CASH",
										  "allocations": [{"demandId": %d, "amount": 5500.00}]
										}
										""".formatted(sessionId, studentId, annualDemandId)))
						.andReturn().getResponse().getStatus();
				if (st == 201) createdCount.incrementAndGet();
				else if (st == 409) conflictCount.incrementAndGet();
				return null;
			};
			Future<Void> f1 = pool.submit(task);
			Future<Void> f2 = pool.submit(task);
			assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
			startGun.countDown();
			f1.get(10, TimeUnit.SECONDS);
			f2.get(10, TimeUnit.SECONDS);
		} finally {
			pool.shutdownNow();
		}
		assertThat(createdCount.get()).isEqualTo(1);
		assertThat(conflictCount.get()).isEqualTo(1);

		// 6. Refund ₹350 unapplied credit from payment1 -> PARTIALLY_REFUNDED, then reverse the ₹5,500 CASH payment
		mockMvc.perform(post("/api/organizations/{orgId}/fee-payments/{pId}/refund", orgId, payment1Id)
						.cookie(accountantOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"refundAmount\":350.00,\"reason\":\"Refunded excess UPI overpayment\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("PARTIALLY_REFUNDED"))
				.andExpect(jsonPath("$.data.unappliedCreditAmount").value(0.0))
				.andExpect(jsonPath("$.data.refundedAmount").value(350.0));
	}

	@Test
	void feeStructureRevisions_classChangeAdjustment_sessionDashboardReports_andCrossTenantSecurity() throws Exception {
		Long orgId = orgA.getId();
		Long orgBId = orgB.getId();

		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\",\"startDate\":\"2026-04-01\",\"endDate\":\"2027-03-31\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long class1 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 1\",\"code\":\"C1\",\"displayOrder\":1}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long class2 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 2\",\"code\":\"C2\",\"displayOrder\":2}"))
				.andExpect(status().isCreated())
				.andReturn());

		// Class 1 v1 structure: Monthly Tuition ₹2,000 for months 4, 5, 6
		Long c1StructureV1 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/fee-structures", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "classId": %d,
								  "name": "Class 1 v1",
								  "components": [
								    {
								      "name": "Tuition Fee",
								      "code": "TUITION",
								      "category": "TUITION",
								      "frequency": "MONTHLY",
								      "amount": 2000.00,
								      "applicableMonths": [4, 5, 6],
								      "dueDayOfMonth": 10
								    }
								  ]
								}
								""".formatted(sessionId, class1)))
				.andExpect(status().isCreated())
				.andReturn());
		mockMvc.perform(patch("/api/organizations/{orgId}/fee-structures/{id}/publish", orgId, c1StructureV1)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		// Class 2 structure: Monthly Tuition ₹3,000 for months 4, 5, 6
		Long c2Structure = extractId(mockMvc.perform(post("/api/organizations/{orgId}/fee-structures", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "classId": %d,
								  "name": "Class 2 v1",
								  "components": [
								    {
								      "name": "Tuition Fee",
								      "code": "TUITION",
								      "category": "TUITION",
								      "frequency": "MONTHLY",
								      "amount": 3000.00,
								      "applicableMonths": [4, 5, 6],
								      "dueDayOfMonth": 10
								    }
								  ]
								}
								""".formatted(sessionId, class2)))
				.andExpect(status().isCreated())
				.andReturn());
		mockMvc.perform(patch("/api/organizations/{orgId}/fee-structures/{id}/publish", orgId, c2Structure)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		Long stu1 = createStudent(orgId, "ADM-301", "Arjun");
		Long enroll1 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"studentId\":" + stu1 + ",\"academicSessionId\":" + sessionId + ",\"classId\":" + class1 + ",\"enrollmentDate\":\"2026-04-01\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		// Pay April demand (₹2,000) under Class 1 v1
		JsonNode profBeforeRev = objectMapper.readTree(mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/financial-profile", orgId, stu1)
						.param("academicSessionId", sessionId.toString())
						.cookie(accountantOrgACookie))
				.andReturn().getResponse().getContentAsString()).path("data");
		Long aprDemand = profBeforeRev.path("monthlyDemands").get(0).path("id").asLong();

		mockMvc.perform(post("/api/organizations/{orgId}/fee-payments", orgId)
						.cookie(accountantOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"academicSessionId\":" + sessionId + ",\"studentId\":" + stu1 + ",\"paymentDate\":\"2026-04-05\",\"totalAmount\":2000.00,\"paymentMethod\":\"BANK_TRANSFER\",\"allocations\":[{\"demandId\":" + aprDemand + "}] }"))
				.andExpect(status().isCreated());

		// 1. Direct modification of PUBLISHED c1StructureV1 is rejected (409)
		mockMvc.perform(put("/api/organizations/{orgId}/fee-structures/{id}", orgId, c1StructureV1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "classId": %d,
								  "name": "Attempt Silent Edit",
								  "components": [{"name":"Tuition","code":"TUITION","category":"TUITION","frequency":"MONTHLY","amount":9999.00}]
								}
								""".formatted(sessionId, class1)))
				.andExpect(status().isConflict());

		// 2. Revise Class 1 structure to v2 (₹2,200 effective 2026-06-01):
		// April (PAID, v1=₹2,000) and May (dueDate 2026-05-10 < 2026-06-01, v1=₹2,000) stay v1; June (dueDate 2026-06-10 >= 2026-06-01) updates to v2=₹2,200
		mockMvc.perform(post("/api/organizations/{orgId}/fee-structures/{id}/revisions", orgId, c1StructureV1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Class 1 v2 Revised",
								  "effectiveFromDate": "2026-06-01",
								  "components": [
								    {
								      "name": "Tuition Fee",
								      "code": "TUITION",
								      "category": "TUITION",
								      "frequency": "MONTHLY",
								      "amount": 2200.00,
								      "applicableMonths": [4, 5, 6],
								      "dueDayOfMonth": 10
								    }
								  ]
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.versionNumber").value(2));

		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/financial-profile", orgId, stu1)
						.param("academicSessionId", sessionId.toString())
						.cookie(accountantOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.monthlyDemands[0].feeStructureVersion").value(1))
				.andExpect(jsonPath("$.data.monthlyDemands[0].baseAmount").value(2000.0))
				.andExpect(jsonPath("$.data.monthlyDemands[1].feeStructureVersion").value(1))
				.andExpect(jsonPath("$.data.monthlyDemands[1].baseAmount").value(2000.0))
				.andExpect(jsonPath("$.data.monthlyDemands[2].feeStructureVersion").value(2))
				.andExpect(jsonPath("$.data.monthlyDemands[2].baseAmount").value(2200.0));

		// 3. Class transfer: move stu1 from Class 1 to Class 2 effective 2026-05-01 ->
		// Unpaid May & June Class 1 demands are CANCELLED; Class 2 May & June demands (₹3,000 each) are generated; paid April Class 1 demand is preserved!
		mockMvc.perform(put("/api/organizations/{orgId}/enrollments/{eId}", orgId, enroll1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + class2 + ",\"enrollmentDate\":\"2026-05-01\",\"remarks\":\"Promoted to Class 2\"}"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/financial-profile", orgId, stu1)
						.param("academicSessionId", sessionId.toString())
						.cookie(accountantOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.classId").value(class2))
				.andExpect(jsonPath("$.data.monthlyDemands.length()").value(3))
				.andExpect(jsonPath("$.data.totalBaseFees").value(8000.0))
				.andExpect(jsonPath("$.data.totalPaidAmount").value(2000.0))
				.andExpect(jsonPath("$.data.totalOutstandingBalance").value(6000.0));

		// 4. Session Fee Dashboard Report
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/fee-reports/dashboard", orgId, sessionId)
						.cookie(accountantOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalExpectedBaseFees").value(8000.0))
				.andExpect(jsonPath("$.data.totalCollectedAmount").value(2000.0))
				.andExpect(jsonPath("$.data.totalOutstandingFees").value(6000.0))
				.andExpect(jsonPath("$.data.collectionByPaymentMethod.BANK_TRANSFER").value(2000.0));

		// 5. RBAC, Cross-Tenant Isolation & Composite Foreign Key Enforcement
		mockMvc.perform(post("/api/organizations/{orgId}/fee-structures", orgId)
						.cookie(accountantOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"academicSessionId\":" + sessionId + ",\"classId\":" + class1 + ",\"name\":\"Unauth\",\"components\":[{\"name\":\"T\",\"code\":\"T\",\"category\":\"TUITION\",\"frequency\":\"MONTHLY\",\"amount\":100}]}"))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/financial-profile", orgId, stu1)
						.param("academicSessionId", sessionId.toString())
						.cookie(teacherOrgACookie))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/organizations/{orgId}/fee-structures/{id}", orgBId, c1StructureV1)
						.cookie(adminOrgBCookie))
				.andExpect(status().isNotFound());

		assertThatThrownBy(() -> jdbc.update("""
				INSERT INTO class_fee_structure_components
				  (organization_id, fee_structure_id, name, code, category, frequency, amount, late_fee_type, late_fee_amount, late_fee_grace_days, optional_component, display_order, created_at, updated_at)
				VALUES (:orgBId, :c1StructureV1, 'Hack', 'HACK', 'TUITION', 'MONTHLY', 100.00, 'NONE', 0.00, 0, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
				""", Map.of("orgBId", orgBId, "c1StructureV1", c1StructureV1)))
				.isInstanceOf(DataIntegrityViolationException.class);
	}
}
