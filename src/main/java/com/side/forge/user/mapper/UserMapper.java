package com.side.forge.user.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.side.forge.user.dto.RegisterUserRequest;
import com.side.forge.user.dto.UserResponse;
import com.side.forge.user.entity.Users;

@Mapper(componentModel = "spring")
public interface UserMapper {

	UserResponse toResponse(Users user);

	@Mapping(target = "id", ignore = true)
	@Mapping(target = "passwordHash", ignore = true)
	@Mapping(target = "status", ignore = true)
	@Mapping(target = "emailVerified", ignore = true)
	@Mapping(target = "phoneVerified", ignore = true)
	@Mapping(target = "createdAt", ignore = true)
	@Mapping(target = "updatedAt", ignore = true)
	Users toEntity(RegisterUserRequest request);
}
