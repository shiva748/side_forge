package com.side.forge.user.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.user.dto.LoginUserRequest;
import com.side.forge.user.dto.RegisterUserRequest;
import com.side.forge.user.service.AuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@Tag(name = "Authentication", description = "User registration and login")
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;
	@Value("${spring.application.token.expiry}")
	private long tokenExpiry;

	@Value("${forge.security.cookie-secure:true}")
	private boolean cookieSecure;

	@PostMapping("/register")
	public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterUserRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new ApiResponse<>(true, "Account created successfully", authService.registerUser(request)));
	}

	@PostMapping("/login")
	public ResponseEntity<?> login(@Valid @RequestBody LoginUserRequest request) {
		String Token = authService.loginUser(request);
		String secureAttr = cookieSecure ? " Secure;" : "";
		return ResponseEntity.ok()
				.header("Set-Cookie",
						String.format("jwt=%s; Path=/; Max-Age=%d; HttpOnly;%s SameSite=Lax", Token, tokenExpiry, secureAttr))
				.body(new ApiResponse<>(true, "login was successful."));
	}

	@PostMapping("/logout")
	public ResponseEntity<?> logout() {
		String secureAttr = cookieSecure ? " Secure;" : "";
		return ResponseEntity.ok()
				.header("Set-Cookie",
						String.format("jwt=; Path=/; Max-Age=0; HttpOnly;%s SameSite=Lax", secureAttr))
				.body(new ApiResponse<>(true, "Logged out successfully."));
	}
}