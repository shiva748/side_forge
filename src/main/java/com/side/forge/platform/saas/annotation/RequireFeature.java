package com.side.forge.platform.saas.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import com.side.forge.platform.saas.enums.PlatformFeature;

/**
 * Declares the subscription feature entitlement(s) required for an organization
 * to use an endpoint or service operation. Evaluated centrally by
 * FeatureEntitlementInterceptor / SubscriptionEntitlementService separately from
 * user RBAC permissions (@RequirePermission).
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequireFeature {

	PlatformFeature[] value();
}
