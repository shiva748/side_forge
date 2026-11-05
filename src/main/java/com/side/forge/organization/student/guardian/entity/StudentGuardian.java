package com.side.forge.organization.student.guardian.entity;

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
		name = "student_guardians",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_student_guardians_org_student_guardian",
						columnNames = {"organization_id", "student_id", "guardian_id"}
				)
		},
		indexes = {
				@Index(name = "idx_student_guardians_org_student", columnList = "organization_id, student_id"),
				@Index(name = "idx_student_guardians_org_guardian", columnList = "organization_id, guardian_id")
		}
)
@Getter
@Setter
public class StudentGuardian extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "student_id", nullable = false)
	private Long studentId;

	@Column(name = "guardian_id", nullable = false)
	private Long guardianId;

	@Enumerated(EnumType.STRING)
	@Column(name = "relationship_type", nullable = false, length = 20)
	private GuardianRelationshipType relationshipType;

	@Column(name = "primary_contact", nullable = false)
	private boolean primaryContact = false;

	@Column(name = "emergency_contact", nullable = false)
	private boolean emergencyContact = false;

	@Column(name = "receive_notifications", nullable = false)
	private boolean receiveNotifications = true;
}
