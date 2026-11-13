package com.side.forge.notification.websocket;

import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import com.side.forge.notification.entity.DevicePlatform;
import com.side.forge.security.jwt.JwtService;
import com.side.forge.user.entity.UserStatus;
import com.side.forge.user.repository.UserRepository;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class NotificationWebSocketHandshakeInterceptor implements HandshakeInterceptor {

	public static final String ATTR_USER_ID = "userId";
	public static final String ATTR_INSTALLATION_ID = "installationId";
	public static final String ATTR_PLATFORM = "platform";
	public static final String ATTR_ORGANIZATION_ID = "organizationId";

	private final JwtService jwtService;
	private final UserRepository userRepository;

	@Override
	public boolean beforeHandshake(
			ServerHttpRequest request,
			ServerHttpResponse response,
			WebSocketHandler wsHandler,
			Map<String, Object> attributes) {
		Long userId = resolveAuthenticatedUserId(request);
		if (userId == null) {
			response.setStatusCode(HttpStatus.UNAUTHORIZED);
			return false;
		}

		String installationId = "ws-default-" + userId;
		DevicePlatform platform = DevicePlatform.ANDROID;
		Long organizationId = null;

		if (request instanceof ServletServerHttpRequest servletReq) {
			HttpServletRequest httpReq = servletReq.getServletRequest();
			String instParam = httpReq.getParameter("installationId");
			if (instParam != null && !instParam.isBlank()) {
				installationId = instParam.trim();
			}
			String platformParam = httpReq.getParameter("platform");
			if (platformParam != null && !platformParam.isBlank()) {
				try {
					platform = DevicePlatform.valueOf(platformParam.trim().toUpperCase(Locale.ROOT));
				} catch (IllegalArgumentException ignored) {
				}
			}
			String orgParam = httpReq.getParameter("organizationId");
			if (orgParam != null && !orgParam.isBlank()) {
				try {
					organizationId = Long.parseLong(orgParam.trim());
				} catch (NumberFormatException ignored) {
				}
			}
		}

		attributes.put(ATTR_USER_ID, userId);
		attributes.put(ATTR_INSTALLATION_ID, installationId);
		attributes.put(ATTR_PLATFORM, platform);
		if (organizationId != null && organizationId > 0) {
			attributes.put(ATTR_ORGANIZATION_ID, organizationId);
		}
		return true;
	}

	@Override
	public void afterHandshake(
			ServerHttpRequest request,
			ServerHttpResponse response,
			WebSocketHandler wsHandler,
			Exception exception) {
		// No-op
	}

	private Long resolveAuthenticatedUserId(ServerHttpRequest request) {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof Long principalId) {
			return principalId;
		}
		if (!(request instanceof ServletServerHttpRequest servletRequest)) {
			return null;
		}
		HttpServletRequest httpReq = servletRequest.getServletRequest();
		String token = extractToken(httpReq);
		if (token == null) {
			return null;
		}
		try {
			if (!jwtService.validateToken(token)) {
				return null;
			}
			Long userId = jwtService.extractUserId(token);
			boolean active = userRepository.findById(userId)
					.map(u -> u.getStatus() == UserStatus.ACTIVE)
					.orElse(false);
			return active ? userId : null;
		} catch (Exception ex) {
			return null;
		}
	}

	private String extractToken(HttpServletRequest req) {
		if (req.getCookies() != null) {
			for (Cookie cookie : req.getCookies()) {
				if ("jwt".equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
					return cookie.getValue().trim();
				}
			}
		}
		String authHeader = req.getHeader("Authorization");
		if (authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
			String bearer = authHeader.substring(7).trim();
			if (!bearer.isEmpty()) {
				return bearer;
			}
		}
		String queryToken = req.getParameter("token");
		if (queryToken != null && !queryToken.isBlank()) {
			return queryToken.trim();
		}
		return null;
	}
}
