package com.side.forge.organization.fees.entity;

import java.time.Instant;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "fee_audit_logs",
		indexes = {
				@Index(name = "idx_fal_org_session_student", columnList = "organization_id, academic_session_id, student_id"),
				@Index(name = "idx_fal_org_entity", columnList = "organization_id, entity_type, entity_id")
		}
)
@Getter
@Setter
public class FeeAuditLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "academic_session_id")
	private Long academicSessionId;

	@Column(name = "student_id")
	private Long studentId;

	@Column(name = "entity_type", nullable = false, length = 50)
	private String entityType;

	@Column(name = "entity_id", nullable = false)
	private Long entityId;

	@Column(nullable = false, length = 50)
	private String action;

	@Column(name = "previous_state", length = 1000)
	private String previousState;

	@Column(name = "new_state", length = 1000)
	private String newState;

	@Column(length = 500)
	private String reason;

	@Column(name = "performed_by", nullable = false)
	private Long performedBy;

	@Column(name = "performed_at", nullable = false)
	private Instant performedAt;
}
