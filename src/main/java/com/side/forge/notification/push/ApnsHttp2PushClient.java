package com.side.forge.notification.push;

import java.net.URI;
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

import com.side.forge.notification.spi.NotificationDeliveryGateway.NotificationDispatchEvent;
import com.side.forge.notification.util.NotificationJsonCodec;

import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ApnsHttp2PushClient {

	@Value("${forge.notification.apns.enabled:false}")
	private boolean apnsEnabled;

	@Value("${forge.notification.apns.team-id:}")
	private String teamId;

	@Value("${forge.notification.apns.key-id:}")
	private String keyId;

	@Value("${forge.notification.apns.bundle-id:com.sideforge.app}")
	private String bundleId;

	@Value("${forge.notification.apns.private-key-path:}")
	private String privateKeyPath;

	@Value("${forge.notification.apns.private-key-base64:}")
	private String privateKeyBase64;

	@Value("${forge.notification.apns.production:false}")
	private boolean production;

	private final HttpClient httpClient = HttpClient.newBuilder()
			.version(HttpClient.Version.HTTP_2)
			.connectTimeout(Duration.ofSeconds(10))
			.build();

	private volatile PrivateKey cachedPrivateKey;
	private volatile String cachedProviderJwt;
	private volatile Instant cachedJwtExpiresAt = Instant.EPOCH;

	public boolean isConfiguredAndEnabled() {
		return apnsEnabled
				&& teamId != null && !teamId.isBlank()
				&& keyId != null && !keyId.isBlank()
				&& bundleId != null && !bundleId.isBlank()
				&& loadPrivateKeyIfPossible() != null;
	}

	public PushSendResult sendPushNotification(String deviceToken, NotificationDispatchEvent event) {
		if (deviceToken == null || deviceToken.isBlank()) {
			return PushSendResult.failure(true, "EMPTY_TOKEN", "APNs device token is empty");
		}
		if (!isConfiguredAndEnabled()) {
			return PushSendResult.failure(false, "APNS_DISABLED", "APNs HTTP/2 is disabled or not configured");
		}

		try {
			String providerToken = getOrRefreshProviderJwt();
			String host = production ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
			String url = host + "/3/device/" + deviceToken.trim();
			String payload = buildApnsPayload(event);

			HttpRequest request = HttpRequest.newBuilder()
					.uri(URI.create(url))
					.timeout(Duration.ofSeconds(12))
					.header("authorization", "bearer " + providerToken)
					.header("apns-topic", bundleId.trim())
					.header("apns-push-type", "alert")
					.header("apns-priority", "10")
					.POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
					.build();

			HttpResponse<String> response = httpClient.send(
					request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
			int status = response.statusCode();
			if (status == 200) {
				String apnsId = response.headers().firstValue("apns-id").orElse("apns-ok");
				return PushSendResult.success(apnsId);
			}

			String body = response.body() != null ? response.body() : "";
			String reason = NotificationJsonCodec.extractStringField(body, "reason");
			boolean permanentInvalid = status == 410
					|| "BadDeviceToken".equalsIgnoreCase(reason)
					|| "Unregistered".equalsIgnoreCase(reason)
					|| "DeviceTokenNotForTopic".equalsIgnoreCase(reason);

			return PushSendResult.failure(
					permanentInvalid,
					reason != null ? reason : "APNS_HTTP_" + status,
					body);
		} catch (Exception ex) {
			log.warn("APNs HTTP/2 send error for notification {}: {}", event.notificationId(), ex.getMessage());
			return PushSendResult.failure(false, "APNS_EXCEPTION", ex.getMessage());
		}
	}

	private String buildApnsPayload(NotificationDispatchEvent event) {
		return "{"
				+ "\"aps\":{"
				+ "\"alert\":{"
				+ "\"title\":" + NotificationJsonCodec.quoteOrNull(event.title()) + ","
				+ "\"body\":" + NotificationJsonCodec.quoteOrNull(event.message())
				+ "},"
				+ "\"sound\":\"default\""
				+ "},"
				+ "\"notificationId\":" + NotificationJsonCodec.numberOrNull(event.notificationId()) + ","
				+ "\"organizationId\":" + NotificationJsonCodec.numberOrNull(event.organizationId()) + ","
				+ "\"category\":" + NotificationJsonCodec.quoteOrNull(
						event.category() != null ? event.category().name() : null) + ","
				+ "\"type\":" + NotificationJsonCodec.quoteOrNull(
						event.type() != null ? event.type().name() : null) + ","
				+ "\"resourceType\":" + NotificationJsonCodec.quoteOrNull(event.resourceType()) + ","
				+ "\"resourceId\":" + NotificationJsonCodec.numberOrNull(event.resourceId()) + ","
				+ "\"navigationUrl\":" + NotificationJsonCodec.quoteOrNull(event.navigationUrl())
				+ "}";
	}

	private synchronized String getOrRefreshProviderJwt() {
		Instant now = Instant.now();
		if (cachedProviderJwt != null && now.isBefore(cachedJwtExpiresAt)) {
			return cachedProviderJwt;
		}
		PrivateKey key = loadPrivateKeyIfPossible();
		if (key == null) {
			throw new IllegalStateException("APNs .p8 private key is not available");
		}
		cachedProviderJwt = Jwts.builder()
				.header().keyId(keyId.trim()).and()
				.issuer(teamId.trim())
				.issuedAt(Date.from(now))
				.signWith(key, Jwts.SIG.ES256)
				.compact();
		cachedJwtExpiresAt = now.plusSeconds(3000);
		return cachedProviderJwt;
	}

	private PrivateKey loadPrivateKeyIfPossible() {
		if (cachedPrivateKey != null) {
			return cachedPrivateKey;
		}
		synchronized (this) {
			if (cachedPrivateKey != null) {
				return cachedPrivateKey;
			}
			try {
				String rawPem = null;
				if (privateKeyBase64 != null && !privateKeyBase64.isBlank()) {
					rawPem = new String(Base64.getDecoder().decode(privateKeyBase64.trim()), StandardCharsets.UTF_8);
				} else if (privateKeyPath != null && !privateKeyPath.isBlank()) {
					Path path = Path.of(privateKeyPath.trim());
					if (Files.exists(path)) {
						rawPem = Files.readString(path, StandardCharsets.UTF_8);
					}
				}
				if (rawPem == null || rawPem.isBlank()) {
					return null;
				}
				String cleanBase64 = rawPem
						.replace("-----BEGIN PRIVATE KEY-----", "")
						.replace("-----END PRIVATE KEY-----", "")
						.replaceAll("\\s+", "");
				byte[] keyBytes = Base64.getDecoder().decode(cleanBase64);
				cachedPrivateKey = KeyFactory.getInstance("EC")
						.generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
				return cachedPrivateKey;
			} catch (Exception ex) {
				log.warn("Unable to parse APNs .p8 private key: {}", ex.getMessage());
				return null;
			}
		}
	}
}

