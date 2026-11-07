package com.side.forge.organization.academic.common;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.side.forge.authorization.enums.PermissionCode;
import com.side.forge.platform.saas.service.SubscriptionPlanService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Idempotently seeds predefined system permissions, PLATFORM and ORGANIZATION
 * system roles, default role-permission mappings, default subscription plans,
 * the initial platform administrator account, and composite cross-tenant
 * foreign keys on every application startup.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AcademicDatabaseInitializer implements ApplicationRunner {

	private static final String STARTUP_LOCK_NAME = "side_forge_startup_init";

	private final NamedParameterJdbcTemplate jdbc;
	private final SubscriptionPlanService subscriptionPlanService;
	private final PasswordEncoder passwordEncoder;

	@Value("${forge.bootstrap.admin.email:admin@sideforge.com}")
	private String bootstrapAdminEmail;

	@Value("${forge.bootstrap.admin.password:}")
	private String bootstrapAdminPassword;

	@Value("${forge.bootstrap.admin.first-name:Platform}")
	private String bootstrapAdminFirstName;

	@Value("${forge.bootstrap.admin.last-name:Administrator}")
	private String bootstrapAdminLastName;

	@Value("${forge.bootstrap.admin.phone:+919999999999}")
	private String bootstrapAdminPhone;

	@Value("${forge.bootstrap.admin.role:SYSTEM_ADMIN}")
	private String bootstrapAdminRole;

	private record PermissionSeed(PermissionCode code, String name, String module, String description) {
	}

	private record RoleSeed(String code, String name, String description) {
	}

	private static final List<RoleSeed> PLATFORM_ROLES = List.of(
			new RoleSeed("SYSTEM_ADMIN", "System Administrator", "Full platform and SaaS administration access"),
			new RoleSeed("PLATFORM_ADMIN", "Platform Administrator",
					"Platform operations, onboarding, plans, subscriptions, and entitlements"),
			new RoleSeed("PLATFORM_SUPPORT", "Platform Support",
					"Read-only platform support and troubleshooting access"),
			new RoleSeed("PLATFORM_FINANCE", "Platform Finance",
					"Subscription billing, payment recording, and invoice management")
	);

	private static final List<RoleSeed> ORGANIZATION_ROLES = List.of(
			new RoleSeed("SCHOOL_ADMIN", "School Administrator",
					"Full school administration and management access"),
			new RoleSeed("PRINCIPAL", "Principal",
					"School academic and operational leadership"),
			new RoleSeed("TEACHER", "Teacher",
					"Classroom instruction, attendance, examinations, and homework management"),
			new RoleSeed("ACCOUNTANT", "Accountant",
					"School fee collection, billing, refunds, and financial reporting"),
			new RoleSeed("RECEPTIONIST", "Receptionist",
					"Front-office student inquiries, admissions, and general communication"),
			new RoleSeed("SCHOOL_STAFF", "School Staff",
					"General non-teaching school staff"),
			new RoleSeed("STUDENT", "Student",
					"Enrolled school student"),
			new RoleSeed("PARENT", "Parent / Guardian",
					"Parent or guardian of enrolled student")
	);

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
					"Communicate regarding linked student records"),
			new PermissionSeed(PermissionCode.SCHOOL_VIEW, "View school profile", "SCHOOL",
					"View school profile and general organization settings"),
			new PermissionSeed(PermissionCode.SCHOOL_UPDATE, "Update school profile", "SCHOOL",
					"Update school profile and general organization details"),
			new PermissionSeed(PermissionCode.SCHOOL_SETTINGS_MANAGE, "Manage school settings", "SCHOOL",
					"Configure school-wide operational settings and preferences"),
			new PermissionSeed(PermissionCode.ADMISSION_VIEW, "View admissions", "ADMISSION",
					"View student admission inquiries and applications"),
			new PermissionSeed(PermissionCode.ADMISSION_MANAGE, "Manage admissions", "ADMISSION",
					"Manage student admission inquiries, applications, and pipeline"),
			new PermissionSeed(PermissionCode.LIBRARY_VIEW, "View library", "LIBRARY",
					"View library catalog and circulation records"),
			new PermissionSeed(PermissionCode.LIBRARY_MANAGE, "Manage library", "LIBRARY",
					"Manage library books, inventory, and circulation"),
			new PermissionSeed(PermissionCode.TRANSPORT_VIEW, "View transport", "TRANSPORT",
					"View school transport routes, vehicles, and assignments"),
			new PermissionSeed(PermissionCode.TRANSPORT_MANAGE, "Manage transport", "TRANSPORT",
					"Manage school transport fleet, routes, and student allocations"),
			new PermissionSeed(PermissionCode.PLATFORM_DASHBOARD_VIEW, "View platform dashboard", "PLATFORM",
					"View platform-wide SaaS metrics, revenue, and subscription summaries"),
			new PermissionSeed(PermissionCode.PLATFORM_ORGANIZATION_VIEW, "View all organizations", "PLATFORM",
					"View and search all organizations across the platform"),
			new PermissionSeed(PermissionCode.PLATFORM_ORGANIZATION_MANAGE, "Manage organizations", "PLATFORM",
					"Approve onboarding, suspend, reactivate, and deactivate organizations"),
			new PermissionSeed(PermissionCode.PLATFORM_USER_MANAGE, "Manage platform users", "PLATFORM",
					"Manage platform users"),
			new PermissionSeed(PermissionCode.PLATFORM_ROLE_MANAGE, "Manage platform user roles", "PLATFORM",
					"Assign and revoke platform administrator roles"),
			new PermissionSeed(PermissionCode.PLATFORM_AUDIT_VIEW, "View platform audit logs", "PLATFORM",
					"View platform administration and authorization audit logs"),
			new PermissionSeed(PermissionCode.PLATFORM_PLAN_VIEW, "View subscription plans", "PLATFORM",
					"View SaaS subscription plans and feature matrices"),
			new PermissionSeed(PermissionCode.PLATFORM_PLAN_MANAGE, "Manage subscription plans", "PLATFORM",
					"Create, update, and activate/deactivate SaaS subscription plans"),
			new PermissionSeed(PermissionCode.PLATFORM_SUBSCRIPTION_VIEW, "View organization subscriptions", "PLATFORM",
					"View organization subscription status, limits, and lifecycle history"),
			new PermissionSeed(PermissionCode.PLATFORM_SUBSCRIPTION_MANAGE, "Manage organization subscriptions", "PLATFORM",
					"Assign, upgrade, downgrade, renew, and cancel organization subscriptions"),
			new PermissionSeed(PermissionCode.PLATFORM_BILLING_VIEW, "View subscription billing", "PLATFORM",
					"View organization subscription payments, invoices, and billing summaries"),
			new PermissionSeed(PermissionCode.PLATFORM_BILLING_MANAGE, "Manage subscription billing", "PLATFORM",
					"Record manual subscription payments and generate receipts"),
			new PermissionSeed(PermissionCode.PLATFORM_ENTITLEMENT_MANAGE, "Manage organization entitlements", "PLATFORM",
					"Configure organization-level feature overrides and student limit overrides")
	);

	private static final Map<String, List<PermissionCode>> ROLE_PERMISSION_MAPPINGS = Map.of(
			"SCHOOL_ADMIN", List.of(
					PermissionCode.SCHOOL_VIEW, PermissionCode.SCHOOL_UPDATE, PermissionCode.SCHOOL_SETTINGS_MANAGE,
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
					PermissionCode.ADMISSION_VIEW, PermissionCode.ADMISSION_MANAGE,
					PermissionCode.LIBRARY_VIEW, PermissionCode.LIBRARY_MANAGE,
					PermissionCode.TRANSPORT_VIEW, PermissionCode.TRANSPORT_MANAGE,
					PermissionCode.COMMUNICATION_VIEW, PermissionCode.COMMUNICATION_MANAGE,
					PermissionCode.DASHBOARD_VIEW, PermissionCode.REPORT_VIEW, PermissionCode.REPORT_EXPORT,
					PermissionCode.HOMEWORK_VIEW, PermissionCode.HOMEWORK_MANAGE, PermissionCode.HOMEWORK_EVALUATE),
			"PRINCIPAL", List.of(
					PermissionCode.SCHOOL_VIEW, PermissionCode.SCHOOL_UPDATE,
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
					PermissionCode.ADMISSION_VIEW, PermissionCode.ADMISSION_MANAGE,
					PermissionCode.LIBRARY_VIEW, PermissionCode.TRANSPORT_VIEW,
					PermissionCode.COMMUNICATION_VIEW, PermissionCode.COMMUNICATION_MANAGE,
					PermissionCode.DASHBOARD_VIEW, PermissionCode.REPORT_VIEW, PermissionCode.REPORT_EXPORT,
					PermissionCode.HOMEWORK_VIEW, PermissionCode.HOMEWORK_MANAGE, PermissionCode.HOMEWORK_EVALUATE),
			"RECEPTIONIST", List.of(
					PermissionCode.SCHOOL_VIEW,
					PermissionCode.ADMISSION_VIEW, PermissionCode.ADMISSION_MANAGE,
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

	private static final Map<String, List<PermissionCode>> PLATFORM_ROLE_PERMISSION_MAPPINGS = Map.of(
			"SYSTEM_ADMIN", List.of(
					PermissionCode.PLATFORM_DASHBOARD_VIEW, PermissionCode.PLATFORM_USER_MANAGE,
					PermissionCode.PLATFORM_ORGANIZATION_VIEW, PermissionCode.PLATFORM_ORGANIZATION_MANAGE,
					PermissionCode.PLATFORM_ROLE_MANAGE, PermissionCode.PLATFORM_AUDIT_VIEW,
					PermissionCode.PLATFORM_PLAN_VIEW, PermissionCode.PLATFORM_PLAN_MANAGE,
					PermissionCode.PLATFORM_SUBSCRIPTION_VIEW, PermissionCode.PLATFORM_SUBSCRIPTION_MANAGE,
					PermissionCode.PLATFORM_BILLING_VIEW, PermissionCode.PLATFORM_BILLING_MANAGE,
					PermissionCode.PLATFORM_ENTITLEMENT_MANAGE),
			"PLATFORM_ADMIN", List.of(
					PermissionCode.PLATFORM_DASHBOARD_VIEW, PermissionCode.PLATFORM_USER_MANAGE,
					PermissionCode.PLATFORM_ORGANIZATION_VIEW, PermissionCode.PLATFORM_ORGANIZATION_MANAGE,
					PermissionCode.PLATFORM_ROLE_MANAGE, PermissionCode.PLATFORM_AUDIT_VIEW,
					PermissionCode.PLATFORM_PLAN_VIEW, PermissionCode.PLATFORM_PLAN_MANAGE,
					PermissionCode.PLATFORM_SUBSCRIPTION_VIEW, PermissionCode.PLATFORM_SUBSCRIPTION_MANAGE,
					PermissionCode.PLATFORM_BILLING_VIEW, PermissionCode.PLATFORM_BILLING_MANAGE,
					PermissionCode.PLATFORM_ENTITLEMENT_MANAGE),
			"PLATFORM_SUPPORT", List.of(
					PermissionCode.PLATFORM_DASHBOARD_VIEW,
					PermissionCode.PLATFORM_ORGANIZATION_VIEW,
					PermissionCode.PLATFORM_PLAN_VIEW,
					PermissionCode.PLATFORM_SUBSCRIPTION_VIEW,
					PermissionCode.PLATFORM_BILLING_VIEW,
					PermissionCode.PLATFORM_AUDIT_VIEW),
			"PLATFORM_FINANCE", List.of(
					PermissionCode.PLATFORM_DASHBOARD_VIEW,
					PermissionCode.PLATFORM_ORGANIZATION_VIEW,
					PermissionCode.PLATFORM_PLAN_VIEW,
					PermissionCode.PLATFORM_SUBSCRIPTION_VIEW, PermissionCode.PLATFORM_SUBSCRIPTION_MANAGE,
					PermissionCode.PLATFORM_BILLING_VIEW, PermissionCode.PLATFORM_BILLING_MANAGE)
	);

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		Integer lockAcquired = null;
		try {
			lockAcquired = jdbc.queryForObject(
					"SELECT GET_LOCK(:lockName, 30)",
					Map.of("lockName", STARTUP_LOCK_NAME),
					Integer.class);
			if (lockAcquired == null || lockAcquired != 1) {
				throw new IllegalStateException(
						"Could not acquire database startup initialization lock: " + STARTUP_LOCK_NAME);
			}

			log.info("Starting automatic database initialization check...");
			ensureRolePermissionsTable();
			seedAcademicPermissions();
			seedDefaultRolePermissions();
			seedPlatformRolesAndPermissions();
			seedDefaultSubscriptionPlans();
			seedInitialPlatformAdministrator();
			ensureCompositeForeignKeys();
			log.info("Automatic database initialization completed successfully.");
		} catch (Exception ex) {
			log.error("Automatic database initialization failed: {}", ex.getMessage(), ex);
			throw ex;
		} finally {
			if (lockAcquired != null && lockAcquired == 1) {
				try {
					jdbc.queryForObject(
							"SELECT RELEASE_LOCK(:lockName)",
							Map.of("lockName", STARTUP_LOCK_NAME),
							Integer.class);
				} catch (Exception releaseEx) {
					log.warn("Failed to release startup initialization lock {}: {}",
							STARTUP_LOCK_NAME, releaseEx.getMessage());
				}
			}
		}
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
		int inserted = 0;
		int existing = 0;
		for (PermissionSeed seed : ACADEMIC_PERMISSIONS) {
			int rows = jdbc.update(sql, Map.of(
					"code", seed.code().getValue(),
					"name", seed.name(),
					"module", seed.module(),
					"description", seed.description()));
			if (rows > 0) {
				inserted += rows;
			} else {
				existing++;
			}
		}
		for (PermissionCode code : PermissionCode.values()) {
			int rows = jdbc.update(sql, Map.of(
					"code", code.getValue(),
					"name", code.name().replace('_', ' '),
					"module", code.name().split("_")[0],
					"description", "System permission " + code.getValue()));
			if (rows > 0) {
				inserted += rows;
			}
		}
		log.info("System permissions verified: {} already present, {} newly initialized (total defined: {}).",
				existing, inserted, PermissionCode.values().length);
	}

	private void seedDefaultRolePermissions() {
		int rolesInserted = 0;
		int rolesExisting = 0;
		for (RoleSeed role : ORGANIZATION_ROLES) {
			int rows = seedRoleIfMissing(role.code(), role.name(), "ORGANIZATION", role.description());
			if (rows > 0) {
				rolesInserted += rows;
			} else {
				rolesExisting++;
			}
		}

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
		int mappingsInserted = 0;
		int mappingsExisting = 0;
		for (Map.Entry<String, List<PermissionCode>> entry : ROLE_PERMISSION_MAPPINGS.entrySet()) {
			String roleCode = entry.getKey();
			for (PermissionCode permissionCode : entry.getValue()) {
				int rows = jdbc.update(sql, Map.of(
						"roleCode", roleCode,
						"permissionCode", permissionCode.getValue()));
				if (rows > 0) {
					mappingsInserted += rows;
				} else {
					mappingsExisting++;
				}
			}
		}
		log.info("ORGANIZATION roles verified: {} already present, {} newly initialized. Role-permission mappings: {} already present, {} newly initialized.",
				rolesExisting, rolesInserted, mappingsExisting, mappingsInserted);
	}

	private void seedPlatformRolesAndPermissions() {
		int rolesInserted = 0;
		int rolesExisting = 0;
		for (RoleSeed role : PLATFORM_ROLES) {
			int rows = seedRoleIfMissing(role.code(), role.name(), "PLATFORM", role.description());
			if (rows > 0) {
				rolesInserted += rows;
			} else {
				rolesExisting++;
			}
		}

		String sql = """
				INSERT INTO role_permissions (role_id, permission_id)
				SELECT r.id, p.id
				FROM roles r
				JOIN permissions p ON p.code = :permissionCode
				WHERE r.code = :roleCode
				  AND r.scope = 'PLATFORM'
				  AND r.organization_id IS NULL
				  AND NOT EXISTS (
				      SELECT 1 FROM role_permissions rp
				      WHERE rp.role_id = r.id AND rp.permission_id = p.id
				  )
				""";
		int mappingsInserted = 0;
		int mappingsExisting = 0;
		for (Map.Entry<String, List<PermissionCode>> entry : PLATFORM_ROLE_PERMISSION_MAPPINGS.entrySet()) {
			String roleCode = entry.getKey();
			for (PermissionCode permissionCode : entry.getValue()) {
				int rows = jdbc.update(sql, Map.of(
						"roleCode", roleCode,
						"permissionCode", permissionCode.getValue()));
				if (rows > 0) {
					mappingsInserted += rows;
				} else {
					mappingsExisting++;
				}
			}
		}
		log.info("PLATFORM roles verified: {} already present, {} newly initialized. Role-permission mappings: {} already present, {} newly initialized.",
				rolesExisting, rolesInserted, mappingsExisting, mappingsInserted);
	}

	private int seedRoleIfMissing(String code, String name, String scope, String description) {
		return jdbc.update("""
				INSERT INTO roles (code, name, scope, organization_id, description, is_system_defined, created_at, updated_at)
				SELECT :code, :name, :scope, NULL, :description, 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
				WHERE NOT EXISTS (
				    SELECT 1 FROM roles WHERE code = :code AND scope = :scope AND organization_id IS NULL
				)
				""", Map.of("code", code, "name", name, "scope", scope, "description", description));
	}

	private void seedDefaultSubscriptionPlans() {
		Integer beforeCount = jdbc.queryForObject(
				"SELECT COUNT(*) FROM subscription_plans",
				Map.of(),
				Integer.class);
		subscriptionPlanService.seedDefaultPlansIfMissing();
		Integer afterCount = jdbc.queryForObject(
				"SELECT COUNT(*) FROM subscription_plans",
				Map.of(),
				Integer.class);
		int before = beforeCount != null ? beforeCount : 0;
		int after = afterCount != null ? afterCount : 0;
		log.info("Default subscription plans verified: {} already present, {} newly initialized.",
				before, Math.max(0, after - before));
	}

	private void seedInitialPlatformAdministrator() {
		String email = bootstrapAdminEmail == null ? "" : bootstrapAdminEmail.trim().toLowerCase(Locale.ROOT);
		if (email.isBlank()) {
			throw new IllegalStateException("Bootstrap platform administrator email must not be blank");
		}

		List<Long> existingUserIds = jdbc.queryForList(
				"SELECT id FROM users WHERE LOWER(email) = :email",
				Map.of("email", email),
				Long.class);

		boolean accountCreated = false;
		Long adminUserId;

		if (existingUserIds.isEmpty()) {
			if (bootstrapAdminPassword == null || bootstrapAdminPassword.isBlank()) {
				throw new IllegalStateException(
						"Initial platform administrator account (" + email + ") does not exist and "
								+ "forge.bootstrap.admin.password is not configured.");
			}

			String encodedPassword = passwordEncoder.encode(bootstrapAdminPassword);
			String phoneToUse = (bootstrapAdminPhone != null && !bootstrapAdminPhone.isBlank())
					? bootstrapAdminPhone.trim()
					: null;
			if (phoneToUse != null) {
				Integer phoneConflict = jdbc.queryForObject(
						"SELECT COUNT(*) FROM users WHERE phone_number = :phone",
						Map.of("phone", phoneToUse),
						Integer.class);
				if (phoneConflict != null && phoneConflict > 0) {
					phoneToUse = null;
				}
			}

			MapSqlParameterSource params = new MapSqlParameterSource()
					.addValue("firstName", bootstrapAdminFirstName != null ? bootstrapAdminFirstName.trim() : "Platform")
					.addValue("lastName", bootstrapAdminLastName != null ? bootstrapAdminLastName.trim() : "Administrator")
					.addValue("email", email)
					.addValue("phoneNumber", phoneToUse)
					.addValue("passwordHash", encodedPassword);

			int inserted = jdbc.update("""
					INSERT INTO users (
					    first_name, last_name, email, phone_number, password_hash,
					    status, email_verified, phone_verified, created_at, updated_at
					)
					SELECT :firstName, :lastName, :email, :phoneNumber, :passwordHash,
					       'ACTIVE', 1, 1, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
					WHERE NOT EXISTS (
					    SELECT 1 FROM users WHERE LOWER(email) = :email
					)
					""", params);
			accountCreated = inserted > 0;
			adminUserId = jdbc.queryForObject(
					"SELECT id FROM users WHERE LOWER(email) = :email",
					Map.of("email", email),
					Long.class);
		} else {
			adminUserId = existingUserIds.get(0);
		}

		if (adminUserId == null) {
			throw new IllegalStateException("Failed to resolve user ID for bootstrap platform administrator: " + email);
		}

		String targetRoleCode = (bootstrapAdminRole != null && !bootstrapAdminRole.isBlank())
				? bootstrapAdminRole.trim().toUpperCase(Locale.ROOT)
				: "SYSTEM_ADMIN";

		List<Long> roleIds = jdbc.queryForList("""
				SELECT id FROM roles
				WHERE code = :code AND scope = 'PLATFORM' AND organization_id IS NULL
				""",
				Map.of("code", targetRoleCode),
				Long.class);

		if (roleIds.isEmpty()) {
			throw new IllegalStateException("Platform role '" + targetRoleCode + "' not found during bootstrap admin initialization");
		}

		Long platformRoleId = roleIds.get(0);
		int roleAssigned = jdbc.update("""
				INSERT INTO platform_user_roles (user_id, role_id, assigned_by, assigned_at)
				SELECT :userId, :roleId, :userId, CURRENT_TIMESTAMP(6)
				WHERE NOT EXISTS (
				    SELECT 1 FROM platform_user_roles WHERE user_id = :userId AND role_id = :roleId
				)
				""",
				Map.of("userId", adminUserId, "roleId", platformRoleId));

		log.info("Initial platform administrator ({}) verified: account={}, platformRole={} ({}).",
				email,
				accountCreated ? "CREATED" : "ALREADY_EXISTS",
				targetRoleCode,
				roleAssigned > 0 ? "ASSIGNED" : "ALREADY_ASSIGNED");
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
		addForeignKeyIfAbsent("organization_subscriptions", "fk_org_subs_org",
				"ALTER TABLE organization_subscriptions ADD CONSTRAINT fk_org_subs_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("organization_subscriptions", "fk_org_subs_plan",
				"ALTER TABLE organization_subscriptions ADD CONSTRAINT fk_org_subs_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)");
		addForeignKeyIfAbsent("organization_subscription_history", "fk_org_sub_hist_org",
				"ALTER TABLE organization_subscription_history ADD CONSTRAINT fk_org_sub_hist_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("subscription_payments", "fk_sub_payments_org",
				"ALTER TABLE subscription_payments ADD CONSTRAINT fk_sub_payments_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("subscription_payments", "fk_sub_payments_sub",
				"ALTER TABLE subscription_payments ADD CONSTRAINT fk_sub_payments_sub FOREIGN KEY (subscription_id) REFERENCES organization_subscriptions (id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("organization_feature_entitlements", "fk_org_feat_ent_org",
				"ALTER TABLE organization_feature_entitlements ADD CONSTRAINT fk_org_feat_ent_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE");
		addForeignKeyIfAbsent("organization_status_history", "fk_org_status_hist_org",
				"ALTER TABLE organization_status_history ADD CONSTRAINT fk_org_status_hist_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE");
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
