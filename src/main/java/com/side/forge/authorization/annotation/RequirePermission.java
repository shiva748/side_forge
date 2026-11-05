package com.side.forge.authorization.annotation;

import java.lang.annotation.*;

import org.springframework.security.access.prepost.PreAuthorize;

import com.side.forge.authorization.enums.PermissionCode;

/**
 * Protects a method with one application permission.
 *
 * Spring Security annotation-template expressions substitute {value} with the
 * PermissionCode's enum name, so PermissionChecker resolves the corresponding
 * database permission code.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@PreAuthorize("@permissionChecker.hasPermissionByName('{value}')")
public @interface RequirePermission {
	PermissionCode value();
}
