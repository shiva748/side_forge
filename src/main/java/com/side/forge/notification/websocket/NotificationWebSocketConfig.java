package com.side.forge.notification.websocket;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocket
@ConditionalOnProperty(
		prefix = "forge.notification.ws",
		name = "enabled",
		havingValue = "true",
		matchIfMissing = true
)
@RequiredArgsConstructor
public class NotificationWebSocketConfig implements WebSocketConfigurer {

	private final NotificationWebSocketHandler webSocketHandler;
	private final NotificationWebSocketHandshakeInterceptor handshakeInterceptor;

	@Value("${forge.notification.ws.endpoint:/ws/notifications}")
	private String wsEndpoint;

	@Value("${forge.notification.ws.allowed-origins:*}")
	private String allowedOriginsCsv;

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		String[] originPatterns = Arrays.stream(allowedOriginsCsv.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.toArray(String[]::new);
		if (originPatterns.length == 0) {
			originPatterns = new String[] {"*"};
		}
		registry.addHandler(webSocketHandler, wsEndpoint)
				.addInterceptors(handshakeInterceptor)
				.setAllowedOriginPatterns(originPatterns);
	}
}
