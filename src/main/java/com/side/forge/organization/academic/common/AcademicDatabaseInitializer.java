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
			new PermissionSeed(PermissionCode.STAFF_MANAGE, "Manage staff", "STAFF", "Manage non-teaching staff")
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
					PermissionCode.TEACHER_VIEW, PermissionCode.TEACHER_MANAGE),
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
					PermissionCode.TEACHER_VIEW, PermissionCode.TEACHER_MANAGE),
			"RECEPTIONIST", List.of(
					PermissionCode.STUDENT_VIEW, PermissionCode.STUDENT_CREATE,
					PermissionCode.STUDENT_GUARDIAN_MANAGE,
					PermissionCode.STAFF_VIEW, PermissionCode.TEACHER_VIEW),
			"TEACHER", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SECTION_VIEW, PermissionCode.SUBJECT_VIEW,
					PermissionCode.CLASS_SUBJECT_VIEW, PermissionCode.STUDENT_VIEW,
					PermissionCode.TEACHER_VIEW),
			"SCHOOL_STAFF", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SECTION_VIEW, PermissionCode.SUBJECT_VIEW,
					PermissionCode.CLASS_SUBJECT_VIEW, PermissionCode.STUDENT_VIEW,
					PermissionCode.STAFF_VIEW, PermissionCode.TEACHER_VIEW),
			"ACCOUNTANT", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SECTION_VIEW, PermissionCode.STUDENT_VIEW,
					PermissionCode.STAFF_VIEW, PermissionCode.TEACHER_VIEW)
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
