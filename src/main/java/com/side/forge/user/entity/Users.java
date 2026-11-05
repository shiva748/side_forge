package com.side.forge.user.entity;

import com.side.forge.common.persistence.AuditableEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users", uniqueConstraints = {@UniqueConstraint(name = "uk_users_email", columnNames = "email"),
		@UniqueConstraint(name = "uk_users_phone", columnNames = "phone_number")})
@Getter
@Setter
public class Users extends AuditableEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "first_name", nullable = false, length = 100)
	private String firstName;

	@Column(name = "last_name", length = 100)
	private String lastName;

	@Column(length = 255)
	private String email;

	@Column(name = "phone_number", length = 20)
	private String phoneNumber;

	@Column(name = "password_hash", nullable = false, length = 255)
	private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private UserStatus status = UserStatus.ACTIVE;

	@Column(nullable = false)
	private boolean emailVerified = false;

	@Column(nullable = false)
	private boolean phoneVerified = false;
}