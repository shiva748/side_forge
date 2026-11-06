package com.side.forge.organization.examination.entity;

public enum ExaminationStatus {
	DRAFT,
	SCHEDULED,
	IN_PROGRESS,
	COMPLETED,
	PUBLISHED;

	public boolean isEditableConfig() {
		return this == DRAFT || this == SCHEDULED;
	}

	public boolean allowsMarksEntry() {
		return this == SCHEDULED || this == IN_PROGRESS;
	}
}
