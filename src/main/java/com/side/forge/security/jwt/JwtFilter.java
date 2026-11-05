package com.side.forge.security.jwt;

import java.io.IOException;
import java.util.Collections;

import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter {

	private final JwtService jwtService;

	public JwtFilter(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, @NonNull HttpServletResponse response,
			@NonNull FilterChain filterChain) throws ServletException, IOException {

		String path = request.getServletPath();
		if (path.startsWith("/api/auth") || path.startsWith("/api/public")) {
			filterChain.doFilter(request, response);
			return;
		}

		String token = extractJwtFromCookies(request);
		if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
			try {
				if (jwtService.validateToken(token)) {
					Long userId = jwtService.extractUserId(token);
					Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(userId, null,
							Collections.emptyList());
					SecurityContextHolder.getContext().setAuthentication(authentication);
				}
			} catch (JwtException | IllegalArgumentException exception) {
				// Treat malformed/expired cookies as unauthenticated. Protected
				// endpoints will be rejected by Spring Security with HTTP 401.
				SecurityContextHolder.clearContext();
			}
		}

		filterChain.doFilter(request, response);
	}

	private String extractJwtFromCookies(HttpServletRequest request) {
		if (request.getCookies() == null) {
			return null;
		}
		for (Cookie cookie : request.getCookies()) {
			if ("jwt".equals(cookie.getName())) {
				return cookie.getValue();
			}
		}
		return null;
	}
}
