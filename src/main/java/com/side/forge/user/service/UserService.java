package com.side.forge.user.service;

import java.util.Objects;
import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.side.forge.user.dto.UserResponse;
import com.side.forge.user.entity.Users;
import com.side.forge.user.mapper.UserMapper;
import com.side.forge.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

	private final UserRepository userRepository;
	private final UserMapper userMapper;

	public UserResponse getProfile(Authentication authentication) {
		Optional<Users> user = userRepository.findById((Long) Objects.requireNonNull(authentication.getPrincipal()));
		if (user.isPresent())
			return userMapper.toResponse(user.get());
		throw new UsernameNotFoundException("User Not found");
	}
}
