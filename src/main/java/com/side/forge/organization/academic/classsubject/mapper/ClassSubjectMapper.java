package com.side.forge.organization.academic.classsubject.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.organization.academic.classsubject.dto.AssignClassSubjectRequest;
import com.side.forge.organization.academic.classsubject.dto.ClassSubjectResponse;
import com.side.forge.organization.academic.classsubject.entity.ClassSubject;

@Mapper(componentModel = "spring")
public interface ClassSubjectMapper {

	ClassSubjectResponse toResponse(ClassSubject classSubject);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "organizationId", ignore = true)
	@Mapping(target = "academicSessionId", ignore = true)
	@Mapping(target = "classId", ignore = true)
	@Mapping(target = "compulsory", ignore = true)
	@Mapping(target = "displayOrder", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	ClassSubject toEntity(AssignClassSubjectRequest request);
}
