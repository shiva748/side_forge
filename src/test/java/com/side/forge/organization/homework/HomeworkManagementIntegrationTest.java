package com.side.forge.organization.homework;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
class HomeworkManagementIntegrationTest {

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
	private Users teacher1User;
	private Users teacher2User;
	private Users student1User;
	private Users student2User;
	private Cookie adminOrgACookie;
	private Cookie teacher1Cookie;
	private Cookie teacher2Cookie;
	private Cookie student1Cookie;
	private Cookie student2Cookie;
	private Cookie adminOrgBCookie;

	@BeforeEach
	void setUp() {
		orgA = createOrganization("Sunrise Public School", "Asia/Kolkata");
		orgB = createOrganization("Oakridge Academy", "UTC");

		Users adminA = createUser("hwAdminA");
		assignOrgRole(adminA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgACookie = jwtCookie(adminA);

		teacher1User = createUser("hwTeacher1");
		assignOrgRole(teacher1User.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacher1Cookie = jwtCookie(teacher1User);

		teacher2User = createUser("hwTeacher2");
		assignOrgRole(teacher2User.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacher2Cookie = jwtCookie(teacher2User);

		student1User = createUser("hwStudent1");
		assignOrgRole(student1User.getId(), orgA.getId(), "STUDENT", MembershipStatus.ACTIVE);
		student1Cookie = jwtCookie(student1User);

		student2User = createUser("hwStudent2");
		assignOrgRole(student2User.getId(), orgA.getId(), "STUDENT", MembershipStatus.ACTIVE);
		student2Cookie = jwtCookie(student2User);

		Users adminB = createUser("hwAdminB");
		assignOrgRole(adminB.getId(), orgB.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgBCookie = jwtCookie(adminB);
	}

	@AfterEach
	void tearDown() {
		String[] tables = {
				"student_homework_submissions", "homework_assignments",
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
		org.setAddress("10 Homework Lane");
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
	void homeworkLifecycle_createAssignViewSubmitResubmitEvaluate_latePolicy_dashboardsAndSecurity() throws Exception {
		// 1. Setup Session, Class 1 & Class 2, Subject (Mathematics), Class-Subject
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
						{"name": "Class 5", "code": "C5", "displayOrder": 5}
						"""))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		long class2Id = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/classes")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "Class 6", "code": "C6", "displayOrder": 6}
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

		mockMvc.perform(post("/api/organizations/" + orgA.getId()
				+ "/academic-sessions/" + sessionId + "/classes/" + class2Id + "/subjects")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"subjectId\": " + mathId + "}"))
				.andExpect(status().isCreated());

		// 2. Create Teacher 1 (assigned to Class 5 Math) & Teacher 2 (assigned to Class 6 Math)
		long teacher1Id = createTeacher(orgA.getId(), teacher1User.getId(), "EMP-HW1", "Vikram", "Rao");
		long teacher2Id = createTeacher(orgA.getId(), teacher2User.getId(), "EMP-HW2", "Meera", "Iyer");

		mockMvc.perform(post("/api/organizations/" + orgA.getId()
				+ "/academic-sessions/" + sessionId + "/classes/" + class1Id + "/subjects/" + mathId + "/teachers")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"teacherId\": " + teacher1Id + "}"))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/organizations/" + orgA.getId()
				+ "/academic-sessions/" + sessionId + "/classes/" + class2Id + "/subjects/" + mathId + "/teachers")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"teacherId\": " + teacher2Id + "}"))
				.andExpect(status().isCreated());

		// 3. Create & Enroll Student 1 and Student 2 in Class 5
		long stu1Id = createStudentAndEnroll(orgA.getId(), sessionId, class1Id, student1User.getId(), "HW-S1", "Rohan", "Verma");
		long stu2Id = createStudentAndEnroll(orgA.getId(), sessionId, class1Id, student2User.getId(), "HW-S2", "Sneha", "Kapoor");

		// 4. Teacher 1 cannot create homework for unassigned Class 6 -> 403 Forbidden
		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/homework")
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "subjectId": %d,
						  "title": "Unauthorized Homework",
						  "description": "Should fail",
						  "assignedDate": "2026-04-05",
						  "dueDate": "2026-04-10"
						}
						""".formatted(sessionId, class2Id, mathId)))
				.andExpect(status().isForbidden());

		// 5. Teacher 1 creates Homework 1 (REJECT_LATE) for Class 5 Math
		JsonNode hw1 = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/homework")
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "subjectId": %d,
						  "title": "Fractions Worksheet 1",
						  "description": "Solve exercises 1 to 10 from Chapter 2",
						  "assignedDate": "2026-04-05",
						  "dueDate": "2026-04-10",
						  "maxMarks": 20.00,
						  "allowResubmission": true,
						  "lateSubmissionPolicy": "REJECT_LATE",
						  "referenceAttachments": ["https://files.school.edu/fractions-ref.pdf"]
						}
						""".formatted(sessionId, class1Id, mathId)))
				.andExpect(status().isCreated()).andReturn());
		long hw1Id = hw1.get("id").asLong();
		assertThat(hw1.get("totalAssignedStudents").asInt()).isEqualTo(2);
		assertThat(hw1.get("pendingCount").asInt()).isEqualTo(2);
		assertThat(hw1.get("referenceAttachments")).hasSize(1);
		// 6. Enrolling a 3rd student later does not retroactively change hw1's historical roster
		createStudentAndEnroll(orgA.getId(), sessionId, class1Id, null, "HW-S3", "Karan", "Malhotra");
		JsonNode roster = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/homework/" + hw1Id + "/submissions")
				.param("referenceDate", "2026-04-06")
				.cookie(teacher1Cookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(roster).hasSize(2);

		// 7. Student 1 views their assigned homework (and cannot view Student 2's homework -> 403)
		JsonNode stu1List = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/homework/my-assignments")
				.param("referenceDate", "2026-04-06")
				.cookie(student1Cookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(stu1List).hasSize(1);
		assertThat(stu1List.get(0).get("status").asText()).isEqualTo("PENDING");
		assertThat(stu1List.get(0).get("referenceAttachments")).hasSize(1);

		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/students/" + stu2Id + "/homework")
				.cookie(student1Cookie))
				.andExpect(status().isForbidden());

		// 8. Student 1 submits homework before deadline and resubmits updated work before deadline
		JsonNode sub1 = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/homework/" + hw1Id + "/submissions")
				.cookie(student1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "submissionText": "Initial solutions 1-10",
						  "attachments": ["https://files.school.edu/stu1-draft.pdf"],
						  "submissionDate": "2026-04-08"
						}
						"""))
				.andExpect(status().isOk()).andReturn());
		assertThat(sub1.get("status").asText()).isEqualTo("SUBMITTED");
		assertThat(sub1.get("submissionCount").asInt()).isEqualTo(1);
		assertThat(sub1.get("lateSubmission").asBoolean()).isFalse();

		JsonNode resub1 = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/homework/" + hw1Id + "/submissions")
				.cookie(student1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "submissionText": "Revised solutions 1-10 with steps",
						  "attachments": ["https://files.school.edu/stu1-final.pdf"],
						  "submissionDate": "2026-04-09"
						}
						"""))
				.andExpect(status().isOk()).andReturn());
		long sub1Id = resub1.get("submissionId").asLong();
		assertThat(resub1.get("submissionCount").asInt()).isEqualTo(2);
		assertThat(resub1.get("lastResubmittedAt").isNull()).isFalse();

		// Student 1 cannot submit work on behalf of Student 2 -> 403 Forbidden
		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/homework/" + hw1Id + "/submissions")
				.cookie(student1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "studentId": %d,
						  "submissionText": "Impersonated submission",
						  "submissionDate": "2026-04-08"
						}
						""".formatted(stu2Id)))
				.andExpect(status().isForbidden());

		// 9. Cannot delete homework after a student has submitted work -> 409 Conflict
		mockMvc.perform(delete("/api/organizations/" + orgA.getId() + "/homework/" + hw1Id)
				.cookie(teacher1Cookie))
				.andExpect(status().isConflict());

		// 10. Deadline & Late Submission Behavior: Student 2 attempts late submission on 2026-04-12 (REJECT_LATE -> 409)
		mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/homework/" + hw1Id + "/submissions")
				.cookie(student2Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "submissionText": "Late work",
						  "submissionDate": "2026-04-12"
						}
						"""))
				.andExpect(status().isConflict());

		// Student 2 sees status OVERDUE when viewing after dueDate (2026-04-12)
		JsonNode stu2Dash = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/homework/dashboard/student")
				.param("referenceDate", "2026-04-12")
				.cookie(student2Cookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(stu2Dash.get("overdueCount").asInt()).isEqualTo(1);
		// 11. Teacher 1 updates hw1 policy to ALLOW_LATE; Student 2 submits late and is flagged lateSubmission=true
		mockMvc.perform(put("/api/organizations/" + orgA.getId() + "/homework/" + hw1Id)
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "title": "Fractions Worksheet 1",
						  "description": "Solve exercises 1 to 10 from Chapter 2",
						  "assignedDate": "2026-04-05",
						  "dueDate": "2026-04-10",
						  "maxMarks": 20.00,
						  "allowResubmission": true,
						  "lateSubmissionPolicy": "ALLOW_LATE",
						  "referenceAttachments": ["https://files.school.edu/fractions-ref.pdf"]
						}
						"""))
				.andExpect(status().isOk());

		JsonNode sub2Late = readData(mockMvc.perform(post("/api/organizations/" + orgA.getId() + "/homework/" + hw1Id + "/submissions")
				.cookie(student2Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "submissionText": "Late completed solutions",
						  "submissionDate": "2026-04-12"
						}
						"""))
				.andExpect(status().isOk()).andReturn());
		assertThat(sub2Late.get("status").asText()).isEqualTo("SUBMITTED");
		assertThat(sub2Late.get("lateSubmission").asBoolean()).isTrue();

		// 12. Teacher 2 (unrelated Class 6 teacher) cannot evaluate Class 5 homework -> 403 Forbidden
		mockMvc.perform(patch("/api/organizations/" + orgA.getId()
				+ "/homework/" + hw1Id + "/submissions/" + sub1Id + "/evaluate")
				.cookie(teacher2Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"marksAwarded": 18.00, "feedback": "Unauthorized evaluation"}
						"""))
				.andExpect(status().isForbidden());

		// 13. Teacher 1 evaluates Student 1's submission
		JsonNode evaluated1 = readData(mockMvc.perform(patch("/api/organizations/" + orgA.getId()
				+ "/homework/" + hw1Id + "/submissions/" + sub1Id + "/evaluate")
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"marksAwarded": 19.00, "feedback": "Excellent step-by-step work!"}
						"""))
				.andExpect(status().isOk()).andReturn());
		assertThat(evaluated1.get("status").asText()).isEqualTo("EVALUATED");
		assertThat(evaluated1.get("marksAwarded").decimalValue()).isEqualByComparingTo("19.00");
		assertThat(evaluated1.get("teacherFeedback").asText()).isEqualTo("Excellent step-by-step work!");

		// 14. Verify Teacher & Student Homework Dashboards
		JsonNode teacherDash = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/homework/dashboard/teacher")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("referenceDate", "2026-04-12")
				.cookie(teacher1Cookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(teacherDash.get("totalAssignmentsCreated").asInt()).isEqualTo(1);
		assertThat(teacherDash.get("submittedAssignmentsCount").asInt()).isEqualTo(2);
		assertThat(teacherDash.get("awaitingEvaluationCount").asInt()).isEqualTo(1);
		assertThat(teacherDash.get("evaluatedSubmissionsCount").asInt()).isEqualTo(1);

		JsonNode stu1Dash = readData(mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/homework/dashboard/student")
				.param("academicSessionId", String.valueOf(sessionId))
				.param("referenceDate", "2026-04-12")
				.cookie(student1Cookie))
				.andExpect(status().isOk()).andReturn());
		assertThat(stu1Dash.get("totalAssignedCount").asInt()).isEqualTo(1);
		assertThat(stu1Dash.get("evaluatedCount").asInt()).isEqualTo(1);
		assertThat(stu1Dash.get("assignments").get(0).get("marksAwarded").decimalValue()).isEqualByComparingTo("19.00");

		// 15. Verify Cross-Tenant Isolation (Org B Admin blocked from Org A homework)
		mockMvc.perform(get("/api/organizations/" + orgA.getId() + "/homework/" + hw1Id)
				.cookie(adminOrgBCookie))
				.andExpect(status().isForbidden());
	}

	private long createTeacher(Long orgId, Long userId, String empId, String firstName, String lastName) throws Exception {
		return readData(mockMvc.perform(post("/api/organizations/" + orgId + "/teachers")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "userId": %d,
						  "employeeId": "%s",
						  "firstName": "%s",
						  "lastName": "%s",
						  "phoneNumber": "9811122233",
						  "joiningDate": "2025-06-01",
						  "designation": "Teacher",
						  "department": "Academics",
						  "employmentType": "PERMANENT",
						  "qualifications": "M.Sc, B.Ed",
						  "specialization": "Mathematics",
						  "experienceYears": 5,
						  "availableForAssignment": true
						}
						""".formatted(userId, empId, firstName, lastName)))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();
	}

	private long createStudentAndEnroll(
			Long orgId, Long sessionId, Long classId, Long userId,
			String admissionNumber, String firstName, String lastName) throws Exception {
		String userField = userId != null ? "\"userId\": " + userId + "," : "";
		long studentId = readData(mockMvc.perform(post("/api/organizations/" + orgId + "/students")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  %s
						  "admissionNumber": "%s",
						  "firstName": "%s",
						  "lastName": "%s",
						  "dateOfBirth": "2015-05-10",
						  "gender": "MALE",
						  "admissionDate": "2026-04-01"
						}
						""".formatted(userField, admissionNumber, firstName, lastName)))
				.andExpect(status().isCreated()).andReturn()).get("id").asLong();

		mockMvc.perform(post("/api/organizations/" + orgId + "/enrollments")
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "studentId": %d,
						  "academicSessionId": %d,
						  "classId": %d,
						  "rollNumber": "R-%s",
						  "enrollmentDate": "2026-04-01"
						}
						""".formatted(studentId, sessionId, classId, admissionNumber)))
				.andExpect(status().isCreated());

		return studentId;
	}
}
