package com.side.forge.user.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.user.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@Tag(name = "User", description = "Authenticated user profile operations")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/me")
public class UserController {

	private final UserService userService;

	@GetMapping
	public ResponseEntity<ApiResponse<?>> myProfile(Authentication authentication) {
		return ResponseEntity.status(HttpStatus.OK)
				.body(new ApiResponse<>(true, "Authenticated", userService.getProfile(authentication)));
	}
}
