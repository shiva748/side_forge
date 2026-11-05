package com.side.forge.security;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the tenant selected by /api/organizations/{organizationId}/...
 * The path value is only a selector; AuthorizationContextService still verifies
 * that the authenticated user has an active membership in that organization.
 */
@Component
public class OrganizationIdResolver {

    private static final Pattern ORGANIZATION_PATH =
            Pattern.compile("^/api/organizations/([1-9][0-9]*)(?:/.*)?$");

    public Long resolve(HttpServletRequest request) {
        Matcher matcher = ORGANIZATION_PATH.matcher(request.getServletPath());
        if (!matcher.matches()) {
            return null;
        }

        try {
            return Long.parseLong(matcher.group(1));
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Invalid organization ID in request path", exception);
        }
    }
}
