package com.side.forge.organization.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
class DashboardAndReportsIntegrationTest {

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
	private Users teacherUserA;
	private Cookie adminOrgACookie;
	private Cookie principalOrgACookie;
	private Cookie accountantOrgACookie;
	private Cookie teacherOrgACookie;
	private Cookie adminOrgBCookie;

	@BeforeEach
	void setUp() {
		orgA = createOrganization("Apex International School", "Asia/Kolkata");
		orgB = createOrganization("Zenith Academy", "UTC");

		Users adminA = createUser("repAdminA");
		assignOrgRole(adminA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgACookie = jwtCookie(adminA);

		Users principalA = createUser("repPrincipalA");
		assignOrgRole(principalA.getId(), orgA.getId(), "PRINCIPAL", MembershipStatus.ACTIVE);
		principalOrgACookie = jwtCookie(principalA);

		Users accountantA = createUser("repAccountantA");
		assignOrgRole(accountantA.getId(), orgA.getId(), "ACCOUNTANT", MembershipStatus.ACTIVE);
		accountantOrgACookie = jwtCookie(accountantA);

		teacherUserA = createUser("repTeacherA");
		assignOrgRole(teacherUserA.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacherOrgACookie = jwtCookie(teacherUserA);

		Users adminB = createUser("repAdminB");
		assignOrgRole(adminB.getId(), orgB.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgBCookie = jwtCookie(adminB);
	}
	@AfterEach
	void tearDown() {
		String[] tables = {
				"school_notices", "fee_audit_logs", "fee_payment_allocations", "fee_payments",
				"student_fee_demands", "student_fee_concessions", "student_fee_assignments",
				"class_fee_structure_components", "class_fee_structures", "exam_results",
				"exam_marks", "exam_schedules", "examinations", "grading_rules", "grading_scales",
				"attendance_audit_logs", "student_attendance", "staff_attendance",
				"timetable_slots", "class_timetables", "timetable_periods", "timetable_configs",
				"teacher_subject_assignments", "teacher_class_assignments", "teachers", "staff",
				"student_guardians", "guardians", "student_enrollments", "students",
				"class_subjects", "sections", "subjects", "classes", "academic_sessions"
		};
		for (Long orgId : createdOrgIds) {
			for (String t : tables) {
				jdbc.update("DELETE FROM " + t + " WHERE organization_id = :orgId", Map.of("orgId", orgId));
			}
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
		org.setAddress("200 Campus Drive");
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

	private JsonNode readData(MvcResult res) throws Exception {
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data");
	}
	@Test
	void emptyStates_andRoleBasedDashboards_admin_principal_accountant_teacher() throws Exception {
		// 1. Verify empty state on fresh organization before any data exists
		JsonNode emptyAdmin = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/admin")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andReturn());
		assertThat(emptyAdmin.get("emptyState").asBoolean()).isTrue();
		assertThat(emptyAdmin.get("totalActiveStudents").asInt()).isEqualTo(0);

		// 2. Create Academic Session, Classes, Subjects, Class-Subjects
		long sessionId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/academic-sessions")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "2026-2027", "startDate": "2026-04-01", "endDate": "2027-03-31"}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		long class1Id = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/classes")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "Grade 1", "code": "G1", "displayOrder": 1}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		long class2Id = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/classes")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "Grade 2", "code": "G2", "displayOrder": 2}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		long mathId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/subjects")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "Mathematics", "code": "MATH"}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		mockMvc.perform(post("/api/organizations/" + orgA.getId()
				+ "/academic-sessions/" + sessionId + "/classes/" + class1Id + "/subjects")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"subjectId\": " + mathId + "}"))
				.andExpect(status().isCreated());

		// 3. Create Teacher linked to teacherUserA + Non-Teaching Staff
		JsonNode teacherNode = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/teachers")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "userId": %d,
						  "employeeId": "EMP-T1",
						  "firstName": "Anita",
						  "lastName": "Verma",
						  "phoneNumber": "9811122233",
						  "joiningDate": "2025-06-01",
						  "designation": "Senior Teacher",
						  "department": "Mathematics",
						  "employmentType": "PERMANENT",
						  "qualifications": "M.Sc, B.Ed",
						  "specialization": "Mathematics",
						  "experienceYears": 6,
						  "availableForAssignment": true
						}
						""".formatted(teacherUserA.getId())))
				.andExpect(status().isCreated()).andReturn());
		long teacherId = teacherNode.get("id").asLong();
		long teacherStaffId = teacherNode.get("staffId").asLong();

		long nonTeachingStaffId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/staff")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "employeeId": "EMP-NT1",
						  "firstName": "Ramesh",
						  "lastName": "Nair",
						  "phoneNumber": "9822233344",
						  "joiningDate": "2025-07-01",
						  "designation": "Admin Clerk",
						  "department": "Administration",
						  "employmentType": "PERMANENT",
						  "teachingStaff": false
						}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		// Assign teacher to Grade 1 and Mathematics
		mockMvc.perform(post("/api/organizations/" + orgA.getId()
				+ "/academic-sessions/" + sessionId + "/classes/" + class1Id + "/teachers")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"teacherId\": " + teacherId + ", \"classTeacher\": true}"))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/organizations/" + orgA.getId()
				+ "/academic-sessions/" + sessionId + "/classes/" + class1Id + "/subjects/" + mathId + "/teachers")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"teacherId\": " + teacherId + "}"))
				.andExpect(status().isCreated());
		// 4. Create Timetable for Grade 1 on MONDAY (2026-04-06 is Monday)
		long ttConfigId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/timetable-configs")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "Standard Config",
						  "workingDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
						  "dayStartTime": "08:00:00",
						  "dayEndTime": "14:00:00"
						}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		long periodId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId()
				+ "/timetable-configs/" + ttConfigId + "/periods")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "Period 1", "periodOrder": 1, "startTime": "08:00:00", "endTime": "08:45:00", "periodType": "TEACHING"}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		long timetableId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/timetables")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"academicSessionId": %d, "classId": %d, "timetableConfigId": %d}
						""".formatted(sessionId, class1Id, ttConfigId)))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/timetables/" + timetableId + "/slots")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"dayOfWeek": "MONDAY", "periodId": %d, "subjectId": %d, "teacherId": %d, "room": "101"}
						""".formatted(periodId, mathId, teacherId)))
				.andExpect(status().isCreated());

		mockMvc.perform(patch("/api/organizations/" + orgA.getId() + "/timetables/" + timetableId + "/publish")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		// 5. Create 2 Students in Grade 1 + 1 Student in Grade 2
		long stu1Id = createStudentAndEnroll(orgA.getId(), sessionId, class1Id, "ADM-101", "Aarav", "Sharma", "MALE", "2026-04-01", true);
		long stu2Id = createStudentAndEnroll(orgA.getId(), sessionId, class1Id, "ADM-102", "Diya", "Patel", "FEMALE", "2026-04-01", false);
		long stu3Id = createStudentAndEnroll(orgA.getId(), sessionId, class2Id, "ADM-201", "Kabir", "Mehta", "MALE", "2026-06-05", false);

		// 6. Mark Student & Staff Attendance on 2026-04-06 (Monday)
		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/student-attendance/bulk")
				.cookie(teacherOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "attendanceDate": "2026-04-06",
						  "records": [
						    {"studentId": %d, "status": "PRESENT"},
						    {"studentId": %d, "status": "ABSENT", "remarks": "Sick"}
						  ]
						}
						""".formatted(sessionId, class1Id, stu1Id, stu2Id)))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/staff-attendance")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"staffId": %d, "attendanceDate": "2026-04-06", "status": "PRESENT"}
						""".formatted(teacherStaffId)))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/staff-attendance")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"staffId": %d, "attendanceDate": "2026-04-06", "status": "PRESENT"}
						""".formatted(nonTeachingStaffId)))
				.andExpect(status().isCreated());

		// 7. Create Grading Scale, Published Exam (Midterm 1), and Draft Exam (Unit Test 2)
		long scaleId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/grading-scales")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "Standard Scale",
						  "rules": [
						    {"grade": "A", "minPercentage": 80, "maxPercentage": 100, "gradePoint": 9.0, "passing": true},
						    {"grade": "B", "minPercentage": 40, "maxPercentage": 79.99, "gradePoint": 7.0, "passing": true},
						    {"grade": "F", "minPercentage": 0, "maxPercentage": 39.99, "gradePoint": 0.0, "passing": false}
						  ]
						}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		long exam1Id = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/examinations")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "gradingScaleId": %d,
						  "name": "Midterm 1",
						  "examType": "MID_TERM",
						  "startDate": "2026-04-10",
						  "endDate": "2026-04-15"
						}
						""".formatted(sessionId, class1Id, scaleId)))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/examinations/" + exam1Id + "/schedules")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "subjectId": %d,
						  "examDate": "2026-04-11",
						  "startTime": "09:00:00",
						  "endTime": "11:00:00",
						  "maxMarks": 100,
						  "passingMarks": 40
						}
						""".formatted(mathId)))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/examinations/" + exam1Id + "/marks/bulk")
				.cookie(teacherOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "subjectId": %d,
						  "entries": [
						    {"studentId": %d, "entryStatus": "PRESENT", "marksObtained": 90},
						    {"studentId": %d, "entryStatus": "PRESENT", "marksObtained": 30}
						  ]
						}
						""".formatted(mathId, stu1Id, stu2Id)))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/organizations/" + orgA.getId() + "/examinations/" + exam1Id + "/finalize")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk());
		mockMvc.perform(patch("/api/organizations/" + orgA.getId() + "/examinations/" + exam1Id + "/publish")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		// Also create an upcoming scheduled exam
		long upcomingExamId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/examinations")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "gradingScaleId": %d,
						  "name": "Final Term Exam",
						  "examType": "FINAL",
						  "startDate": "2026-05-10",
						  "endDate": "2026-05-20"
						}
						""".formatted(sessionId, class1Id, scaleId)))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();
		// 8. Create & Publish Fee Structure for Grade 1 + Concession + Payment
		long feeStructId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/fee-structures")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "name": "Grade 1 Fee Structure",
						  "effectiveFromDate": "2026-04-01",
						  "components": [
						    {
						      "code": "TUITION",
						      "name": "Tuition Fee",
						      "category": "TUITION",
						      "frequency": "MONTHLY",
						      "amount": 2000.00,
						      "applicableMonths": [4, 5],
						      "dueDayOfMonth": 10
						    }
						  ]
						}
						""".formatted(sessionId, class1Id)))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		mockMvc.perform(patch("/api/organizations/" + orgA.getId() + "/fee-structures/" + feeStructId + "/publish")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		// Apply 500 fixed concession on stu1
		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/students/" + stu1Id + "/concessions")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "concessionType": "FIXED_AMOUNT",
						  "value": 500.00,
						  "componentCode": "TUITION",
						  "reason": "Academic excellence"
						}
						""".formatted(sessionId)))
				.andExpect(status().isCreated());

		JsonNode stu1Fin = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId()
				+ "/students/" + stu1Id + "/financial-profile")
				.param("academicSessionId", String.valueOf(sessionId))
				.cookie(accountantOrgACookie))
				.andExpect(status().isOk()).andReturn());
		long stu1AprDemandId = stu1Fin.get("monthlyDemands").get(0).get("id").asLong();

		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/fee-payments")
				.cookie(accountantOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "studentId": %d,
						  "paymentDate": "2026-04-06",
						  "paymentMethod": "UPI",
						  "totalAmount": 1500.00,
						  "idempotencyKey": "IDEM-DASH-1",
						  "allocations": [{"demandId": %d, "amount": 1500.00}]
						}
						""".formatted(sessionId, stu1Id, stu1AprDemandId)))
				.andExpect(status().isCreated());

		// 9. Create Important School Notice
		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/notices")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "title": "PTM Scheduled",
						  "content": "Parent-Teacher Meeting on Saturday",
						  "audience": "ALL",
						  "important": true,
						  "publishedDate": "2026-04-06"
						}
						""".formatted(sessionId)))
				.andExpect(status().isCreated());

		// 10. Verify Admin Dashboard
		JsonNode adminDash = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/admin")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("referenceDate", "2026-04-06")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(adminDash.get("totalActiveStudents").asInt()).isEqualTo(3);
		assertThat(adminDash.get("totalActiveTeachers").asInt()).isEqualTo(1);
		assertThat(adminDash.get("totalActiveNonTeachingStaff").asInt()).isEqualTo(1);
		assertThat(adminDash.get("totalActiveStaffAndTeachers").asInt()).isEqualTo(2);
		assertThat(adminDash.get("totalClasses").asInt()).isEqualTo(2);
		assertThat(adminDash.get("todayStudentAttendance").get("presentCount").asInt()).isEqualTo(1);
		assertThat(adminDash.get("todayStudentAttendance").get("absentCount").asInt()).isEqualTo(1);
		assertThat(adminDash.get("todayStaffAttendance").get("presentCount").asInt()).isEqualTo(2);
		assertThat(adminDash.get("overallStudentAttendancePercentage").asDouble()).isEqualTo(50.0);
		assertThat(adminDash.get("upcomingExaminations").size()).isGreaterThanOrEqualTo(1);
		assertThat(adminDash.get("recentlyPublishedResults")).hasSize(1);
		assertThat(adminDash.get("financialSummary").get("totalFeesDemanded").decimalValue()).isEqualByComparingTo("7000.00");
		assertThat(adminDash.get("financialSummary").get("totalFeesCollected").decimalValue()).isEqualByComparingTo("1500.00");
		assertThat(adminDash.get("financialSummary").get("outstandingFeeAmount").decimalValue()).isEqualByComparingTo("5500.00");
		assertThat(adminDash.get("announcements")).hasSize(1);
		assertThat(adminDash.get("recentActivities")).isNotEmpty();
		// 11. Verify Principal Dashboard
		JsonNode principalDash = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/principal")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("referenceDate", "2026-04-06")
				.cookie(principalOrgACookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(principalDash.get("classWisePerformanceAndStrength")).hasSize(2);
		assertThat(principalDash.get("lowAttendanceStudents")).hasSize(1);
		assertThat(principalDash.get("lowAttendanceStudents").get(0).get("studentId").asLong()).isEqualTo(stu2Id);
		assertThat(principalDash.get("studentsRequiringAcademicAttention")).hasSize(1);
		assertThat(principalDash.get("studentsRequiringAcademicAttention").get(0).get("studentId").asLong()).isEqualTo(stu2Id);
		assertThat(principalDash.get("importantSchoolNotices")).hasSize(1);
		assertThat(principalDash.get("overallStaffAttendancePercentage").asDouble()).isEqualTo(100.0);

		// 12. Verify Accountant Dashboard
		JsonNode accountantDash = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/accountant")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("referenceDate", "2026-04-06")
				.cookie(accountantOrgACookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(accountantDash.get("totalFeeDemands").decimalValue()).isEqualByComparingTo("7000.00");
		assertThat(accountantDash.get("totalCollection").decimalValue()).isEqualByComparingTo("1500.00");
		assertThat(accountantDash.get("outstandingFees").decimalValue()).isEqualByComparingTo("5500.00");
		assertThat(accountantDash.get("recentPayments")).hasSize(1);
		assertThat(accountantDash.get("concessionsAndWaiversSummary").get("totalConcessionAndWaiverAmount").decimalValue())
				.isEqualByComparingTo("1000.00");

		// 13. Verify Teacher Dashboard (auto-resolved via teacherUserA)
		JsonNode teacherDash = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/teacher")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("referenceDate", "2026-04-06")
				.cookie(teacherOrgACookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(teacherDash.get("teacherId").asLong()).isEqualTo(teacherId);
		assertThat(teacherDash.get("assignedClasses")).hasSize(1);
		assertThat(teacherDash.get("assignedSubjects")).hasSize(1);
		assertThat(teacherDash.get("todayTimetable")).hasSize(1);
		assertThat(teacherDash.get("todayAttendanceTasks")).hasSize(1);
		assertThat(teacherDash.get("todayAttendanceTasks").get(0).get("completed").asBoolean()).isTrue();
		assertThat(teacherDash.get("homeworkAndEvaluationWidget").get("available").asBoolean()).isFalse();
		assertThat(teacherDash.get("importantSchoolNotices")).hasSize(1);

		// 14. Verify Student & Enrollment Report + Date Range & Incomplete Profile detection
		JsonNode stuReport = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/students-enrollment")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("datePreset", "CUSTOM")
				.param("startDate", "2026-06-01")
				.param("endDate", "2026-06-30")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(stuReport.get("totalActiveStudents").asInt()).isEqualTo(3);
		assertThat(stuReport.get("newAdmissionsInPeriod")).hasSize(1);
		assertThat(stuReport.get("newAdmissionsInPeriod").get(0).get("studentId").asLong()).isEqualTo(stu3Id);
		assertThat(stuReport.get("studentsWithIncompleteProfile")).hasSize(2);
		assertThat(stuReport.get("enrollmentChangesInSession")).hasSize(1);
		assertThat(stuReport.get("genderDistribution").get("MALE").asInt()).isEqualTo(2);
		assertThat(stuReport.get("genderDistribution").get("FEMALE").asInt()).isEqualTo(1);
		// 15. Verify Attendance Report (SELECTED_MONTH filter, absent report, low attendance threshold)
		JsonNode attReport = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/attendance")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("datePreset", "SELECTED_MONTH")
				.param("selectedMonth", "2026-04")
				.param("threshold", "75.0")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(attReport.get("monthlyAttendanceSummaries")).hasSize(1);
		assertThat(attReport.get("absentStudentReport")).hasSize(1);
		assertThat(attReport.get("studentsBelowThreshold")).hasSize(1);
		assertThat(attReport.get("staffAttendanceSummaries")).hasSize(2);

		// 16. Verify Examination Performance Report (official vs draft distinction)
		JsonNode examReport = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/examinations")
				.param("academicSessionId", String.valueOf(sessionId))
				.cookie(adminOrgACookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(examReport.get("officialResultsOnly").asBoolean()).isTrue();
		assertThat(examReport.get("totalOfficialExamsCount").asInt()).isEqualTo(1);
		assertThat(examReport.get("totalDraftOrInProgressExamsCount").asInt()).isEqualTo(1);
		assertThat(examReport.get("examinationWiseResultSummaries")).hasSize(1);
		assertThat(examReport.get("overallPassPercentage").asDouble()).isEqualTo(50.0);
		assertThat(examReport.get("overallAveragePercentage").decimalValue()).isEqualByComparingTo("60.00");
		assertThat(examReport.get("gradeDistribution").get("A").asInt()).isEqualTo(1);
		assertThat(examReport.get("gradeDistribution").get("F").asInt()).isEqualTo(1);

		// 17. Verify Financial Report reconciliation
		JsonNode finReport = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/financial")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("datePreset", "CUSTOM")
				.param("startDate", "2026-04-01")
				.param("endDate", "2026-04-30")
				.cookie(accountantOrgACookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(finReport.get("totalBaseAmount").decimalValue()).isEqualByComparingTo("8000.00");
		assertThat(finReport.get("totalConcessionAmount").decimalValue()).isEqualByComparingTo("1000.00");
		assertThat(finReport.get("totalFeesDemanded").decimalValue()).isEqualByComparingTo("7000.00");
		assertThat(finReport.get("totalAmountCollected").decimalValue()).isEqualByComparingTo("1500.00");
		assertThat(finReport.get("totalOutstandingAmount").decimalValue()).isEqualByComparingTo("5500.00");
		assertThat(finReport.get("partialAndUnpaidFeeDemands")).hasSize(3);
		assertThat(finReport.get("dateRangeCollectionSummary").get("netCollectedAmount").decimalValue())
				.isEqualByComparingTo("1500.00");

		// 18. Verify Exports (CSV, EXCEL, PDF) across all report types
		byte[] csvBytes = mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/financial/export")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("format", "CSV")
				.cookie(accountantOrgACookie))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsByteArray();
		String csvText = new String(csvBytes, StandardCharsets.UTF_8);
		assertThat(csvText).contains("Fees & Financial Report", "ADM-101", "7000.00", "1500.00");

		byte[] excelBytes = mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/attendance/export")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("format", "EXCEL")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsByteArray();
		assertThat(new String(excelBytes, StandardCharsets.UTF_8)).contains("<Workbook", "Attendance Report", "ADM-101");

		byte[] pdfBytes = mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/student-fee-statement/export")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("studentId", String.valueOf(stu1Id))
				.param("format", "PDF")
				.cookie(accountantOrgACookie))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsByteArray();
		assertThat(new String(pdfBytes, StandardCharsets.UTF_8)).startsWith("%PDF-1.4").contains("Student Fee Statement");
		// 19. Verify Authorization & Teacher Scope Restrictions
		// Teacher cannot access Admin, Principal, Accountant dashboards or Financial report/export
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/admin").cookie(teacherOrgACookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/principal").cookie(teacherOrgACookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/accountant").cookie(teacherOrgACookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/financial").cookie(teacherOrgACookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/financial/export").cookie(teacherOrgACookie))
				.andExpect(status().isForbidden());

		// Teacher can view Attendance Report for assigned Grade 1, but is blocked from unassigned Grade 2
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/attendance")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("classId", String.valueOf(class1Id))
				.cookie(teacherOrgACookie))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/attendance")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("classId", String.valueOf(class2Id))
				.cookie(teacherOrgACookie))
				.andExpect(status().isForbidden());

		// Accountant cannot access Admin or Principal dashboard
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/admin").cookie(accountantOrgACookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/principal").cookie(accountantOrgACookie))
				.andExpect(status().isForbidden());

		// 20. Verify Cross-Tenant Isolation (Admin of Org B blocked from all Org A dashboards, reports, exports)
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/dashboards/admin").cookie(adminOrgBCookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/students-enrollment").cookie(adminOrgBCookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/financial/export").cookie(adminOrgBCookie))
				.andExpect(status().isForbidden());

		// 21. Verify Historical Session Filtering (sessionScope=PREVIOUS after completing 2026-2027 and starting 2027-2028)
		mockMvc.perform(patch("/api/organizations/" + orgA.getId() + "/academic-sessions/" + sessionId + "/start")
				.cookie(adminOrgACookie)).andExpect(status().isOk());
		mockMvc.perform(patch("/api/organizations/" + orgA.getId() + "/academic-sessions/" + sessionId + "/complete")
				.cookie(adminOrgACookie)).andExpect(status().isOk());

		long session2Id = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/academic-sessions")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "2027-2028", "startDate": "2027-04-01", "endDate": "2028-03-31"}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();
		mockMvc.perform(patch("/api/organizations/" + orgA.getId() + "/academic-sessions/" + session2Id + "/start")
				.cookie(adminOrgACookie)).andExpect(status().isOk());

		JsonNode prevFinReport = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/financial")
				.param("sessionScope", "PREVIOUS")
				.cookie(accountantOrgACookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(prevFinReport.get("filters").get("academicSessionId").asLong()).isEqualTo(sessionId);
		assertThat(prevFinReport.get("totalFeesDemanded").decimalValue()).isEqualByComparingTo("7000.00");
	}

	@Test
	void paginationAndPerformanceWithLargerDataset_andAllReportFormatExports() throws Exception {
		long sessionId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/academic-sessions")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "2026-2027-PERF", "startDate": "2026-04-01", "endDate": "2027-03-31"}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		long classId = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/classes")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "Grade 10", "code": "G10", "displayOrder": 10}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		// Enroll 25 students and verify pagination & responsive reporting
		for (int i = 1; i <= 25; i++) {
			String admNo = String.format("PERF-%03d", i);
			String gender = (i % 2 == 0) ? "FEMALE" : "MALE";
			createStudentAndEnroll(orgA.getId(), sessionId, classId, admNo, "Student" + i, "Batch", gender, "2026-04-01", false);
		}

		JsonNode page0 = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/students-enrollment")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("page", "0")
				.param("size", "10")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk()).andReturn()).get("studentDirectoryPage");
		assertThat(page0.get("content")).hasSize(10);
		assertThat(page0.get("totalElements").asLong()).isEqualTo(25L);
		assertThat(page0.get("totalPages").asInt()).isEqualTo(3);
		assertThat(page0.get("first").asBoolean()).isTrue();
		assertThat(page0.get("last").asBoolean()).isFalse();

		JsonNode page2 = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/students-enrollment")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("page", "2")
				.param("size", "10")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk()).andReturn()).get("studentDirectoryPage");
		assertThat(page2.get("content")).hasSize(5);
		assertThat(page2.get("first").asBoolean()).isFalse();
		assertThat(page2.get("last").asBoolean()).isTrue();

		// Verify PDF and CSV exports for students-enrollment and examinations
		byte[] stuPdf = mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/students-enrollment/export")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("format", "PDF")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsByteArray();
		assertThat(new String(stuPdf, StandardCharsets.UTF_8))
				.startsWith("%PDF-1.4")
				.contains("Student & Enrollment Report", "Total Active Students: 25");

		byte[] examCsv = mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/reports/examinations/export")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("format", "CSV")
				.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsByteArray();
		assertThat(new String(examCsv, StandardCharsets.UTF_8))
				.contains("Examination & Academic Performance Report", "Overall Pass Percentage");
	}
	private long createStudentAndEnroll(
			Long orgId, Long sessionId, Long classId, String admissionNumber,
			String firstName, String lastName, String gender, String admissionDate,
			boolean completeProfileWithGuardian) throws Exception {
		String body = completeProfileWithGuardian
				? """
				{
				  "admissionNumber": "%s",
				  "firstName": "%s",
				  "lastName": "%s",
				  "dateOfBirth": "2018-05-10",
				  "gender": "%s",
				  "admissionDate": "%s",
				  "phoneNumber": "9900112233",
				  "email": "%s@school.edu",
				  "address": "12 MG Road",
				  "city": "Bengaluru",
				  "state": "Karnataka",
				  "postalCode": "560001",
				  "bloodGroup": "O+"
				}
				""".formatted(admissionNumber, firstName, lastName, gender, admissionDate, admissionNumber.toLowerCase())
				: """
				{
				  "admissionNumber": "%s",
				  "firstName": "%s",
				  "lastName": "%s",
				  "dateOfBirth": "2018-05-10",
				  "gender": "%s",
				  "admissionDate": "%s"
				}
				""".formatted(admissionNumber, firstName, lastName, gender, admissionDate);

		long studentId = readData(mockMvc.perform(post("/api/organizations/" + orgId + "/students")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		if (completeProfileWithGuardian) {
			long guardianId = readData(mockMvc.perform(post("/api/organizations/" + orgId + "/guardians")
					.cookie(adminOrgACookie)
					.contentType(MediaType.APPLICATION_JSON)
					.content("""
							{
							  "firstName": "Parent",
							  "lastName": "%s",
							  "phoneNumber": "9988776655",
							  "email": "parent.%s@example.com"
							}
							""".formatted(lastName, admissionNumber.toLowerCase())))
					.andExpect(status().isCreated()).andReturn()).get("id").asLong();

			mockMvc.perform(post("/api/organizations/" + orgId + "/students/" + studentId + "/guardians")
					.cookie(adminOrgACookie)
					.contentType(MediaType.APPLICATION_JSON)
					.content("""
							{
							  "guardianId": %d,
							  "relationshipType": "FATHER",
							  "primaryContact": true
							}
							""".formatted(guardianId)))
					.andExpect(status().isCreated());
		}

		mockMvc.perform(post("/api/organizations/" + orgId + "/enrollments")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "studentId": %d,
						  "academicSessionId": %d,
						  "classId": %d,
						  "rollNumber": "R-%s",
						  "enrollmentDate": "%s"
						}
						""".formatted(studentId, sessionId, classId, admissionNumber, admissionDate)))
				.andExpect(status().isCreated());

		return studentId;
	}
}