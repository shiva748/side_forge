package com.side.forge.notification.util;

import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.side.forge.notification.spi.NotificationDeliveryGateway.NotificationDispatchEvent;

/**
 * Self-contained JSON encoder and lightweight field extractor for real-time WebSocket frames
 * and push gateway payloads (FCM HTTP v1 and APNs HTTP/2).
 */
public final class NotificationJsonCodec {

	private NotificationJsonCodec() {
	}

	public static String escapeJson(String value) {
		if (value == null) {
			return "";
		}
		StringBuilder sb = new StringBuilder(value.length() + 16);
		for (int i = 0; i < value.length(); i++) {
			char c = value.charAt(i);
			switch (c) {
				case '"' -> sb.append("\\\"");
				case '\\' -> sb.append("\\\\");
				case '\b' -> sb.append("\\b");
				case '\f' -> sb.append("\\f");
				case '\n' -> sb.append("\\n");
				case '\r' -> sb.append("\\r");
				case '\t' -> sb.append("\\t");
				default -> {
					if (c < 0x20) {
						sb.append(String.format("\\u%04x", (int) c));
					} else {
						sb.append(c);
					}
				}
			}
		}
		return sb.toString();
	}

	public static String quoteOrNull(String value) {
		return value == null ? "null" : "\"" + escapeJson(value) + "\"";
	}

	public static String numberOrNull(Number value) {
		return value == null ? "null" : value.toString();
	}

	public static String buildWebSocketNotificationFrame(NotificationDispatchEvent event) {
		String createdAtStr = (event.createdAt() != null ? event.createdAt() : Instant.now()).toString();
		return "{"
				+ "\"type\":\"NOTIFICATION\","
				+ "\"organizationId\":" + numberOrNull(event.organizationId()) + ","
				+ "\"notification\":{"
				+ "\"id\":" + numberOrNull(event.notificationId()) + ","
				+ "\"organizationId\":" + numberOrNull(event.organizationId()) + ","
				+ "\"recipientUserId\":" + numberOrNull(event.recipientUserId()) + ","
				+ "\"category\":" + quoteOrNull(event.category() != null ? event.category().name() : null) + ","
				+ "\"type\":" + quoteOrNull(event.type() != null ? event.type().name() : null) + ","
				+ "\"title\":" + quoteOrNull(event.title()) + ","
				+ "\"message\":" + quoteOrNull(event.message()) + ","
				+ "\"resourceType\":" + quoteOrNull(event.resourceType()) + ","
				+ "\"resourceId\":" + numberOrNull(event.resourceId()) + ","
				+ "\"navigationUrl\":" + quoteOrNull(event.navigationUrl()) + ","
				+ "\"read\":false,"
				+ "\"readAt\":null,"
				+ "\"createdAt\":" + quoteOrNull(createdAtStr)
				+ "}"
				+ "}";
	}

	public static String buildWebSocketUnreadCountFrame(Long organizationId, long unreadCount) {
		return "{"
				+ "\"type\":\"UNREAD_COUNT\","
				+ "\"organizationId\":" + numberOrNull(organizationId) + ","
				+ "\"unreadCount\":" + unreadCount
				+ "}";
	}

	public static String buildWebSocketControlFrame(String type, Long organizationId) {
		return "{"
				+ "\"type\":" + quoteOrNull(type) + ","
				+ "\"organizationId\":" + numberOrNull(organizationId)
				+ "}";
	}

	public static String extractStringField(String json, String fieldName) {
		if (json == null || json.isBlank() || fieldName == null) {
			return null;
		}
		Pattern pattern = Pattern.compile(
				"\"" + Pattern.quote(fieldName) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"");
		Matcher matcher = pattern.matcher(json);
		if (!matcher.find()) {
			return null;
		}
		return unescapeJsonString(matcher.group(1));
	}

	public static Long extractLongField(String json, String fieldName) {
		if (json == null || json.isBlank() || fieldName == null) {
			return null;
		}
		Pattern pattern = Pattern.compile(
				"\"" + Pattern.quote(fieldName) + "\"\\s*:\\s*(-?\\d+)");
		Matcher matcher = pattern.matcher(json);
		if (!matcher.find()) {
			return null;
		}
		try {
			return Long.parseLong(matcher.group(1));
		} catch (NumberFormatException ex) {
			return null;
		}
	}

	private static String unescapeJsonString(String raw) {
		if (raw == null || raw.indexOf('\\') < 0) {
			return raw;
		}
		StringBuilder sb = new StringBuilder(raw.length());
		for (int i = 0; i < raw.length(); i++) {
			char c = raw.charAt(i);
			if (c == '\\' && i + 1 < raw.length()) {
				char next = raw.charAt(++i);
				switch (next) {
					case '"' -> sb.append('"');
					case '\\' -> sb.append('\\');
					case '/' -> sb.append('/');
					case 'b' -> sb.append('\b');
					case 'f' -> sb.append('\f');
					case 'n' -> sb.append('\n');
					case 'r' -> sb.append('\r');
					case 't' -> sb.append('\t');
					case 'u' -> {
						if (i + 4 < raw.length()) {
							String hex = raw.substring(i + 1, i + 5);
							try {
								sb.append((char) Integer.parseInt(hex, 16));
								i += 4;
							} catch (NumberFormatException ex) {
								sb.append("\\u").append(hex);
								i += 4;
							}
						}
					}
					default -> sb.append(next);
				}
			} else {
				sb.append(c);
			}
		}
		return sb.toString();
	}
}
