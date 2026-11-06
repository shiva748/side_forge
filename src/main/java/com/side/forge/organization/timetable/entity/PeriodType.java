package com.side.forge.organization.timetable.entity;

public enum PeriodType {
	TEACHING,
	SHORT_BREAK,
	LUNCH_BREAK,
	ASSEMBLY;

	public boolean isTeaching() {
		return this == TEACHING;
	}

	public boolean isBreak() {
		return this == SHORT_BREAK || this == LUNCH_BREAK;
	}
}
