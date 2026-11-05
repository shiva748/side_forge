package com.side.forge.organization.student;

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
class StudentManagementIntegrationTest {

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
		orgA = createOrganization("St. Xavier School", "Asia/Kolkata");
		orgB = createOrganization("Greenwood High", "UTC");

		Users adminA = createUser("stuAdminA");
		assignOrgRole(adminA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgACookie = jwtCookie(adminA);

		Users principalA = createUser("stuPrincipalA");
		assignOrgRole(principalA.getId(), orgA.getId(), "PRINCIPAL", MembershipStatus.ACTIVE);
		principalOrgACookie = jwtCookie(principalA);

		Users teacherA = createUser("stuTeacherA");
		assignOrgRole(teacherA.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacherOrgACookie = jwtCookie(teacherA);

		Users receptionistA = createUser("stuReceptionistA");
		assignOrgRole(receptionistA.getId(), orgA.getId(), "RECEPTIONIST", MembershipStatus.ACTIVE);
		receptionistOrgACookie = jwtCookie(receptionistA);

		Users suspendedA = createUser("stuSuspendedA");
		assignOrgRole(suspendedA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.SUSPENDED);
		suspendedMemberOrgACookie = jwtCookie(suspendedA);

		Users adminB = createUser("stuAdminB");
		assignOrgRole(adminB.getId(), orgB.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgBCookie = jwtCookie(adminB);

		Users outsider = createUser("stuOutsider");
		nonMemberCookie = jwtCookie(outsider);
	}

	@AfterEach
	void tearDown() {
		for (Long orgId : createdOrgIds) {
			jdbc.update("DELETE FROM student_enrollments WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM student_guardians WHERE organization_id = :orgId", Map.of("orgId", orgId));
			jdbc.update("DELETE FROM guardians WHERE organization_id = :orgId", Map.of("orgId", orgId));
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
		org.setAddress("100 Campus Road");
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

	private Long createStudentViaApi(Long orgId, Cookie cookie, String admNo, String firstName, String lastName,
			String gender) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/students", orgId)
						.cookie(cookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "admissionNumber": "%s",
								  "firstName": "%s",
								  "lastName": "%s",
								  "dateOfBirth": "2015-05-15",
								  "gender": "%s",
								  "email": "%s@student.edu",
								  "phoneNumber": "9876543210",
								  "address": "12 MG Road",
								  "city": "Bengaluru",
								  "state": "Karnataka",
								  "postalCode": "560001",
								  "admissionDate": "2024-04-01",
								  "bloodGroup": "O+",
								  "nationality": "Indian"
								}
								""".formatted(admNo, firstName, lastName, gender, admNo.toLowerCase())))
				.andExpect(status().isCreated())
				.andReturn();
		return extractId(res);
	}

	@Test
	void studentProfiles_crudDuplicateValidationStatusSearchFilterAndPagination() throws Exception {
		Long orgId = orgA.getId();

		// 1. Register students
		Long aaravId = createStudentViaApi(orgId, adminOrgACookie, "adm-001", "Aarav", "Sharma", "MALE");
		Long diyaId = createStudentViaApi(orgId, receptionistOrgACookie, "adm-002", "Diya", "Verma", "FEMALE");
		createStudentViaApi(orgId, adminOrgACookie, "adm-003", "Rohan", "Sharma", "MALE");

		// 2. Duplicate admission number in same organization -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/students", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "admissionNumber": "ADM-001",
								  "firstName": "Duplicate",
								  "dateOfBirth": "2015-01-10",
								  "gender": "MALE",
								  "admissionDate": "2024-04-01"
								}
								"""))
				.andExpect(status().isConflict());

		// 3. Invalid dates (admissionDate earlier than dateOfBirth, and future DOB) -> 400 Bad Request
		mockMvc.perform(post("/api/organizations/{orgId}/students", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "admissionNumber": "ADM-999",
								  "firstName": "InvalidDate",
								  "dateOfBirth": "2018-06-15",
								  "gender": "MALE",
								  "admissionDate": "2016-01-01"
								}
								"""))
				.andExpect(status().isBadRequest());

		mockMvc.perform(post("/api/organizations/{orgId}/students", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "admissionNumber": "ADM-998",
								  "firstName": "FutureChild",
								  "dateOfBirth": "2099-01-01",
								  "gender": "FEMALE",
								  "admissionDate": "2099-06-01"
								}
								"""))
				.andExpect(status().isBadRequest());

		// 4. Retrieve & update student details
		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}", orgId, aaravId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.admissionNumber").value("ADM-001"))
				.andExpect(jsonPath("$.data.firstName").value("Aarav"));

		mockMvc.perform(put("/api/organizations/{orgId}/students/{sId}", orgId, aaravId)
						.cookie(principalOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "admissionNumber": "ADM-001",
								  "firstName": "Aarav",
								  "middleName": "Kumar",
								  "lastName": "Sharma",
								  "dateOfBirth": "2015-05-15",
								  "gender": "MALE",
								  "admissionDate": "2024-04-01",
								  "city": "Mysuru"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.middleName").value("Kumar"))
				.andExpect(jsonPath("$.data.city").value("Mysuru"));

		// 5. Change student status (preserving student record)
		mockMvc.perform(patch("/api/organizations/{orgId}/students/{sId}/status", orgId, diyaId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"INACTIVE\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("INACTIVE"));

		// 6. Search by name, search by admissionNumber, filter by status & gender, paginate & sort
		mockMvc.perform(get("/api/organizations/{orgId}/students", orgId)
						.param("search", "sharma")
						.param("sortBy", "firstName")
						.param("sortDir", "desc")
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(2))
				.andExpect(jsonPath("$.data.content[0].firstName").value("Rohan"))
				.andExpect(jsonPath("$.data.content[1].firstName").value("Aarav"));

		mockMvc.perform(get("/api/organizations/{orgId}/students", orgId)
						.param("admissionNumber", "ADM-002")
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1))
				.andExpect(jsonPath("$.data.content[0].firstName").value("Diya"));

		mockMvc.perform(get("/api/organizations/{orgId}/students", orgId)
						.param("status", "ACTIVE")
						.param("page", "0")
						.param("size", "1")
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(2))
				.andExpect(jsonPath("$.data.totalPages").value(2))
				.andExpect(jsonPath("$.data.content.length()").value(1));
	}

	@Test
	void guardiansAndRelationships_multipleGuardiansMultipleStudentsPrimaryContactAndPreservation() throws Exception {
		Long orgId = orgA.getId();

		Long sibling1 = createStudentViaApi(orgId, adminOrgACookie, "ADM-101", "Kabir", "Mehta", "MALE");
		Long sibling2 = createStudentViaApi(orgId, adminOrgACookie, "ADM-102", "Ananya", "Mehta", "FEMALE");

		// 1. Create father and mother guardians (without requiring user login accounts)
		Long fatherId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/guardians", orgId)
						.cookie(receptionistOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "firstName": "Rajesh",
								  "lastName": "Mehta",
								  "email": "rajesh.mehta@example.com",
								  "phoneNumber": "9811122233",
								  "occupation": "Architect"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn());

		Long motherId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/guardians", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "firstName": "Sunita",
								  "lastName": "Mehta",
								  "email": "sunita.mehta@example.com",
								  "phoneNumber": "9811122244",
								  "occupation": "Doctor"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn());

		// Update father guardian details
		mockMvc.perform(put("/api/organizations/{orgId}/guardians/{gId}", orgId, fatherId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "firstName": "Rajesh",
								  "lastName": "Mehta",
								  "email": "rajesh.m@example.com",
								  "phoneNumber": "9811122233",
								  "occupation": "Senior Architect"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.occupation").value("Senior Architect"));

		// 2. Link father as primaryContact=true to sibling1
		mockMvc.perform(post("/api/organizations/{orgId}/students/{sId}/guardians", orgId, sibling1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "guardianId": %d,
								  "relationshipType": "FATHER",
								  "primaryContact": true,
								  "emergencyContact": true,
								  "receiveNotifications": true
								}
								""".formatted(fatherId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.primaryContact").value(true));

		// Duplicate guardian link to same student -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/students/{sId}/guardians", orgId, sibling1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "guardianId": %d,
								  "relationshipType": "FATHER",
								  "primaryContact": false
								}
								""".formatted(fatherId)))
				.andExpect(status().isConflict());

		// 3. Link mother as primaryContact=true to sibling1 -> father's primaryContact automatically demoted to false
		mockMvc.perform(post("/api/organizations/{orgId}/students/{sId}/guardians", orgId, sibling1)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "guardianId": %d,
								  "relationshipType": "MOTHER",
								  "primaryContact": true,
								  "emergencyContact": true,
								  "receiveNotifications": false
								}
								""".formatted(motherId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.primaryContact").value(true));

		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/guardians", orgId, sibling1)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2))
				.andExpect(jsonPath("$.data[0].guardianId").value(motherId))
				.andExpect(jsonPath("$.data[0].primaryContact").value(true))
				.andExpect(jsonPath("$.data[1].guardianId").value(fatherId))
				.andExpect(jsonPath("$.data[1].primaryContact").value(false));

		// 4. Associate father with sibling2 as well (one guardian -> multiple students)
		mockMvc.perform(post("/api/organizations/{orgId}/students/{sId}/guardians", orgId, sibling2)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "guardianId": %d,
								  "relationshipType": "FATHER",
								  "primaryContact": true,
								  "emergencyContact": true
								}
								""".formatted(fatherId)))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/organizations/{orgId}/guardians/{gId}/students", orgId, fatherId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2));

		// 5. Update relationship on sibling1 & then remove father's association from sibling1;
		// verify father's guardian record and association with sibling2 remain intact!
		mockMvc.perform(put("/api/organizations/{orgId}/students/{sId}/guardians/{gId}", orgId, sibling1, fatherId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "relationshipType": "GUARDIAN",
								  "primaryContact": true,
								  "emergencyContact": false,
								  "receiveNotifications": true
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.relationshipType").value("GUARDIAN"))
				.andExpect(jsonPath("$.data.primaryContact").value(true));

		mockMvc.perform(delete("/api/organizations/{orgId}/students/{sId}/guardians/{gId}", orgId, sibling1, fatherId)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		// Father record still exists and is still linked to sibling2
		mockMvc.perform(get("/api/organizations/{orgId}/guardians/{gId}", orgId, fatherId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.firstName").value("Rajesh"));
		mockMvc.perform(get("/api/organizations/{orgId}/guardians/{gId}/students", orgId, fatherId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].studentId").value(sibling2));
	}

	@Test
	void studentEnrollment_plannedAndActiveSessions_classProgression_directoryAndStatusTransitions() throws Exception {
		Long orgId = orgA.getId();

		Long studentId = createStudentViaApi(orgId, adminOrgACookie, "ADM-201", "Vikram", "Rao", "MALE");
		Long student2Id = createStudentViaApi(orgId, adminOrgACookie, "ADM-202", "Neha", "Kulkarni", "FEMALE");

		Long class1Id = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 1\",\"code\":\"C1\",\"displayOrder\":1}"))
				.andExpect(status().isCreated())
				.andReturn());

		Long class2Id = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 2\",\"code\":\"C2\",\"displayOrder\":2}"))
				.andExpect(status().isCreated())
				.andReturn());

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

		// 1. Enroll student in ACTIVE session 2026-27 into Class 1
		Long enrollment2627 = extractId(mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "studentId": %d,
								  "academicSessionId": %d,
								  "classId": %d,
								  "rollNumber": "R-01",
								  "enrollmentDate": "2026-04-01"
								}
								""".formatted(studentId, session2627, class1Id)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status").value("ACTIVE"))
				.andReturn());

		// Update active enrollment details (rollNumber & remarks) -> 200 OK
		mockMvc.perform(put("/api/organizations/{orgId}/enrollments/{eId}", orgId, enrollment2627)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "classId": %d,
								  "rollNumber": "R-01A",
								  "remarks": "Updated roll number"
								}
								""".formatted(class1Id)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.rollNumber").value("R-01A"))
				.andExpect(jsonPath("$.data.remarks").value("Updated roll number"));

		// Enrolling an INACTIVE student must fail with 409 Conflict
		mockMvc.perform(patch("/api/organizations/{orgId}/students/{sId}/status", orgId, student2Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"INACTIVE\"}"))
				.andExpect(status().isOk());
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "studentId": %d,
								  "academicSessionId": %d,
								  "classId": %d
								}
								""".formatted(student2Id, session2627, class1Id)))
				.andExpect(status().isConflict());
		mockMvc.perform(patch("/api/organizations/{orgId}/students/{sId}/status", orgId, student2Id)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"ACTIVE\"}"))
				.andExpect(status().isOk());

		// Duplicate enrollment in same session -> 409 Conflict
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "studentId": %d,
								  "academicSessionId": %d,
								  "classId": %d
								}
								""".formatted(studentId, session2627, class2Id)))
				.andExpect(status().isConflict());

		// 2. Prepare upcoming PLANNED session 2027-28 while 2026-27 is still ACTIVE
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(principalOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "studentId": %d,
								  "academicSessionId": %d,
								  "classId": %d,
								  "rollNumber": "R-01",
								  "enrollmentDate": "2027-04-01"
								}
								""".formatted(studentId, session2728, class2Id)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.className").value("Class 2"));

		// 3. Class-wise student directory & session enrollment lookup
		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/classes/{cId}/students",
						orgId, session2627, class1Id)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1))
				.andExpect(jsonPath("$.data.content[0].firstName").value("Vikram"));

		mockMvc.perform(get("/api/organizations/{orgId}/academic-sessions/{sId}/enrollments", orgId, session2627)
						.param("classId", class1Id.toString())
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1));

		// 4. Transition 2026-27 enrollment to PROMOTED; verify invalid transition back to ACTIVE is rejected (409)
		mockMvc.perform(patch("/api/organizations/{orgId}/enrollments/{eId}/status", orgId, enrollment2627)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"PROMOTED\",\"remarks\":\"Promoted to Class 2\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("PROMOTED"));

		mockMvc.perform(patch("/api/organizations/{orgId}/enrollments/{eId}/status", orgId, enrollment2627)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"ACTIVE\"}"))
				.andExpect(status().isConflict());

		// Modifying a non-ACTIVE enrollment via PUT must fail with 409
		mockMvc.perform(put("/api/organizations/{orgId}/enrollments/{eId}", orgId, enrollment2627)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"classId\":" + class1Id + ",\"rollNumber\":\"R-99\"}"))
				.andExpect(status().isConflict());

		// 5. Complete session 2026-27 -> enrolling student2 into COMPLETED 2026-27 must fail with 409
		mockMvc.perform(patch("/api/organizations/{orgId}/academic-sessions/{id}/complete", orgId, session2627)
						.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "studentId": %d,
								  "academicSessionId": %d,
								  "classId": %d
								}
								""".formatted(student2Id, session2627, class1Id)))
				.andExpect(status().isConflict());

		// 6. Verify student's academic enrollment history preserves both 2026-27 (Class 1, PROMOTED) and 2027-28 (Class 2, ACTIVE)
		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}/enrollments", orgId, studentId)
						.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2))
				.andExpect(jsonPath("$.data[0].className").value("Class 2"))
				.andExpect(jsonPath("$.data[0].status").value("ACTIVE"))
				.andExpect(jsonPath("$.data[1].className").value("Class 1"))
				.andExpect(jsonPath("$.data[1].status").value("PROMOTED"));
	}

	@Test
	void concurrentEnrollmentRequests_preventsDuplicateEnrollment() throws Exception {
		Long orgId = orgA.getId();

		Long studentId = createStudentViaApi(orgId, adminOrgACookie, "ADM-301", "Arjun", "Nair", "MALE");
		Long sessionId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"2026-27\"}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long classId = extractId(mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Class 3\",\"code\":\"C3\",\"displayOrder\":3}"))
				.andExpect(status().isCreated())
				.andReturn());

		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch startGun = new CountDownLatch(1);
		AtomicInteger createdCount = new AtomicInteger(0);
		AtomicInteger conflictCount = new AtomicInteger(0);

		String payload = """
				{
				  "studentId": %d,
				  "academicSessionId": %d,
				  "classId": %d,
				  "rollNumber": "R-10"
				}
				""".formatted(studentId, sessionId, classId);

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Callable<Void> task = () -> {
				ready.countDown();
				startGun.await(5, TimeUnit.SECONDS);
				int httpStatus = mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
								.cookie(adminOrgACookie)
								.contentType(MediaType.APPLICATION_JSON)
								.content(payload))
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
	}

	@Test
	void crossTenantIsolation_andAuthorizationAndCompositeForeignKeys() throws Exception {
		Long orgAId = orgA.getId();
		Long orgBId = orgB.getId();

		Long studentA = createStudentViaApi(orgAId, adminOrgACookie, "ADM-401", "Meera", "Iyer", "FEMALE");
		Long guardianA = extractId(mockMvc.perform(post("/api/organizations/{orgId}/guardians", orgAId)
						.cookie(adminOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"firstName\":\"Karthik\",\"phoneNumber\":\"9811100000\"}"))
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
						.content("{\"name\":\"Class 1\",\"code\":\"C1\",\"displayOrder\":1}"))
				.andExpect(status().isCreated())
				.andReturn());
		Long studentB = createStudentViaApi(orgBId, adminOrgBCookie, "ADM-401", "SameAdmInOrgB", "Test", "MALE");

		// 1. Cross-tenant access attempts from Org B to Org A resources return 404 Not Found
		mockMvc.perform(get("/api/organizations/{orgId}/students/{sId}", orgBId, studentA)
						.cookie(adminOrgBCookie))
				.andExpect(status().isNotFound());
		mockMvc.perform(get("/api/organizations/{orgId}/guardians/{gId}", orgBId, guardianA)
						.cookie(adminOrgBCookie))
				.andExpect(status().isNotFound());
		mockMvc.perform(post("/api/organizations/{orgId}/students/{sId}/guardians", orgBId, studentB)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"guardianId\":" + guardianA + ",\"relationshipType\":\"FATHER\"}"))
				.andExpect(status().isNotFound());
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgBId)
						.cookie(adminOrgBCookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"studentId\":" + studentA + ",\"academicSessionId\":" + sessionB + ",\"classId\":" + classB + "}"))
				.andExpect(status().isNotFound());

		// 2. Database-level composite FK enforcement rejects cross-tenant enrollment & student-guardian inserts
		assertThatThrownBy(() -> jdbc.update("""
				INSERT INTO student_enrollments (organization_id, student_id, academic_session_id, class_id, enrollment_date, status, created_at, updated_at)
				VALUES (:orgId, :studentId, :sessionId, :classId, '2026-04-01', 'ACTIVE', CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
				""",
				Map.of("orgId", orgBId, "studentId", studentA, "sessionId", sessionB, "classId", classB)))
				.isInstanceOf(DataIntegrityViolationException.class);

		assertThatThrownBy(() -> jdbc.update("""
				INSERT INTO student_guardians (organization_id, student_id, guardian_id, relationship_type, primary_contact, emergency_contact, receive_notifications, created_at, updated_at)
				VALUES (:orgId, :studentId, :guardianId, 'FATHER', 0, 0, 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
				""",
				Map.of("orgId", orgBId, "studentId", studentB, "guardianId", guardianA)))
				.isInstanceOf(DataIntegrityViolationException.class);

		// 3. Authorization checks: unauthenticated (401), non-member (403), suspended member (403), missing permissions (403)
		mockMvc.perform(get("/api/organizations/{orgId}/students", orgAId))
				.andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/organizations/{orgId}/students", orgAId).cookie(nonMemberCookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/students", orgAId).cookie(suspendedMemberOrgACookie))
				.andExpect(status().isForbidden());

		// Teacher cannot create/update students, manage guardians, or enroll students (403)
		mockMvc.perform(put("/api/organizations/{orgId}/students/{sId}", orgAId, studentA)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"admissionNumber\":\"ADM-401\",\"firstName\":\"Meera\",\"dateOfBirth\":\"2015-05-15\",\"gender\":\"FEMALE\",\"admissionDate\":\"2024-04-01\"}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/api/organizations/{orgId}/guardians", orgAId)
						.cookie(teacherOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"firstName\":\"Test\",\"phoneNumber\":\"9811100001\"}"))
				.andExpect(status().isForbidden());

		// Receptionist can create students & guardians, but cannot manage enrollments (403)
		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgAId)
						.cookie(receptionistOrgACookie)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"studentId\":" + studentA + ",\"academicSessionId\":1,\"classId\":1}"))
				.andExpect(status().isForbidden());
	}
}
