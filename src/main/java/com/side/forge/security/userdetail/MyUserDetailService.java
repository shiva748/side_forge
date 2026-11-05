package com.side.forge.security.userdetail;

import java.util.Optional;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.side.forge.user.entity.Users;
import com.side.forge.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MyUserDetailService implements UserDetailsService {

	private final UserRepository userRepository;

	@Override
	public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
		Optional<Users> user = userRepository.findByEmail(email);
		if (user.isPresent()) {
			return User.withUsername(user.get().getEmail()).password(user.get().getPasswordHash())
					.disabled(user.get().getStatus() != com.side.forge.user.entity.UserStatus.ACTIVE).build();
		}
		throw new UsernameNotFoundException("User Not Found");
	}
}
