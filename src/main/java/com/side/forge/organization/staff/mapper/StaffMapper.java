package com.side.forge.organization.staff.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.organization.staff.dto.CreateStaffRequest;
import com.side.forge.organization.staff.dto.StaffResponse;
import com.side.forge.organization.staff.entity.Staff;

@Mapper(componentModel = "spring")
public interface StaffMapper {

	StaffResponse toResponse(Staff staff);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "organizationId", ignore = true)
	@Mapping(target = "leavingDate", ignore = true)
	@Mapping(target = "employmentStatus", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	Staff toEntity(CreateStaffRequest request);
}
