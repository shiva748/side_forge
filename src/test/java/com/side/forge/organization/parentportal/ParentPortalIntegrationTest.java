package com.side.forge.organization.parentportal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.StandardCharsets;
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
import com.side.forge.invitation.notification.LoggingInvitationNotificationSender;
import com.side.forge.organization.entity.*;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.security.jwt.JwtService;
import com.side.forge.user.entity.UserStatus;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
class ParentPortalIntegrationTest {

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
	private OrganizationMembershipRepository membershipRepository;

	@Autowired
	private MembershipRoleRepository membershipRoleRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private JwtService jwtService;

	@Autowired
	private LoggingInvitationNotificationSender invitationSender;

	private Organization org1;
	private Organization org2;
	private Cookie adminCookie;
	private Cookie org2AdminCookie;

	@BeforeEach
	void setUp() {
		cleanDatabase();

		org1 = createOrganization("Sunrise Public School", OrganizationStatus.ACTIVE);
		org2 = createOrganization("Greenwood High School", OrganizationStatus.ACTIVE);

		Users admin1 = createUser("AdminOne");
		assignOrgRole(admin1.getId(), org1.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminCookie = jwtCookie(admin1);

		Users admin2 = createUser("AdminTwo");
		assignOrgRole(admin2.getId(), org2.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		org2AdminCookie = jwtCookie(admin2);
	}

	@Test
	void multiChildParentPortalLifecycle_dashboardAttendanceHomeworkExamsFeesTimetableAndFiles() throws Exception {
		Long orgId = org1.getId();
		Long sessionId = createActiveSession(orgId, adminCookie, "2026-2027");
		Long class6A = createSchoolClass(orgId, adminCookie, "Class 6-A", "C6A", 6);
		Long class8B = createSchoolClass(orgId, adminCookie, "Class 8-B", "C8B", 8);
		Long mathId = createSubject(orgId, adminCookie, "Mathematics", "MATH-6");
		assignSubjectToClass(orgId, adminCookie, sessionId, class6A, mathId);
		Users teacherUser = createUser("TeacherMath");
		assignOrgRole(teacherUser.getId(), orgId, "TEACHER", MembershipStatus.ACTIVE);
		Long teacherId = createTeacher(orgId, adminCookie, teacherUser.getId(), "TCH-PP-01", "Vikram", "Rao", "9400000001");
		assignTeacherToSubject(orgId, adminCookie, sessionId, class6A, mathId, teacherId);

		// Register two children in different classes (no student login accounts)
		Long child1Id = createStudentAndEnroll(orgId, adminCookie, sessionId, class6A, "ADM-PP-01", "Aarav", "Sharma");
		Long child2Id = createStudentAndEnroll(orgId, adminCookie, sessionId, class8B, "ADM-PP-02", "Ananya", "Sharma");

		// Upload student photo and admission document for child1
		MockMultipartFile photoFile = new MockMultipartFile(
				"file", "aarav.png", "image/png", "PNG-AARAV-PHOTO".getBytes(StandardCharsets.UTF_8));
		mockMvc.perform(multipart("/api/organizations/{orgId}/students/{studentId}/photo", orgId, child1Id)
				.file(photoFile).cookie(adminCookie))
				.andExpect(status().isCreated());

		MockMultipartFile docFile = new MockMultipartFile(
				"file", "birth-certificate.pdf", "application/pdf", "%PDF-1.4-BIRTH-CERT".getBytes(StandardCharsets.UTF_8));
		MvcResult docRes = mockMvc.perform(multipart("/api/organizations/{orgId}/students/{studentId}/documents", orgId, child1Id)
				.file(docFile).cookie(adminCookie))
				.andExpect(status().isCreated())
				.andReturn();
		Long child1DocFileId = readData(docRes).get("id").asLong();

		// Create Guardian record in org1 and link both children
		Long guardian1Id = createGuardian(orgId, adminCookie, "Rajesh", "Sharma", "rajesh.parent@parentportal.test", "9200000001");
		linkGuardianToStudent(orgId, adminCookie, child1Id, guardian1Id);
		linkGuardianToStudent(orgId, adminCookie, child2Id, guardian1Id);

		// Also set up org2 with a 3rd child linked to Rajesh in org2
		Long org2SessionId = createActiveSession(org2.getId(), org2AdminCookie, "2026-2027");
		Long org2Class4 = createSchoolClass(org2.getId(), org2AdminCookie, "Grade 4-A", "G4A", 4);
		Long child3Org2Id = createStudentAndEnroll(org2.getId(), org2AdminCookie, org2SessionId, org2Class4, "ADM-G2-01", "Vihaan", "Sharma");
		Long guardian2Org2Id = createGuardian(org2.getId(), org2AdminCookie, "Rajesh", "Sharma", "rajesh.parent@parentportal.test", "9200000001");
		linkGuardianToStudent(org2.getId(), org2AdminCookie, child3Org2Id, guardian2Org2Id);

		// Invite Rajesh to org1 as PARENT linked to guardian1Id and accept invitation
		Cookie parentCookie = inviteAndAcceptGuardian(
				orgId, adminCookie, guardian1Id, "rajesh.parent@parentportal.test", "9200000001", true, null);
		// Invite same parent account to org2 linked to guardian2Org2Id and accept with existing account
		inviteAndAcceptGuardian(
				org2.getId(), org2AdminCookie, guardian2Org2Id, "rajesh.parent@parentportal.test", "9200000001", false, parentCookie);

		// 1. Verify cross-organization and per-organization child listing & profile overview
		MvcResult allChildrenRes = mockMvc.perform(get("/api/me/parent-portal/children").cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		assertThat(readData(allChildrenRes).size()).isEqualTo(3);

		MvcResult profileOverviewRes = mockMvc.perform(get("/api/me/parent-portal/profile").cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		assertThat(readData(profileOverviewRes).get("userProfile").get("email").asText())
				.isEqualTo("rajesh.parent@parentportal.test");
		assertThat(readData(profileOverviewRes).get("linkedChildren").size()).isEqualTo(3);

		MvcResult org1ChildrenRes = mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children", orgId)
				.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		assertThat(readData(org1ChildrenRes).size()).isEqualTo(2);

		// 2. Verify Child Details, Photo Download, and Document Download
		MvcResult child1DetailRes = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}", orgId, child1Id)
						.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode child1Detail = readData(child1DetailRes);
		assertThat(child1Detail.get("profile").get("admissionNumber").asText()).isEqualTo("ADM-PP-01");
		assertThat(child1Detail.get("currentEnrollment").get("classId").asLong()).isEqualTo(class6A);
		assertThat(child1Detail.get("documents").size()).isEqualTo(1);
		assertThat(child1Detail.get("profilePhotoFileId").isNull()).isFalse();

		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/photo", orgId, child1Id)
				.cookie(parentCookie))
				.andExpect(status().isOk())
				.andExpect(content().bytes("PNG-AARAV-PHOTO".getBytes(StandardCharsets.UTF_8)));

		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/documents/{fileId}",
				orgId, child1Id, child1DocFileId).cookie(parentCookie))
				.andExpect(status().isOk())
				.andExpect(content().bytes("%PDF-1.4-BIRTH-CERT".getBytes(StandardCharsets.UTF_8)));

		exerciseAttendanceAndHomeworkForChild(
				orgId, sessionId, class6A, mathId, teacherId, child1Id, child2Id, parentCookie);
	}

	private void exerciseAttendanceAndHomeworkForChild(
			Long orgId, Long sessionId, Long class6A, Long mathId,
			Long teacherId, Long child1Id, Long child2Id, Cookie parentCookie) throws Exception {
		// 3. Attendance: mark PRESENT, ABSENT->corrected to LATE, and HOLIDAY
		markAttendance(orgId, sessionId, class6A, child1Id, "2026-06-01", "PRESENT");
		Long day2AttId = markAttendance(orgId, sessionId, class6A, child1Id, "2026-06-02", "ABSENT");
		markAttendance(orgId, sessionId, class6A, child1Id, "2026-06-03", "HOLIDAY");

		mockMvc.perform(put("/api/organizations/{orgId}/student-attendance/{id}", orgId, day2AttId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "status": "LATE",
						  "remarks": "Bus delayed",
						  "correctionReason": "Verified with transport"
						}
						"""))
				.andExpect(status().isOk());

		MvcResult attRes = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/attendance", orgId, child1Id)
						.param("year", "2026").param("month", "6")
						.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode attData = readData(attRes);
		assertThat(attData.get("overallSummary").get("presentCount").asInt()).isEqualTo(1);
		assertThat(attData.get("overallSummary").get("lateCount").asInt()).isEqualTo(1);
		assertThat(attData.get("overallSummary").get("holidayDays").asInt()).isEqualTo(1);
		assertThat(attData.get("overallSummary").get("attendancePercentage").asDouble()).isEqualTo(100.0);
		assertThat(attData.get("monthlySummaries").size()).isEqualTo(1);
		assertThat(attData.get("recentAttendanceUpdates").size()).isGreaterThanOrEqualTo(1);

		// 4. Homework & Assignments: create homework with teacher attachment, parent submits on behalf of child1
		MvcResult hwRes = mockMvc.perform(post("/api/organizations/{orgId}/homework", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "subjectId": %d,
						  "teacherId": %d,
						  "title": "Fractions Practice Sheet",
						  "description": "Solve all 10 problems and upload your work",
						  "assignedDate": "2026-06-05",
						  "dueDate": "2026-06-15",
						  "maxMarks": 100.00,
						  "allowResubmission": true,
						  "lateSubmissionPolicy": "ALLOW_LATE"
						}
						""".formatted(sessionId, class6A, mathId, teacherId)))
				.andExpect(status().isCreated())
				.andReturn();
		Long hwId = readData(hwRes).get("id").asLong();

		MockMultipartFile teacherWorksheet = new MockMultipartFile(
				"file", "fractions-sheet.pdf", "application/pdf", "%PDF-1.4-WORKSHEET".getBytes(StandardCharsets.UTF_8));
		MvcResult tFileRes = mockMvc.perform(
				multipart("/api/organizations/{orgId}/homework/{hwId}/attachments", orgId, hwId)
						.file(teacherWorksheet).cookie(adminCookie))
				.andExpect(status().isCreated())
				.andReturn();
		Long teacherFileId = readData(tFileRes).get("id").asLong();

		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/homework/{hwId}/attachments/{fileId}",
				orgId, child1Id, hwId, teacherFileId).cookie(parentCookie))
				.andExpect(status().isOk())
				.andExpect(content().bytes("%PDF-1.4-WORKSHEET".getBytes(StandardCharsets.UTF_8)));

		MockMultipartFile parentSubFile = new MockMultipartFile(
				"file", "aarav-answers.pdf", "application/pdf", "%PDF-1.4-AARAV-ANSWERS".getBytes(StandardCharsets.UTF_8));
		MvcResult pSubFileRes = mockMvc.perform(
				multipart("/api/organizations/{orgId}/parent-portal/children/{studentId}/homework/{hwId}/submit-file",
						orgId, child1Id, hwId)
						.file(parentSubFile)
						.param("submissionText", "Completed all 10 problems with parent supervision")
						.param("submissionDate", "2026-06-10")
						.cookie(parentCookie))
				.andExpect(status().isCreated())
				.andReturn();
		Long studentSubFileId = readData(pSubFileRes).get("id").asLong();

		MvcResult subDetailBeforeEval = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/homework/{hwId}",
						orgId, child1Id, hwId).cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		Long submissionId = readData(subDetailBeforeEval).get("submission").get("submissionId").asLong();
		assertThat(readData(subDetailBeforeEval).get("submission").get("status").asText()).isEqualTo("SUBMITTED");

		mockMvc.perform(patch("/api/organizations/{orgId}/homework/{hwId}/submissions/{subId}/evaluate",
				orgId, hwId, submissionId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "marksAwarded": 92.00,
						  "feedback": "Excellent neat work, Aarav!"
						}
						"""))
				.andExpect(status().isOk());

		MvcResult subDetailAfterEval = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/homework/{hwId}",
						orgId, child1Id, hwId).cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode evalSub = readData(subDetailAfterEval).get("submission");
		assertThat(evalSub.get("status").asText()).isEqualTo("EVALUATED");
		assertThat(evalSub.get("marksAwarded").decimalValue()).isEqualByComparingTo("92.00");
		assertThat(evalSub.get("teacherFeedback").asText()).isEqualTo("Excellent neat work, Aarav!");

		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/homework/{hwId}/submissions/{subId}/attachments/{fileId}",
				orgId, child1Id, hwId, submissionId, studentSubFileId).cookie(parentCookie))
				.andExpect(status().isOk())
				.andExpect(content().bytes("%PDF-1.4-AARAV-ANSWERS".getBytes(StandardCharsets.UTF_8)));

		exerciseExamsFeesTimetableAnnouncementsAndDashboard(
				orgId, sessionId, class6A, mathId, teacherId, child1Id, child2Id, parentCookie);
	}

	private void exerciseExamsFeesTimetableAnnouncementsAndDashboard(
			Long orgId, Long sessionId, Long class6A, Long mathId,
			Long teacherId, Long child1Id, Long child2Id, Cookie parentCookie) throws Exception {
		// 5. Examinations & Results: verify unpublished results are hidden, published results + PDF report card exposed
		Long examId = createCompletedExamWithMarks(orgId, sessionId, class6A, mathId, child1Id);

		MvcResult examsBeforePub = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/examinations", orgId, child1Id)
						.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		assertThat(readData(examsBeforePub).get("upcomingExaminations").size()).isEqualTo(1);
		assertThat(readData(examsBeforePub).get("publishedResults").size()).isEqualTo(0);

		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/examinations/{examId}/report-card",
				orgId, child1Id, examId).cookie(parentCookie))
				.andExpect(status().isConflict());

		mockMvc.perform(patch("/api/organizations/{orgId}/examinations/{examId}/publish", orgId, examId)
				.cookie(adminCookie))
				.andExpect(status().isOk());

		MvcResult examsAfterPub = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/examinations", orgId, child1Id)
						.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		assertThat(readData(examsAfterPub).get("publishedResults").size()).isEqualTo(1);
		assertThat(readData(examsAfterPub).get("publishedResults").get(0).get("percentage").decimalValue())
				.isEqualByComparingTo("95.00");

		MvcResult reportCardPdf = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/examinations/{examId}/report-card/download",
						orgId, child1Id, examId).param("format", "PDF").cookie(parentCookie))
				.andExpect(status().isOk())
				.andExpect(header().string("Content-Type", "application/pdf"))
				.andReturn();
		assertThat(reportCardPdf.getResponse().getContentAsByteArray().length).isGreaterThan(100);

		// 6. Fees & Finance: publish fee structure, generate demands, record payment, verify consolidated & per-child fees + receipt PDF
		Long paymentId = setupFeeStructureAndPaymentForChild(orgId, sessionId, class6A, child1Id);

		MvcResult consolidatedFeesRes = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/fees", orgId).cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode consolidatedFees = readData(consolidatedFeesRes);
		assertThat(consolidatedFees.get("totalNetPayableAmount").decimalValue()).isEqualByComparingTo("5000.00");
		assertThat(consolidatedFees.get("totalPaidAmount").decimalValue()).isEqualByComparingTo("3000.00");
		assertThat(consolidatedFees.get("totalOutstandingAmount").decimalValue()).isEqualByComparingTo("2000.00");
		assertThat(consolidatedFees.get("childrenFinancialProfiles").size()).isEqualTo(2);

		MvcResult child1FeesRes = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/fees", orgId, child1Id)
						.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		assertThat(readData(child1FeesRes).get("paymentHistory").size()).isEqualTo(1);

		MvcResult receiptPdfRes = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/fees/payments/{paymentId}/receipt/download",
						orgId, child1Id, paymentId).param("format", "PDF").cookie(parentCookie))
				.andExpect(status().isOk())
				.andExpect(header().string("Content-Type", "application/pdf"))
				.andReturn();
		assertThat(receiptPdfRes.getResponse().getContentAsByteArray().length).isGreaterThan(100);

		// 7. Timetable: configure and publish class timetable, verify parent can view child1's timetable
		setupAndPublishTimetable(orgId, sessionId, class6A, mathId, teacherId);

		MvcResult ttRes = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/timetable", orgId, child1Id)
						.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		assertThat(readData(ttRes).get("classId").asLong()).isEqualTo(class6A);
		assertThat(readData(ttRes).get("slots").size()).isEqualTo(1);

		exerciseAnnouncementsNotificationsAndDashboards(orgId, sessionId, child1Id, parentCookie);
	}

	private void exerciseAnnouncementsNotificationsAndDashboards(
			Long orgId, Long sessionId, Long child1Id, Cookie parentCookie) throws Exception {
		// 8. Announcements & Notifications: publish parent announcement with attachment
		MvcResult annRes = mockMvc.perform(post("/api/organizations/{orgId}/announcements", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "title": "Parent-Teacher Meeting Circular",
						  "description": "PTM scheduled for Saturday at 10 AM.",
						  "targetAudience": "PARENTS",
						  "publicationDate": "2026-06-01",
						  "expiryDate": "2026-06-30",
						  "important": true
						}
						""".formatted(sessionId)))
				.andExpect(status().isCreated())
				.andReturn();
		Long annId = readData(annRes).get("id").asLong();

		MockMultipartFile circularPdf = new MockMultipartFile(
				"file", "ptm-circular.pdf", "application/pdf", "%PDF-1.4-PTM-CIRCULAR".getBytes(StandardCharsets.UTF_8));
		MvcResult annFileRes = mockMvc.perform(
				multipart("/api/organizations/{orgId}/announcements/{annId}/attachments", orgId, annId)
						.file(circularPdf).cookie(adminCookie))
				.andExpect(status().isCreated())
				.andReturn();
		Long annFileId = readData(annFileRes).get("id").asLong();

		mockMvc.perform(post("/api/organizations/{orgId}/announcements/{annId}/publish", orgId, annId)
				.cookie(adminCookie))
				.andExpect(status().isOk());

		MvcResult parentAnns = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/announcements", orgId)
						.param("referenceDate", "2026-06-10")
						.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		assertThat(readData(parentAnns).size()).isEqualTo(1);

		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/announcements/{annId}/attachments/{fileId}",
				orgId, annId, annFileId).cookie(parentCookie))
				.andExpect(status().isOk())
				.andExpect(content().bytes("%PDF-1.4-PTM-CIRCULAR".getBytes(StandardCharsets.UTF_8)));

		// 9. Consolidated Parent Dashboard & Individual Child Dashboard
		MvcResult dashRes = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/dashboard", orgId)
						.param("referenceDate", "2026-06-10")
						.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode dash = readData(dashRes);
		assertThat(dash.get("totalLinkedChildren").asInt()).isEqualTo(2);
		assertThat(dash.get("totalOutstandingFeeDues").decimalValue()).isEqualByComparingTo("2000.00");
		assertThat(dash.get("recentAnnouncements").size()).isEqualTo(1);
		assertThat(dash.get("unreadNotificationCount").asLong()).isGreaterThanOrEqualTo(1L);

		MvcResult childDashRes = mockMvc.perform(
				get("/api/organizations/{orgId}/parent-portal/children/{studentId}/dashboard", orgId, child1Id)
						.param("referenceDate", "2026-06-10")
						.cookie(parentCookie))
				.andExpect(status().isOk())
				.andReturn();
		JsonNode childDash = readData(childDashRes);
		assertThat(childDash.get("evaluatedHomeworkCount").asInt()).isEqualTo(1);
		assertThat(childDash.get("recentlyPublishedResults").size()).isEqualTo(1);
		assertThat(childDash.get("outstandingFeeDues").decimalValue()).isEqualByComparingTo("2000.00");
	}

	@Test
	void parentAuthorizationAndTenantIsolation_blocksOtherParentsChildrenCrossOrgAndMutations() throws Exception {
		Long orgId = org1.getId();
		Long sessionId = createActiveSession(orgId, adminCookie, "2026-2027");
		Long class6A = createSchoolClass(orgId, adminCookie, "Class 6-A", "C6A", 6);
		Long class7A = createSchoolClass(orgId, adminCookie, "Class 7-A", "C7A", 7);
		Long mathId = createSubject(orgId, adminCookie, "Mathematics", "MATH-6");
		assignSubjectToClass(orgId, adminCookie, sessionId, class6A, mathId);
		assignSubjectToClass(orgId, adminCookie, sessionId, class7A, mathId);
		Users teacherUser = createUser("TeacherIso");
		assignOrgRole(teacherUser.getId(), orgId, "TEACHER", MembershipStatus.ACTIVE);
		Long teacherId = createTeacher(orgId, adminCookie, teacherUser.getId(), "TCH-ISO-01", "Vikram", "Rao", "9400000010");
		assignTeacherToSubject(orgId, adminCookie, sessionId, class6A, mathId, teacherId);
		assignTeacherToSubject(orgId, adminCookie, sessionId, class7A, mathId, teacherId);

		Long child1Id = createStudentAndEnroll(orgId, adminCookie, sessionId, class6A, "ADM-ISO-01", "Aarav", "Sharma");
		Long otherChildId = createStudentAndEnroll(orgId, adminCookie, sessionId, class7A, "ADM-ISO-02", "Kabir", "Verma");

		Long guardian1Id = createGuardian(orgId, adminCookie, "Rajesh", "Sharma", "p1@parentportal.test", "9300000001");
		linkGuardianToStudent(orgId, adminCookie, child1Id, guardian1Id);
		Cookie parent1Cookie = inviteAndAcceptGuardian(
				orgId, adminCookie, guardian1Id, "p1@parentportal.test", "9300000001", true, null);

		Long guardian2Id = createGuardian(orgId, adminCookie, "Sunita", "Verma", "p2@parentportal.test", "9300000002");
		linkGuardianToStudent(orgId, adminCookie, otherChildId, guardian2Id);
		inviteAndAcceptGuardian(orgId, adminCookie, guardian2Id, "p2@parentportal.test", "9300000002", true, null);

		Users unlinkedUser = createUser("UnlinkedParent");
		Cookie unlinkedCookie = jwtCookie(unlinkedUser);
		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/dashboard", orgId).cookie(unlinkedCookie))
				.andExpect(status().isForbidden());

		assertUnauthorizedStudentAndTenantAccess(
				orgId, sessionId, class7A, mathId, teacherId, otherChildId, parent1Cookie);
	}

	private void assertUnauthorizedStudentAndTenantAccess(
			Long orgId, Long sessionId, Long class6A, Long mathId,
			Long teacherId, Long otherChildId, Cookie parent1Cookie) throws Exception {
		MvcResult hwRes = mockMvc.perform(post("/api/organizations/{orgId}/homework", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "subjectId": %d,
						  "teacherId": %d,
						  "title": "Algebra HW",
						  "description": "Complete exercises",
						  "assignedDate": "2026-06-05",
						  "dueDate": "2026-06-15",
						  "maxMarks": 50.00,
						  "allowResubmission": true,
						  "lateSubmissionPolicy": "ALLOW_LATE"
						}
						""".formatted(sessionId, class6A, mathId, teacherId)))
				.andExpect(status().isCreated())
				.andReturn();
		Long hwId = readData(hwRes).get("id").asLong();

		Long examId = createCompletedExamWithMarks(orgId, sessionId, class6A, mathId, otherChildId);
		mockMvc.perform(patch("/api/organizations/{orgId}/examinations/{examId}/publish", orgId, examId)
				.cookie(adminCookie)).andExpect(status().isOk());

		Long otherPaymentId = setupFeeStructureAndPaymentForChild(orgId, sessionId, class6A, otherChildId);

		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}", orgId, otherChildId)
				.cookie(parent1Cookie)).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/dashboard", orgId, otherChildId)
				.cookie(parent1Cookie)).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/attendance", orgId, otherChildId)
				.cookie(parent1Cookie)).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/homework", orgId, otherChildId)
				.cookie(parent1Cookie)).andExpect(status().isForbidden());
		mockMvc.perform(post("/api/organizations/{orgId}/parent-portal/children/{studentId}/homework/{hwId}/submit",
				orgId, otherChildId, hwId).cookie(parent1Cookie).contentType(MediaType.APPLICATION_JSON)
				.content("{\"submissionText\":\"Unauthorized\"}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/examinations/{examId}/report-card",
				orgId, otherChildId, examId).cookie(parent1Cookie)).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/fees", orgId, otherChildId)
				.cookie(parent1Cookie)).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/children/{studentId}/fees/payments/{paymentId}/receipt",
				orgId, otherChildId, otherPaymentId).cookie(parent1Cookie)).andExpect(status().isForbidden());

		// Also verify direct underlying module APIs block Parent 1 from accessing Parent 2's child
		mockMvc.perform(get("/api/organizations/{orgId}/students/{studentId}/attendance", orgId, otherChildId)
				.cookie(parent1Cookie)).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/examinations/{examId}/students/{studentId}/report-card",
				orgId, examId, otherChildId).cookie(parent1Cookie)).andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/students/{studentId}/financial-profile",
				orgId, otherChildId)
				.param("academicSessionId", String.valueOf(sessionId))
				.cookie(parent1Cookie)).andExpect(status().isForbidden());
		mockMvc.perform(post("/api/organizations/{orgId}/homework/{hwId}/submissions", orgId, hwId)
				.cookie(parent1Cookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "studentId": %d,
						  "submissionText": "Unauthorized direct submit",
						  "submissionDate": "2026-06-10"
						}
						""".formatted(otherChildId)))
				.andExpect(status().isForbidden());

		// Cross-organization isolation: Parent 1 cannot access org2 endpoints
		mockMvc.perform(get("/api/organizations/{orgId}/parent-portal/dashboard", org2.getId())
				.cookie(parent1Cookie)).andExpect(status().isForbidden());

		// Parent 1 cannot mutate administrative records
		mockMvc.perform(patch("/api/organizations/{orgId}/examinations/{examId}/publish", orgId, examId)
				.cookie(parent1Cookie)).andExpect(status().isForbidden());
	}

	private void cleanDatabase() {
		List<String> tables = List.of(
				"user_notification_preferences", "in_app_notifications",
				"announcement_target_students", "announcement_target_classes", "announcements",
				"stored_file_references", "stored_files",
				"organization_invitations", "organization_onboarding_requests",
				"student_homework_submissions", "homework_assignments",
				"school_notices",
				"fee_audit_logs", "fee_payment_allocations", "fee_payments",
				"student_fee_demands", "student_fee_concessions", "student_fee_assignments",
				"class_fee_structure_components", "class_fee_structures",
				"exam_results", "student_exam_results", "exam_marks", "exam_schedules", "examinations",
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

	private Cookie inviteAndAcceptGuardian(
			Long orgId, Cookie senderCookie, Long guardianId,
			String email, String phone, boolean newAccount, Cookie existingCookie) throws Exception {
		MvcResult invRes = mockMvc.perform(post("/api/organizations/{orgId}/invitations", orgId)
				.cookie(senderCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "%s",
						  "phoneNumber": "%s",
						  "firstName": "Rajesh",
						  "lastName": "Sharma",
						  "roleCode": "PARENT",
						  "targetType": "GUARDIAN",
						  "targetProfileId": %d
						}
						""".formatted(email, phone, guardianId)))
				.andExpect(status().isCreated())
				.andReturn();
		String rawToken = readData(invRes).get("invitationToken").asText();

		String acceptBody = newAccount
				? """
				  {
				    "token": "%s",
				    "firstName": "Rajesh",
				    "lastName": "Sharma",
				    "phoneNumber": "%s",
				    "password": "ParentPass@123"
				  }
				  """.formatted(rawToken, phone)
				: """
				  {
				    "token": "%s"
				  }
				  """.formatted(rawToken);
		var builder = post("/api/invitations/accept")
				.contentType(MediaType.APPLICATION_JSON)
				.content(acceptBody);
		if (existingCookie != null) {
			builder.cookie(existingCookie);
		}
		mockMvc.perform(builder).andExpect(status().isOk());
		Users parentUser = userRepository.findByEmail(email).orElseThrow();
		return jwtCookie(parentUser);
	}

	private Long createActiveSession(Long orgId, Cookie cookie, String name) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions", orgId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "%s",
						  "startDate": "2026-04-01",
						  "endDate": "2027-03-31"
						}
						""".formatted(name)))
				.andExpect(status().isCreated())
				.andReturn();
		return readData(res).get("id").asLong();
	}

	private Long createSchoolClass(Long orgId, Cookie cookie, String name, String code, int order) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "%s",
						  "code": "%s",
						  "displayOrder": %d
						}
						""".formatted(name, code, order)))
				.andExpect(status().isCreated())
				.andReturn();
		return readData(res).get("id").asLong();
	}

	private Long createSubject(Long orgId, Cookie cookie, String name, String code) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/subjects", orgId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "%s",
						  "code": "%s"
						}
						""".formatted(name, code)))
				.andExpect(status().isCreated())
				.andReturn();
		return readData(res).get("id").asLong();
	}

	private void assignSubjectToClass(Long orgId, Cookie cookie, Long sessionId, Long classId, Long subjectId) throws Exception {
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sessionId}/classes/{classId}/subjects",
				orgId, sessionId, classId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "subjectId": %d,
						  "mandatory": true
						}
						""".formatted(subjectId)))
				.andExpect(status().isCreated());
	}

	private Long createTeacher(
			Long orgId, Cookie cookie, Long userId, String employeeId,
			String firstName, String lastName, String phone) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/teachers", orgId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "userId": %d,
						  "employeeId": "%s",
						  "firstName": "%s",
						  "lastName": "%s",
						  "phoneNumber": "%s",
						  "joiningDate": "2024-06-01",
						  "designation": "Senior Teacher",
						  "department": "Academics",
						  "specialization": "Mathematics"
						}
						""".formatted(userId, employeeId, firstName, lastName, phone)))
				.andExpect(status().isCreated())
				.andReturn();
		return readData(res).get("id").asLong();
	}

	private void assignTeacherToSubject(
			Long orgId, Cookie cookie, Long sessionId, Long classId, Long subjectId, Long teacherId) throws Exception {
		mockMvc.perform(post("/api/organizations/{orgId}/academic-sessions/{sessionId}/classes/{classId}/subjects/{subjectId}/teachers",
				orgId, sessionId, classId, subjectId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "teacherId": %d,
						  "primaryTeacher": true
						}
						""".formatted(teacherId)))
				.andExpect(status().isCreated());
	}

	private Long createStudentAndEnroll(
			Long orgId, Cookie cookie, Long sessionId, Long classId,
			String admissionNumber, String firstName, String lastName) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/students", orgId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "admissionNumber": "%s",
						  "firstName": "%s",
						  "lastName": "%s",
						  "dateOfBirth": "2014-05-15",
						  "gender": "MALE",
						  "admissionDate": "2026-04-01"
						}
						""".formatted(admissionNumber, firstName, lastName)))
				.andExpect(status().isCreated())
				.andReturn();
		long studentId = readData(res).get("id").asLong();

		mockMvc.perform(post("/api/organizations/{orgId}/enrollments", orgId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
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

	private Long createGuardian(
			Long orgId, Cookie cookie, String firstName, String lastName, String email, String phone) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/guardians", orgId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
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
		return readData(res).get("id").asLong();
	}

	private void linkGuardianToStudent(Long orgId, Cookie cookie, Long studentId, Long guardianId) throws Exception {
		mockMvc.perform(post("/api/organizations/{orgId}/students/{sId}/guardians", orgId, studentId)
				.cookie(cookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "guardianId": %d,
						  "relationshipType": "FATHER",
						  "primaryContact": true,
						  "emergencyContact": true,
						  "receiveNotifications": true
						}
						""".formatted(guardianId)))
				.andExpect(status().isCreated());
	}

	private Long markAttendance(
			Long orgId, Long sessionId, Long classId, Long studentId, String date, String status) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/student-attendance", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "studentId": %d,
						  "attendanceDate": "%s",
						  "status": "%s"
						}
						""".formatted(sessionId, classId, studentId, date, status)))
				.andExpect(status().isCreated())
				.andReturn();
		return readData(res).get("id").asLong();
	}

	private Long createCompletedExamWithMarks(
			Long orgId, Long sessionId, Long classId, Long subjectId, Long studentId) throws Exception {
		MvcResult scaleRes = mockMvc.perform(post("/api/organizations/{orgId}/grading-scales", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "Standard CBSE Scale " + %d,
						  "rules": [
						    {"grade": "A", "minPercentage": 80.00, "maxPercentage": 100.00, "gradePoint": 9.0, "passed": true, "displayOrder": 1},
						    {"grade": "B", "minPercentage": 35.00, "maxPercentage": 79.99, "gradePoint": 7.0, "passed": true, "displayOrder": 2},
						    {"grade": "F", "minPercentage": 0.00, "maxPercentage": 34.99, "gradePoint": 0.0, "passed": false, "displayOrder": 3}
						  ]
						}
						""".replace("\"Standard CBSE Scale \" + %d", "\"Standard CBSE Scale " + COUNTER.incrementAndGet() + "\"")))
				.andExpect(status().isCreated())
				.andReturn();
		long scaleId = readData(scaleRes).get("id").asLong();

		MvcResult examRes = mockMvc.perform(post("/api/organizations/{orgId}/examinations", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "gradingScaleId": %d,
						  "name": "Mid-Term Exam 2026",
						  "examType": "MID_TERM",
						  "startDate": "2026-09-01",
						  "endDate": "2026-09-15"
						}
						""".formatted(sessionId, classId, scaleId)))
				.andExpect(status().isCreated())
				.andReturn();
		long examId = readData(examRes).get("id").asLong();

		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{examId}/schedules", orgId, examId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "subjectId": %d,
						  "examDate": "2026-09-10",
						  "startTime": "09:00",
						  "endTime": "11:00",
						  "maxMarks": 100.00,
						  "passingMarks": 35.00
						}
						""".formatted(subjectId)))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{examId}/marks", orgId, examId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "subjectId": %d,
						  "studentId": %d,
						  "entryStatus": "PRESENT",
						  "marksObtained": 95.00
						}
						""".formatted(subjectId, studentId)))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/organizations/{orgId}/examinations/{examId}/finalize", orgId, examId)
				.cookie(adminCookie))
				.andExpect(status().isOk());
		return examId;
	}

	private Long setupFeeStructureAndPaymentForChild(
			Long orgId, Long sessionId, Long classId, Long studentId) throws Exception {
		MvcResult structRes = mockMvc.perform(post("/api/organizations/{orgId}/fee-structures", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "name": "Class Fee Structure " + %d,
						  "effectiveFromDate": "2026-04-01",
						  "components": [
						    {
						      "code": "TUITION_%d",
						      "name": "Annual Tuition Fee",
						      "category": "TUITION",
						      "frequency": "YEARLY",
						      "amount": 5000.00,
						      "dueDate": "2026-07-15",
						      "mandatory": true,
						      "displayOrder": 1
						    }
						  ]
						}
						""".replace("\"Class Fee Structure \" + %d", "\"Class Fee Structure " + studentId + "\"")
						.formatted(sessionId, classId, studentId)))
				.andExpect(status().isCreated())
				.andReturn();
		long structId = readData(structRes).get("id").asLong();

		mockMvc.perform(patch("/api/organizations/{orgId}/fee-structures/{id}/publish", orgId, structId)
				.cookie(adminCookie)).andExpect(status().isOk());

		MvcResult enrRes = mockMvc.perform(get("/api/organizations/{orgId}/enrollments", orgId)
				.param("academicSessionId", String.valueOf(sessionId))
				.param("studentId", String.valueOf(studentId))
				.cookie(adminCookie))
				.andExpect(status().isOk())
				.andReturn();
		long enrollmentId = readData(enrRes).get("content").get(0).get("id").asLong();

		MvcResult demandsRes = mockMvc.perform(post("/api/organizations/{orgId}/enrollments/{enrId}/generate-fees",
				orgId, enrollmentId).cookie(adminCookie))
				.andExpect(status().isOk())
				.andReturn();
		long demandId = readData(demandsRes).get(0).get("id").asLong();

		MvcResult payRes = mockMvc.perform(post("/api/organizations/{orgId}/fee-payments", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "studentId": %d,
						  "idempotencyKey": "PAY-PP-%d",
						  "paymentDate": "2026-06-06",
						  "totalAmount": 3000.00,
						  "paymentMethod": "UPI",
						  "referenceNumber": "UPI-REF-%d",
						  "allocations": [
						    {
						      "demandId": %d,
						      "amount": 3000.00
						    }
						  ]
						}
						""".formatted(sessionId, studentId, studentId, studentId, demandId)))
				.andExpect(status().isCreated())
				.andReturn();
		return readData(payRes).get("id").asLong();
	}

	private void setupAndPublishTimetable(
			Long orgId, Long sessionId, Long classId, Long subjectId, Long teacherId) throws Exception {
		MvcResult cfgRes = mockMvc.perform(post("/api/organizations/{orgId}/timetable-configs", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "Standard 6-Day Schedule",
						  "workingDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
						  "dayStartTime": "08:30",
						  "dayEndTime": "15:00"
						}
						"""))
				.andExpect(status().isCreated())
				.andReturn();
		long configId = readData(cfgRes).get("id").asLong();

		MvcResult periodRes = mockMvc.perform(
				post("/api/organizations/{orgId}/timetable-configs/{cfgId}/periods", orgId, configId)
						.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "Period 1",
								  "periodOrder": 1,
								  "startTime": "09:00",
								  "endTime": "09:45",
								  "periodType": "TEACHING"
								}
								"""))
				.andExpect(status().isCreated())
				.andReturn();
		long periodId = readData(periodRes).get("id").asLong();

		MvcResult ttRes = mockMvc.perform(post("/api/organizations/{orgId}/timetables", orgId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "timetableConfigId": %d,
						  "notes": "Class 6-A Timetable"
						}
						""".formatted(sessionId, classId, configId)))
				.andExpect(status().isCreated())
				.andReturn();
		long ttId = readData(ttRes).get("id").asLong();

		mockMvc.perform(post("/api/organizations/{orgId}/timetables/{ttId}/slots", orgId, ttId)
				.cookie(adminCookie).contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "dayOfWeek": "MONDAY",
						  "periodId": %d,
						  "subjectId": %d,
						  "teacherId": %d,
						  "room": "Room 6"
						}
						""".formatted(periodId, subjectId, teacherId)))
				.andExpect(status().isCreated());

		mockMvc.perform(patch("/api/organizations/{orgId}/timetables/{ttId}/publish", orgId, ttId)
				.cookie(adminCookie))
				.andExpect(status().isOk());
	}

	private JsonNode readData(MvcResult result) throws Exception {
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
	}
}
