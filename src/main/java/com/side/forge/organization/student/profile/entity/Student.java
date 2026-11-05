package com.side.forge.organization.student.profile.entity;

import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

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
		name = "students",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_students_org_admission_number",
						columnNames = {"organization_id", "admission_number"}
				),
				@UniqueConstraint(name = "uk_students_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_students_org_status", columnList = "organization_id, status"),
				@Index(name = "idx_students_org_name", columnList = "organization_id, first_name, last_name")
		}
)
@Getter
@Setter
public class Student extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "user_id")
	private Long userId;

	@Column(name = "admission_number", nullable = false, length = 50)
	private String admissionNumber;

	@Column(name = "first_name", nullable = false, length = 100)
	private String firstName;

	@Column(name = "middle_name", length = 100)
	private String middleName;

	@Column(name = "last_name", length = 100)
	private String lastName;

	@Column(name = "date_of_birth", nullable = false)
	private LocalDate dateOfBirth;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Gender gender;

	@Column(length = 255)
	private String email;

	@Column(name = "phone_number", length = 20)
	private String phoneNumber;

	@Column(length = 500)
	private String address;

	@Column(length = 100)
	private String city;

	@Column(length = 100)
	private String state;

	@Column(name = "postal_code", length = 10)
	private String postalCode;

	@Column(name = "admission_date", nullable = false)
	private LocalDate admissionDate;

	@Column(name = "blood_group", length = 10)
	private String bloodGroup;

	@Column(length = 60)
	private String nationality;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private StudentStatus status = StudentStatus.ACTIVE;
}
