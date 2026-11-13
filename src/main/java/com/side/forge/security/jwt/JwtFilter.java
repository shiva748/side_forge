package com.side.forge.security.jwt;

import java.io.IOException;
import java.util.Collections;

import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.side.forge.user.entity.UserStatus;
import com.side.forge.user.repository.UserRepository;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter {

	private final JwtService jwtService;
	private final UserRepository userRepository;

	public JwtFilter(JwtService jwtService, UserRepository userRepository) {
		this.jwtService = jwtService;
		this.userRepository = userRepository;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, @NonNull HttpServletResponse response,
			@NonNull FilterChain filterChain) throws ServletException, IOException {

		String path = request.getServletPath();
		if ((path == null || path.isEmpty()) && request.getRequestURI() != null) {
			path = request.getRequestURI();
		}
		if (path != null && (path.startsWith("/api/auth") || path.startsWith("/api/public"))) {
			filterChain.doFilter(request, response);
			return;
		}

		String token = extractJwtFromRequest(request, path);
		if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
			try {
				if (jwtService.validateToken(token)) {
					Long userId = jwtService.extractUserId(token);
					boolean activeUser = userRepository.findById(userId)
							.map(u -> u.getStatus() == UserStatus.ACTIVE)
							.orElse(false);
					if (activeUser) {
						Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(userId, null,
								Collections.emptyList());
						SecurityContextHolder.getContext().setAuthentication(authentication);
					} else {
						SecurityContextHolder.clearContext();
					}
				}
			} catch (JwtException | IllegalArgumentException exception) {
				// Treat malformed/expired tokens as unauthenticated. Protected
				// endpoints will be rejected by Spring Security with HTTP 401.
				SecurityContextHolder.clearContext();
			}
		}

		filterChain.doFilter(request, response);
	}

	private String extractJwtFromRequest(HttpServletRequest request, String path) {
		if (request.getCookies() != null) {
			for (Cookie cookie : request.getCookies()) {
				if ("jwt".equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
					return cookie.getValue().trim();
				}
			}
		}
		String authHeader = request.getHeader("Authorization");
		if (authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
			String bearer = authHeader.substring(7).trim();
			if (!bearer.isEmpty()) {
				return bearer;
			}
		}
		if (path != null && path.startsWith("/ws/")) {
			String queryToken = request.getParameter("token");
			if (queryToken != null && !queryToken.isBlank()) {
				return queryToken.trim();
			}
		}
		return null;
	}
}
