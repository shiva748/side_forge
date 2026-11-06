package com.side.forge.organization.academic.common;

import java.util.List;
import java.util.Map;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.enums.PermissionCode;

import lombok.RequiredArgsConstructor;

/**
 * Idempotently seeds Academic Foundation permissions, default role-permission
 * mappings, and composite cross-tenant foreign keys on startup.
 */
@Component
@RequiredArgsConstructor
public class AcademicDatabaseInitializer implements ApplicationRunner {

	private final NamedParameterJdbcTemplate jdbc;

	private record PermissionSeed(PermissionCode code, String name, String module, String description) {
	}

	private static final List<PermissionSeed> ACADEMIC_PERMISSIONS = List.of(
			new PermissionSeed(PermissionCode.ACADEMIC_SESSION_VIEW, "View academic sessions", "ACADEMICS",
					"View organization academic sessions"),
			new PermissionSeed(PermissionCode.ACADEMIC_SESSION_MANAGE, "Manage academic sessions", "ACADEMICS",
					"Create, start and complete academic sessions"),
			new PermissionSeed(PermissionCode.CLASS_VIEW, "View classes", "ACADEMICS", "View classes and sections"),
			new PermissionSeed(PermissionCode.CLASS_MANAGE, "Manage classes", "ACADEMICS",
					"Create and manage classes and sections"),
			new PermissionSeed(PermissionCode.SECTION_VIEW, "View sections", "ACADEMICS",
					"View class sections within academic sessions"),
			new PermissionSeed(PermissionCode.SECTION_MANAGE, "Manage sections", "ACADEMICS",
					"Create, update and deactivate class sections"),
			new PermissionSeed(PermissionCode.SUBJECT_VIEW, "View subjects", "ACADEMICS",
					"View reusable organization subjects"),
			new PermissionSeed(PermissionCode.SUBJECT_MANAGE, "Manage subjects", "ACADEMICS",
					"Create, update and deactivate organization subjects"),
			new PermissionSeed(PermissionCode.CLASS_SUBJECT_VIEW, "View class subjects", "ACADEMICS",
					"View subject assignments for classes in academic sessions"),
			new PermissionSeed(PermissionCode.CLASS_SUBJECT_MANAGE, "Manage class subjects", "ACADEMICS",
					"Assign and remove subjects for classes in academic sessions"),
			new PermissionSeed(PermissionCode.STUDENT_VIEW, "View students", "STUDENT",
					"View students in the current school"),
			new PermissionSeed(PermissionCode.STUDENT_CREATE, "Create students", "STUDENT",
					"Register students"),
			new PermissionSeed(PermissionCode.STUDENT_UPDATE, "Update students", "STUDENT",
					"Update student records"),
			new PermissionSeed(PermissionCode.STUDENT_DELETE, "Delete students", "STUDENT",
					"Delete or archive student records"),
			new PermissionSeed(PermissionCode.STUDENT_ENROLLMENT_MANAGE, "Manage student enrollment", "STUDENT",
					"Enroll and transfer students"),
			new PermissionSeed(PermissionCode.STUDENT_GUARDIAN_MANAGE, "Manage student guardians", "STUDENT",
					"Create and manage parent/guardian records and student associations"),
			new PermissionSeed(PermissionCode.TEACHER_VIEW, "View teachers", "STAFF", "View teacher profiles"),
			new PermissionSeed(PermissionCode.TEACHER_MANAGE, "Manage teachers", "STAFF",
					"Create and update teacher profiles"),
			new PermissionSeed(PermissionCode.STAFF_VIEW, "View staff", "STAFF", "View non-teaching staff"),
			new PermissionSeed(PermissionCode.STAFF_MANAGE, "Manage staff", "STAFF", "Manage non-teaching staff"),
			new PermissionSeed(PermissionCode.TIMETABLE_VIEW, "View timetable", "ACADEMICS", "View class timetables"),
			new PermissionSeed(PermissionCode.TIMETABLE_MANAGE, "Manage timetable", "ACADEMICS",
					"Create and update timetables"),
			new PermissionSeed(PermissionCode.TIMETABLE_PUBLISH, "Publish timetable", "ACADEMICS",
					"Publish and reopen class timetables"),
			new PermissionSeed(PermissionCode.ATTENDANCE_VIEW, "View attendance", "ATTENDANCE",
					"View attendance records"),
			new PermissionSeed(PermissionCode.ATTENDANCE_MARK, "Mark attendance", "ATTENDANCE",
					"Record student attendance"),
			new PermissionSeed(PermissionCode.ATTENDANCE_UPDATE, "Update attendance", "ATTENDANCE",
					"Correct attendance records"),
			new PermissionSeed(PermissionCode.STAFF_ATTENDANCE_VIEW, "View staff attendance", "ATTENDANCE",
					"View staff and teacher attendance records"),
			new PermissionSeed(PermissionCode.STAFF_ATTENDANCE_MANAGE, "Manage staff attendance", "ATTENDANCE",
					"Record and update staff attendance"),
			new PermissionSeed(PermissionCode.EXAM_VIEW, "View exams", "EXAM", "View examinations and schedules"),
			new PermissionSeed(PermissionCode.EXAM_MANAGE, "Manage exams", "EXAM", "Create and manage examinations"),
			new PermissionSeed(PermissionCode.EXAM_ENTER_MARKS, "Enter marks", "EXAM", "Enter student marks"),
			new PermissionSeed(PermissionCode.EXAM_PUBLISH_RESULTS, "Publish results", "EXAM",
					"Publish examination results"),
			new PermissionSeed(PermissionCode.FEES_VIEW, "View fees", "FEES",
					"View fee structures, student demands, receipts, and financial profiles"),
			new PermissionSeed(PermissionCode.FEES_MANAGE, "Manage fees", "FEES",
					"Configure, publish and revise fee structures, concessions, waivers and late fees"),
			new PermissionSeed(PermissionCode.FEES_COLLECT, "Collect fees", "FEES",
					"Record manual fee payments and generate receipts"),
			new PermissionSeed(PermissionCode.FEES_REFUND, "Refund or reverse fees", "FEES",
					"Reverse or refund recorded fee payments"),
			new PermissionSeed(PermissionCode.FEES_REPORT_VIEW, "View fee reports", "FEES",
					"View school financial and fee collection reports"),
			new PermissionSeed(PermissionCode.COMMUNICATION_VIEW, "View notices and communications", "COMMUNICATION",
					"View school notices and announcements"),
			new PermissionSeed(PermissionCode.COMMUNICATION_MANAGE, "Manage notices and communications", "COMMUNICATION",
					"Create and manage school notices and announcements"),
			new PermissionSeed(PermissionCode.DASHBOARD_VIEW, "View dashboards", "REPORT",
					"View role-based school dashboards"),
			new PermissionSeed(PermissionCode.REPORT_VIEW, "View reports", "REPORT", "View permitted school reports"),
			new PermissionSeed(PermissionCode.REPORT_EXPORT, "Export reports", "REPORT",
					"Export and download permitted school reports in CSV, Excel and PDF formats"),
			new PermissionSeed(PermissionCode.HOMEWORK_VIEW, "View homework", "HOMEWORK",
					"View assigned homework and submissions"),
			new PermissionSeed(PermissionCode.HOMEWORK_MANAGE, "Manage homework", "HOMEWORK",
					"Create, update and delete class homework assignments"),
			new PermissionSeed(PermissionCode.HOMEWORK_SUBMIT, "Submit homework", "HOMEWORK",
					"Submit and resubmit assigned student homework"),
			new PermissionSeed(PermissionCode.HOMEWORK_EVALUATE, "Evaluate homework", "HOMEWORK",
					"Review and evaluate student homework submissions"),
			new PermissionSeed(PermissionCode.PARENT_CHILD_VIEW, "View child records", "PARENT",
					"View linked child academic, attendance, fee, and homework records"),
			new PermissionSeed(PermissionCode.PARENT_CHILD_COMMUNICATION, "Parent communication", "PARENT",
					"Communicate regarding linked student records")
	);

	private static final Map<String, List<PermissionCode>> ROLE_PERMISSION_MAPPINGS = Map.of(
			"SCHOOL_ADMIN", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.ACADEMIC_SESSION_MANAGE,
					PermissionCode.CLASS_VIEW, PermissionCode.CLASS_MANAGE,
					PermissionCode.SECTION_VIEW, PermissionCode.SECTION_MANAGE,
					PermissionCode.SUBJECT_VIEW, PermissionCode.SUBJECT_MANAGE,
					PermissionCode.CLASS_SUBJECT_VIEW, PermissionCode.CLASS_SUBJECT_MANAGE,
					PermissionCode.STUDENT_VIEW, PermissionCode.STUDENT_CREATE,
					PermissionCode.STUDENT_UPDATE, PermissionCode.STUDENT_DELETE,
					PermissionCode.STUDENT_ENROLLMENT_MANAGE, PermissionCode.STUDENT_GUARDIAN_MANAGE,
					PermissionCode.STAFF_VIEW, PermissionCode.STAFF_MANAGE,
					PermissionCode.TEACHER_VIEW, PermissionCode.TEACHER_MANAGE,
					PermissionCode.TIMETABLE_VIEW, PermissionCode.TIMETABLE_MANAGE, PermissionCode.TIMETABLE_PUBLISH,
					PermissionCode.ATTENDANCE_VIEW, PermissionCode.ATTENDANCE_MARK, PermissionCode.ATTENDANCE_UPDATE,
					PermissionCode.STAFF_ATTENDANCE_VIEW, PermissionCode.STAFF_ATTENDANCE_MANAGE,
					PermissionCode.EXAM_VIEW, PermissionCode.EXAM_MANAGE,
					PermissionCode.EXAM_ENTER_MARKS, PermissionCode.EXAM_PUBLISH_RESULTS,
					PermissionCode.FEES_VIEW, PermissionCode.FEES_MANAGE,
					PermissionCode.FEES_COLLECT, PermissionCode.FEES_REFUND, PermissionCode.FEES_REPORT_VIEW,
					PermissionCode.COMMUNICATION_VIEW, PermissionCode.COMMUNICATION_MANAGE,
					PermissionCode.DASHBOARD_VIEW, PermissionCode.REPORT_VIEW, PermissionCode.REPORT_EXPORT,
					PermissionCode.HOMEWORK_VIEW, PermissionCode.HOMEWORK_MANAGE, PermissionCode.HOMEWORK_EVALUATE),
			"PRINCIPAL", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.ACADEMIC_SESSION_MANAGE,
					PermissionCode.CLASS_VIEW, PermissionCode.CLASS_MANAGE,
					PermissionCode.SECTION_VIEW, PermissionCode.SECTION_MANAGE,
					PermissionCode.SUBJECT_VIEW, PermissionCode.SUBJECT_MANAGE,
					PermissionCode.CLASS_SUBJECT_VIEW, PermissionCode.CLASS_SUBJECT_MANAGE,
					PermissionCode.STUDENT_VIEW, PermissionCode.STUDENT_CREATE,
					PermissionCode.STUDENT_UPDATE, PermissionCode.STUDENT_ENROLLMENT_MANAGE,
					PermissionCode.STUDENT_GUARDIAN_MANAGE,
					PermissionCode.STAFF_VIEW, PermissionCode.STAFF_MANAGE,
					PermissionCode.TEACHER_VIEW, PermissionCode.TEACHER_MANAGE,
					PermissionCode.TIMETABLE_VIEW, PermissionCode.TIMETABLE_MANAGE, PermissionCode.TIMETABLE_PUBLISH,
					PermissionCode.ATTENDANCE_VIEW, PermissionCode.ATTENDANCE_MARK, PermissionCode.ATTENDANCE_UPDATE,
					PermissionCode.STAFF_ATTENDANCE_VIEW, PermissionCode.STAFF_ATTENDANCE_MANAGE,
					PermissionCode.EXAM_VIEW, PermissionCode.EXAM_MANAGE,
					PermissionCode.EXAM_ENTER_MARKS, PermissionCode.EXAM_PUBLISH_RESULTS,
					PermissionCode.FEES_VIEW, PermissionCode.FEES_MANAGE,
					PermissionCode.FEES_COLLECT, PermissionCode.FEES_REFUND, PermissionCode.FEES_REPORT_VIEW,
					PermissionCode.COMMUNICATION_VIEW, PermissionCode.COMMUNICATION_MANAGE,
					PermissionCode.DASHBOARD_VIEW, PermissionCode.REPORT_VIEW, PermissionCode.REPORT_EXPORT,
					PermissionCode.HOMEWORK_VIEW, PermissionCode.HOMEWORK_MANAGE, PermissionCode.HOMEWORK_EVALUATE),
			"RECEPTIONIST", List.of(
					PermissionCode.STUDENT_VIEW, PermissionCode.STUDENT_CREATE,
					PermissionCode.STUDENT_GUARDIAN_MANAGE,
					PermissionCode.STAFF_VIEW, PermissionCode.TEACHER_VIEW,
					PermissionCode.TIMETABLE_VIEW, PermissionCode.STAFF_ATTENDANCE_VIEW,
					PermissionCode.FEES_VIEW, PermissionCode.COMMUNICATION_VIEW, PermissionCode.DASHBOARD_VIEW),
			"TEACHER", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SECTION_VIEW, PermissionCode.SUBJECT_VIEW,
					PermissionCode.CLASS_SUBJECT_VIEW, PermissionCode.STUDENT_VIEW,
					PermissionCode.TEACHER_VIEW, PermissionCode.TIMETABLE_VIEW,
					PermissionCode.ATTENDANCE_VIEW, PermissionCode.ATTENDANCE_MARK, PermissionCode.ATTENDANCE_UPDATE,
					PermissionCode.EXAM_VIEW, PermissionCode.EXAM_ENTER_MARKS,
					PermissionCode.COMMUNICATION_VIEW, PermissionCode.COMMUNICATION_MANAGE, PermissionCode.DASHBOARD_VIEW,
					PermissionCode.REPORT_VIEW, PermissionCode.REPORT_EXPORT,
					PermissionCode.HOMEWORK_VIEW, PermissionCode.HOMEWORK_MANAGE, PermissionCode.HOMEWORK_EVALUATE),
			"STUDENT", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SUBJECT_VIEW, PermissionCode.TIMETABLE_VIEW,
					PermissionCode.COMMUNICATION_VIEW, PermissionCode.DASHBOARD_VIEW,
					PermissionCode.HOMEWORK_VIEW, PermissionCode.HOMEWORK_SUBMIT),
			"SCHOOL_STAFF", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SECTION_VIEW, PermissionCode.SUBJECT_VIEW,
					PermissionCode.CLASS_SUBJECT_VIEW, PermissionCode.STUDENT_VIEW,
					PermissionCode.STAFF_VIEW, PermissionCode.TEACHER_VIEW,
					PermissionCode.TIMETABLE_VIEW, PermissionCode.COMMUNICATION_VIEW, PermissionCode.DASHBOARD_VIEW),
			"ACCOUNTANT", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SECTION_VIEW, PermissionCode.STUDENT_VIEW,
					PermissionCode.STAFF_VIEW, PermissionCode.TEACHER_VIEW,
					PermissionCode.STAFF_ATTENDANCE_VIEW,
					PermissionCode.FEES_VIEW, PermissionCode.FEES_COLLECT,
					PermissionCode.FEES_REFUND, PermissionCode.FEES_REPORT_VIEW,
					PermissionCode.COMMUNICATION_VIEW, PermissionCode.DASHBOARD_VIEW,
					PermissionCode.REPORT_VIEW, PermissionCode.REPORT_EXPORT),
			"PARENT", List.of(
					PermissionCode.PARENT_CHILD_VIEW, PermissionCode.PARENT_CHILD_COMMUNICATION,
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SUBJECT_VIEW, PermissionCode.TIMETABLE_VIEW,
					PermissionCode.ATTENDANCE_VIEW, PermissionCode.EXAM_VIEW,
					PermissionCode.FEES_VIEW, PermissionCode.COMMUNICATION_VIEW,
					PermissionCode.DASHBOARD_VIEW, PermissionCode.HOMEWORK_VIEW,
					PermissionCode.HOMEWORK_SUBMIT)
	);

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		ensureRolePermissionsTable();
		seedAcademicPermissions();
		seedDefaultRolePermissions();
		ensureCompositeForeignKeys();
	}

	private void ensureRolePermissionsTable() {
		jdbc.getJdbcTemplate().execute("""
				CREATE TABLE IF NOT EXISTS role_permissions (
				    role_id BIGINT NOT NULL,
				    permission_id BIGINT NOT NULL,
				    PRIMARY KEY (role_id, permission_id),
				    KEY fk_role_permissions_permission (permission_id),
				    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
				    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
				)
				""");
	}

	private void seedAcademicPermissions() {
		String sql = """
				INSERT INTO permissions (code, name, module, description, created_at, updated_at)
				SELECT :code, :name, :module, :description, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
				WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = :code)
				""";
		for (PermissionSeed seed : ACADEMIC_PERMISSIONS) {
			jdbc.update(sql, Map.of(
					"code", seed.code().getValue(),
					"name", seed.name(),
					"module", seed.module(),
					"description", seed.description()));
		}
	}

	private void seedDefaultRolePermissions() {
		jdbc.getJdbcTemplate().execute("""
				INSERT INTO roles (code, name, scope, organization_id, description, is_system_defined, created_at, updated_at)
				SELECT 'STUDENT', 'Student', 'ORGANIZATION', NULL, 'Enrolled school student', 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
				WHERE NOT EXISTS (
				    SELECT 1 FROM roles WHERE code = 'STUDENT' AND scope = 'ORGANIZATION' AND organization_id IS NULL
				)
				""");
		jdbc.getJdbcTemplate().execute("""
				INSERT INTO roles (code, name, scope, organization_id, description, is_system_defined, created_at, updated_at)
				SELECT 'PARENT', 'Parent / Guardian', 'ORGANIZATION', NULL, 'Parent or guardian of enrolled student', 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
				WHERE NOT EXISTS (
				    SELECT 1 FROM roles WHERE code = 'PARENT' AND scope = 'ORGANIZATION' AND organization_id IS NULL
				)
				""");
		String sql = """
				INSERT INTO role_permissions (role_id, permission_id)
				SELECT r.id, p.id
				FROM roles r
				JOIN permissions p ON p.code = :permissionCode
				WHERE r.code = :roleCode
				  AND r.scope = 'ORGANIZATION'
				  AND r.organization_id IS NULL
				  AND NOT EXISTS (
				      SELECT 1 FROM role_permissions rp
				      WHERE rp.role_id = r.id AND rp.permission_id = p.id
				  )
				""";
		for (Map.Entry<String, List<PermissionCode>> entry : ROLE_PERMISSION_MAPPINGS.entrySet()) {
			String roleCode = entry.getKey();
			for (PermissionCode permissionCode : entry.getValue()) {
				jdbc.update(sql, Map.of(
						"roleCode", roleCode,
						"permissionCode", permissionCode.getValue()));
			}
		}
		jdbc.update("""
				DELETE rp FROM role_permissions rp
				JOIN roles r ON r.id = rp.role_id
				JOIN permissions p ON p.id = rp.permission_id
				WHERE p.code = :permCode
				  AND r.scope = 'ORGANIZATION'
				  AND r.code NOT IN ('SCHOOL_ADMIN', 'PRINCIPAL')
				""", Map.of("permCode", PermissionCode.FEES_MANAGE.getValue()));
	}

	private void ensureCompositeForeignKeys() {
		addForeignKeyIfAbsent("academic_sessions", "fk_academic_sessions_org",
				"ALTER TABLE academic_sessions ADD CONSTRAINT fk_academic_sessions_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("classes", "fk_classes_org",
				"ALTER TABLE classes ADD CONSTRAINT fk_classes_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("subjects", "fk_subjects_org",
				"ALTER TABLE subjects ADD CONSTRAINT fk_subjects_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("sections", "fk_sections_org",
				"ALTER TABLE sections ADD CONSTRAINT fk_sections_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("sections", "fk_sections_session_org",
				"ALTER TABLE sections ADD CONSTRAINT fk_sections_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("sections", "fk_sections_class_org",
				"ALTER TABLE sections ADD CONSTRAINT fk_sections_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("class_subjects", "fk_class_subjects_org",
				"ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("class_subjects", "fk_class_subjects_session_org",
				"ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("class_subjects", "fk_class_subjects_class_org",
				"ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("class_subjects", "fk_class_subjects_subject_org",
				"ALTER TABLE class_subjects ADD CONSTRAINT fk_class_subjects_subject_org FOREIGN KEY (subject_id, organization_id) REFERENCES subjects (id, organization_id)");
		addForeignKeyIfAbsent("students", "fk_students_org",
				"ALTER TABLE students ADD CONSTRAINT fk_students_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("students", "fk_students_user",
				"ALTER TABLE students ADD CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL");
		addForeignKeyIfAbsent("guardians", "fk_guardians_org",
				"ALTER TABLE guardians ADD CONSTRAINT fk_guardians_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("guardians", "fk_guardians_user",
				"ALTER TABLE guardians ADD CONSTRAINT fk_guardians_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL");
		addForeignKeyIfAbsent("student_guardians", "fk_student_guardians_org",
				"ALTER TABLE student_guardians ADD CONSTRAINT fk_student_guardians_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("student_guardians", "fk_student_guardians_student_org",
				"ALTER TABLE student_guardians ADD CONSTRAINT fk_student_guardians_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("student_guardians", "fk_student_guardians_guardian_org",
				"ALTER TABLE student_guardians ADD CONSTRAINT fk_student_guardians_guardian_org FOREIGN KEY (guardian_id, organization_id) REFERENCES guardians (id, organization_id)");
		addForeignKeyIfAbsent("student_enrollments", "fk_student_enrollments_org",
				"ALTER TABLE student_enrollments ADD CONSTRAINT fk_student_enrollments_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("student_enrollments", "fk_student_enrollments_student_org",
				"ALTER TABLE student_enrollments ADD CONSTRAINT fk_student_enrollments_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("student_enrollments", "fk_student_enrollments_session_org",
				"ALTER TABLE student_enrollments ADD CONSTRAINT fk_student_enrollments_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("student_enrollments", "fk_student_enrollments_class_org",
				"ALTER TABLE student_enrollments ADD CONSTRAINT fk_student_enrollments_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("staff", "fk_staff_org",
				"ALTER TABLE staff ADD CONSTRAINT fk_staff_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("staff", "fk_staff_user",
				"ALTER TABLE staff ADD CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL");
		addForeignKeyIfAbsent("teachers", "fk_teachers_org",
				"ALTER TABLE teachers ADD CONSTRAINT fk_teachers_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("teachers", "fk_teachers_staff_org",
				"ALTER TABLE teachers ADD CONSTRAINT fk_teachers_staff_org FOREIGN KEY (staff_id, organization_id) REFERENCES staff (id, organization_id)");
		addForeignKeyIfAbsent("teacher_class_assignments", "fk_tca_org",
				"ALTER TABLE teacher_class_assignments ADD CONSTRAINT fk_tca_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("teacher_class_assignments", "fk_tca_session_org",
				"ALTER TABLE teacher_class_assignments ADD CONSTRAINT fk_tca_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("teacher_class_assignments", "fk_tca_class_org",
				"ALTER TABLE teacher_class_assignments ADD CONSTRAINT fk_tca_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("teacher_class_assignments", "fk_tca_teacher_org",
				"ALTER TABLE teacher_class_assignments ADD CONSTRAINT fk_tca_teacher_org FOREIGN KEY (teacher_id, organization_id) REFERENCES teachers (id, organization_id)");
		addForeignKeyIfAbsent("teacher_subject_assignments", "fk_tsa_org",
				"ALTER TABLE teacher_subject_assignments ADD CONSTRAINT fk_tsa_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("teacher_subject_assignments", "fk_tsa_session_org",
				"ALTER TABLE teacher_subject_assignments ADD CONSTRAINT fk_tsa_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("teacher_subject_assignments", "fk_tsa_class_org",
				"ALTER TABLE teacher_subject_assignments ADD CONSTRAINT fk_tsa_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("teacher_subject_assignments", "fk_tsa_subject_org",
				"ALTER TABLE teacher_subject_assignments ADD CONSTRAINT fk_tsa_subject_org FOREIGN KEY (subject_id, organization_id) REFERENCES subjects (id, organization_id)");
		addForeignKeyIfAbsent("teacher_subject_assignments", "fk_tsa_teacher_org",
				"ALTER TABLE teacher_subject_assignments ADD CONSTRAINT fk_tsa_teacher_org FOREIGN KEY (teacher_id, organization_id) REFERENCES teachers (id, organization_id)");
		addForeignKeyIfAbsent("timetable_configs", "fk_tt_configs_org",
				"ALTER TABLE timetable_configs ADD CONSTRAINT fk_tt_configs_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("timetable_periods", "fk_tt_periods_config_org",
				"ALTER TABLE timetable_periods ADD CONSTRAINT fk_tt_periods_config_org FOREIGN KEY (timetable_config_id, organization_id) REFERENCES timetable_configs (id, organization_id)");
		addForeignKeyIfAbsent("class_timetables", "fk_class_tt_session_org",
				"ALTER TABLE class_timetables ADD CONSTRAINT fk_class_tt_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("class_timetables", "fk_class_tt_class_org",
				"ALTER TABLE class_timetables ADD CONSTRAINT fk_class_tt_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("class_timetables", "fk_class_tt_config_org",
				"ALTER TABLE class_timetables ADD CONSTRAINT fk_class_tt_config_org FOREIGN KEY (timetable_config_id, organization_id) REFERENCES timetable_configs (id, organization_id)");
		addForeignKeyIfAbsent("timetable_slots", "fk_tt_slots_timetable_org",
				"ALTER TABLE timetable_slots ADD CONSTRAINT fk_tt_slots_timetable_org FOREIGN KEY (class_timetable_id, organization_id) REFERENCES class_timetables (id, organization_id)");
		addForeignKeyIfAbsent("timetable_slots", "fk_tt_slots_period_org",
				"ALTER TABLE timetable_slots ADD CONSTRAINT fk_tt_slots_period_org FOREIGN KEY (period_id, organization_id) REFERENCES timetable_periods (id, organization_id)");
		addForeignKeyIfAbsent("timetable_slots", "fk_tt_slots_subject_org",
				"ALTER TABLE timetable_slots ADD CONSTRAINT fk_tt_slots_subject_org FOREIGN KEY (subject_id, organization_id) REFERENCES subjects (id, organization_id)");
		addForeignKeyIfAbsent("timetable_slots", "fk_tt_slots_teacher_org",
				"ALTER TABLE timetable_slots ADD CONSTRAINT fk_tt_slots_teacher_org FOREIGN KEY (teacher_id, organization_id) REFERENCES teachers (id, organization_id)");
		addForeignKeyIfAbsent("student_attendance", "fk_stu_att_session_org",
				"ALTER TABLE student_attendance ADD CONSTRAINT fk_stu_att_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("student_attendance", "fk_stu_att_class_org",
				"ALTER TABLE student_attendance ADD CONSTRAINT fk_stu_att_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("student_attendance", "fk_stu_att_student_org",
				"ALTER TABLE student_attendance ADD CONSTRAINT fk_stu_att_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("staff_attendance", "fk_stf_att_staff_org",
				"ALTER TABLE staff_attendance ADD CONSTRAINT fk_stf_att_staff_org FOREIGN KEY (staff_id, organization_id) REFERENCES staff (id, organization_id)");
		addForeignKeyIfAbsent("grading_scales", "fk_grading_scales_org",
				"ALTER TABLE grading_scales ADD CONSTRAINT fk_grading_scales_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("grading_rules", "fk_grading_rules_scale_org",
				"ALTER TABLE grading_rules ADD CONSTRAINT fk_grading_rules_scale_org FOREIGN KEY (grading_scale_id, organization_id) REFERENCES grading_scales (id, organization_id)");
		addForeignKeyIfAbsent("examinations", "fk_exams_session_org",
				"ALTER TABLE examinations ADD CONSTRAINT fk_exams_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("examinations", "fk_exams_class_org",
				"ALTER TABLE examinations ADD CONSTRAINT fk_exams_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("examinations", "fk_exams_scale_org",
				"ALTER TABLE examinations ADD CONSTRAINT fk_exams_scale_org FOREIGN KEY (grading_scale_id, organization_id) REFERENCES grading_scales (id, organization_id)");
		addForeignKeyIfAbsent("exam_schedules", "fk_exam_sch_exam_org",
				"ALTER TABLE exam_schedules ADD CONSTRAINT fk_exam_sch_exam_org FOREIGN KEY (examination_id, organization_id) REFERENCES examinations (id, organization_id)");
		addForeignKeyIfAbsent("exam_schedules", "fk_exam_sch_subject_org",
				"ALTER TABLE exam_schedules ADD CONSTRAINT fk_exam_sch_subject_org FOREIGN KEY (subject_id, organization_id) REFERENCES subjects (id, organization_id)");
		addForeignKeyIfAbsent("exam_marks", "fk_exam_marks_exam_org",
				"ALTER TABLE exam_marks ADD CONSTRAINT fk_exam_marks_exam_org FOREIGN KEY (examination_id, organization_id) REFERENCES examinations (id, organization_id)");
		addForeignKeyIfAbsent("exam_marks", "fk_exam_marks_student_org",
				"ALTER TABLE exam_marks ADD CONSTRAINT fk_exam_marks_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("exam_results", "fk_exam_results_exam_org",
				"ALTER TABLE exam_results ADD CONSTRAINT fk_exam_results_exam_org FOREIGN KEY (examination_id, organization_id) REFERENCES examinations (id, organization_id)");
		addForeignKeyIfAbsent("exam_results", "fk_exam_results_student_org",
				"ALTER TABLE exam_results ADD CONSTRAINT fk_exam_results_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("class_fee_structures", "fk_cfs_session_org",
				"ALTER TABLE class_fee_structures ADD CONSTRAINT fk_cfs_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("class_fee_structures", "fk_cfs_class_org",
				"ALTER TABLE class_fee_structures ADD CONSTRAINT fk_cfs_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("class_fee_structure_components", "fk_cfsc_structure_org",
				"ALTER TABLE class_fee_structure_components ADD CONSTRAINT fk_cfsc_structure_org FOREIGN KEY (fee_structure_id, organization_id) REFERENCES class_fee_structures (id, organization_id)");
		addForeignKeyIfAbsent("student_fee_assignments", "fk_sfa_structure_org",
				"ALTER TABLE student_fee_assignments ADD CONSTRAINT fk_sfa_structure_org FOREIGN KEY (fee_structure_id, organization_id) REFERENCES class_fee_structures (id, organization_id)");
		addForeignKeyIfAbsent("student_fee_assignments", "fk_sfa_student_org",
				"ALTER TABLE student_fee_assignments ADD CONSTRAINT fk_sfa_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("student_fee_concessions", "fk_sfc_student_org",
				"ALTER TABLE student_fee_concessions ADD CONSTRAINT fk_sfc_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("student_fee_demands", "fk_sfd_structure_org",
				"ALTER TABLE student_fee_demands ADD CONSTRAINT fk_sfd_structure_org FOREIGN KEY (fee_structure_id, organization_id) REFERENCES class_fee_structures (id, organization_id)");
		addForeignKeyIfAbsent("student_fee_demands", "fk_sfd_student_org",
				"ALTER TABLE student_fee_demands ADD CONSTRAINT fk_sfd_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("fee_payments", "fk_fp_student_org",
				"ALTER TABLE fee_payments ADD CONSTRAINT fk_fp_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("fee_payment_allocations", "fk_fpa_payment_org",
				"ALTER TABLE fee_payment_allocations ADD CONSTRAINT fk_fpa_payment_org FOREIGN KEY (payment_id, organization_id) REFERENCES fee_payments (id, organization_id)");
		addForeignKeyIfAbsent("fee_payment_allocations", "fk_fpa_demand_org",
				"ALTER TABLE fee_payment_allocations ADD CONSTRAINT fk_fpa_demand_org FOREIGN KEY (demand_id, organization_id) REFERENCES student_fee_demands (id, organization_id)");
		addForeignKeyIfAbsent("school_notices", "fk_school_notices_org",
				"ALTER TABLE school_notices ADD CONSTRAINT fk_school_notices_org FOREIGN KEY (organization_id) REFERENCES organizations (id)");
		addForeignKeyIfAbsent("school_notices", "fk_school_notices_session_org",
				"ALTER TABLE school_notices ADD CONSTRAINT fk_school_notices_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("homework_assignments", "fk_hw_session_org",
				"ALTER TABLE homework_assignments ADD CONSTRAINT fk_hw_session_org FOREIGN KEY (academic_session_id, organization_id) REFERENCES academic_sessions (id, organization_id)");
		addForeignKeyIfAbsent("homework_assignments", "fk_hw_class_org",
				"ALTER TABLE homework_assignments ADD CONSTRAINT fk_hw_class_org FOREIGN KEY (class_id, organization_id) REFERENCES classes (id, organization_id)");
		addForeignKeyIfAbsent("homework_assignments", "fk_hw_subject_org",
				"ALTER TABLE homework_assignments ADD CONSTRAINT fk_hw_subject_org FOREIGN KEY (subject_id, organization_id) REFERENCES subjects (id, organization_id)");
		addForeignKeyIfAbsent("homework_assignments", "fk_hw_teacher_org",
				"ALTER TABLE homework_assignments ADD CONSTRAINT fk_hw_teacher_org FOREIGN KEY (teacher_id, organization_id) REFERENCES teachers (id, organization_id)");
		addForeignKeyIfAbsent("student_homework_submissions", "fk_shs_homework_org",
				"ALTER TABLE student_homework_submissions ADD CONSTRAINT fk_shs_homework_org FOREIGN KEY (homework_id, organization_id) REFERENCES homework_assignments (id, organization_id)");
		addForeignKeyIfAbsent("student_homework_submissions", "fk_shs_student_org",
				"ALTER TABLE student_homework_submissions ADD CONSTRAINT fk_shs_student_org FOREIGN KEY (student_id, organization_id) REFERENCES students (id, organization_id)");
		addForeignKeyIfAbsent("organization_invitations", "fk_org_invitations_org",
				"ALTER TABLE organization_invitations ADD CONSTRAINT fk_org_invitations_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("stored_file_references", "fk_stored_file_refs_file",
				"ALTER TABLE stored_file_references ADD CONSTRAINT fk_stored_file_refs_file FOREIGN KEY (file_id) REFERENCES stored_files (id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("in_app_notifications", "fk_in_app_notif_org",
				"ALTER TABLE in_app_notifications ADD CONSTRAINT fk_in_app_notif_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("announcements", "fk_announcements_org",
				"ALTER TABLE announcements ADD CONSTRAINT fk_announcements_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("announcement_target_classes", "fk_ann_target_classes_ann",
				"ALTER TABLE announcement_target_classes ADD CONSTRAINT fk_ann_target_classes_ann FOREIGN KEY (announcement_id, organization_id) REFERENCES announcements (id, organization_id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("announcement_target_students", "fk_ann_target_students_ann",
				"ALTER TABLE announcement_target_students ADD CONSTRAINT fk_ann_target_students_ann FOREIGN KEY (announcement_id, organization_id) REFERENCES announcements (id, organization_id) ON DELETE CASCADE");
	}

	private void addForeignKeyIfAbsent(String tableName, String constraintName, String alterSql) {
		Integer count = jdbc.queryForObject("""
				SELECT COUNT(*)
				FROM information_schema.TABLE_CONSTRAINTS
				WHERE TABLE_SCHEMA = DATABASE()
				  AND TABLE_NAME = :tableName
				  AND CONSTRAINT_NAME = :constraintName
				""",
				Map.of("tableName", tableName, "constraintName", constraintName),
				Integer.class);
		if (count != null && count == 0) {
			jdbc.getJdbcTemplate().execute(alterSql);
		}
	}
}
