package com.side.forge.organization.academic.subject.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.organization.academic.subject.dto.CreateSubjectRequest;
import com.side.forge.organization.academic.subject.dto.SubjectResponse;
import com.side.forge.organization.academic.subject.entity.Subject;

@Mapper(componentModel = "spring")
public interface SubjectMapper {

	SubjectResponse toResponse(Subject subject);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "organizationId", ignore = true)
	@Mapping(target = "active", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	Subject toEntity(CreateSubjectRequest request);
}
