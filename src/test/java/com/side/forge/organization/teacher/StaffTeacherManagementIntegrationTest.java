package com.side.forge.organization.teacher;

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
class StaffTeacherManagementIntegrationTest {

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
	private Cookie suspendedMemberOrgACookie;
	private Cookie adminOrgBCookie;
	private Cookie nonMemberCookie;

	@BeforeEach
	void setUp() {
		orgA = createOrganization("DPS Bengaluru", "Asia/Kolkata");
		orgB = createOrganization("Oakridge International", "UTC");

		Users adminA = createUser("stfAdminA");
		assignOrgRole(adminA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgACookie = jwtCookie(adminA);

		Users principalA = createUser("stfPrincipalA");
		assignOrgRole(principalA.getId(), orgA.getId(), "PRINCIPAL", MembershipStatus.ACTIVE);
		principalOrgACookie = jwtCookie(principalA);

		Users teacherA = createUser("stfTeacherA");
		assignOrgRole(teacherA.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacherOrgACookie = jwtCookie(teacherA);

		Users receptionistA = createUser("stfReceptionistA");
		assignOrgRole(receptionistA.getId(), orgA.getId(), "RECEPTIONIST", MembershipStatus.ACTIVE);
		receptionistOrgACookie = jwtCookie(receptionistA);

		Users suspendedA = createUser("stfSuspendedA");
		assignOrgRole(suspendedA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.SUSPENDED);
		suspendedMemberOrgACookie = jwtCookie(suspendedA);

		Users adminB = createUser("stfAdminB");
		assignOrgRole(adminB.getId(), orgB.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgBCookie = jwtCookie(adminB);

		Users outsider = createUser("stfOutsider");
		nonMemberCookie = jwtCookie(outsider);
	}

	@AfterEach
	void tearDown() {
		for (Long orgId : createdOrgIds) {
			jdbc.update("DELETE FROM teacher_subject_assignments WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM teacher_class_assignments WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM teachers WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM staff WHERE organization_id = :orgId", Map.of("orgId", orgId));
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
		org.setAddress("200 Faculty Road");
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

	private Long createTeacherViaApi(Long orgId, Cookie cookie, String empId, String firstName, String lastName,
			String specialization) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/teachers", orgId)
						.cookie(cookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "employeeId": "%s",
								  "firstName": "%s",
								  "lastName": "%s",
								  "dateOfBirth": "1988-03-10",
								  "gender": "FEMALE",
								  "email": "%s@school.edu",
								  "phoneNumber": "9845011122",
								  "joiningDate": "2020-06-01",
								  "designation": "Senior Teacher",
								  "department": "Academics",
								  "employmentType": "PERMANENT",
								  "qualifications": "M.Sc., B.Ed.",
								  "specialization": "%s",
								  "experienceYears": 8,
								  "registrationNumber": "REG-%s"
								}
								""".formatted(empId, firstName, lastName, empId.toLowerCase(), specialization, empId)))
				.andExpect(status().isCreated())
				.andReturn();
		return extractId(res);
	}

	@Test
	void staffManagement_crudDuplicateValidationStatusTransitionsUserAccountAndDirectory() throws Exception {
		Long orgId = orgA.getId();

		// 1. Register non-teaching administrative staff
		MvcResult createRes = mockMvc.perform(post("/api/organizations/{orgId}/staff", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "employeeId": "emp-001",
								  "firstName": "Suresh",
								  "lastName": "Kulkarni",
								  "dateOfBirth": "1985-04-20",
								  "gender": "MALE",
								  "email": "suresh@school.edu",
								  "phoneNumber": "9845012345",
								  "joiningDate": "2019-06-01",
								  "designation": "Accounts Officer",
								  "department": "Finance",
								  "employmentType": "PERMANENT",
								  "emergencyContactName": "Anita Kulkarni",
								  "emergencyContactPhone": "9845099999",
								  "emergencyContactRelation": "Spouse",
								  "teachingStaff": false
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.employeeId").value("EMP-001"))
				.andExpect(jsonPath("$.data.employmentStatus").value("ACTIVE"))
				.andReturn();
		Long staff1Id = extractId(createRes);

		// Register contractual staff
		Long staff2Id = extractId(mockMvc.perform(post("/api/organizations/{orgId}/staff", orgId)
						.cookie(principalOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "employeeId": "emp-002",
								  "firstName": "Kavita",
								  "lastName": "Reddy",
								  "dateOfBirth": "1992-08-12",
								  "gender": "FEMALE",
								  "phoneNumber": "9845054321",
								  "joiningDate": "2023-01-15",
								  "designation": "Lab Assistant",
								  "department": "Science",
								  "employmentType": "CONTRACTUAL"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn());

		// 2. Duplicate employeeId in same organization -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/staff", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "employeeId": "EMP-001",
								  "firstName": "Another",
								  "phoneNumber": "9845000001",
								  "joiningDate": "2024-01-01",
								  "designation": "Clerk"
								}
								"""))
				.andExpect(status().isConflict());

		// 3. Invalid dates (joiningDate before DOB) -> 400 Bad Request
		mockMvc.perform(post("/api/organizations/{orgId}/staff", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "employeeId": "EMP-999",
								  "firstName": "Invalid",
								  "dateOfBirth": "2000-05-10",
								  "phoneNumber": "9845000002",
								  "joiningDate": "1999-01-01",
								  "designation": "Clerk"
								}
								"""))
				.andExpect(status().isBadRequest());

		// 4. Update staff profile
		mockMvc.perform(put("/api/organizations/{orgId}/staff/{sId}", orgId, staff1Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "employeeId": "EMP-001",
								  "firstName": "Suresh",
								  "middleName": "V",
								  "lastName": "Kulkarni",
								  "dateOfBirth": "1985-04-20",
								  "gender": "MALE",
								  "phoneNumber": "9845012345",
								  "joiningDate": "2019-06-01",
								  "designation": "Senior Accounts Officer",
								  "department": "Finance",
								  "employmentType": "PERMANENT"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.designation").value("Senior Accounts Officer"));

		// 5. Associate existing application user account & reject duplicate user association
		Users staffUser = createUser("sureshAcc");
		mockMvc.perform(put("/api/organizations/{orgId}/staff/{sId}/user-account", orgId, staff1Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"userId\":" + staffUser.getId() + "}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.userId").value(staffUser.getId()));

		mockMvc.perform(put("/api/organizations/{orgId}/staff/{sId}/user-account", orgId, staff2Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"userId\":" + staffUser.getId() + "}"))
				.andExpect(status().isConflict());

		// 6. Employment status lifecycle: ACTIVE -> ON_LEAVE -> ACTIVE -> RESIGNED (terminal) -> cannot transition back to ACTIVE
		mockMvc.perform(patch("/api/organizations/{orgId}/staff/{sId}/status", orgId, staff2Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"employmentStatus\":\"ON_LEAVE\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.employmentStatus").value("ON_LEAVE"));

		mockMvc.perform(patch("/api/organizations/{orgId}/staff/{sId}/status", orgId, staff2Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"employmentStatus\":\"RESIGNED\",\"leavingDate\":\"2026-03-31\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.employmentStatus").value("RESIGNED"))
				.andExpect(jsonPath("$.data.leavingDate").value("2026-03-31"));

		mockMvc.perform(patch("/api/organizations/{orgId}/staff/{sId}/status", orgId, staff2Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"employmentStatus\":\"ACTIVE\"}"))
				.andExpect(status().isConflict());

		// 7. Staff directory search, filter by department/employmentType/employmentStatus, and pagination
		mockMvc.perform(get("/api/organizations/{orgId}/staff", orgId)
						.param("department", "Finance")
						.param("employmentStatus", "ACTIVE")
						.cookie(receptionistOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1))
				.andExpect(jsonPath("$.data.content[0].firstName").value("Suresh"));
	}

	@Test
	void teacherManagement_promoteStaffDirectCreateUpdateDirectoryAndAvailability() throws Exception {
		Long orgId = orgA.getId();

		// 1. Register staff first, then promote to teacher via POST /teachers with staffId
		Long staffId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/staff", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "employeeId": "EMP-101",
								  "firstName": "Priya",
								  "lastName": "Menon",
								  "dateOfBirth": "1989-07-15",
								  "gender": "FEMALE",
								  "phoneNumber": "9845022233",
								  "joiningDate": "2021-06-01",
								  "designation": "Vice Principal & Faculty",
								  "department": "Academics",
								  "employmentType": "PERMANENT",
								  "teachingStaff": false
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn());

		Long teacher1Id = extractId(mockMvc.perform(post("/api/organizations/{orgId}/teachers", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "staffId": %d,
								  "qualifications": "M.A. English, B.Ed.",
								  "specialization": "English Literature",
								  "experienceYears": 10,
								  "registrationNumber": "TR-101"
								}
								""".formatted(staffId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.staffId").value(staffId))
				.andExpect(jsonPath("$.data.specialization").value("English Literature"))
				.andReturn());

		// Promoting the same staff member twice -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/teachers", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"staffId\":" + staffId + ",\"specialization\":\"Duplicate\"}"))
				.andExpect(status().isConflict());

		// 2. Direct teacher creation (Staff + TeacherProfile created in one request)
		Long teacher2Id = createTeacherViaApi(orgId, principalOrgACookie, "EMP-102", "Nandini", "Rao", "Mathematics");

		// 3. Update teacher profile & manage teacher availability
		mockMvc.perform(put("/api/organizations/{orgId}/teachers/{tId}", orgId, teacher1Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "qualifications": "M.A. English, Ph.D., B.Ed.",
								  "specialization": "English & Linguistics",
								  "experienceYears": 12,
								  "registrationNumber": "TR-101-A",
								  "certifications": "CELTA",
								  "availableForAssignment": true
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.experienceYears").value(12))
				.andExpect(jsonPath("$.data.certifications").value("CELTA"));

		// Mark teacher2 as INACTIVE -> availableForAssignment automatically becomes false, and cannot be forced true while INACTIVE
		mockMvc.perform(patch("/api/organizations/{orgId}/teachers/{tId}/status", orgId, teacher2Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"employmentStatus\":\"INACTIVE\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.employmentStatus").value("INACTIVE"))
				.andExpect(jsonPath("$.data.availableForAssignment").value(false));

		mockMvc.perform(patch("/api/organizations/{orgId}/teachers/{tId}/status", orgId, teacher2Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"availableForAssignment\":true}"))
				.andExpect(status().isConflict());

		// Available teachers endpoint returns only teacher1 (ACTIVE + availableForAssignment=true)
		mockMvc.perform(get("/api/organizations/{orgId}/teachers/available", orgId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1))
				.andExpect(jsonPath("$.data.content[0].firstName").value("Priya"));
	}

	@Test
	void teacherClassAndSubjectAssignments_classSubjectValidation_completedSessionAndConcurrency() throws Exception {
		Long orgId = orgA.getId();

		Long teacher1 = createTeacherViaApi(orgId, adminOrgACookie, "TCH-201", "Anil", "Deshmukh", "Mathematics");
		Long teacher2 = createTeacherViaApi(orgId, adminOrgACookie, "TCH-202", "Rekha", "Iyer", "Science");

		Long session2627 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/start", orgId, session2627)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		Long session2728 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2027-28\"}"))
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

		Long mathSub = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Mathematics\",\"code\":\"MATH\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long sciSub = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Science\",\"code\":\"SCI\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		// Assign ONLY mathSub to class1 in 2026-27 (sciSub is NOT assigned to class1 yet)
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, session2627, class1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + mathSub + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isCreated());

		// 1. Teacher-Class Assignments: assign teacher1 as classTeacher=true to Class 1 & Class 2
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/teachers",
						orgId, session2627, class1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacher1 + ",\"classTeacher\":true,\"remarks\":\"Primary Teacher\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.classTeacher").value(true));

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/teachers",
						orgId, session2627, class2)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacher1 + ",\"classTeacher\":false}"))
				.andExpect(status().isCreated());

		// Duplicate teacher-class assignment -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/teachers",
						orgId, session2627, class1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacher1 + "}"))
				.andExpect(status().isConflict());

		// Assign teacher2 to Class 1 with classTeacher=true -> teacher1's classTeacher on Class 1 demoted to false
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/teachers",
						orgId, session2627, class1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacher2 + ",\"classTeacher\":true}"))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/teachers",
						orgId, session2627, class1)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2))
				.andExpect(jsonPath("$.data[0].teacherId").value(teacher2))
				.andExpect(jsonPath("$.data[0].classTeacher").value(true))
				.andExpect(jsonPath("$.data[1].teacherId").value(teacher1))
				.andExpect(jsonPath("$.data[1].classTeacher").value(false));

		// 2. Teacher-Subject Assignments: assigning teacher2 to sciSub on Class 1 MUST FAIL (409)
		// because sciSub is NOT assigned to Class 1 in 2026-27!
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}/teachers",
						orgId, session2627, class1, sciSub)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacher2 + "}"))
				.andExpect(status().isConflict());

		// Assigning teacher1 and teacher2 to mathSub on Class 1 (which IS assigned to Class 1) -> 201 Created
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}/teachers",
						orgId, session2627, class1, mathSub)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacher1 + ",\"remarks\":\"Lead Math Teacher\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.subjectCode").value("MATH"));

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}/teachers",
						orgId, session2627, class1, mathSub)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacher2 + ",\"remarks\":\"Co-Teacher\"}"))
				.andExpect(status().isCreated());

		// Duplicate teacher-subject assignment -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}/teachers",
						orgId, session2627, class1, mathSub)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacher1 + "}"))
				.andExpect(status().isConflict());

		// Update teacher-class and teacher-subject assignments via PUT -> 200 OK
		mockMvc.perform(put("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/teachers/{tId}",
						orgId, session2627, class1, teacher1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classTeacher\":true,\"remarks\":\"Re-appointed Class Teacher\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.classTeacher").value(true))
				.andExpect(jsonPath("$.data.remarks").value("Re-appointed Class Teacher"));

		mockMvc.perform(put("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}/teachers/{tId}",
						orgId, session2627, class1, mathSub, teacher1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"remarks\":\"Updated Math Lead\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.remarks").value("Updated Math Lead"));

		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/subjects/{subId}/teachers",
						orgId, session2627, mathSub)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2));

		mockMvc.perform(get("/api/organizations/{orgId}/teachers/{tId}/class-assignments", orgId, teacher1)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2));

		// Prepare upcoming PLANNED session 2027-28 while 2026-27 is ACTIVE
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, session2728, class1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + sciSub + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isCreated());
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}/teachers",
						orgId, session2728, class1, sciSub)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacher1 + "}"))
				.andExpect(status().isCreated());

		// Directory filter by academicSessionId, classId, subjectId, and teacher assignment views
		mockMvc.perform(get("/api/organizations/{orgId}/teachers", orgId)
						.param("academicSessionId", session2627.toString())
						.param("classId", class1.toString())
						.param("subjectId", mathSub.toString())
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(2));

		mockMvc.perform(get("/api/organizations/{orgId}/teachers/{tId}/subject-assignments", orgId, teacher1)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2));

		// Complete session 2026-27 -> modifying or deleting assignments in COMPLETED session fails with 409,
		// while historical assignments remain retrievable!
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/complete", orgId, session2627)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/teachers/{tId}",
						orgId, session2627, class1, teacher1)
						.cookie(adminOrgACookie))
				.andExpect(status().isConflict());
		mockMvc.perform(delete("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}/teachers/{tId}",
						orgId, session2627, class1, mathSub, teacher1)
						.cookie(adminOrgACookie))
				.andExpect(status().isConflict());

		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/teacher-class-assignments",
						orgId, session2627)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(3));
	}

	@Test
	void concurrentAssignmentOperations_preventDuplicateRecords() throws Exception {
		Long orgId = orgA.getId();

		Long teacherId = createTeacherViaApi(orgId, adminOrgACookie, "TCH-301", "Vikram", "Sethi", "Physics");
		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long classId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 9\",\"code\":\"C9\",\"displayOrder\":9}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long subjectId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Physics\",\"code\":\"PHY\"}"))
				.andExpect(status().isCreated())
				.andReturn());

		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects",
						orgId, sessionId, classId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"subjectId\":" + subjectId + ",\"compulsory\":true,\"displayOrder\":1}"))
				.andExpect(status().isCreated());

		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch startGun = new CountDownLatch(1);
		AtomicInteger createdCount = new AtomicInteger(0);
		AtomicInteger conflictCount = new AtomicInteger(0);

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Callable<Void> task = () -> {
				ready.countDown();
				startGun.await(5, TimeUnit.SECONDS);
				int httpStatus = mockMvc.perform(post(
								"/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/subjects/{subId}/teachers",
								orgId, sessionId, classId, subjectId)
								.cookie(adminOrgACookie)
								.contentType(MediaType.APPLICATION_JSON)
								.content("{\"teacherId\":" + teacherId + "}"))
						.andReturn().getResponse().getStatus();
				if (httpStatus == 201) {
					createdCount.incrementAndGet();
				} else if (httpStatus == 409) {
					conflictCount.incrementAndGet();
				}
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

		// Also verify concurrent teacher-class assignment requests
		CountDownLatch classReady = new CountDownLatch(2);
		CountDownLatch classStartGun = new CountDownLatch(1);
		AtomicInteger classCreated = new AtomicInteger(0);
		AtomicInteger classConflict = new AtomicInteger(0);

		ExecutorService classPool = Executors.newFixedThreadPool(2);
		try {
			Callable<Void> classTask = () -> {
				classReady.countDown();
				classStartGun.await(5, TimeUnit.SECONDS);
				int httpStatus = mockMvc.perform(post(
								"/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/teachers",
								orgId, sessionId, classId)
								.cookie(adminOrgACookie)
								.contentType(MediaType.APPLICATION_JSON)
								.content("{\"teacherId\":" + teacherId + ",\"classTeacher\":true}"))
						.andReturn().getResponse().getStatus();
				if (httpStatus == 201) {
					classCreated.incrementAndGet();
				} else if (httpStatus == 409) {
					classConflict.incrementAndGet();
				}
				return null;
			};

			Future<Void> cf1 = classPool.submit(classTask);
			Future<Void> cf2 = classPool.submit(classTask);
			assertThat(classReady.await(5, TimeUnit.SECONDS)).isTrue();
			classStartGun.countDown();
			cf1.get(10, TimeUnit.SECONDS);
			cf2.get(10, TimeUnit.SECONDS);
		} finally {
			classPool.shutdownNow();
		}

		assertThat(classCreated.get()).isEqualTo(1);
		assertThat(classConflict.get()).isEqualTo(1);
	}

	@Test
	void crossTenantIsolation_andAuthorizationAndCompositeForeignKeys() throws Exception {
		Long orgAId = orgA.getId();
		Long orgBId = orgB.getId();

		Long teacherA = createTeacherViaApi(orgAId, adminOrgACookie, "TCH-401", "Deepa", "Nambiar", "Biology");
		Long sessionB = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgBId)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long classB = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgBId)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 1\",\"code\":\"C1\",\"displayOrder\":1}"))
				.andExpect(status().isCreated())
				.andReturn());

		// 1. Cross-tenant access & assignment attempts return 404 Not Found without leaking existence
		mockMvc.perform(get("/api/organizations/{orgId}/teachers/{tId}", orgBId, teacherA)
						.cookie(adminOrgBCookie))
				.andExpect(status().isNotFound());
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/teachers",
						orgBId, sessionB, classB)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"teacherId\":" + teacherA + "}"))
				.andExpect(status().isNotFound());

		// 2. Database-level composite FK enforcement rejects cross-tenant teacher-class assignment
		assertThatThrownBy(() -> jdbc.update("""
				INSERT INTO teacher_class_assignments (organization_id, academic_session_id, class_id, teacher_id, is_class_teacher, created_at, updated_at)
				VALUES (:orgId, :sessionId, :classId, :teacherId, 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
				""",
				Map.of("orgId", orgBId, "sessionId", sessionB, "classId", classB, "teacherId", teacherA)))
				.isInstanceOf(DataIntegrityViolationException.class);

		// 3. Authorization checks: unauthenticated (401), non-member (403), suspended member (403), missing permissions (403)
		mockMvc.perform(get("/api/organizations/{orgId}/staff", orgAId))
				.andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/organizations/{orgId}/staff", orgAId).cookie(nonMemberCookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/staff", orgAId).cookie(suspendedMemberOrgACookie))
				.andExpect(status().isForbidden());

		// Teacher has TEACHER_VIEW (200) but lacks STAFF_MANAGE & TEACHER_MANAGE (403)
		mockMvc.perform(get("/api/organizations/{orgId}/teachers", orgAId).cookie(teacherOrgACookie))
				.andExpect(status().isOk());
		mockMvc.perform(post("/api/organizations/{orgId}/teachers", orgAId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"employeeId\":\"TCH-X\",\"firstName\":\"NoPerm\",\"phoneNumber\":\"9845099991\",\"joiningDate\":\"2024-01-01\",\"designation\":\"Teacher\"}"))
				.andExpect(status().isForbidden());
	}
}
