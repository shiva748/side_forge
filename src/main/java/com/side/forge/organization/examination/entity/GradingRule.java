package com.side.forge.organization.examination.entity;

import java.math.BigDecimal;

import com.side.forge.common.persistence.AuditableEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
		name = "grading_rules",
		uniqueConstraints = {
				@UniqueConstraint(
						name = "uk_grading_rules_scale_grade",
						columnNames = {"organization_id", "grading_scale_id", "grade"}
				)
		},
		indexes = {
				@Index(name = "idx_grading_rules_org_scale", columnList = "organization_id, grading_scale_id")
		}
)
@Getter
@Setter
public class GradingRule extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "grading_scale_id", nullable = false)
	private Long gradingScaleId;

	@Column(nullable = false, length = 10)
	private String grade;

	@Column(name = "min_percentage", nullable = false, precision = 5, scale = 2)
	private BigDecimal minPercentage;

	@Column(name = "max_percentage", nullable = false, precision = 5, scale = 2)
	private BigDecimal maxPercentage;

	@Column(name = "grade_point", precision = 4, scale = 2)
	private BigDecimal gradePoint;

	@Column(nullable = false)
	private boolean passing = true;

	@Column(length = 200)
	private String remarks;
}
