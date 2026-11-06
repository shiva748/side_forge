package com.side.forge.organization.teacher.entity;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
		name = "teachers",
		uniqueConstraints = {
				@UniqueConstraint(name = "uk_teachers_org_staff", columnNames = {"organization_id", "staff_id"}),
				@UniqueConstraint(name = "uk_teachers_id_org", columnNames = {"id", "organization_id"})
		},
		indexes = {
				@Index(name = "idx_teachers_org_available", columnList = "organization_id, available_for_assignment"),
				@Index(name = "idx_teachers_org_specialization", columnList = "organization_id, specialization")
		}
)
@Getter
@Setter
public class TeacherProfile extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "staff_id", nullable = false)
	private Long staffId;

	@Column(length = 500)
	private String qualifications;

	@Column(length = 255)
	private String specialization;

	@Column(name = "experience_years")
	private Integer experienceYears = 0;

	@Column(name = "registration_number", length = 100)
	private String registrationNumber;

	@Column(length = 500)
	private String certifications;

	@Column(name = "teaching_notes", length = 500)
	private String teachingNotes;

	@Column(name = "available_for_assignment", nullable = false)
	private boolean availableForAssignment = true;
}
