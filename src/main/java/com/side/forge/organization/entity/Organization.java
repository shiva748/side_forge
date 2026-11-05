package com.side.forge.organization.entity;

import com.side.forge.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "organizations")
@Getter
@Setter
public class Organization extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 150)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(name = "board_affiliation", nullable = false)
	private BoardAffiliation boardAffiliation;

	@Column(length = 255)
	private String email;

	@Column(name = "phone_number", length = 15)
	private String phoneNumber;

	@Column(nullable = false, length = 500)
	private String address;

	@Column(nullable = false, length = 100)
	private String city;

	@Column(nullable = false, length = 100)
	private String state;

	@Column(nullable = false, length = 6)
	private String postalCode;

	@Column(name = "timezone", nullable = false, length = 64, columnDefinition = "varchar(64) not null default 'Asia/Kolkata'")
	private String timezone = "Asia/Kolkata";

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OrganizationStatus status = OrganizationStatus.PENDING;
}