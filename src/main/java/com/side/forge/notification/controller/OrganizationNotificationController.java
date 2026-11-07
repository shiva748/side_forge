package com.side.forge.notification.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.common.dto.ApiResponse;
import com.side.forge.common.dto.PagedResponse;
import com.side.forge.notification.dto.NotificationDtos.*;
import com.side.forge.notification.entity.NotificationCategory;
import com.side.forge.notification.entity.NotificationType;
import com.side.forge.notification.service.NotificationService;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;

@RestController
@Validated
@RequireFeature(PlatformFeature.COMMUNICATION_AND_NOTIFICATIONS)
@Tag(name = "Notifications & Preferences", description = "In-app notification inbox, unread counts, read status, and category preferences")
@SecurityRequirement(name = "jwtCookie")
@RequestMapping("/api/organizations/{organizationId}")
@RequiredArgsConstructor
public class OrganizationNotificationController {

	private final NotificationService notificationService;
	private final CurrentUserContext currentUser;

	@GetMapping("/notifications")
	public ResponseEntity<ApiResponse<PagedResponse<NotificationResponse>>> getNotifications(
			@PathVariable @Positive Long organizationId,
			@RequestParam(required = false) NotificationCategory category,
			@RequestParam(required = false) NotificationType type,
			@RequestParam(required = false) Boolean unreadOnly,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notifications retrieved successfully",
				notificationService.getUserNotifications(
						currentUser.getUserId(), organizationId, category, type, unreadOnly, page, size)));
	}

	@GetMapping("/notifications/unread-count")
	public ResponseEntity<ApiResponse<UnreadNotificationCountResponse>> getUnreadCount(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Unread notification count retrieved successfully",
				notificationService.getUnreadCount(currentUser.getUserId(), organizationId)));
	}

	@PatchMapping("/notifications/{notificationId}/read")
	public ResponseEntity<ApiResponse<NotificationResponse>> markAsReadPatch(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long notificationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notification marked as read",
				notificationService.markAsRead(currentUser.getUserId(), organizationId, notificationId)));
	}

	@PostMapping("/notifications/{notificationId}/read")
	public ResponseEntity<ApiResponse<NotificationResponse>> markAsReadPost(
			@PathVariable @Positive Long organizationId,
			@PathVariable @Positive Long notificationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notification marked as read",
				notificationService.markAsRead(currentUser.getUserId(), organizationId, notificationId)));
	}

	@PostMapping("/notifications/read-all")
	public ResponseEntity<ApiResponse<MarkAllReadResponse>> markAllAsReadPost(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "All notifications marked as read",
				notificationService.markAllAsRead(currentUser.getUserId(), organizationId)));
	}

	@PatchMapping("/notifications/read-all")
	public ResponseEntity<ApiResponse<MarkAllReadResponse>> markAllAsReadPatch(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "All notifications marked as read",
				notificationService.markAllAsRead(currentUser.getUserId(), organizationId)));
	}

	@GetMapping("/notification-preferences")
	public ResponseEntity<ApiResponse<NotificationPreferenceResponse>> getNotificationPreferences(
			@PathVariable @Positive Long organizationId) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notification preferences retrieved successfully",
				notificationService.getUserPreferences(currentUser.getUserId(), organizationId)));
	}

	@PutMapping("/notification-preferences")
	public ResponseEntity<ApiResponse<NotificationPreferenceResponse>> updateNotificationPreferences(
			@PathVariable @Positive Long organizationId,
			@Valid @RequestBody UpdateNotificationPreferencesRequest request) {
		return ResponseEntity.ok(new ApiResponse<>(
				true, "Notification preferences updated successfully",
				notificationService.updateUserPreferences(currentUser.getUserId(), organizationId, request)));
	}
}
