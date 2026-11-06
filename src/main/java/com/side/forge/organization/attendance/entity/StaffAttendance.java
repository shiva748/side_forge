package com.side.forge.organization.attendance.entity;

import java.time.LocalDate;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "staff_attendance",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_staff_attendance_org_staff_date",
						columnNames = {"organization_id", "staff_id", "attendance_date"}
				)
		},
		indexes = {
				@Index(name = "idx_staff_attendance_org_date", columnList = "organization_id, attendance_date"),
				@Index(name = "idx_staff_attendance_org_staff_date", columnList = "organization_id, staff_id, attendance_date")
		}
)
@Getter
@Setter
public class StaffAttendance extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "staff_id", nullable = false)
	private Long staffId;

	@Column(name = "attendance_date", nullable = false)
	private LocalDate attendanceDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private StaffAttendanceStatus status;

	@Column(name = "marked_by", nullable = false)
	private Long markedBy;

	@Column(name = "updated_by")
	private Long updatedBy;

	@Column(length = 500)
	private String remarks;
}
