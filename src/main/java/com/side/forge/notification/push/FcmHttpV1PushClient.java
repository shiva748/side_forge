package com.side.forge.notification.push;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.side.forge.notification.entity.NotificationCategory;
import com.side.forge.notification.spi.NotificationDeliveryGateway.NotificationDispatchEvent;
import com.side.forge.notification.util.NotificationJsonCodec;

import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;

/**
 * Firebase Cloud Messaging (FCM) HTTP v1 API client using Google Service Account OAuth2
 * bearer tokens and JDK HttpClient.
 */
@Slf4j
@Component
public class FcmHttpV1PushClient {

	private static final String FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
	private static final String DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";

	@Value("${forge.notification.fcm.enabled:false}")
	private boolean fcmEnabled;

	@Value("${forge.notification.fcm.project-id:}")
	private String configuredProjectId;

	@Value("${forge.notification.fcm.credentials-path:}")
	private String credentialsPath;

	@Value("${forge.notification.fcm.credentials-json-base64:}")
	private String credentialsJsonBase64;

	@Value("${forge.notification.fcm.android-channel-id:side-forge-general}")
	private String defaultAndroidChannelId;

	private final HttpClient httpClient = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10))
			.build();

	private volatile String cachedAccessToken;
	private volatile Instant cachedTokenExpiresAt = Instant.EPOCH;
	private volatile ServiceAccountCredentials cachedCredentials;

	private record ServiceAccountCredentials(
			String projectId,
			String clientEmail,
			String tokenUri,
			PrivateKey privateKey
	) {
	}

	public boolean isConfiguredAndEnabled() {
		if (!fcmEnabled) {
			return false;
		}
		return loadCredentialsIfPossible() != null;
	}

	public PushSendResult sendPushNotification(String deviceToken, NotificationDispatchEvent event) {
		if (deviceToken == null || deviceToken.isBlank()) {
			return PushSendResult.failure(true, "EMPTY_TOKEN", "Device push token is empty");
		}
		ServiceAccountCredentials creds = loadCredentialsIfPossible();
		if (!fcmEnabled || creds == null) {
			return PushSendResult.failure(false, "FCM_DISABLED", "FCM HTTP v1 is disabled or not configured");
		}

		try {
			String accessToken = getOrRefreshAccessToken(creds);
			String endpoint = "https://fcm.googleapis.com/v1/projects/" + creds.projectId() + "/messages:send";
			String bodyJson = buildFcmV1Payload(deviceToken.trim(), event);

			HttpRequest request = HttpRequest.newBuilder()
					.uri(URI.create(endpoint))
					.timeout(Duration.ofSeconds(12))
					.header("Authorization", "Bearer " + accessToken)
					.header("Content-Type", "application/json; charset=UTF-8")
					.POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8))
					.build();

			HttpResponse<String> response = httpClient.send(
					request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
			int status = response.statusCode();
			String responseBody = response.body() != null ? response.body() : "";

			if (status >= 200 && status < 300) {
				String messageName = NotificationJsonCodec.extractStringField(responseBody, "name");
				return PushSendResult.success(messageName != null ? messageName : "fcm-ok");
			}

			String errorStatus = NotificationJsonCodec.extractStringField(responseBody, "status");
			String errorCode = NotificationJsonCodec.extractStringField(responseBody, "errorCode");
			String errorMessage = NotificationJsonCodec.extractStringField(responseBody, "message");
			String effectiveCode = errorCode != null ? errorCode : (errorStatus != null ? errorStatus : "HTTP_" + status);

			boolean permanentInvalid = status == 404 || status == 410
					|| "UNREGISTERED".equalsIgnoreCase(errorCode)
					|| "UNREGISTERED".equalsIgnoreCase(errorStatus)
					|| (status == 400 && responseBody.contains("not a valid FCM registration token"));

			return PushSendResult.failure(permanentInvalid, effectiveCode, errorMessage);
		} catch (Exception ex) {
			log.warn("FCM HTTP v1 send error for notification {}: {}", event.notificationId(), ex.getMessage());
			return PushSendResult.failure(false, "FCM_EXCEPTION", ex.getMessage());
		}
	}

	private String buildFcmV1Payload(String token, NotificationDispatchEvent event) {
		String channelId = event.category() == NotificationCategory.ANNOUNCEMENT
				? "side-forge-urgent"
				: defaultAndroidChannelId;
		String createdAtStr = (event.createdAt() != null ? event.createdAt() : Instant.now()).toString();
		String collapseKey = "sf_notif_" + (event.organizationId() != null ? event.organizationId() : 0)
				+ "_" + (event.category() != null ? event.category().name() : "GEN");

		return "{"
				+ "\"message\":{"
				+ "\"token\":" + NotificationJsonCodec.quoteOrNull(token) + ","
				+ "\"notification\":{"
				+ "\"title\":" + NotificationJsonCodec.quoteOrNull(event.title()) + ","
				+ "\"body\":" + NotificationJsonCodec.quoteOrNull(event.message())
				+ "},"
				+ "\"data\":{"
				+ "\"notificationId\":" + NotificationJsonCodec.quoteOrNull(String.valueOf(event.notificationId())) + ","
				+ "\"id\":" + NotificationJsonCodec.quoteOrNull(String.valueOf(event.notificationId())) + ","
				+ "\"organizationId\":" + NotificationJsonCodec.quoteOrNull(
						event.organizationId() != null ? String.valueOf(event.organizationId()) : "") + ","
				+ "\"category\":" + NotificationJsonCodec.quoteOrNull(
						event.category() != null ? event.category().name() : "") + ","
				+ "\"type\":" + NotificationJsonCodec.quoteOrNull(
						event.type() != null ? event.type().name() : "") + ","
				+ "\"resourceType\":" + NotificationJsonCodec.quoteOrNull(
						event.resourceType() != null ? event.resourceType() : "") + ","
				+ "\"resourceId\":" + NotificationJsonCodec.quoteOrNull(
						event.resourceId() != null ? String.valueOf(event.resourceId()) : "") + ","
				+ "\"navigationUrl\":" + NotificationJsonCodec.quoteOrNull(
						event.navigationUrl() != null ? event.navigationUrl() : "") + ","
				+ "\"createdAt\":" + NotificationJsonCodec.quoteOrNull(createdAtStr)
				+ "},"
				+ "\"android\":{"
				+ "\"priority\":\"HIGH\","
				+ "\"collapse_key\":" + NotificationJsonCodec.quoteOrNull(collapseKey) + ","
				+ "\"notification\":{"
				+ "\"channel_id\":" + NotificationJsonCodec.quoteOrNull(channelId) + ","
				+ "\"sound\":\"default\""
				+ "}"
				+ "},"
				+ "\"apns\":{"
				+ "\"headers\":{\"apns-priority\":\"10\"},"
				+ "\"payload\":{\"aps\":{\"sound\":\"default\"}}"
				+ "}"
				+ "}"
				+ "}";
	}

	private synchronized String getOrRefreshAccessToken(ServiceAccountCredentials creds) throws Exception {
		Instant now = Instant.now();
		if (cachedAccessToken != null && now.plusSeconds(300).isBefore(cachedTokenExpiresAt)) {
			return cachedAccessToken;
		}
		Instant expiresAt = now.plusSeconds(3600);
		String assertion = Jwts.builder()
				.issuer(creds.clientEmail())
				.audience().add(creds.tokenUri()).and()
				.claim("scope", FCM_SCOPE)
				.issuedAt(Date.from(now))
				.expiration(Date.from(expiresAt))
				.signWith(creds.privateKey(), Jwts.SIG.RS256)
				.compact();

		String form = "grant_type=" + URLEncoder.encode(
				"urn:ietf:params:oauth:grant-type:jwt-bearer", StandardCharsets.UTF_8)
				+ "&assertion=" + URLEncoder.encode(assertion, StandardCharsets.UTF_8);

		HttpRequest req = HttpRequest.newBuilder()
				.uri(URI.create(creds.tokenUri()))
				.timeout(Duration.ofSeconds(10))
				.header("Content-Type", "application/x-www-form-urlencoded")
				.POST(HttpRequest.BodyPublishers.ofString(form, StandardCharsets.UTF_8))
				.build();

		HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
		if (res.statusCode() < 200 || res.statusCode() >= 300) {
			throw new IllegalStateException("Failed to obtain Google OAuth2 token: HTTP " + res.statusCode());
		}
		String token = NotificationJsonCodec.extractStringField(res.body(), "access_token");
		Long expiresIn = NotificationJsonCodec.extractLongField(res.body(), "expires_in");
		if (token == null || token.isBlank()) {
			throw new IllegalStateException("Google OAuth2 response did not contain access_token");
		}
		cachedAccessToken = token;
		cachedTokenExpiresAt = now.plusSeconds(expiresIn != null && expiresIn > 60 ? expiresIn : 3500);
		return cachedAccessToken;
	}

	private ServiceAccountCredentials loadCredentialsIfPossible() {
		if (cachedCredentials != null) {
			return cachedCredentials;
		}
		synchronized (this) {
			if (cachedCredentials != null) {
				return cachedCredentials;
			}
			try {
				String rawJson = null;
				if (credentialsJsonBase64 != null && !credentialsJsonBase64.isBlank()) {
					rawJson = new String(Base64.getDecoder().decode(credentialsJsonBase64.trim()), StandardCharsets.UTF_8);
				} else if (credentialsPath != null && !credentialsPath.isBlank()) {
					Path path = Path.of(credentialsPath.trim());
					if (Files.exists(path)) {
						rawJson = Files.readString(path, StandardCharsets.UTF_8);
					}
				}
				if (rawJson == null || rawJson.isBlank()) {
					return null;
				}
				String projectId = (configuredProjectId != null && !configuredProjectId.isBlank())
						? configuredProjectId.trim()
						: NotificationJsonCodec.extractStringField(rawJson, "project_id");
				String clientEmail = NotificationJsonCodec.extractStringField(rawJson, "client_email");
				String privateKeyPem = NotificationJsonCodec.extractStringField(rawJson, "private_key");
				String tokenUri = NotificationJsonCodec.extractStringField(rawJson, "token_uri");
				if (projectId == null || clientEmail == null || privateKeyPem == null) {
					return null;
				}
				String cleanBase64 = privateKeyPem
						.replace("-----BEGIN PRIVATE KEY-----", "")
						.replace("-----END PRIVATE KEY-----", "")
						.replaceAll("\\s+", "");
				byte[] keyBytes = Base64.getDecoder().decode(cleanBase64);
				PrivateKey privateKey = KeyFactory.getInstance("RSA")
						.generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
				cachedCredentials = new ServiceAccountCredentials(
						projectId,
						clientEmail,
						tokenUri != null && !tokenUri.isBlank() ? tokenUri : DEFAULT_TOKEN_URI,
						privateKey);
				return cachedCredentials;
			} catch (Exception ex) {
				log.warn("Unable to parse FCM service account credentials: {}", ex.getMessage());
				return null;
			}
		}
	}
}


