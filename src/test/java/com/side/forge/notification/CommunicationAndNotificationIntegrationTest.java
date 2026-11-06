package com.side.forge.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
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
import com.side.forge.notification.repository.InAppNotificationRepository;
import com.side.forge.organization.entity.*;
import com.side.forge.organization.repository.OrganizationRepository;
import com.side.forge.security.jwt.JwtService;
import com.side.forge.storage.repository.StoredFileRepository;
import com.side.forge.user.entity.UserStatus;
import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@AutoConfigureMockMvc
class CommunicationAndNotificationIntegrationTest {

	private static final AtomicInteger COUNTER = new AtomicInteger(9000);

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
	private InAppNotificationRepository notificationRepository;

	@Autowired
	private StoredFileRepository storedFileRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private JwtService jwtService;

	private Organization orgA;
	private Organization orgB;
	private Users adminA;
	private Users teacher1User;
	private Users student1User;
	private Users parent1User;
	private Users student2User;
	private Users accountantA;
	private Users adminB;

	private Cookie adminOrgACookie;
	private Cookie teacher1Cookie;
	private Cookie student1Cookie;
	private Cookie parent1Cookie;
	private Cookie student2Cookie;
	private Cookie accountantCookie;
	private Cookie adminOrgBCookie;

	private long sessionId;
	private long class1Id;
	private long class2Id;
	private long mathSubjectId;
	private long teacher1ProfileId;
	private long student1Id;
	private long student2Id;
	private long parent1GuardianId;

	@BeforeEach
	void setUp() throws Exception {
		cleanTables();

		orgA = createOrganization("Comm Notif Org A", OrganizationStatus.ACTIVE);
		orgB = createOrganization("Comm Notif Org B", OrganizationStatus.ACTIVE);

		adminA = createUser("cnAdminA");
		assignOrgRole(adminA.getId(), orgA.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgACookie = jwtCookie(adminA);

		teacher1User = createUser("cnTeacher1");
		assignOrgRole(teacher1User.getId(), orgA.getId(), "TEACHER", MembershipStatus.ACTIVE);
		teacher1Cookie = jwtCookie(teacher1User);

		student1User = createUser("cnStudent1");
		assignOrgRole(student1User.getId(), orgA.getId(), "STUDENT", MembershipStatus.ACTIVE);
		student1Cookie = jwtCookie(student1User);

		parent1User = createUser("cnParent1");
		assignOrgRole(parent1User.getId(), orgA.getId(), "PARENT", MembershipStatus.ACTIVE);
		parent1Cookie = jwtCookie(parent1User);

		student2User = createUser("cnStudent2");
		assignOrgRole(student2User.getId(), orgA.getId(), "STUDENT", MembershipStatus.ACTIVE);
		student2Cookie = jwtCookie(student2User);

		accountantA = createUser("cnAccountantA");
		assignOrgRole(accountantA.getId(), orgA.getId(), "ACCOUNTANT", MembershipStatus.ACTIVE);
		accountantCookie = jwtCookie(accountantA);

		adminB = createUser("cnAdminB");
		assignOrgRole(adminB.getId(), orgB.getId(), "SCHOOL_ADMIN", MembershipStatus.ACTIVE);
		adminOrgBCookie = jwtCookie(adminB);

		// Setup Academic Session, Class 1 & Class 2, Math Subject, Teacher 1 -> Class 1 Math, Student 1 (+ Parent 1) in Class 1, Student 2 in Class 2
		sessionId = createActiveSession(orgA.getId(), "2026-2027");
		class1Id = createSchoolClass(orgA.getId(), "Grade 10-A", "G10A", 1);
		class2Id = createSchoolClass(orgA.getId(), "Grade 10-B", "G10B", 2);
		mathSubjectId = createSubject(orgA.getId(), "Mathematics", "MATH10");
		assignSubjectToClass(orgA.getId(), sessionId, class1Id, mathSubjectId);
		assignSubjectToClass(orgA.getId(), sessionId, class2Id, mathSubjectId);

		teacher1ProfileId = createTeacherWithUserInOrg(orgA.getId(), teacher1User.getId(), "EMP-CN-1", "Ananya", "Verma", "9810010001");
		assignTeacherToSubject(orgA.getId(), sessionId, class1Id, mathSubjectId, teacher1ProfileId);

		student1Id = createStudentWithUserAndEnroll(orgA.getId(), sessionId, class1Id, student1User.getId(), "ADM-CN-1", "Kabir");
		parent1GuardianId = createGuardianAndLinkToStudent(orgA.getId(), student1Id, parent1User.getId(), "Rajeev", "9810010002");

		student2Id = createStudentWithUserAndEnroll(orgA.getId(), sessionId, class2Id, student2User.getId(), "ADM-CN-2", "Diya");

		notificationRepository.deleteAll();
	}

	@Test
	void announcementsLifecycleAudienceTargetingAttachmentsAndAuthorizationWorkEndToEnd() throws Exception {
		// 1. Admin creates a DRAFT announcement targeting TEACHERS, attaches a PDF circular, edits it, then publishes
		MvcResult draftRes = mockMvc.perform(post("/api/organizations/{orgId}/announcements", orgA.getId())
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "title": "Faculty Meeting Draft",
						  "description": "Initial agenda for faculty review",
						  "targetAudience": "TEACHERS",
						  "publicationDate": "2026-06-10",
						  "expiryDate": "2026-06-30",
						  "important": true,
						  "publishImmediately": false
						}
						""".formatted(sessionId)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status").value("DRAFT"))
				.andReturn();
		long teacherAnnId = objectMapper.readTree(draftRes.getResponse().getContentAsString())
				.get("data").get("id").asLong();

		// Draft announcement is NOT visible in public list and cannot be viewed by non-creator teacher/student
		mockMvc.perform(get("/api/organizations/{orgId}/announcements", orgA.getId())
				.param("referenceDate", "2026-06-12")
				.cookie(teacher1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(0)));

		mockMvc.perform(get("/api/organizations/{orgId}/announcements/{id}", orgA.getId(), teacherAnnId)
				.cookie(teacher1Cookie))
				.andExpect(status().isForbidden());

		// Upload PDF circular attachment to the announcement
		byte[] circularBytes = "%PDF-1.4 Faculty Circular Agenda".getBytes(StandardCharsets.UTF_8);
		MockMultipartFile circularFile = new MockMultipartFile(
				"file", "faculty_agenda.pdf", "application/pdf", circularBytes);
		MvcResult attachRes = mockMvc.perform(
				multipart("/api/organizations/{orgId}/announcements/{id}/attachments", orgA.getId(), teacherAnnId)
						.file(circularFile)
						.cookie(adminOrgACookie))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.originalFilename").value("faculty_agenda.pdf"))
				.andReturn();
		long circularFileId = objectMapper.readTree(attachRes.getResponse().getContentAsString())
				.get("data").get("id").asLong();

		// Edit announcement title & description before publishing
		mockMvc.perform(put("/api/organizations/{orgId}/announcements/{id}", orgA.getId(), teacherAnnId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "title": "Final Faculty Meeting Circular",
						  "description": "Updated agenda for Monday 3 PM",
						  "targetAudience": "TEACHERS",
						  "publicationDate": "2026-06-10",
						  "expiryDate": "2026-06-30",
						  "important": true
						}
						""".formatted(sessionId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.title").value("Final Faculty Meeting Circular"));

		// Publish the TEACHERS announcement -> notifies Teacher 1, does NOT notify Student 1 or Parent 1
		mockMvc.perform(post("/api/organizations/{orgId}/announcements/{id}/publish", orgA.getId(), teacherAnnId)
				.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("PUBLISHED"));

		// Teacher 1 sees the announcement and can download its attachment
		mockMvc.perform(get("/api/organizations/{orgId}/announcements", orgA.getId())
				.param("referenceDate", "2026-06-12")
				.cookie(teacher1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(1)))
				.andExpect(jsonPath("$.data[0].title").value("Final Faculty Meeting Circular"))
				.andExpect(jsonPath("$.data[0].attachments", hasSize(1)));

		mockMvc.perform(get("/api/organizations/{orgId}/announcements/{id}/attachments/{fileId}",
				orgA.getId(), teacherAnnId, circularFileId)
				.cookie(teacher1Cookie))
				.andExpect(status().isOk())
				.andExpect(content().bytes(circularBytes));

		// Student 1 and Parent 1 do NOT see the TEACHERS announcement and cannot access it or its attachment
		mockMvc.perform(get("/api/organizations/{orgId}/announcements", orgA.getId())
				.param("referenceDate", "2026-06-12")
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(0)));

		mockMvc.perform(get("/api/organizations/{orgId}/announcements/{id}", orgA.getId(), teacherAnnId)
				.cookie(student1Cookie))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/organizations/{orgId}/announcements/{id}/attachments/{fileId}",
				orgA.getId(), teacherAnnId, circularFileId)
				.cookie(parent1Cookie))
				.andExpect(status().isForbidden());

		// 2. Teacher authority restrictions:
		// Teacher 1 CANNOT publish to ALL or unassigned Class 2 (403 Forbidden)
		mockMvc.perform(post("/api/organizations/{orgId}/announcements", orgA.getId())
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "title": "Unauthorized School-Wide Notice",
						  "description": "Should fail",
						  "targetAudience": "ALL",
						  "publishImmediately": true
						}
						""".formatted(sessionId)))
				.andExpect(status().isForbidden());

		mockMvc.perform(post("/api/organizations/{orgId}/announcements", orgA.getId())
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "title": "Unauthorized Class 2 Notice",
						  "description": "Should fail",
						  "targetAudience": "SPECIFIC_CLASSES",
						  "targetClassIds": [%d],
						  "publishImmediately": true
						}
						""".formatted(sessionId, class2Id)))
				.andExpect(status().isForbidden());

		// Teacher 1 CAN create & publish an announcement for their assigned Class 1 (SPECIFIC_CLASSES)
		MvcResult class1AnnRes = mockMvc.perform(post("/api/organizations/{orgId}/announcements", orgA.getId())
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "title": "Grade 10-A Math Quiz Tomorrow",
						  "description": "Bring geometry box",
						  "targetAudience": "SPECIFIC_CLASSES",
						  "targetClassIds": [%d],
						  "publicationDate": "2026-06-10",
						  "expiryDate": "2026-06-20",
						  "publishImmediately": true
						}
						""".formatted(sessionId, class1Id)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data.status").value("PUBLISHED"))
				.andReturn();
		long class1AnnId = objectMapper.readTree(class1AnnRes.getResponse().getContentAsString())
				.get("data").get("id").asLong();

		// Student 1 and Parent 1 (linked to Student 1 in Class 1) see the Class 1 announcement, while Student 2 (in Class 2) does NOT!
		mockMvc.perform(get("/api/organizations/{orgId}/announcements", orgA.getId())
				.param("referenceDate", "2026-06-12")
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(1)))
				.andExpect(jsonPath("$.data[0].id").value(class1AnnId));

		mockMvc.perform(get("/api/organizations/{orgId}/announcements", orgA.getId())
				.param("referenceDate", "2026-06-12")
				.cookie(parent1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(1)))
				.andExpect(jsonPath("$.data[0].id").value(class1AnnId));

		mockMvc.perform(get("/api/organizations/{orgId}/announcements", orgA.getId())
				.param("referenceDate", "2026-06-12")
				.cookie(student2Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(0)));

		// After expiryDate (2026-06-25), the Class 1 announcement is no longer returned in visible announcements
		mockMvc.perform(get("/api/organizations/{orgId}/announcements", orgA.getId())
				.param("referenceDate", "2026-06-25")
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", hasSize(0)));

		// Teacher 1 cannot delete Admin's announcement (403 Forbidden), but Admin can delete it (cleaning up attachment)
		mockMvc.perform(delete("/api/organizations/{orgId}/announcements/{id}", orgA.getId(), teacherAnnId)
				.cookie(teacher1Cookie))
				.andExpect(status().isForbidden());

		mockMvc.perform(delete("/api/organizations/{orgId}/announcements/{id}", orgA.getId(), teacherAnnId)
				.cookie(adminOrgACookie))
				.andExpect(status().isOk());
		assertThat(storedFileRepository.findById(circularFileId)).isEmpty();
	}

	@Test
	void applicationWideNotificationsReadStatusPreferencesAndTenantIsolationWorkEndToEnd() throws Exception {
		// 1. Homework Assigned -> Student 1 and Parent 1 receive HOMEWORK_ASSIGNED notification
		MvcResult hwRes = mockMvc.perform(post("/api/organizations/{orgId}/homework", orgA.getId())
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "subjectId": %d,
						  "teacherId": %d,
						  "title": "Trigonometry Exercise 1",
						  "description": "Solve Q1-Q10",
						  "assignedDate": "2026-06-10",
						  "dueDate": "2026-06-20",
						  "maxMarks": 25.00
						}
						""".formatted(sessionId, class1Id, mathSubjectId, teacher1ProfileId)))
				.andExpect(status().isCreated())
				.andReturn();
		long hwId = objectMapper.readTree(hwRes.getResponse().getContentAsString()).get("data").get("id").asLong();

		mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.param("category", "HOMEWORK")
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1))
				.andExpect(jsonPath("$.data.content[0].type").value("HOMEWORK_ASSIGNED"));

		mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.param("category", "HOMEWORK")
				.cookie(parent1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1))
				.andExpect(jsonPath("$.data.content[0].type").value("HOMEWORK_ASSIGNED"));

		// 2. Student 1 submits homework -> Teacher 1 receives HOMEWORK_SUBMISSION_RECEIVED notification
		MvcResult subRes = mockMvc.perform(post("/api/organizations/{orgId}/homework/{hwId}/submissions", orgA.getId(), hwId)
				.cookie(student1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "submissionText": "Here are my Trigonometry answers",
						  "submissionDate": "2026-06-12"
						}
						"""))
				.andExpect(status().isOk())
				.andReturn();
		long submissionId = objectMapper.readTree(subRes.getResponse().getContentAsString())
				.get("data").get("submissionId").asLong();

		mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.param("category", "HOMEWORK")
				.cookie(teacher1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1))
				.andExpect(jsonPath("$.data.content[0].type").value("HOMEWORK_SUBMISSION_RECEIVED"));

		// 3. Teacher 1 evaluates submission -> Student 1 & Parent 1 receive HOMEWORK_EVALUATED notification
		mockMvc.perform(patch("/api/organizations/{orgId}/homework/{hwId}/submissions/{subId}/evaluate",
				orgA.getId(), hwId, submissionId)
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "marksAwarded": 23.50,
						  "feedback": "Great work"
						}
						"""))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.param("type", "HOMEWORK_EVALUATED")
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1));

		// 4. Attendance: Student 1 marked ABSENT -> Student 1 & Parent 1 receive STUDENT_MARKED_ABSENT notification
		mockMvc.perform(post("/api/organizations/{orgId}/student-attendance", orgA.getId())
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "studentId": %d,
						  "attendanceDate": "2026-06-15",
						  "status": "ABSENT",
						  "remarks": "Uninformed absence"
						}
						""".formatted(sessionId, class1Id, student1Id)))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.param("category", "ATTENDANCE")
				.cookie(parent1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(1))
				.andExpect(jsonPath("$.data.content[0].type").value("STUDENT_MARKED_ABSENT"));

		// 5. Examination: schedule subject & publish results -> Student 1 & Parent 1 receive EXAM_SCHEDULE_PUBLISHED & EXAM_RESULTS_PUBLISHED
		long scaleId = createGradingScale(orgA.getId());
		long examId = createExamination(orgA.getId(), sessionId, class1Id, scaleId, "Mid-Term Exam 2026");
		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{examId}/schedules", orgA.getId(), examId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "subjectId": %d,
						  "examDate": "2026-09-10",
						  "startTime": "09:00",
						  "endTime": "11:00",
						  "maxMarks": 100.00,
						  "passingMarks": 35.00
						}
						""".formatted(mathSubjectId)))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/organizations/{orgId}/examinations/{examId}/marks", orgA.getId(), examId)
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "subjectId": %d,
						  "studentId": %d,
						  "entryStatus": "PRESENT",
						  "marksObtained": 88.00
						}
						""".formatted(mathSubjectId, student1Id)))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/organizations/{orgId}/examinations/{examId}/finalize", orgA.getId(), examId)
				.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		mockMvc.perform(patch("/api/organizations/{orgId}/examinations/{examId}/publish", orgA.getId(), examId)
				.cookie(adminOrgACookie))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.param("category", "EXAMINATION")
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(2));

		// 6. Fees & Finance: publish fee structure & record payment -> FEE_DEMAND_GENERATED, FEE_PAYMENT_RECORDED, FEE_RECEIPT_AVAILABLE
		long structureId = createAndPublishYearlyFeeStructure(orgA.getId(), sessionId, class1Id);
		assertThat(structureId).isPositive();
		long enrollment1Id = getStudentEnrollmentId(orgA.getId(), sessionId, student1Id);
		MvcResult demandsRes = mockMvc.perform(post("/api/organizations/{orgId}/enrollments/{enrId}/generate-fees",
				orgA.getId(), enrollment1Id)
				.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andReturn();
		long demandId = objectMapper.readTree(demandsRes.getResponse().getContentAsString())
				.get("data").get(0).get("id").asLong();

		mockMvc.perform(post("/api/organizations/{orgId}/fee-payments", orgA.getId())
				.cookie(accountantCookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "studentId": %d,
						  "idempotencyKey": "PAY-NOTIF-001",
						  "paymentDate": "2026-06-15",
						  "totalAmount": 5000.00,
						  "paymentMethod": "UPI",
						  "referenceNumber": "UPI-998877",
						  "allocations": [
						    {
						      "demandId": %d,
						      "amount": 5000.00
						    }
						  ]
						}
						""".formatted(sessionId, student1Id, demandId)))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.param("category", "FEES")
				.cookie(parent1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(3));

		// 7. Unread Count, Mark Individual Read, Mark All Read, and Recipient Isolation
		MvcResult unreadRes = mockMvc.perform(get("/api/organizations/{orgId}/notifications/unread-count", orgA.getId())
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andReturn();
		long initialUnread = objectMapper.readTree(unreadRes.getResponse().getContentAsString())
				.get("data").get("unreadCount").asLong();
		assertThat(initialUnread).isEqualTo(8L);

		MvcResult listRes = mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.param("unreadOnly", "true")
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andReturn();
		long firstNotifId = objectMapper.readTree(listRes.getResponse().getContentAsString())
				.get("data").get("content").get(0).get("id").asLong();

		// Student 2 cannot mark Student 1's notification as read (404 Not Found)
		mockMvc.perform(patch("/api/organizations/{orgId}/notifications/{id}/read", orgA.getId(), firstNotifId)
				.cookie(student2Cookie))
				.andExpect(status().isNotFound());

		// Student 1 marks individual notification as read -> unread count decrements to 7
		mockMvc.perform(patch("/api/organizations/{orgId}/notifications/{id}/read", orgA.getId(), firstNotifId)
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.read").value(true));

		mockMvc.perform(get("/api/organizations/{orgId}/notifications/unread-count", orgA.getId())
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.unreadCount").value(7));

		// Mark all notifications as read -> unread count becomes 0
		mockMvc.perform(post("/api/organizations/{orgId}/notifications/read-all", orgA.getId())
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.markedReadCount").value(7));

		mockMvc.perform(get("/api/organizations/{orgId}/notifications/unread-count", orgA.getId())
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.unreadCount").value(0));

		// 8. Notification Preferences: Student 1 disables HOMEWORK notifications, while Parent 1 keeps HOMEWORK enabled
		mockMvc.perform(put("/api/organizations/{orgId}/notification-preferences", orgA.getId())
				.cookie(student1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "preferences": [
						    {
						      "category": "HOMEWORK",
						      "enabled": false
						    }
						  ]
						}
						"""))
				.andExpect(status().isOk());

		// Assign a second homework to Class 1 -> Student 1 gets NO new notification (unreadCount stays 0), while Parent 1 DOES receive it!
		mockMvc.perform(post("/api/organizations/{orgId}/homework", orgA.getId())
				.cookie(teacher1Cookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "subjectId": %d,
						  "teacherId": %d,
						  "title": "Trigonometry Exercise 2",
						  "description": "Solve Q11-Q20",
						  "assignedDate": "2026-06-15",
						  "dueDate": "2026-06-25",
						  "maxMarks": 25.00
						}
						""".formatted(sessionId, class1Id, mathSubjectId, teacher1ProfileId)))
				.andExpect(status().isCreated());

		mockMvc.perform(get("/api/organizations/{orgId}/notifications/unread-count", orgA.getId())
				.cookie(student1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.unreadCount").value(0));

		mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.param("type", "HOMEWORK_ASSIGNED")
				.cookie(parent1Cookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(2));

		// 9. Cross-Tenant Isolation: Admin of Org B cannot access Org A's announcements, notifications, or preferences
		mockMvc.perform(get("/api/organizations/{orgId}/announcements", orgA.getId())
				.cookie(adminOrgBCookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/notifications", orgA.getId())
				.cookie(adminOrgBCookie))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/api/organizations/{orgId}/notification-preferences", orgA.getId())
				.cookie(adminOrgBCookie))
				.andExpect(status().isForbidden());
	}

	private void cleanTables() {
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

	private long createSchoolClass(Long orgId, String name, String code, int order) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/classes", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "%s",
						  "code": "%s",
						  "displayOrder": %d
						}
						""".formatted(name, code, order)))
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
						  "designation": "Senior Teacher",
						  "department": "Academics",
						  "specialization": "Mathematics"
						}
						""".formatted(userId, employeeId, firstName, lastName, phone)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
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

	private long createGuardianAndLinkToStudent(
			Long orgId, Long studentId, Long userId, String firstName, String phone) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/guardians", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "userId": %d,
						  "firstName": "%s",
						  "lastName": "Parent",
						  "phoneNumber": "%s"
						}
						""".formatted(userId, firstName, phone)))
				.andExpect(status().isCreated())
				.andReturn();
		long gId = objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();

		mockMvc.perform(post("/api/organizations/{orgId}/students/{sId}/guardians", orgId, studentId)
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
						""".formatted(gId)))
				.andExpect(status().isCreated());
		return gId;
	}

	private long createGradingScale(Long orgId) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/grading-scales", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "Standard CBSE Scale",
						  "rules": [
						    {"grade": "A", "minPercentage": 80.00, "maxPercentage": 100.00, "gradePoint": 9.0, "passed": true, "displayOrder": 1},
						    {"grade": "B", "minPercentage": 35.00, "maxPercentage": 79.99, "gradePoint": 7.0, "passed": true, "displayOrder": 2},
						    {"grade": "F", "minPercentage": 0.00, "maxPercentage": 34.99, "gradePoint": 0.0, "passed": false, "displayOrder": 3}
						  ]
						}
						"""))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}

	private long createExamination(Long orgId, Long sessionId, Long classId, Long scaleId, String name) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/examinations", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "gradingScaleId": %d,
						  "name": "%s",
						  "examType": "MID_TERM",
						  "startDate": "2026-09-01",
						  "endDate": "2026-09-15"
						}
						""".formatted(sessionId, classId, scaleId, name)))
				.andExpect(status().isCreated())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();
	}

	private long createAndPublishYearlyFeeStructure(Long orgId, Long sessionId, Long classId) throws Exception {
		MvcResult res = mockMvc.perform(post("/api/organizations/{orgId}/fee-structures", orgId)
				.cookie(adminOrgACookie)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "academicSessionId": %d,
						  "classId": %d,
						  "name": "Grade 10 Fee Structure 2026",
						  "effectiveFromDate": "2026-04-01",
						  "components": [
						    {
						      "code": "TUITION_ANNUAL",
						      "name": "Annual Tuition Fee",
						      "category": "TUITION",
						      "frequency": "YEARLY",
						      "amount": 12000.00,
						      "dueDate": "2026-07-15",
						      "mandatory": true,
						      "displayOrder": 1
						    }
						  ]
						}
						""".formatted(sessionId, classId)))
				.andExpect(status().isCreated())
				.andReturn();
		long structureId = objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("id").asLong();

		mockMvc.perform(patch("/api/organizations/{orgId}/fee-structures/{id}/publish", orgId, structureId)
				.cookie(adminOrgACookie))
				.andExpect(status().isOk());
		return structureId;
	}

	private long getStudentEnrollmentId(Long orgId, Long sessionId, Long studentId) throws Exception {
		MvcResult res = mockMvc.perform(get("/api/organizations/{orgId}/enrollments", orgId)
				.param("academicSessionId", String.valueOf(sessionId))
				.param("studentId", String.valueOf(studentId))
				.cookie(adminOrgACookie))
				.andExpect(status().isOk())
				.andReturn();
		return objectMapper.readTree(res.getResponse().getContentAsString())
				.get("data").get("content").get(0).get("id").asLong();
	}
}
