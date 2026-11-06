package com.side.forge.organization.attendance.entity;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "attendance_audit_logs",
		indexes = {
				@Index(
						name = "idx_attendance_audit_org_type_record",
						columnList = "organization_id, target_type, attendance_record_id"
				)
		}
)
@Getter
@Setter
public class AttendanceAuditLog {

	public enum TargetType {
		STUDENT,
		STAFF
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Enumerated(EnumType.STRING)
	@Column(name = "target_type", nullable = false, length = 20)
	private TargetType targetType;

	@Column(name = "attendance_record_id", nullable = false)
	private Long attendanceRecordId;

	@Column(name = "target_person_id", nullable = false)
	private Long targetPersonId;

	@Column(name = "attendance_date", nullable = false)
	private LocalDate attendanceDate;

	@Column(name = "previous_status", nullable = false, length = 20)
	private String previousStatus;

	@Column(name = "new_status", nullable = false, length = 20)
	private String newStatus;

	@Column(name = "previous_remarks", length = 500)
	private String previousRemarks;

	@Column(name = "new_remarks", length = 500)
	private String newRemarks;

	@Column(name = "changed_by", nullable = false)
	private Long changedBy;

	@Column(name = "correction_reason", length = 500)
	private String correctionReason;

	@Column(name = "changed_at", nullable = false, updatable = false)
	private Instant changedAt;

	@PrePersist
	void onCreate() {
		if (changedAt == null) {
			changedAt = Instant.now();
		}
	}
}
