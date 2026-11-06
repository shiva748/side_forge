package com.side.forge.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.side.forge.authorization.entity.*;
import com.side.forge.authorization.repository.*;
import com.side.forge.invitation.entity.InvitationStatus;
import com.side.forge.invitation.entity.OrganizationInvitation;
import com.side.forge.invitation.notification.LoggingInvitationNotificationSender;
import com.side.forge.invitation.repository.OrganizationInvitationRepository;
import com.side.forge.organization.entity.*;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.organization.staff.entity.Staff;
import com.side.forge.organization.staff.repository.StaffRepository;
import com.side.forge.organization.student.guardian.entity.Guardian;
import com.side.forge.organization.student.guardian.repository.GuardianRepository;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.repository.StudentRepository;
import com.side.forge.security.jwt.JwtService;
import com.side.forge.storage.repository.StoredFileReferenceRepository;
import com.side.forge.storage.repository.StoredFileRepository;
import com.side.forge.storage.spi.FileStorageProvider;
import com.side.forge.user.entity.UserStatus;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
class InvitationProfileAndStorageIntegrationTest {

	private static final AtomicInteger COUNTER = new AtomicInteger(7000);

	@Autowired
	private MockMvc mockMvc;

	private final ObjectMapper objectMapper = new ObjectMapper();

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private OrganizationRepository organizationRepository;

	@Autowired
	private RoleRepository roleRepository;

	@Autowired
	private PlatformUserRoleRepository platformUserRoleRepository;

	@Autowired
	private OrganizationMembershipRepository membershipRepository;

	@Autowired
	private MembershipRoleRepository membershipRoleRepository;

	@Autowired
	private OrganizationInvitationRepository invitationRepository;

	@Autowired
	private LoggingInvitationNotificationSender notificationSender;

	@Autowired
	private StaffRepository staffRepository;

	@Autowired
	private GuardianRepository guardianRepository;

	@Autowired
	private StudentRepository studentRepository;

	@Autowired
	private StoredFileRepository storedFileRepository;

	@Autowired
	private StoredFileReferenceRepository storedFileReferenceRepository;

	@Autowired
	private FileStorageProvider fileStorageProvider;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private JwtService jwtService;

	private Organization orgA;
	private Organization orgB;
	private Users platformAdmin;
	private Users adminA;
	private Users principalA;
	private Users teacherA;
	private Cookie platformAdminCookie;
	private Cookie adminOrgACookie;
	private Cookie principalOrgACookie;
	private Cookie teacherOrgACookie;
	private Cookie adminOrgBCookie;

	@BeforeEach
	void setUp() {
		cleanTables();

		orgA = createOrganization("Invitations Org A", OrganizationStatus.ACTIVE);
		orgB = createOrganization("Invitations Org B", OrganizationStatus.ACTIVE);

		platformAdmin = createUser("sysAdmin");
		assignPlatformRole(platformAdmin.getId(), "SYSTEM_ADMIN");
		platformAdminCookie = jwtCookie(platformAdmin);

		adminA = createUser("invAdminA");
		assignOrgRole(adminA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgACookie = jwtCookie(adminA);

		principalA = createUser("invPrincipalA");
		assignOrgRole(principalA.getId(), orgA.getId(), "PRINCIPAL", MembershipStatus.ACTIVE);
		principalOrgACookie = jwtCookie(principalA);

		teacherA = createUser("invTeacherA");
		assignOrgRole(teacherA.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacherOrgACookie = jwtCookie(teacherA);

		Users adminB = createUser("invAdminB");
		assignOrgRole(adminB.getId(), orgB.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgBCookie = jwtCookie(adminB);
	}

	@Test
	void invitationsCoverInitialSchoolAdminStaffGuardianStudentResendRevokeExpiryAndPrivilegeChecks() throws Exception {
		// 1. Anonymous organization onboarding -> Platform approval -> Automatic initial SCHOOL_ADMIN invitation
		MvcResult onbRes = mockMvc.perform(post("/api/organizations/onboarding")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "schoolName": "Sunrise Public School",
						  "boardAffiliation": "CBSE",
						  "schoolEmail": "info@sunrise-school.test",
						  "schoolPhone": "9876543210",
						  "address": "123 Education Lane",
						  "city": "Pune",
						  "state": "Maharashtra",
						  "postalCode": "411001",
						  "contactPersonName": "Rajesh Sharma",
						  "designation": "Director",
						  "contactEmail": "founder@sunrise-school.test",
						  "mobileNumber": "9876501234",
						  "studentStrength": "FROM_500_TO_1000",
						  "campusCount": 1,
						  "managementSystem": "EXCEL_SPREADSHEETS"
						}
						"""))
				.andExpect(status().isCreated())
				.andReturn();
		long onboardingId = objectMapper.readTree(onbRes.getResponse().getContentAsString()).get("id").asLong();

		MvcResult approveRes = mockMvc.perform(post("/api/platform/onboarding/organizations/{requestId}/approve", onboardingId)
				.cookie(platformAdminCookie))
				.andExpect(status().isOk())
				.andReturn();
		long sunriseOrgId = objectMapper.readTree(approveRes.getResponse().getContentAsString()).get("id").asLong();

		// Verify initial SCHOOL_ADMIN invitation was automatically created & dispatched, and no user/membership is active yet
		assertThat(userRepository.findByEmail("founder@sunrise-school.test")).isEmpty();
		var dispatchedFounder = notificationSender.getLastDispatchedForOrgAndEmail(sunriseOrgId, "founder@sunrise-school.test");
		assertThat(dispatchedFounder).isPresent();
		String founderToken = dispatchedFounder.get().invitationToken();

		// Verify invitation token endpoint
		mockMvc.perform(get("/api/invitations/verify").param("token", founderToken))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.organizationId").value(sunriseOrgId))
				.andExpect(jsonPath("$.data.roleCode").value("SCHOOL_ADMIN"))
				.andExpect(jsonPath("$.data.existingUserAccount").value(false))
				.andExpect(jsonPath("$.data.status").value("PENDING"));

		// Wrong email in accept payload is rejected
		mockMvc.perform(post("/api/invitations/accept")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token": "%s",
						  "email": "attacker@sunrise-school.test",
						  "password": "Password123!"
						}
						""".formatted(founderToken)))
				.andExpect(status().isForbidden());

		// Accept initial SCHOOL_ADMIN invitation as new user
		MvcResult acceptFounderRes = mockMvc.perform(post("/api/invitations/accept")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token": "%s",
						  "password": "FounderPassword123!"
						}
						""".formatted(founderToken)))
				.andExpect(status().isOk())
				.andExpect(header().exists("Set-Cookie"))
				.andExpect(jsonPath("$.data.roleCode").value("SCHOOL_ADMIN"))
				.andExpect(jsonPath("$.data.membershipStatus").value("ACTIVE"))
				.andReturn();
		long founderUserId = objectMapper.readTree(acceptFounderRes.getResponse().getContentAsString())
				.get("data").get("userId").asLong();
		assertThat(membershipRepository.findByUserIdAndOrganizationIdAndStatus(
				founderUserId, sunriseOrgId, MembershipStatus.ACTIVE)).isPresent();

		// Single-use token: second acceptance attempt fails with 409 Conflict
		mockMvc.perform(post("/api/invitations/accept")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token": "%s",
						  "password": "FounderPassword123!"
						}
						""".formatted(founderToken)))
				.andExpect(status().isConflict());

		// 2. Privilege escalation checks:
		// Principal cannot invite SCHOOL_ADMIN or PRINCIPAL
		mockMvc.perform(post("/api/organizations/{orgId}/invitations", orgA.getId())
				.cookie(principalOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "escalated-admin@school.test",
						  "roleCode": "SCHOOL_ADMIN"
						}
						"""))
				.andExpect(status().isForbidden());

		// Teacher cannot invite anyone
		mockMvc.perform(post("/api/organizations/{orgId}/invitations", orgA.getId())
				.cookie(teacherOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "unauth-invite@school.test",
						  "roleCode": "STUDENT"
						}
						"""))
				.andExpect(status().isForbidden());

		// Cross-tenant isolation: Admin of Org B cannot view or create invitations in Org A
		mockMvc.perform(get("/api/organizations/{orgId}/invitations", orgA.getId())
				.cookie(adminOrgBCookie))
				.andExpect(status().isForbidden());

		// 3. Create domain profiles (Teacher/Staff, Guardian, Student) WITHOUT user accounts, then invite them
		long teacherProfileId = createTeacherInOrg(orgA.getId(), "EMP-INV-01", "Meera", "Nair", "meera.teacher@school.test", "9811122233");
		long guardianId = createGuardianInOrg(orgA.getId(), "Vikram", "Patel", "vikram.parent@school.test", "9822233344");
		long studentId = createStudentInOrg(orgA.getId(), "ADM-INV-01", "Aarav", "Patel", "aarav.student@school.test", "9833344455");

		// Principal invites Teacher linked to existing TeacherProfile
		MvcResult inviteTeacherRes = mockMvc.perform(post("/api/organizations/{orgId}/invitations", orgA.getId())
				.cookie(principalOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "meera.teacher@school.test",
						  "roleCode": "TEACHER",
						  "targetType": "TEACHER",
						  "targetProfileId": %d
						}
						""".formatted(teacherProfileId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.invitation.status").value("PENDING"))
				.andExpect(jsonPath("$.data.invitationToken").isNotEmpty())
				.andReturn();
		JsonNode inviteTeacherData = objectMapper.readTree(inviteTeacherRes.getResponse().getContentAsString()).get("data");
		long teacherInvId = inviteTeacherData.get("invitation").get("id").asLong();
		String firstTeacherToken = inviteTeacherData.get("invitationToken").asText();

		// Duplicate active invitation for same recipient + org + role is prevented (409 Conflict)
		mockMvc.perform(post("/api/organizations/{orgId}/invitations", orgA.getId())
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "meera.teacher@school.test",
						  "roleCode": "TEACHER"
						}
						"""))
				.andExpect(status().isConflict());

		// Resend pending invitation -> rotates token and invalidates previous token
		MvcResult resendTeacherRes = mockMvc.perform(post("/api/organizations/{orgId}/invitations/{id}/resend", orgA.getId(), teacherInvId)
				.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.invitation.resendCount").value(1))
				.andReturn();
		String rotatedTeacherToken = objectMapper.readTree(resendTeacherRes.getResponse().getContentAsString())
				.get("data").get("invitationToken").asText();
		assertThat(rotatedTeacherToken).isNotEqualTo(firstTeacherToken);

		// Old token is no longer found
		mockMvc.perform(post("/api/invitations/accept")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token": "%s",
						  "password": "TeacherPassword123!"
						}
						""".formatted(firstTeacherToken)))
				.andExpect(status().isNotFound());

		// Wrong authenticated user cannot accept Meera's invitation
		mockMvc.perform(post("/api/invitations/accept")
				.cookie(teacherOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token": "%s",
						  "password": "TeacherPassword123!"
						}
						""".formatted(rotatedTeacherToken)))
				.andExpect(status().isForbidden());

		// Accept with rotated token -> creates Meera's user account AND links existing Staff/Teacher profile without duplicating Staff
		long staffCountBefore = staffRepository.findAllByOrganizationIdOrderByIdAsc(orgA.getId()).size();
		MvcResult acceptTeacherRes = mockMvc.perform(post("/api/invitations/accept")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token": "%s",
						  "password": "TeacherPassword123!"
						}
						""".formatted(rotatedTeacherToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.roleCode").value("TEACHER"))
				.andExpect(jsonPath("$.data.linkedProfileId").value(teacherProfileId))
				.andReturn();
		long meeraUserId = objectMapper.readTree(acceptTeacherRes.getResponse().getContentAsString())
				.get("data").get("userId").asLong();
		assertThat(staffRepository.findAllByOrganizationIdOrderByIdAsc(orgA.getId())).hasSize((int) staffCountBefore);
		Staff meeraStaff = staffRepository.findByOrganizationIdAndUserId(orgA.getId(), meeraUserId).orElseThrow();
		assertThat(meeraStaff.getEmail()).isEqualTo("meera.teacher@school.test");

		// 4. Existing User Account Linking: pre-register Vikram's user account, then invite him as PARENT in Org A
		Users existingVikram = new Users();
		existingVikram.setFirstName("Vikram");
		existingVikram.setLastName("Patel");
		existingVikram.setEmail("vikram.parent@school.test");
		existingVikram.setPhoneNumber("+919822233344");
		existingVikram.setPasswordHash(passwordEncoder.encode("ExistingParent123!"));
		existingVikram.setStatus(UserStatus.ACTIVE);
		existingVikram = userRepository.saveAndFlush(existingVikram);
		Cookie vikramCookie = jwtCookie(existingVikram);

		MvcResult inviteParentRes = mockMvc.perform(post("/api/organizations/{orgId}/invitations", orgA.getId())
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "vikram.parent@school.test",
						  "roleCode": "PARENT",
						  "targetType": "GUARDIAN",
						  "targetProfileId": %d
						}
						""".formatted(guardianId)))
				.andExpect(status().isCreated())
				.andReturn();
		String parentToken = objectMapper.readTree(inviteParentRes.getResponse().getContentAsString())
				.get("data").get("invitationToken").asText();

		// Vikram can see his pending invitation via GET /api/me/invitations (without exposing raw token)
		mockMvc.perform(get("/api/me/invitations").cookie(vikramCookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(1)))
				.andExpect(jsonPath("$.data[0].roleCode").value("PARENT"))
				.andExpect(jsonPath("$.data[0].invitationToken").doesNotExist());

		// Accept invitation as authenticated existing user -> links existing Users account without creating duplicate
		long userCountBefore = userRepository.count();
		mockMvc.perform(post("/api/invitations/accept")
				.cookie(vikramCookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token": "%s"
						}
						""".formatted(parentToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.userId").value(existingVikram.getId()))
				.andExpect(jsonPath("$.data.linkedProfileId").value(guardianId));
		assertThat(userRepository.count()).isEqualTo(userCountBefore);
		Guardian linkedGuardian = guardianRepository.findByIdAndOrganizationId(guardianId, orgA.getId()).orElseThrow();
		assertThat(linkedGuardian.getUserId()).isEqualTo(existingVikram.getId());

		// 5. Revoke and Expiry checks on Student invitation
		MvcResult inviteStudentRes = mockMvc.perform(post("/api/organizations/{orgId}/invitations", orgA.getId())
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "aarav.student@school.test",
						  "roleCode": "STUDENT",
						  "targetType": "STUDENT",
						  "targetProfileId": %d
						}
						""".formatted(studentId)))
				.andExpect(status().isCreated())
				.andReturn();
		JsonNode stuInvData = objectMapper.readTree(inviteStudentRes.getResponse().getContentAsString()).get("data");
		long stuInvId = stuInvData.get("invitation").get("id").asLong();
		String stuInvToken = stuInvData.get("invitationToken").asText();

		// Revoke pending student invitation
		mockMvc.perform(post("/api/organizations/{orgId}/invitations/{id}/revoke", orgA.getId(), stuInvId)
				.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("REVOKED"));

		// Revoked invitation cannot be accepted or resent
		mockMvc.perform(post("/api/invitations/accept")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token": "%s",
						  "password": "StudentPassword123!"
						}
						""".formatted(stuInvToken)))
				.andExpect(status().isConflict());

		mockMvc.perform(post("/api/organizations/{orgId}/invitations/{id}/resend", orgA.getId(), stuInvId)
				.cookie(adminOrgACookie))
				.andExpect(status().isConflict());

		// Create a new student invitation, then expire it and verify acceptance is rejected with 409 Conflict
		MvcResult inviteStudent2Res = mockMvc.perform(post("/api/organizations/{orgId}/invitations", orgA.getId())
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "aarav.student@school.test",
						  "roleCode": "STUDENT",
						  "targetType": "STUDENT",
						  "targetProfileId": %d
						}
						""".formatted(studentId)))
				.andExpect(status().isCreated())
				.andReturn();
		JsonNode stuInv2Data = objectMapper.readTree(inviteStudent2Res.getResponse().getContentAsString()).get("data");
		long stuInv2Id = stuInv2Data.get("invitation").get("id").asLong();
		String stuInv2Token = stuInv2Data.get("invitationToken").asText();

		OrganizationInvitation expInv = invitationRepository.findById(stuInv2Id).orElseThrow();
		expInv.setExpiresAt(Instant.now().minus(2, ChronoUnit.HOURS));
		invitationRepository.saveAndFlush(expInv);

		mockMvc.perform(post("/api/invitations/accept")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "token": "%s",
						  "password": "StudentPassword123!"
						}
						""".formatted(stuInv2Token)))
				.andExpect(status().isConflict());
		assertThat(invitationRepository.findById(stuInv2Id).orElseThrow().getStatus())
				.isEqualTo(InvitationStatus.EXPIRED);
	}

	@Test
	void userProfilePasswordPhotoHomeworkFilesAndReferenceSafeCleanupWorkEndToEnd() throws Exception {
		// 1. Multi-organization user account profile & separation from domain profiles
		assignOrgRole(teacherA.getId(), orgB.getId(), "TEACHER", MembershipStatus.ACTIVE);
		long teacherStaffIdOrgA = createTeacherWithUserInOrg(
				orgA.getId(), teacherA.getId(), "EMP-PR-01", "DomainFirstName", "DomainLastName", "9844455566");

		mockMvc.perform(get("/api/me").cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.id").value(teacherA.getId()))
				.andExpect(jsonPath("$.data.organizations", hasSize(2)));

		// Update personal account details via PUT /api/me -> updates global Users record without altering org-specific Staff record
		mockMvc.perform(put("/api/me")
				.cookie(teacherOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "firstName": "UpdatedGlobalFirst",
						  "lastName": "UpdatedGlobalLast",
						  "phoneNumber": "9899988877"
						}
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.firstName").value("UpdatedGlobalFirst"))
				.andExpect(jsonPath("$.data.lastName").value("UpdatedGlobalLast"))
				.andExpect(jsonPath("$.data.phoneNumber").value("+919899988877"));

		Staff orgAStaff = staffRepository.findByOrganizationIdAndUserId(orgA.getId(), teacherA.getId()).orElseThrow();
		assertThat(orgAStaff.getFirstName()).isEqualTo("DomainFirstName");

		// 2. Password change: wrong current password rejected, valid password change succeeds and works on /api/auth/login
		mockMvc.perform(post("/api/me/change-password")
				.cookie(teacherOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "currentPassword": "WrongCurrentPassword!",
						  "newPassword": "NewSecurePassword123!"
						}
						"""))
				.andExpect(status().isBadRequest());

		mockMvc.perform(post("/api/me/change-password")
				.cookie(teacherOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "currentPassword": "Password123!",
						  "newPassword": "NewSecurePassword123!"
						}
						"""))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "%s",
						  "password": "NewSecurePassword123!"
						}
						""".formatted(teacherA.getEmail())))
				.andExpect(status().isOk())
				.andExpect(header().exists("Set-Cookie"));

		// 3. Profile photo upload, view, replace (cleaning up old file), and delete
		MockMultipartFile invalidPhoto = new MockMultipartFile(
				"file", "malicious.exe", "application/octet-stream", "MZ-bad".getBytes(StandardCharsets.UTF_8));
		mockMvc.perform(multipart("/api/me/profile-photo").file(invalidPhoto).cookie(teacherOrgACookie))
				.andExpect(status().isBadRequest());

		byte[] photo1Bytes = "fake-png-bytes-1".getBytes(StandardCharsets.UTF_8);
		MockMultipartFile photo1 = new MockMultipartFile("file", "avatar1.png", "image/png", photo1Bytes);
		MvcResult uploadPhoto1Res = mockMvc.perform(multipart("/api/me/profile-photo").file(photo1).cookie(teacherOrgACookie))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.originalFilename").value("avatar1.png"))
				.andReturn();
		long photo1FileId = objectMapper.readTree(uploadPhoto1Res.getResponse().getContentAsString())
				.get("data").get("id").asLong();

		mockMvc.perform(get("/api/me/profile-photo").cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(content().bytes(photo1Bytes));

		// Replace profile photo -> old photo file record and physical storage are cleaned up
		byte[] photo2Bytes = "fake-jpeg-bytes-2".getBytes(StandardCharsets.UTF_8);
		MockMultipartFile photo2 = new MockMultipartFile("file", "avatar2.jpg", "image/jpeg", photo2Bytes);
		MvcResult uploadPhoto2Res = mockMvc.perform(multipart("/api/me/profile-photo").file(photo2).cookie(teacherOrgACookie))
				.andExpect(status().isCreated())
				.andReturn();
		long photo2FileId = objectMapper.readTree(uploadPhoto2Res.getResponse().getContentAsString())
				.get("data").get("id").asLong();
		assertThat(storedFileRepository.findById(photo1FileId)).isEmpty();
		assertThat(storedFileRepository.findById(photo2FileId)).isPresent();

		// Delete profile photo
		mockMvc.perform(delete("/api/me/profile-photo").cookie(teacherOrgACookie))
				.andExpect(status().isOk());
		assertThat(storedFileRepository.findById(photo2FileId)).isEmpty();
		mockMvc.perform(get("/api/me/profile-photo").cookie(teacherOrgACookie))
				.andExpect(status().isNotFound());

		// 4. Homework File Storage Integration & Reference-Counted Safe Deletion
		long sessionId = createActiveSession(orgA.getId(), "2026-2027");
		long classId = createSchoolClass(orgA.getId(), "Grade 9", "G9");
		long subjectId = createSubject(orgA.getId(), "Physics", "PHY9");
		assignSubjectToClass(orgA.getId(), sessionId, classId, subjectId);
		assignTeacherToSubject(orgA.getId(), sessionId, classId, subjectId, teacherStaffIdOrgA);

		Users studentUser1 = createUser("hwFileStu1");
		assignOrgRole(studentUser1.getId(), orgA.getId(), "STUDENT", MembershipStatus.ACTIVE);
		Cookie student1Cookie = jwtCookie(studentUser1);
		createStudentWithUserAndEnroll(orgA.getId(), sessionId, classId, studentUser1.getId(), "ADM-HWF-1", "Rohan");

		Users studentUser2 = createUser("hwFileStu2");
		assignOrgRole(studentUser2.getId(), orgA.getId(), "STUDENT", MembershipStatus.ACTIVE);
		Cookie student2Cookie = jwtCookie(studentUser2);
		createStudentWithUserAndEnroll(orgA.getId(), sessionId, classId, studentUser2.getId(), "ADM-HWF-2", "Sneha");

		long hw1Id = createHomeworkAssignment(orgA.getId(), sessionId, classId, subjectId, teacherStaffIdOrgA, "Newton Laws Worksheet");
		long hw2Id = createHomeworkAssignment(orgA.getId(), sessionId, classId, subjectId, teacherStaffIdOrgA, "Kinematics Practice");

		// Teacher uploads worksheet PDF to hw1
		byte[] worksheetBytes = "%PDF-1.4 Newton Laws Worksheet Content".getBytes(StandardCharsets.UTF_8);
		MockMultipartFile worksheetFile = new MockMultipartFile(
				"file", "newton_worksheet.pdf", "application/pdf", worksheetBytes);
		MvcResult hwAttachRes = mockMvc.perform(
				multipart("/api/organizations/{orgId}/homework/{hwId}/attachments", orgA.getId(), hw1Id)
						.file(worksheetFile)
						.cookie(teacherOrgACookie))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.originalFilename").value("newton_worksheet.pdf"))
				.andExpect(jsonPath("$.data.storageKey").doesNotExist())
				.andReturn();
		long worksheetFileId = objectMapper.readTree(hwAttachRes.getResponse().getContentAsString())
				.get("data").get("id").asLong();

		// Link the same file to hw2 as well (shared reference)
		mockMvc.perform(post("/api/organizations/{orgId}/homework/{hwId}/attachments/{fileId}/link",
				orgA.getId(), hw2Id, worksheetFileId)
				.cookie(teacherOrgACookie))
				.andExpect(status().isOk());
		assertThat(storedFileReferenceRepository.countByFileId(worksheetFileId)).isEqualTo(2);

		// Delete hw2 (which has no student submissions) -> must NOT delete worksheetFile because hw1 still references it!
		mockMvc.perform(delete("/api/organizations/{orgId}/homework/{hwId}", orgA.getId(), hw2Id)
				.cookie(teacherOrgACookie))
				.andExpect(status().isOk());
		assertThat(storedFileReferenceRepository.countByFileId(worksheetFileId)).isEqualTo(1);
		assertThat(storedFileRepository.findById(worksheetFileId)).isPresent();

		// Student 1 downloads worksheet PDF from hw1
		mockMvc.perform(get("/api/organizations/{orgId}/homework/{hwId}/attachments/{fileId}",
				orgA.getId(), hw1Id, worksheetFileId)
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(content().bytes(worksheetBytes));

		// Admin of Org B cannot download Org A's file (tenant isolation)
		mockMvc.perform(get("/api/organizations/{orgId}/files/{fileId}", orgB.getId(), worksheetFileId)
				.cookie(adminOrgBCookie))
				.andExpect(status().isNotFound());

		// Student 1 uploads a homework submission file
		byte[] subBytes = "%PDF-1.4 Student 1 Solution".getBytes(StandardCharsets.UTF_8);
		MockMultipartFile subFile = new MockMultipartFile(
				"file", "rohan_solution.pdf", "application/pdf", subBytes);
		MvcResult subUploadRes = mockMvc.perform(
				multipart("/api/organizations/{orgId}/homework/{hwId}/submissions/attachments", orgA.getId(), hw1Id)
						.file(subFile)
						.param("submissionText", "Completed all problems")
						.param("submissionDate", "2026-06-12")
						.cookie(student1Cookie))
				.andExpect(status().isCreated())
				.andReturn();
		long subFileId = objectMapper.readTree(subUploadRes.getResponse().getContentAsString())
				.get("data").get("id").asLong();

		// Find submissionId for Student 1
		MvcResult myHwRes = mockMvc.perform(get("/api/organizations/{orgId}/homework/my-assignments", orgA.getId())
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andReturn();
		long submissionId = objectMapper.readTree(myHwRes.getResponse().getContentAsString())
				.get("data").get(0).get("submissionId").asLong();

		// Teacher can download Student 1's submission file
		mockMvc.perform(get("/api/organizations/{orgId}/homework/{hwId}/submissions/{subId}/attachments/{fileId}",
				orgA.getId(), hw1Id, submissionId, subFileId)
				.cookie(teacherOrgACookie))
				.andExpect(status().isOk())
				.andExpect(content().bytes(subBytes));

		// Student 2 cannot download Student 1's submission file (403 Forbidden)
		mockMvc.perform(get("/api/organizations/{orgId}/homework/{hwId}/submissions/{subId}/attachments/{fileId}",
				orgA.getId(), hw1Id, submissionId, subFileId)
				.cookie(student2Cookie))
				.andExpect(status().isForbidden());

		// Remove worksheet attachment from hw1 -> now 0 references remain, so file is deleted from DB and storage
		mockMvc.perform(delete("/api/organizations/{orgId}/homework/{hwId}/attachments/{fileId}",
				orgA.getId(), hw1Id, worksheetFileId)
				.cookie(teacherOrgACookie))
				.andExpect(status().isOk());
		assertThat(storedFileRepository.findById(worksheetFileId)).isEmpty();
	}

	private void cleanTables() {
		List<String> tables = List.of(
				"stored_file_references", "stored_files",
				"organization_invitations", "organization_onboarding_requests",
				"student_homework_submissions", "homework_assignments",
				"school_notices",
				"fee_audit_logs", "fee_payment_allocations", "fee_payments",
				"student_fee_demands", "student_fee_concessions", "student_fee_assignments",
				"class_fee_structure_components", "class_fee_structures",
				"student_exam_results", "exam_marks", "exam_schedules", "examinations",
				"grading_rules", "grading_scales",
				"attendance_audit_logs", "student_attendance", "staff_attendance",
				"timetable_slots", "class_timetables", "timetable_periods", "timetable_configs",
				"teacher_subject_assignments", "teacher_class_assignments", "teachers", "staff",
				"student_guardians", "guardians", "student_enrollments", "students",
				"class_subjects", "sections", "subjects", "classes", "academic_sessions"
		);
		for (String table : tables) {
			Integer exists = jdbcTemplate.queryForObject("""
					SELECT COUNT(*) FROM information_schema.TABLES
					WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
					""", Integer.class, table);
			if (exists != null && exists > 0) {
				jdbcTemplate.execute("DELETE FROM " + table);
			}
		}
		jdbcTemplate.execute("UPDATE users SET profile_photo_file_id = NULL");
		jdbcTemplate.execute("DELETE FROM authorization_audit_logs");
		jdbcTemplate.execute("DELETE FROM membership_roles");
		jdbcTemplate.execute("DELETE FROM organization_memberships");
		jdbcTemplate.execute("DELETE FROM platform_user_roles");
		jdbcTemplate.execute("DELETE FROM organizations");
		jdbcTemplate.execute("DELETE FROM users");
	}

	private Organization createOrganization(String name, OrganizationStatus status) {
		Organization org = new Organization();
		org.setName(name);
		org.setBoardAffiliation(BoardAffiliation.CBSE);
		org.setEmail(name.toLowerCase().replace(" ", "") + "@school.test");
		org.setPhoneNumber("9876543210");
		org.setAddress("100 Main Road");
		org.setCity("Bengaluru");
		org.setState("Karnataka");
		org.setPostalCode("560001");
		org.setStatus(status);
		return organizationRepository.save(org);
	}

	private Users createUser(String prefix) {
		int n = COUNTER.incrementAndGet();
		Users u = new Users();
		u.setFirstName("Test");
		u.setLastName(prefix);
		u.setEmail(prefix.toLowerCase() + n + "@test.com");
		u.setPhoneNumber("+919" + String.format("%09d", n));
		u.setPasswordHash(passwordEncoder.encode("Password123!"));
		u.setStatus(UserStatus.ACTIVE);
		u.setEmailVerified(true);
		u.setPhoneVerified(true);
		return userRepository.save(u);
	}

	private void assignPlatformRole(Long userId, String roleCode) {
		Role role = roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.PLATFORM, null)
				.orElseGet(() -> {
					jdbcTemplate.update("""
							INSERT INTO roles (code, name, scope, organization_id, description, is_system_defined, created_at, updated_at)
							VALUES (?, ?, 'PLATFORM', NULL, 'Platform role', 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))
							""", roleCode, roleCode);
					return roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.PLATFORM, null)
							.orElseThrow();
				});
		jdbcTemplate.update("""
				INSERT INTO role_permissions (role_id, permission_id)
				SELECT ?, p.id FROM permissions p
				WHERE p.code LIKE 'platform.%'
				  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = ? AND rp.permission_id = p.id)
				""", role.getId(), role.getId());
		platformUserRoleRepository.save(new PlatformUserRole(userId, role.getId(), userId));
	}

	private void assignOrgRole(Long userId, Long orgId, String roleCode, MembershipStatus status) {
		OrganizationMembership membership = OrganizationMembership.active(userId, orgId);
		if (status != MembershipStatus.ACTIVE) {
			membership.changeStatus(status);
		}
		membership = membershipRepository.save(membership);

		Role role = roleRepository.findByCodeAndScopeAndOrganizationId(roleCode, RoleScope.ORGANIZATION, null)
				.orElseThrow();
		membershipRoleRepository.save(new MembershipRole(membership.getId(), role.getId(), userId));
	}

	private Cookie jwtCookie(Users user) {
		return new Cookie("jwt", jwtService.generateToken(user));
	}

	private long createTeacherInOrg(
			Long orgId, String employeeId, String firstName, String lastName, String email, String phone) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/teachers", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "employeeId": "%s",
						  "firstName": "%s",
						  "lastName": "%s",
						  "email": "%s",
						  "phoneNumber": "%s",
						  "joiningDate": "2024-06-01",
						  "designation": "Senior Teacher",
						  "department": "Academics",
						  "specialization": "Science"
						}
						""".formatted(employeeId, firstName, lastName, email, phone)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}

	private long createTeacherWithUserInOrg(
			Long orgId, Long userId, String employeeId, String firstName, String lastName, String phone) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/teachers", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "userId": %d,
						  "employeeId": "%s",
						  "firstName": "%s",
						  "lastName": "%s",
						  "phoneNumber": "%s",
						  "joiningDate": "2024-06-01",
						  "designation": "Teacher",
						  "department": "Academics",
						  "specialization": "Physics"
						}
						""".formatted(userId, employeeId, firstName, lastName, phone)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}

	private long createGuardianInOrg(
			Long orgId, String firstName, String lastName, String email, String phone) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/guardians", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "firstName": "%s",
						  "lastName": "%s",
						  "email": "%s",
						  "phoneNumber": "%s"
						}
						""".formatted(firstName, lastName, email, phone)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}

	private long createStudentInOrg(
			Long orgId, String admissionNumber, String firstName, String lastName, String email, String phone) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/students", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "admissionNumber": "%s",
						  "firstName": "%s",
						  "lastName": "%s",
						  "dateOfBirth": "2012-05-15",
						  "gender": "MALE",
						  "email": "%s",
						  "phoneNumber": "%s",
						  "admissionDate": "2026-04-01"
						}
						""".formatted(admissionNumber, firstName, lastName, email, phone)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}

	private long createStudentWithUserAndEnroll(
			Long orgId, Long sessionId, Long classId, Long userId, String admissionNumber, String firstName) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/students", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "userId": %d,
						  "admissionNumber": "%s",
						  "firstName": "%s",
						  "lastName": "Student",
						  "dateOfBirth": "2012-05-15",
						  "gender": "MALE",
						  "admissionDate": "2026-04-01"
						}
						""".formatted(userId, admissionNumber, firstName)))
				.andExpect(status().isCreated())
				.andReturn();
		long studentId = objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();

		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "studentId": %d,
						  "classId": %d,
						  "enrollmentDate": "2026-04-02"
						}
						""".formatted(sessionId, studentId, classId)))
				.andExpect(status().isCreated());
		return studentId;
	}

	private long createActiveSession(Long orgId, String name) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "%s",
						  "startDate": "2026-04-01",
						  "endDate": "2027-03-31"
						}
						""".formatted(name)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}

	private long createSchoolClass(Long orgId, String name, String code) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "%s",
						  "code": "%s",
						  "displayOrder": 1
						}
						""".formatted(name, code)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}

	private long createSubject(Long orgId, String name, String code) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "%s",
						  "code": "%s"
						}
						""".formatted(name, code)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}

	private void assignSubjectToClass(Long orgId, Long sessionId, Long classId, Long subjectId) throws Exception {
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sessionId}/classes/{classId}/subjects",
				orgId, sessionId, classId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "subjectId": %d,
						  "mandatory": true
						}
						""".formatted(subjectId)))
				.andExpect(status().isCreated());
	}

	private void assignTeacherToSubject(Long orgId, Long sessionId, Long classId, Long subjectId, Long teacherId) throws Exception {
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sessionId}/classes/{classId}/subjects/{subjectId}/teachers",
				orgId, sessionId, classId, subjectId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "teacherId": %d,
						  "primaryTeacher": true
						}
						""".formatted(teacherId)))
				.andExpect(status().isCreated());
	}

	private long createHomeworkAssignment(
			Long orgId, Long sessionId, Long classId, Long subjectId, Long teacherId, String title) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/homework", orgId)
				.cookie(teacherOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "subjectId": %d,
						  "teacherId": %d,
						  "title": "%s",
						  "description": "Solve all problems",
						  "assignedDate": "2026-06-10",
						  "dueDate": "2026-06-20",
						  "maxMarks": 20.00,
						  "allowResubmission": true,
						  "lateSubmissionPolicy": "ALLOW_LATE"
						}
						""".formatted(sessionId, classId, subjectId, teacherId, title)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}
}
