package com.side.forge.organization.examination;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
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
class TimetableAttendanceExamIntegrationTest {

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
	private Cookie principalOrgACookie;
	private Cookie teacherOrgACookie;
	private Cookie receptionistOrgACookie;
	private Cookie adminOrgBCookie;
	private Cookie nonMemberCookie;

	@BeforeEach
	void setUp() {
		orgA = createOrganization("National Public School", "Asia/Kolkata");
		orgB = createOrganization("Valley International", "UTC");

		Users adminA = createUser("taeAdminA");
		assignOrgRole(adminA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgACookie = jwtCookie(adminA);

		Users principalA = createUser("taePrincipalA");
		assignOrgRole(principalA.getId(), orgA.getId(), "PRINCIPAL", MembershipStatus.ACTIVE);
		principalOrgACookie = jwtCookie(principalA);

		Users teacherA = createUser("taeTeacherA");
		assignOrgRole(teacherA.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacherOrgACookie = jwtCookie(teacherA);

		Users receptionistA = createUser("taeReceptionistA");
		assignOrgRole(receptionistA.getId(), orgA.getId(), "RECEPTIONIST", MembershipStatus.ACTIVE);
		receptionistOrgACookie = jwtCookie(receptionistA);

		Users adminB = createUser("taeAdminB");
		assignOrgRole(adminB.getId(), orgB.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgBCookie = jwtCookie(adminB);

		Users outsider = createUser("taeOutsider");
		nonMemberCookie = jwtCookie(outsider);
	}

	@AfterEach
	void tearDown() {
		for (Long orgId : createdOrgIds) {
			jdbc.update("DELETE FROM exam_results WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM exam_marks WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM exam_schedules WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM examinations WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM grading_rules WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM grading_scales WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM attendance_audit_logs WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM student_attendance WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM staff_attendance WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM timetable_slots WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM class_timetables WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM timetable_periods WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM timetable_configs WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM teacher_subject_assignments WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM teacher_class_assignments WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM teachers WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM staff WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM student_enrollments WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM students WHERE organization_id = :orgId", Map.of("orgId", orgId));
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
		org.setAddress("300 Education Lane");
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

	private Long createTeacher(Long orgId, String empId, String firstName, String spec) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/teachers", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "employeeId": "%s",
								  "firstName": "%s",
								  "lastName": "Faculty",
								  "dateOfBirth": "1988-05-10",
								  "gender": "MALE",
								  "phoneNumber": "9845012345",
								  "joiningDate": "2020-06-01",
								  "designation": "Teacher",
								  "department": "Academics",
								  "employmentType": "PERMANENT",
								  "specialization": "%s"
								}
								""".formatted(empId, firstName, spec)))
				.andExpect(status().isCreated())
				.andReturn();
		return extractId(res);
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
								  "dateOfBirth": "2014-03-10",
								  "gender": "FEMALE",
								  "admissionDate": "2024-04-01"
								}
								""".formatted(admNo, firstName)))
				.andExpect(status().isCreated())
				.andReturn();
		return extractId(res);
	}

	@Test
	void timetableManagement_configPeriodsDraftScheduleConflictsPublishingAndConcurrency() throws Exception {
		Long orgId = orgA.getId();

		// 1. Create TimetableConfig
		Long configId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/timetable-configs", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Regular Schedule",
								  "workingDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
								  "dayStartTime": "08:00:00",
								  "dayEndTime": "14:00:00"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn());

		// 2. Add Period 1 (TEACHING), Period 2 (TEACHING), and Break (SHORT_BREAK); test overlap rejection
		Long period1 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/timetable-configs/{cId}/periods", orgId, configId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Period 1\",\"periodOrder\":1,\"startTime\":\"08:00:00\",\"endTime\":\"08:45:00\",\"periodType\":\"TEACHING\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long period2 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/timetable-configs/{cId}/periods", orgId, configId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Period 2\",\"periodOrder\":2,\"startTime\":\"08:45:00\",\"endTime\":\"09:30:00\",\"periodType\":\"TEACHING\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long breakPeriod = extractId(mockMvc.perform(post("/api/organizations/{orgId}/timetable-configs/{cId}/periods", orgId, configId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Morning Break\",\"periodOrder\":3,\"startTime\":\"09:30:00\",\"endTime\":\"09:50:00\",\"periodType\":\"SHORT_BREAK\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.breakPeriod").value(true))
				.andReturn());

		// Overlapping period timing -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/timetable-configs/{cId}/periods", orgId, configId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Overlap\",\"periodOrder\":4,\"startTime\":\"08:30:00\",\"endTime\":\"09:00:00\",\"periodType\":\"TEACHING\"}"))
				.andExpect(status().isConflict());

		// 3. Setup session, Class 1 & Class 2, Math & Science, and Teachers
		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
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
		Long mathId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Mathematics\",\"code\":\"MATH\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long sciId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Science\",\"code\":\"SCI\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long teacher1 = createTeacher(orgId, "T-101", "Rakesh", "Mathematics");
		Long teacher2 = createTeacher(orgId, "T-102", "Sunita", "Science");

		// Assign Math to Class 1 and Class 2, and assign teacher1 to teach Math in both Class 1 and Class 2
		for (Long cId : List.of(class1, class2)) {
			mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects", orgId, sessionId, cId)
							.cookie(adminOrgACookie)
							.contentType(MediaType.APPLICATION_JSON)
							.content("{\"subjectId\":" + mathId + ",\"compulsory\":true,\"displayOrder\":1}"))
					.andExpect(status().isCreated());
			mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}/teachers",
							orgId, sessionId, cId, mathId)
							.cookie(adminOrgACookie)
							.contentType(MediaType.APPLICATION_JSON)
							.content("{\"teacherId\":" + teacher1 + "}"))
					.andExpect(status().isCreated());
		}

		// Create draft timetables for Class 1 and Class 2
		Long ttClass1 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/timetables", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"academicSessionId\":" + sessionId + ",\"classId\":" + class1 + ",\"timetableConfigId\":" + configId + "}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status").value("DRAFT"))
				.andReturn());

		Long ttClass2 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/timetables", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"academicSessionId\":" + sessionId + ",\"classId\":" + class2 + ",\"timetableConfigId\":" + configId + "}"))
				.andExpect(status().isCreated())
				.andReturn());

		// 4. Reject break period as teaching period (409), unassigned subject sciId (409), and unassigned teacher2 (409)
		mockMvc.perform(post("/api/organizations/{orgId}/timetables/{tId}/slots", orgId, ttClass1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"dayOfWeek\":\"MONDAY\",\"periodId\":" + breakPeriod + ",\"subjectId\":" + mathId + ",\"teacherId\":" + teacher1 + "}"))
				.andExpect(status().isConflict());
		mockMvc.perform(post("/api/organizations/{orgId}/timetables/{tId}/slots", orgId, ttClass1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"dayOfWeek\":\"MONDAY\",\"periodId\":" + period1 + ",\"subjectId\":" + sciId + ",\"teacherId\":" + teacher1 + "}"))
				.andExpect(status().isConflict());
		mockMvc.perform(post("/api/organizations/{orgId}/timetables/{tId}/slots", orgId, ttClass1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"dayOfWeek\":\"MONDAY\",\"periodId\":" + period1 + ",\"subjectId\":" + mathId + ",\"teacherId\":" + teacher2 + "}"))
				.andExpect(status().isConflict());

		// 5. Concurrent scheduling of teacher1 in Period 1 on MONDAY across Class 1 and Class 2 -> 1 succeeds (201), 1 fails (409)
		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch startGun = new CountDownLatch(1);
		AtomicInteger createdCount = new AtomicInteger(0);
		AtomicInteger conflictCount = new AtomicInteger(0);

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Callable<Void> task1 = () -> {
				ready.countDown();
				startGun.await(5, TimeUnit.SECONDS);
				int st = mockMvc.perform(post("/api/organizations/{orgId}/timetables/{tId}/slots", orgId, ttClass1)
								.cookie(adminOrgACookie)
								.contentType(MediaType.APPLICATION_JSON)
								.content("{\"dayOfWeek\":\"MONDAY\",\"periodId\":" + period1 + ",\"subjectId\":" + mathId + ",\"teacherId\":" + teacher1 + "}"))
						.andReturn().getResponse().getStatus();
				if (st == 201) createdCount.incrementAndGet();
				else if (st == 409) conflictCount.incrementAndGet();
				return null;
			};
			Callable<Void> task2 = () -> {
				ready.countDown();
				startGun.await(5, TimeUnit.SECONDS);
				int st = mockMvc.perform(post("/api/organizations/{orgId}/timetables/{tId}/slots", orgId, ttClass2)
								.cookie(adminOrgACookie)
								.contentType(MediaType.APPLICATION_JSON)
								.content("{\"dayOfWeek\":\"MONDAY\",\"periodId\":" + period1 + ",\"subjectId\":" + mathId + ",\"teacherId\":" + teacher1 + "}"))
						.andReturn().getResponse().getStatus();
				if (st == 201) createdCount.incrementAndGet();
				else if (st == 409) conflictCount.incrementAndGet();
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

		assertThat(createdCount.get()).isEqualTo(1);
		assertThat(conflictCount.get()).isEqualTo(1);

		// Schedule teacher1 in Period 2 on MONDAY for the other class so both have valid slots
		Long winningTt = mockMvc.perform(get("/api/organizations/{orgId}/timetables/{tId}", orgId, ttClass1)
						.cookie(teacherOrgACookie))
				.andReturn().getResponse().getContentAsString().contains("\"periodId\":" + period1) ? ttClass1 : ttClass2;

		// 6. Publish winningTt -> status PUBLISHED; direct slot addition & config mutation blocked (409); reopen increments revisionNumber to 2
		mockMvc.perform(patch("/api/organizations/{orgId}/timetables/{tId}/publish", orgId, winningTt)
						.cookie(principalOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("PUBLISHED"))
				.andExpect(jsonPath("$.data.revisionNumber").value(1));

		mockMvc.perform(post("/api/organizations/{orgId}/timetables/{tId}/slots", orgId, winningTt)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"dayOfWeek\":\"TUESDAY\",\"periodId\":" + period2 + ",\"subjectId\":" + mathId + ",\"teacherId\":" + teacher1 + "}"))
				.andExpect(status().isConflict());

		mockMvc.perform(patch("/api/organizations/{orgId}/timetables/{tId}/reopen", orgId, winningTt)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("DRAFT"))
				.andExpect(jsonPath("$.data.revisionNumber").value(2));

		// Unscheduled teachers endpoint returns teacher2
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/timetables/unscheduled-teachers",
						orgId, sessionId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].id").value(teacher2));
	}

	@Test
	void attendanceManagement_studentBulkStaffCorrectionsAuditAndReports() throws Exception {
		Long orgId = orgA.getId();

		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start", orgId, sessionId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		Long classId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 5\",\"code\":\"C5\",\"displayOrder\":5}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long stu1 = createStudent(orgId, "ADM-501", "Aarav");
		Long stu2 = createStudent(orgId, "ADM-502", "Diya");
		Long unenrolledStu = createStudent(orgId, "ADM-503", "Unenrolled");

		for (Long sId : List.of(stu1, stu2)) {
			mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
							.cookie(adminOrgACookie)
							.contentType(MediaType.APPLICATION_JSON)
							.content("{\"studentId\":" + sId + ",\"academicSessionId\":" + sessionId + ",\"classId\":" + classId + "}"))
					.andExpect(status().isCreated());
		}

		// 1. Reject future date (400) and unenrolled student (409)
		mockMvc.perform(post("/api/organizations/{orgId}/student-attendance", orgId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"academicSessionId\":" + sessionId + ",\"classId\":" + classId + ",\"studentId\":" + stu1 + ",\"attendanceDate\":\"2099-01-01\",\"status\":\"PRESENT\"}"))
				.andExpect(status().isBadRequest());

		mockMvc.perform(post("/api/organizations/{orgId}/student-attendance", orgId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"academicSessionId\":" + sessionId + ",\"classId\":" + classId + ",\"studentId\":" + unenrolledStu + ",\"attendanceDate\":\"2026-06-01\",\"status\":\"PRESENT\"}"))
				.andExpect(status().isConflict());

		// 2. Bulk attendance on 2026-06-01 (stu1 PRESENT, stu2 ABSENT)
		MvcResult bulkRes = mockMvc.perform(post("/api/organizations/{orgId}/student-attendance/bulk", orgId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "classId": %d,
								  "attendanceDate": "2026-06-01",
								  "records": [
								    {"studentId": %d, "status": "PRESENT"},
								    {"studentId": %d, "status": "ABSENT"}
								  ]
								}
								""".formatted(sessionId, classId, stu1, stu2)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.length()").value(2))
				.andReturn();
		Long stu2Day1AttId = objectMapper.readTree(bulkRes.getResponse().getContentAsString())
				.path("data").get(1).path("id").asLong();

		// Duplicate attendance for stu1 on 2026-06-01 -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/student-attendance", orgId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"academicSessionId\":" + sessionId + ",\"classId\":" + classId + ",\"studentId\":" + stu1 + ",\"attendanceDate\":\"2026-06-01\",\"status\":\"PRESENT\"}"))
				.andExpect(status().isConflict());

		// Mark additional days for stu1: 2026-06-02 (HALF_DAY), 2026-06-03 (HOLIDAY), 2026-06-04 (EXCUSED)
		// Applicable working days for stu1 = 2 (June 1 PRESENT + June 2 HALF_DAY) -> weighted 1.5 / 2 = 75.0%
		for (String entry : List.of(
				"{\"attendanceDate\":\"2026-06-02\",\"status\":\"HALF_DAY\"}",
				"{\"attendanceDate\":\"2026-06-03\",\"status\":\"HOLIDAY\"}",
				"{\"attendanceDate\":\"2026-06-04\",\"status\":\"EXCUSED\"}")) {
			JsonNode n = objectMapper.readTree(entry);
			mockMvc.perform(post("/api/organizations/{orgId}/student-attendance", orgId)
							.cookie(teacherOrgACookie)
							.contentType(MediaType.APPLICATION_JSON)
							.content("{\"academicSessionId\":" + sessionId + ",\"classId\":" + classId + ",\"studentId\":" + stu1
									+ ",\"attendanceDate\":\"" + n.get("attendanceDate").asText()
									+ "\",\"status\":\"" + n.get("status").asText() + "\"}"))
					.andExpect(status().isCreated());
		}

		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/attendance/summary", orgId, stu1)
						.param("academicSessionId", sessionId.toString())
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalRecordedDays").value(4))
				.andExpect(jsonPath("$.data.holidayDays").value(1))
				.andExpect(jsonPath("$.data.excusedDays").value(1))
				.andExpect(jsonPath("$.data.applicableWorkingDays").value(2))
				.andExpect(jsonPath("$.data.attendancePercentage").value(75.0));

		// 3. Correct stu2's 2026-06-01 attendance from ABSENT to LATE & verify audit log
		mockMvc.perform(put("/api/organizations/{orgId}/student-attendance/{aId}", orgId, stu2Day1AttId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"LATE\",\"remarks\":\"Arrived at 8:20\",\"correctionReason\":\"Bus delayed\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("LATE"));

		mockMvc.perform(get("/api/organizations/{orgId}/attendance-audit-logs/STUDENT/{aId}", orgId, stu2Day1AttId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].previousStatus").value("ABSENT"))
				.andExpect(jsonPath("$.data[0].newStatus").value("LATE"))
				.andExpect(jsonPath("$.data[0].correctionReason").value("Bus delayed"));

		// 4. Staff attendance marking, update, and summary
		Long teacherId = createTeacher(orgId, "T-501", "Meenakshi", "Hindi");
		Long staffId = objectMapper.readTree(mockMvc.perform(get("/api/organizations/{orgId}/teachers/{tId}", orgId, teacherId)
						.cookie(adminOrgACookie)).andReturn().getResponse().getContentAsString()).path("data").path("staffId").asLong();

		Long staffAttId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/staff-attendance", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"staffId\":" + staffId + ",\"attendanceDate\":\"2026-06-01\",\"status\":\"PRESENT\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		mockMvc.perform(put("/api/organizations/{orgId}/staff-attendance/{aId}", orgId, staffAttId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"HALF_DAY\",\"correctionReason\":\"Afternoon medical appointment\"}"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/organizations/{orgId}/staff/{stfId}/attendance/summary", orgId, staffId)
						.param("year", "2026")
						.param("month", "6")
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.attendancePercentage").value(50.0));
	}

	@Test
	void examinationManagement_gradingScalesScheduleMarksFinalizationPublishingAndReports() throws Exception {
		Long orgId = orgA.getId();

		// 1. Reject overlapping grading scale rules (409) & create valid CBSE Grading Scale
		mockMvc.perform(post("/api/organizations/{orgId}/grading-scales", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Invalid Scale",
								  "rules": [
								    {"grade": "A", "minPercentage": 80.0, "maxPercentage": 100.0, "passing": true},
								    {"grade": "B", "minPercentage": 75.0, "maxPercentage": 85.0, "passing": true}
								  ]
								}
								"""))
				.andExpect(status().isConflict());

		Long scaleId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/grading-scales", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Standard Scale",
								  "rules": [
								    {"grade": "A", "minPercentage": 80.0, "maxPercentage": 100.0, "gradePoint": 9.0, "passing": true},
								    {"grade": "B", "minPercentage": 50.0, "maxPercentage": 79.99, "gradePoint": 7.0, "passing": true},
								    {"grade": "C", "minPercentage": 35.0, "maxPercentage": 49.99, "gradePoint": 5.0, "passing": true},
								    {"grade": "F", "minPercentage": 0.0, "maxPercentage": 34.99, "gradePoint": 0.0, "passing": false}
								  ]
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn());

		// 2. Setup session, Class 8, Math & English, and 2 enrolled students
		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long classId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 8\",\"code\":\"C8\",\"displayOrder\":8}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long mathId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Mathematics\",\"code\":\"MTH\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long engId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"English\",\"code\":\"ENG\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		for (Long subId : List.of(mathId, engId)) {
			mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects", orgId, sessionId, classId)
							.cookie(adminOrgACookie)
							.contentType(MediaType.APPLICATION_JSON)
							.content("{\"subjectId\":" + subId + ",\"compulsory\":true,\"displayOrder\":1}"))
					.andExpect(status().isCreated());
		}

		Long stu1 = createStudent(orgId, "ADM-801", "Vikram");
		Long stu2 = createStudent(orgId, "ADM-802", "Neha");
		for (Long sId : List.of(stu1, stu2)) {
			mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
							.cookie(adminOrgACookie)
							.contentType(MediaType.APPLICATION_JSON)
							.content("{\"studentId\":" + sId + ",\"academicSessionId\":" + sessionId + ",\"classId\":" + classId + "}"))
					.andExpect(status().isCreated());
		}

		// 3. Create Mid-Term Examination & schedule Math and English (reject overlapping exam schedule)
		Long examId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/examinations", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "academicSessionId": %d,
								  "classId": %d,
								  "gradingScaleId": %d,
								  "name": "Mid-Term 2026",
								  "examType": "MID_TERM",
								  "startDate": "2026-10-01",
								  "endDate": "2026-10-10"
								}
								""".formatted(sessionId, classId, scaleId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status").value("DRAFT"))
				.andReturn());

		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{eId}/schedules", orgId, examId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + mathId + ",\"examDate\":\"2026-10-02\",\"startTime\":\"09:00:00\",\"endTime\":\"12:00:00\",\"maxMarks\":100.0,\"passingMarks\":35.0}"))
				.andExpect(status().isCreated());

		// Overlapping schedule for the same class on 2026-10-02 -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{eId}/schedules", orgId, examId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + engId + ",\"examDate\":\"2026-10-02\",\"startTime\":\"11:00:00\",\"endTime\":\"14:00:00\",\"maxMarks\":100.0,\"passingMarks\":35.0}"))
				.andExpect(status().isConflict());

		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{eId}/schedules", orgId, examId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + engId + ",\"examDate\":\"2026-10-03\",\"startTime\":\"09:00:00\",\"endTime\":\"12:00:00\",\"maxMarks\":100.0,\"passingMarks\":35.0}"))
				.andExpect(status().isCreated());

		// 4. Reject invalid marks (> maxMarks -> 400; marks supplied when ABSENT -> 400)
		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{eId}/marks", orgId, examId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + mathId + ",\"studentId\":" + stu1 + ",\"entryStatus\":\"PRESENT\",\"marksObtained\":105.0}"))
				.andExpect(status().isBadRequest());

		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{eId}/marks", orgId, examId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + mathId + ",\"studentId\":" + stu1 + ",\"entryStatus\":\"ABSENT\",\"marksObtained\":10.0}"))
				.andExpect(status().isBadRequest());

		// Enter bulk Math marks (stu1: 90 PRESENT -> A; stu2: ABSENT -> AB, failed)
		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{eId}/marks/bulk", orgId, examId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "subjectId": %d,
								  "entries": [
								    {"studentId": %d, "entryStatus": "PRESENT", "marksObtained": 90.0},
								    {"studentId": %d, "entryStatus": "ABSENT"}
								  ]
								}
								""".formatted(mathId, stu1, stu2)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].grade").value("A"))
				.andExpect(jsonPath("$.data[0].passed").value(true))
				.andExpect(jsonPath("$.data[1].grade").value("AB"))
				.andExpect(jsonPath("$.data[1].passed").value(false));

		// Attempting to finalize while English marks are still missing -> 409 Conflict
		mockMvc.perform(patch("/api/organizations/{orgId}/examinations/{eId}/finalize", orgId, examId)
						.cookie(adminOrgACookie))
				.andExpect(status().isConflict());

		// Enter English mark for stu1 (80 PRESENT), check missing-marks endpoint returns stu2
		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{eId}/marks", orgId, examId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + engId + ",\"studentId\":" + stu1 + ",\"entryStatus\":\"PRESENT\",\"marksObtained\":80.0}"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/organizations/{orgId}/examinations/{eId}/subjects/{subId}/missing-marks",
						orgId, examId, engId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].id").value(stu2));

		// Enter English mark for stu2 (EXEMPTED -> excluded from maxMarks denominator for stu2)
		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{eId}/marks", orgId, examId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + engId + ",\"studentId\":" + stu2 + ",\"entryStatus\":\"EXEMPTED\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.grade").value("EX"));

		// 5. Finalize results -> COMPLETED; Teacher (without EXAM_MANAGE/EXAM_PUBLISH_RESULTS) cannot view unpublished report card (409)
		mockMvc.perform(patch("/api/organizations/{orgId}/examinations/{eId}/finalize", orgId, examId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("COMPLETED"));

		mockMvc.perform(get("/api/organizations/{orgId}/examinations/{eId}/students/{sId}/report-card",
						orgId, examId, stu1)
						.cookie(teacherOrgACookie))
				.andExpect(status().isConflict());

		// Publish results -> PUBLISHED; marks are now immutable (409); report card & class report available
		mockMvc.perform(patch("/api/organizations/{orgId}/examinations/{eId}/publish", orgId, examId)
						.cookie(principalOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("PUBLISHED"));

		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{eId}/marks", orgId, examId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + mathId + ",\"studentId\":" + stu1 + ",\"entryStatus\":\"PRESENT\",\"marksObtained\":95.0}"))
				.andExpect(status().isConflict());

		mockMvc.perform(get("/api/organizations/{orgId}/examinations/{eId}/students/{sId}/report-card",
						orgId, examId, stu1)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalObtainedMarks").value(170.0))
				.andExpect(jsonPath("$.data.totalMaxMarks").value(200.0))
				.andExpect(jsonPath("$.data.percentage").value(85.0))
				.andExpect(jsonPath("$.data.overallGrade").value("A"))
				.andExpect(jsonPath("$.data.overallPassed").value(true));

		mockMvc.perform(get("/api/organizations/{orgId}/examinations/{eId}/report", orgId, examId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalEnrolledStudents").value(2))
				.andExpect(jsonPath("$.data.passedStudents").value(1))
				.andExpect(jsonPath("$.data.failedStudents").value(1))
				.andExpect(jsonPath("$.data.passPercentage").value(50.0));
	}

	@Test
	void crossTenantIsolation_andAuthorizationAndCompositeForeignKeys() throws Exception {
		Long orgAId = orgA.getId();
		Long orgBId = orgB.getId();

		// 1. Setup Org A config & Org B session/class
		Long configA = extractId(mockMvc.perform(post("/api/organizations/{orgId}/timetable-configs", orgAId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"OrgA Config\",\"workingDays\":[\"MONDAY\"],\"dayStartTime\":\"08:00:00\",\"dayEndTime\":\"14:00:00\"}"))
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
						.content("{\"name\":\"Class 10\",\"code\":\"C10\",\"displayOrder\":10}"))
				.andExpect(status().isCreated())
				.andReturn());

		// Cross-tenant attempt: Org B admin tries to create a timetable using Org A's TimetableConfig -> 404 Not Found
		mockMvc.perform(post("/api/organizations/{orgId}/timetables", orgBId)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"academicSessionId\":" + sessionB + ",\"classId\":" + classB + ",\"timetableConfigId\":" + configA + "}"))
				.andExpect(status().isNotFound());

		// RBAC: Teacher cannot create timetable config (403), Receptionist cannot mark student attendance (403), Non-member -> 403
		mockMvc.perform(post("/api/organizations/{orgId}/timetable-configs", orgAId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Unauthorized\",\"workingDays\":[\"MONDAY\"],\"dayStartTime\":\"08:00:00\",\"dayEndTime\":\"14:00:00\"}"))
				.andExpect(status().isForbidden());

		mockMvc.perform(post("/api/organizations/{orgId}/student-attendance", orgAId)
						.cookie(receptionistOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"academicSessionId\":1,\"classId\":1,\"studentId\":1,\"attendanceDate\":\"2026-06-01\",\"status\":\"PRESENT\"}"))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/organizations/{orgId}/grading-scales", orgAId)
						.cookie(nonMemberCookie))
				.andExpect(status().isForbidden());

		// Database-level composite FK enforcement: inserting class_timetables for Org B referencing Org A's configA fails
		assertThatThrownBy(() -> jdbc.update("""
				INSERT INTO class_timetables
				  (organization_id, academic_session_id, class_id, timetable_config_id, status, revision_number, created_at, updated_at)
				VALUES (:orgBId, :sessionB, :classB, :configA, 'DRAFT', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
				""", Map.of("orgBId", orgBId, "sessionB", sessionB, "classB", classB, "configA", configA)))
				.isInstanceOf(DataIntegrityViolationException.class);
	}
}
