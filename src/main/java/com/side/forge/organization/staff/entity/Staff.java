package com.side.forge.organization.staff.entity;

import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;
import com.side.forge.organization.student.profile.entity.Gender;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "staff",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_staff_org_employee_id", columnNames = {"organization_id", "employee_id"}),
				@UniqueConstraint(name = "uk_staff_org_user_id", columnNames = {"organization_id", "user_id"}),
				@UniqueConstraint(name = "uk_staff_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_staff_org_status", columnList = "organization_id, employment_status"),
				@Index(name = "idx_staff_org_dept_desig", columnList = "organization_id, department, designation"),
				@Index(name = "idx_staff_org_teaching", columnList = "organization_id, is_teaching_staff"),
				@Index(name = "idx_staff_org_name", columnList = "organization_id, first_name, last_name")
		}
)
@Getter
@Setter
public class Staff extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "user_id")
	private Long userId;

	@Column(name = "employee_id", nullable = false, length = 50)
	private String employeeId;

	@Column(name = "first_name", nullable = false, length = 100)
	private String firstName;

	@Column(name = "middle_name", length = 100)
	private String middleName;

	@Column(name = "last_name", length = 100)
	private String lastName;

	@Column(name = "date_of_birth")
	private LocalDate dateOfBirth;

	@Enumerated(EnumType.STRING)
	@Column(length = 20)
	private Gender gender;

	@Column(length = 255)
	private String email;

	@Column(name = "phone_number", nullable = false, length = 20)
	private String phoneNumber;

	@Column(name = "alternate_phone_number", length = 20)
	private String alternatePhoneNumber;

	@Column(length = 500)
	private String address;

	@Column(length = 100)
	private String city;

	@Column(length = 100)
	private String state;

	@Column(name = "postal_code", length = 10)
	private String postalCode;

	@Column(name = "joining_date", nullable = false)
	private LocalDate joiningDate;

	@Column(name = "leaving_date")
	private LocalDate leavingDate;

	@Column(nullable = false, length = 100)
	private String designation;

	@Column(length = 100)
	private String department;

	@Enumerated(EnumType.STRING)
	@Column(name = "employment_type", nullable = false, length = 30)
	private EmploymentType employmentType = EmploymentType.PERMANENT;

	@Enumerated(EnumType.STRING)
	@Column(name = "employment_status", nullable = false, length = 30)
	private EmploymentStatus employmentStatus = EmploymentStatus.ACTIVE;

	@Column(name = "emergency_contact_name", length = 150)
	private String emergencyContactName;

	@Column(name = "emergency_contact_phone", length = 20)
	private String emergencyContactPhone;

	@Column(name = "emergency_contact_relation", length = 50)
	private String emergencyContactRelation;

	@Column(name = "is_teaching_staff", nullable = false)
	private boolean teachingStaff = false;

	@Column(name = "professional_notes", length = 500)
	private String professionalNotes;
}
