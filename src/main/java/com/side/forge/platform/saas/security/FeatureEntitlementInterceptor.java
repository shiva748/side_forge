package com.side.forge.platform.saas.security;

import java.util.LinkedHashSet;
import java.util.Set;

import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import com.side.forge.authorization.service.CurrentUserContext;
import com.side.forge.platform.saas.annotation.RequireFeature;
import com.side.forge.platform.saas.enums.PlatformFeature;
import com.side.forge.platform.saas.service.SubscriptionEntitlementService;
import com.side.forge.security.OrganizationIdResolver;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * Centralized Spring MVC HandlerInterceptor that evaluates @RequireFeature
 * declarations on organization controllers and methods. Runs for
 * /api/organizations/{organizationId}/** requests and delegates to
 * SubscriptionEntitlementService separately from RBAC (@RequirePermission).
 */
@Component
@RequiredArgsConstructor
public class FeatureEntitlementInterceptor implements HandlerInterceptor {

	private final SubscriptionEntitlementService entitlementService;
	private final CurrentUserContext currentUser;
	private final OrganizationIdResolver organizationIdResolver;

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
		if (!(handler instanceof HandlerMethod handlerMethod)) {
			return true;
		}

		RequireFeature classAnn = AnnotatedElementUtils.findMergedAnnotation(
				handlerMethod.getBeanType(), RequireFeature.class);
		RequireFeature methodAnn = AnnotatedElementUtils.findMergedAnnotation(
				handlerMethod.getMethod(), RequireFeature.class);

		if (classAnn == null && methodAnn == null) {
			return true;
		}

		Set<PlatformFeature> requiredFeatures = new LinkedHashSet<>();
		if (classAnn != null && classAnn.value() != null) {
			for (PlatformFeature f : classAnn.value()) {
				requiredFeatures.add(f);
			}
		}
		if (methodAnn != null && methodAnn.value() != null) {
			for (PlatformFeature f : methodAnn.value()) {
				requiredFeatures.add(f);
			}
		}
		if (requiredFeatures.isEmpty()) {
			return true;
		}

		Long organizationId = resolveOrganizationId(request);
		if (organizationId == null) {
			return true;
		}

		for (PlatformFeature feature : requiredFeatures) {
			entitlementService.requireFeatureAccess(organizationId, feature);
		}
		return true;
	}

	private Long resolveOrganizationId(HttpServletRequest request) {
		try {
			Long fromContext = currentUser.getOrganizationId();
			if (fromContext != null) {
				return fromContext;
			}
		} catch (Exception ignored) {
		}
		try {
			return organizationIdResolver.resolve(request);
		} catch (Exception ignored) {
			return null;
		}
	}
}
