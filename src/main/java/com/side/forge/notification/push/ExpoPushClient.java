package com.side.forge.notification.push;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.side.forge.notification.spi.NotificationDeliveryGateway.NotificationDispatchEvent;
import com.side.forge.notification.util.NotificationJsonCodec;

import lombok.extern.slf4j.Slf4j;

/**
 * Expo Push API (https://exp.host/--/api/v2/push/send) HTTP client for delivering
 * background notifications when an installation registers an ExponentPushToken[...].
 */
@Slf4j
@Component
public class ExpoPushClient {

	private static final String EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

	@Value("${forge.notification.fcm.android-channel-id:sideforge-default}")
	private String defaultAndroidChannelId;

	private final HttpClient httpClient = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10))
			.build();

	public boolean isExpoPushToken(String token) {
		if (token == null || token.isBlank()) {
			return false;
		}
		String trimmed = token.trim();
		return trimmed.startsWith("ExponentPushToken[") || trimmed.startsWith("ExpoPushToken[");
	}

	public PushSendResult sendPushNotification(String expoPushToken, NotificationDispatchEvent event) {
		if (!isExpoPushToken(expoPushToken)) {
			return PushSendResult.failure(false, "NOT_EXPO_TOKEN", "Token is not an ExpoPushToken");
		}
		try {
			String payload = buildExpoPayload(expoPushToken.trim(), event);
			HttpRequest request = HttpRequest.newBuilder()
					.uri(URI.create(EXPO_PUSH_ENDPOINT))
					.timeout(Duration.ofSeconds(12))
					.header("Accept", "application/json")
					.header("Content-Type", "application/json; charset=UTF-8")
					.POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
					.build();

			HttpResponse<String> response = httpClient.send(
					request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
			int status = response.statusCode();
			String body = response.body() != null ? response.body() : "";

			if (status >= 200 && status < 300 && !body.contains("\"status\":\"error\"")) {
				String receiptId = NotificationJsonCodec.extractStringField(body, "id");
				return PushSendResult.success(receiptId != null ? receiptId : "expo-ok");
			}

			boolean unregistered = body.contains("DeviceNotRegistered");
			return PushSendResult.failure(
					unregistered,
					unregistered ? "DeviceNotRegistered" : "EXPO_HTTP_" + status,
					body);
		} catch (Exception ex) {
			log.warn("Expo push send failed: {}", ex.getMessage());
			return PushSendResult.failure(false, "EXPO_TRANSPORT_ERROR", ex.getMessage());
		}
	}

	private String buildExpoPayload(String token, NotificationDispatchEvent event) {
		String channelId = (defaultAndroidChannelId != null && !defaultAndroidChannelId.isBlank())
				? defaultAndroidChannelId.trim()
				: "sideforge-default";
		StringBuilder sb = new StringBuilder(512);
		sb.append('{');
		sb.append("\"to\":").append(NotificationJsonCodec.quoteOrNull(token)).append(',');
		sb.append("\"title\":").append(NotificationJsonCodec.quoteOrNull(
				event.title() != null ? event.title() : "Side Forge Alert")).append(',');
		sb.append("\"body\":").append(NotificationJsonCodec.quoteOrNull(
				event.message() != null ? event.message() : "You have a new notification.")).append(',');
		sb.append("\"sound\":\"default\",");
		sb.append("\"priority\":\"high\",");
		sb.append("\"channelId\":").append(NotificationJsonCodec.quoteOrNull(channelId)).append(',');
		sb.append("\"data\":{");
		sb.append("\"notificationId\":").append(event.notificationId() != null ? event.notificationId() : 0).append(',');
		sb.append("\"id\":").append(event.notificationId() != null ? event.notificationId() : 0).append(',');
		sb.append("\"organizationId\":").append(event.organizationId() != null ? event.organizationId() : "null").append(',');
		sb.append("\"category\":").append(NotificationJsonCodec.quoteOrNull(
				event.category() != null ? event.category().name() : "GENERAL")).append(',');
		sb.append("\"type\":").append(NotificationJsonCodec.quoteOrNull(
				event.type() != null ? event.type().name() : "GENERAL")).append(',');
		sb.append("\"resourceType\":").append(NotificationJsonCodec.quoteOrNull(event.resourceType())).append(',');
		sb.append("\"resourceId\":").append(event.resourceId() != null ? event.resourceId() : "null").append(',');
		sb.append("\"navigationUrl\":").append(NotificationJsonCodec.quoteOrNull(event.navigationUrl()));
		sb.append("}}");
		return sb.toString();
	}
}
