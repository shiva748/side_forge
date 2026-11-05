package com.side.forge.organization.student.profile.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.organization.student.profile.dto.CreateStudentRequest;
import com.side.forge.organization.student.profile.dto.StudentResponse;
import com.side.forge.organization.student.profile.entity.Student;

@Mapper(componentModel = "spring")
public interface StudentMapper {

	StudentResponse toResponse(Student student);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "organizationId", ignore = true)
	@Mapping(target = "status", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	Student toEntity(CreateStudentRequest request);
}
