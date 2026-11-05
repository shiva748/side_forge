package com.side.forge.organization.academic;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
import java.time.ZoneId;
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
import com.side.forge.organization.academic.session.entity.*;
import com.side.forge.organization.academic.session.repository.AcademicSessionRepository;
import com.side.forge.organization.entity.*;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.security.jwt.JwtService;
import com.side.forge.user.entity.*;
import com.side.forge.user.repository.UserRepository;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
class AcademicFoundationIntegrationTest {

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
	private AcademicSessionRepository academicSessionRepository;
	@Autowired
	private JwtService jwtService;
	@Autowired
	private NamedParameterJdbcTemplate jdbc;

	private final List<Long> createdOrgIds = new ArrayList<>();
	private final List<Long> createdUserIds = new ArrayList<>();

	private Organization orgA;
	private Organization orgB;
	private Cookie adminOrgACookie;
	private Cookie teacherOrgACookie;
	private Cookie suspendedMemberOrgACookie;
	private Cookie adminOrgBCookie;
	private Cookie nonMemberCookie;

	@BeforeEach
	void setUp() {
		orgA = createOrganization("Alpha Academy", "Asia/Kolkata");
		orgB = createOrganization("Beta Public School", "UTC");

		Users adminA = createUser("adminA");
		assignOrgRole(adminA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgACookie = jwtCookie(adminA);

		Users teacherA = createUser("teacherA");
		assignOrgRole(teacherA.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacherOrgACookie = jwtCookie(teacherA);

		Users suspendedA = createUser("suspendedA");
		assignOrgRole(suspendedA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.SUSPENDED);
		suspendedMemberOrgACookie = jwtCookie(suspendedA);

		Users adminB = createUser("adminB");
		assignOrgRole(adminB.getId(), orgB.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgBCookie = jwtCookie(adminB);

		Users outsider = createUser("outsider");
		nonMemberCookie = jwtCookie(outsider);
	}

	@AfterEach
	void tearDown() {
		for (Long orgId : createdOrgIds) {
			jdbc.update("DELETE FROM class_subjects WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM sections WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM subjects WHERE organization_id = :orgId", Map.of("orgId", orgId));
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
		org.setAddress("123 Academic Way");
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
		user.setLastName("Test");
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

	@Test
	void academicSessionLifecycle_createStartCompleteAndTimezoneDates() throws Exception {
		Long orgId = orgA.getId();
		LocalDate expectedToday = LocalDate.now(ZoneId.of("Asia/Kolkata"));

		// 1. Create PLANNED session -> startDate and endDate must be null
		MvcResult createRes = mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.name").value("2026-27"))
				.andExpect(jsonPath("$.data.status").value("PLANNED"))
				.andExpect(jsonPath("$.data.startDate").isEmpty())
				.andExpect(jsonPath("$.data.endDate").isEmpty())
				.andReturn();
		Long sessionId = extractId(createRes);

		// Completing a PLANNED session directly must fail with 409
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/complete", orgId, sessionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isConflict());

		// 2. Start session -> status ACTIVE, startDate = today in org timezone, endDate = null
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start", orgId, sessionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("ACTIVE"))
				.andExpect(jsonPath("$.data.startDate").value(expectedToday.toString()))
				.andExpect(jsonPath("$.data.endDate").isEmpty());

		// 3. Complete session -> status COMPLETED, startDate preserved, endDate = today
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/complete", orgId, sessionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("COMPLETED"))
				.andExpect(jsonPath("$.data.startDate").value(expectedToday.toString()))
				.andExpect(jsonPath("$.data.endDate").value(expectedToday.toString()));

		// 4. Completed session immutability: cannot restart, complete again, or rename
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start", orgId, sessionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isConflict());
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/complete", orgId, sessionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isConflict());
		mockMvc.perform(put("/api/organizations/{orgId}/academic-sessions/{id}", orgId, sessionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27-Renamed\"}"))
				.andExpect(status().isConflict());
	}

	@Test
	void multiplePlannedSessions_prepareUpcomingWhileCurrentActive_andReusableClassesAndSubjects() throws Exception {
		Long orgId = orgA.getId();

		Long session2627 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long session2728 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2027-28\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start", orgId, session2627)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("ACTIVE"));

		// Create another PLANNED session while 2026-27 is ACTIVE -> must succeed
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2028-29\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status").value("PLANNED"));

		// Attempting to start 2027-28 while 2026-27 is ACTIVE -> 409 Conflict
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start", orgId, session2728)
						.cookie(adminOrgACookie))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.message").value("Complete the current active session before starting a new one."));

		Long class1Id = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 1\",\"code\":\"cls1\",\"displayOrder\":1,\"description\":\"Primary Class 1\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.code").value("CLS1"))
				.andReturn());

		Long mathId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Mathematics\",\"code\":\"math101\",\"description\":\"Core Math\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.code").value("MATH101"))
				.andReturn());

		Long scienceId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Science\",\"code\":\"SCI101\",\"description\":\"General Science\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		// Section A in ACTIVE session 2026-27 for reusable Class 1
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgId, session2627)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + class1Id + ",\"name\":\"Section A\",\"capacity\":35}"))
				.andExpect(status().isCreated());

		// Prepare upcoming PLANNED session 2027-28 while 2026-27 is ACTIVE
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgId, session2728)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + class1Id + ",\"name\":\"Section A\",\"capacity\":40}"))
				.andExpect(status().isCreated());
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgId, session2728)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + class1Id + ",\"name\":\"Section B\",\"capacity\":40}"))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, session2627, class1Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + mathId + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, session2728, class1Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + mathId + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isCreated());
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, session2728, class1Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + scienceId + ",\"compulsory\":false,\"displayOrder\":2}"))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgId, session2627)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1));
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgId, session2728)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2));
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, session2728, class1Id)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2));

		// Complete 2026-27, then start prepared 2027-28 -> succeeds
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/complete", orgId, session2627)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start", orgId, session2728)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("ACTIVE"));
	}

	@Test
	void concurrentAttemptsToActivateSessions_onlyOneSucceeds() throws Exception {
		Long orgId = orgA.getId();

		Long session1 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Concurrent-1\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long session2 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Concurrent-2\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch startGun = new CountDownLatch(1);
		AtomicInteger successCount = new AtomicInteger(0);
		AtomicInteger conflictCount = new AtomicInteger(0);

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Callable<Void> task1 = () -> {
				ready.countDown();
				startGun.await(5, TimeUnit.SECONDS);
				int httpStatus = mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start",
								orgId, session1).cookie(adminOrgACookie))
						.andReturn().getResponse().getStatus();
				if (httpStatus == 200) {
					successCount.incrementAndGet();
				} else if (httpStatus == 409) {
					conflictCount.incrementAndGet();
				}
				return null;
			};

			Callable<Void> task2 = () -> {
				ready.countDown();
				startGun.await(5, TimeUnit.SECONDS);
				int httpStatus = mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start",
								orgId, session2).cookie(adminOrgACookie))
						.andReturn().getResponse().getStatus();
				if (httpStatus == 200) {
					successCount.incrementAndGet();
				} else if (httpStatus == 409) {
					conflictCount.incrementAndGet();
				}
				return null;
			};

			Future<Void> f1 = pool.submit(task1);
			Future<Void> f2 = pool.submit(task2);
			assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
			startGun.countDown();
			f1.get(10, TimeUnit.SECONDS);
			f2.get(10, TimeUnit.SECONDS);
		} finally {
			pool.shutdownNow();
		}

		assertThat(successCount.get()).isEqualTo(1);
		assertThat(conflictCount.get()).isEqualTo(1);

		List<AcademicSession> activeSessions = academicSessionRepository
				.findAllByOrganizationIdAndStatusOrderByCreatedAtDescIdDesc(orgId, AcademicSessionStatus.ACTIVE);
		assertThat(activeSessions).hasSize(1);
	}

	@Test
	void duplicateConstraints_validationAndDeactivationRules() throws Exception {
		Long orgId = orgA.getId();

		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		// Duplicate session name -> 409
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isConflict());

		Long classId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 2\",\"code\":\"CLS2\",\"displayOrder\":2}"))
				.andExpect(status().isCreated())
				.andReturn());

		// Duplicate class code & duplicate class name -> 409
		mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class Two\",\"code\":\"cls2\",\"displayOrder\":3}"))
				.andExpect(status().isConflict());
		mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 2\",\"code\":\"CLS2B\",\"displayOrder\":3}"))
				.andExpect(status().isConflict());

		// Invalid displayOrder <= 0 -> 400
		mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 3\",\"code\":\"CLS3\",\"displayOrder\":0}"))
				.andExpect(status().isBadRequest());

		// Create section & test duplicate section name and invalid capacity
		Long sectionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections",
						orgId, sessionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classId + ",\"name\":\"Section A\",\"capacity\":30}"))
				.andExpect(status().isCreated())
				.andReturn());

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgId, sessionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classId + ",\"name\":\"section a\",\"capacity\":30}"))
				.andExpect(status().isConflict());

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgId, sessionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classId + ",\"name\":\"Section B\",\"capacity\":0}"))
				.andExpect(status().isBadRequest());

		// Update and deactivate section
		mockMvc.perform(put("/api/organizations/{orgId}/academic-sessions/{sId}/sections/{secId}",
						orgId, sessionId, sectionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classId + ",\"name\":\"Section A1\",\"capacity\":45}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.name").value("Section A1"))
				.andExpect(jsonPath("$.data.capacity").value(45));

		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{sId}/sections/{secId}/deactivate",
						orgId, sessionId, sectionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.active").value(false));

		// Create subject, test duplicate code, duplicate class-subject assignment, and inactive subject/class rejection
		Long subjectId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"English\",\"code\":\"ENG101\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"English Lit\",\"code\":\"eng101\"}"))
				.andExpect(status().isConflict());

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, sessionId, classId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + subjectId + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isCreated());

		// Duplicate class-subject assignment -> 409
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, sessionId, classId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + subjectId + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isConflict());

		// Delete class-subject assignment in PLANNED session -> 200 OK
		mockMvc.perform(delete("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}",
						orgId, sessionId, classId, subjectId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		// Deactivate subject & class -> cannot assign inactive subject or create section on inactive class
		mockMvc.perform(patch("/api/organizations/{orgId}/subjects/{subId}/deactivate", orgId, subjectId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.active").value(false));

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, sessionId, classId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + subjectId + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isConflict());

		mockMvc.perform(patch("/api/organizations/{orgId}/classes/{cId}/deactivate", orgId, classId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.active").value(false));

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgId, sessionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classId + ",\"name\":\"Section Z\",\"capacity\":25}"))
				.andExpect(status().isConflict());
	}

	@Test
	void crossTenantIsolation_andCompositeDatabaseForeignKeyEnforcement() throws Exception {
		Long orgAId = orgA.getId();
		Long orgBId = orgB.getId();

		Long sessionA = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgAId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long classA = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgAId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 1\",\"code\":\"CLS1\",\"displayOrder\":1}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long subjectA = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgAId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Physics\",\"code\":\"PHY101\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long sessionB = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgBId)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long classB = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgBId)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 1\",\"code\":\"CLS1\",\"displayOrder\":1}"))
				.andExpect(status().isCreated())
				.andReturn());

		// Admin of Org B cannot access Org A's resources via Org B's URL (returns 404 without leaking existence)
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{id}", orgBId, sessionA)
						.cookie(adminOrgBCookie))
				.andExpect(status().isNotFound());
		mockMvc.perform(get("/api/organizations/{orgId}/classes/{id}", orgBId, classA)
						.cookie(adminOrgBCookie))
				.andExpect(status().isNotFound());
		mockMvc.perform(get("/api/organizations/{orgId}/subjects/{id}", orgBId, subjectA)
						.cookie(adminOrgBCookie))
				.andExpect(status().isNotFound());

		// Admin of Org B cannot create a section in Org B referencing Org A's classId -> 404
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgBId, sessionB)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classA + ",\"name\":\"Section A\",\"capacity\":30}"))
				.andExpect(status().isNotFound());

		// Admin of Org B cannot assign Org A's subjectId to Org B's class -> 404
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgBId, sessionB, classB)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + subjectA + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isNotFound());

		// Database-level composite FK protection: raw SQL insert linking Org B's session with Org A's class fails
		assertThatThrownBy(() -> jdbc.update("""
				INSERT INTO sections (organization_id, academic_session_id, class_id, name, capacity, active, created_at, updated_at)
				VALUES (:orgId, :sessionId, :classId, 'CrossTenantSec', 30, 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
				""",
				Map.of("orgId", orgBId, "sessionId", sessionB, "classId", classA)))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void rbacAndMembershipEnforcement_andAnonymousOnboardingPreserved() throws Exception {
		Long orgId = orgA.getId();

		// 1. Unauthenticated request -> 401
		mockMvc.perform(get("/api/organizations/{orgId}/classes", orgId))
				.andExpect(status().isUnauthorized());

		// 2. Missing membership (user has no membership in Org A) -> 403
		mockMvc.perform(get("/api/organizations/{orgId}/classes", orgId)
						.cookie(nonMemberCookie))
				.andExpect(status().isForbidden());

		// 3. Inactive (SUSPENDED) membership in Org A -> 403
		mockMvc.perform(get("/api/organizations/{orgId}/classes", orgId)
						.cookie(suspendedMemberOrgACookie))
				.andExpect(status().isForbidden());

		// 4. Teacher has view permissions (200 OK) but lacks manage permissions (403 Forbidden)
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/organizations/{orgId}/classes", orgId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/organizations/{orgId}/subjects", orgId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 1\",\"code\":\"CLS1\",\"displayOrder\":1}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"History\",\"code\":\"HIS101\"}"))
				.andExpect(status().isForbidden());

		// 5. Anonymous onboarding submission remains accessible without authentication -> 201 Created
		MvcResult onboardingRes = mockMvc.perform(post("/api/organizations/onboarding")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "schoolName": "Sunrise Public School",
								  "boardAffiliation": "CBSE",
								  "schoolEmail": "contact@sunrise.edu",
								  "schoolPhone": "9876543210",
								  "address": "45 Park Road",
								  "city": "Pune",
								  "state": "Maharashtra",
								  "postalCode": "411001",
								  "contactPersonName": "Ramesh Sharma",
								  "designation": "Principal",
								  "contactEmail": "ramesh@sunrise.edu",
								  "mobileNumber": "9876543210",
								  "studentStrength": "FROM_500_TO_1000",
								  "campusCount": 1,
								  "managementSystem": "EXCEL_SPREADSHEETS"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		Long onboardingId = objectMapper.readTree(onboardingRes.getResponse().getContentAsString()).path("id").asLong();
		jdbc.update("DELETE FROM organization_onboarding_requests WHERE id = :id", Map.of("id", onboardingId));
	}

	@Test
	void completedSessionImmutability_blocksSectionAndSubjectMutations() throws Exception {
		Long orgId = orgA.getId();

		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2025-26\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long classId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 5\",\"code\":\"CLS5\",\"displayOrder\":5}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long subjectId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Geography\",\"code\":\"GEO101\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long sectionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections",
						orgId, sessionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classId + ",\"name\":\"Section A\",\"capacity\":30}"))
				.andExpect(status().isCreated())
				.andReturn());

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, sessionId, classId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + subjectId + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isCreated());

		// Start and complete the session
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start", orgId, sessionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/complete", orgId, sessionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		// Creating, updating, or deactivating sections in a COMPLETED session must fail with 409
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections", orgId, sessionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classId + ",\"name\":\"Section B\",\"capacity\":30}"))
				.andExpect(status().isConflict());
		mockMvc.perform(put("/api/organizations/{orgId}/academic-sessions/{sId}/sections/{secId}",
						orgId, sessionId, sectionId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classId + ",\"name\":\"Section A2\",\"capacity\":35}"))
				.andExpect(status().isConflict());
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{sId}/sections/{secId}/deactivate",
						orgId, sessionId, sectionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isConflict());

		// Deleting or adding class-subject assignments in a COMPLETED session must fail with 409
		mockMvc.perform(delete("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}",
						orgId, sessionId, classId, subjectId)
						.cookie(adminOrgACookie))
				.andExpect(status().isConflict());
	}

	@Test
	void classAndSubjectUpdate_getById_filtersAndPrincipalAndAccountantPermissions() throws Exception {
		Long orgId = orgA.getId();

		Users principalA = createUser("principalA");
		assignOrgRole(principalA.getId(), orgId, "PRINCIPAL", MembershipStatus.ACTIVE);
		Cookie principalCookie = jwtCookie(principalA);

		Users accountantA = createUser("accountantA");
		assignOrgRole(accountantA.getId(), orgId, "ACCOUNTANT", MembershipStatus.ACTIVE);
		Cookie accountantCookie = jwtCookie(accountantA);

		// Principal can create and manage sessions, classes, sections, subjects, and class-subjects
		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(principalCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		// Update session name while PLANNED -> 200 OK
		mockMvc.perform(put("/api/organizations/{orgId}/academic-sessions/{sId}", orgId, sessionId)
						.cookie(principalCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-2027\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.name").value("2026-2027"));

		// Get session by ID & filter by status=PLANNED
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}", orgId, sessionId)
						.cookie(accountantCookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.name").value("2026-2027"));

		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions", orgId)
						.param("status", "PLANNED")
						.cookie(accountantCookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1));

		// Create & update class, get by ID
		Long classId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(principalCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 10\",\"code\":\"C10\",\"displayOrder\":10}"))
				.andExpect(status().isCreated())
				.andReturn());

		mockMvc.perform(put("/api/organizations/{orgId}/classes/{cId}", orgId, classId)
						.cookie(principalCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Grade 10\",\"code\":\"G10\",\"displayOrder\":10,\"description\":\"Board Class\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.name").value("Grade 10"))
				.andExpect(jsonPath("$.data.code").value("G10"));

		mockMvc.perform(get("/api/organizations/{orgId}/classes/{cId}", orgId, classId)
						.cookie(accountantCookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.code").value("G10"));

		// Create & update subject, get by ID
		Long subjectId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(principalCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Chemistry\",\"code\":\"CHEM1\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		mockMvc.perform(put("/api/organizations/{orgId}/subjects/{subId}", orgId, subjectId)
						.cookie(principalCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Organic Chemistry\",\"code\":\"CHEM101\",\"description\":\"Lab course\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.name").value("Organic Chemistry"))
				.andExpect(jsonPath("$.data.code").value("CHEM101"));

		mockMvc.perform(get("/api/organizations/{orgId}/subjects/{subId}", orgId, subjectId)
						.cookie(principalCookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.code").value("CHEM101"));

		// Section getById and accountant view access
		Long sectionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/sections",
						orgId, sessionId)
						.cookie(principalCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + classId + ",\"name\":\"Section A\",\"capacity\":40}"))
				.andExpect(status().isCreated())
				.andReturn());

		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/sections/{secId}",
						orgId, sessionId, sectionId)
						.cookie(accountantCookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.name").value("Section A"));
	}
}
