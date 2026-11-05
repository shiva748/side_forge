package com.side.forge.user.service;

import java.util.Locale;
import java.util.Optional;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.side.forge.security.jwt.JwtService;
import com.side.forge.user.dto.LoginUserRequest;
import com.side.forge.user.dto.RegisterUserRequest;
import com.side.forge.user.dto.UserResponse;
import com.side.forge.user.entity.Users;
import com.side.forge.user.mapper.UserMapper;
import com.side.forge.user.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
	private final AuthenticationManager authenticationManager;
	private final JwtService jwtService;
	private final UserRepository userRepository;
	private final UserMapper userMapper;
	private final PasswordEncoder encoder;

	@Transactional
	public UserResponse registerUser(RegisterUserRequest request) {
		String email = normalizeEmail(request.email());
		String phone = normalizePhone(request.phoneNumber());
		Optional<Users> doExist = userRepository.findByEmailOrPhoneNumber(email, phone);
		if (doExist.isPresent()) {
			if (doExist.get().getEmail().equals(email)) {
				throw new DuplicateKeyException("Email already registered");
			} else {
				throw new DuplicateKeyException("Phone number is already registered");
			}
		}
		Users user = userMapper.toEntity(request);
		user.setEmail(email);
		user.setPhoneNumber(phone);
		user.setPasswordHash(encoder.encode(request.password()));
		return userMapper.toResponse(userRepository.save(user));
	}

	public String loginUser(LoginUserRequest request) {
		Authentication authentication = authenticationManager.authenticate(
				new UsernamePasswordAuthenticationToken(normalizeEmail(request.email()), request.password()));
		if (authentication.isAuthenticated()) {
			Optional<Users> user = userRepository.findByEmail(normalizeEmail(request.email()));
			return jwtService.generateToken(user.get());
		} else {
			throw new BadCredentialsException("Bad credentials");
		}
	}

	private String normalizeEmail(String email) {
		return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
	}

	private String normalizePhone(String phone) {
		if (phone == null) {
			return null;
		}

		phone = phone.trim();

		return phone.startsWith("+91") ? phone : "+91" + phone;
	}
}
