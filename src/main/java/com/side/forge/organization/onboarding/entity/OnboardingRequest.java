package com.side.forge.organization.onboarding.entity;

import com.side.forge.common.persistence.AuditableEntity;
import com.side.forge.organization.entity.BoardAffiliation;
import com.side.forge.organization.entity.CurrentManagementSystem;
import com.side.forge.organization.entity.StudentStrength;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "organization_onboarding_requests")
@Getter
@Setter
public class OnboardingRequest extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	// School information
	@Column(nullable = false, length = 150)
	private String schoolName;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private BoardAffiliation boardAffiliation;

	@Column(nullable = false, length = 255)
	private String schoolEmail;

	@Column(nullable = false, length = 15)
	private String schoolPhone;

	@Column(nullable = false, length = 500)
	private String address;

	@Column(nullable = false, length = 100)
	private String city;

	@Column(nullable = false, length = 100)
	private String state;

	@Column(nullable = false, length = 6)
	private String postalCode;

	// Contact person
	@Column(nullable = false, length = 150)
	private String contactPersonName;

	@Column(nullable = false, length = 100)
	private String designation;

	@Column(nullable = false, length = 255)
	private String contactEmail;

	@Column(nullable = false, length = 15)
	private String mobileNumber;

	// Operational information
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private StudentStrength studentStrength;

	@Column(nullable = false)
	private Integer campusCount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private CurrentManagementSystem managementSystem;

	@Column(columnDefinition = "TEXT")
	private String additionalRequirements;

	// Applicant and approval information
	@Column(name = "requested_by")
	private Long requestedBy;

	@Column(name = "reviewed_by")
	private Long reviewedBy;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OnboardingStatus status = OnboardingStatus.PENDING;

	@Column(columnDefinition = "TEXT")
	private String rejectionReason;
}
