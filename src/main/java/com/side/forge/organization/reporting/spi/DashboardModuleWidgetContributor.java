package com.side.forge.organization.reporting.spi;

import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.organization.reporting.dto.DashboardDtos.FutureModuleWidgetResponse;

/**
 * Extensibility SPI allowing future Side_forge modules (e.g., Transport,
 * Library, Homework & Assignments, HR & Payroll, Inventory, Communication)
 * to contribute dashboard widgets without modifying core reporting logic.
 */
public interface DashboardModuleWidgetContributor {

	String getModuleCode();

	String getModuleName();

	boolean isAvailable(Long organizationId);

	FutureModuleWidgetResponse contributeWidget(
			Long organizationId, Long academicSessionId, CurrentUserContext userContext);
}
