package com.side.forge.organization.staff.entity;

public enum EmploymentStatus {
	ACTIVE,
	INACTIVE,
	ON_LEAVE,
	SUSPENDED,
	RESIGNED,
	TERMINATED;

	public boolean isTerminal() {
		return this == RESIGNED || this == TERMINATED;
	}
}
