package com.side.forge.notification.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.common.utils.AuthenticationUtils;
import com.side.forge.notification.dto.NotificationDtos.DeviceInstallationResponse;
import com.side.forge.notification.dto.NotificationDtos.NotificationDeliveryAckRequest;
import com.side.forge.notification.dto.NotificationDtos.RegisterDeviceInstallationRequest;
import com.side.forge.notification.service.NotificationDeviceInstallationService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequiredArgsConstructor
@Tag(name = "Notification Devices & Real-Time Delivery", description = "Device installation registration, push token management, and delivery acknowledgments")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/v1/notifications")
public class NotificationDeviceController {

	private final NotificationDeviceInstallationService installationService;

	@PostMapping("/devices")
	public ResponseEntity<ApiResponse<DeviceInstallationResponse>> registerDevice(
			Authentication authentication,
			@Valid @RequestBody RegisterDeviceInstallationRequest request) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		DeviceInstallationResponse saved = installationService.registerOrUpdateInstallation(userId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Device installation registered", saved));
	}

	@GetMapping("/devices")
	public ResponseEntity<ApiResponse<List<DeviceInstallationResponse>>> getMyDevices(
			Authentication authentication) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Active device installations retrieved",
				installationService.getActiveInstallationsForUser(userId)));
	}

	@DeleteMapping("/devices/{installationId}")
	public ResponseEntity<ApiResponse<Void>> deactivateDevice(
			Authentication authentication,
			@PathVariable @NotBlank String installationId) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		installationService.deactivateInstallation(userId, installationId);
		return ResponseEntity.ok(new ApiResponse<>(true, "Device installation deactivated", null));
	}

	@PostMapping("/deliveries/{notificationId}/ack")
	public ResponseEntity<ApiResponse<Void>> acknowledgeDelivery(
			Authentication authentication,
			@PathVariable @Positive Long notificationId,
			@Valid @RequestBody NotificationDeliveryAckRequest request) {
		Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);
		installationService.acknowledgeDelivery(userId, notificationId, request);
		return ResponseEntity.ok(new ApiResponse<>(true, "Notification delivery acknowledged", null));
	}
}
