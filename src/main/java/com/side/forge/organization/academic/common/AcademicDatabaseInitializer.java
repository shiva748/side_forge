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

	private record PermissionSeed(PermissionCode code, String name, String description) {
	}

	private static final List<PermissionSeed> ACADEMIC_PERMISSIONS = List.of(
			new PermissionSeed(PermissionCode.ACADEMIC_SESSION_VIEW, "View academic sessions",
					"View organization academic sessions"),
			new PermissionSeed(PermissionCode.ACADEMIC_SESSION_MANAGE, "Manage academic sessions",
					"Create, start and complete academic sessions"),
			new PermissionSeed(PermissionCode.CLASS_VIEW, "View classes", "View classes and sections"),
			new PermissionSeed(PermissionCode.CLASS_MANAGE, "Manage classes", "Create and manage classes and sections"),
			new PermissionSeed(PermissionCode.SECTION_VIEW, "View sections",
					"View class sections within academic sessions"),
			new PermissionSeed(PermissionCode.SECTION_MANAGE, "Manage sections",
					"Create, update and deactivate class sections"),
			new PermissionSeed(PermissionCode.SUBJECT_VIEW, "View subjects",
					"View reusable organization subjects"),
			new PermissionSeed(PermissionCode.SUBJECT_MANAGE, "Manage subjects",
					"Create, update and deactivate organization subjects"),
			new PermissionSeed(PermissionCode.CLASS_SUBJECT_VIEW, "View class subjects",
					"View subject assignments for classes in academic sessions"),
			new PermissionSeed(PermissionCode.CLASS_SUBJECT_MANAGE, "Manage class subjects",
					"Assign and remove subjects for classes in academic sessions")
	);

	private static final Map<String, List<PermissionCode>> ROLE_PERMISSION_MAPPINGS = Map.of(
			"SCHOOL_ADMIN", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.ACADEMIC_SESSION_MANAGE,
					PermissionCode.CLASS_VIEW, PermissionCode.CLASS_MANAGE,
					PermissionCode.SECTION_VIEW, PermissionCode.SECTION_MANAGE,
					PermissionCode.SUBJECT_VIEW, PermissionCode.SUBJECT_MANAGE,
					PermissionCode.CLASS_SUBJECT_VIEW, PermissionCode.CLASS_SUBJECT_MANAGE),
			"PRINCIPAL", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.ACADEMIC_SESSION_MANAGE,
					PermissionCode.CLASS_VIEW, PermissionCode.CLASS_MANAGE,
					PermissionCode.SECTION_VIEW, PermissionCode.SECTION_MANAGE,
					PermissionCode.SUBJECT_VIEW, PermissionCode.SUBJECT_MANAGE,
					PermissionCode.CLASS_SUBJECT_VIEW, PermissionCode.CLASS_SUBJECT_MANAGE),
			"TEACHER", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SECTION_VIEW, PermissionCode.SUBJECT_VIEW,
					PermissionCode.CLASS_SUBJECT_VIEW),
			"SCHOOL_STAFF", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SECTION_VIEW, PermissionCode.SUBJECT_VIEW,
					PermissionCode.CLASS_SUBJECT_VIEW),
			"ACCOUNTANT", List.of(
					PermissionCode.ACADEMIC_SESSION_VIEW, PermissionCode.CLASS_VIEW,
					PermissionCode.SECTION_VIEW)
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
				SELECT :code, :name, 'ACADEMICS', :description, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
				WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = :code)
				""";
		for (PermissionSeed seed : ACADEMIC_PERMISSIONS) {
			jdbc.update(sql, Map.of(
					"code", seed.code().getValue(),
					"name", seed.name(),
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
