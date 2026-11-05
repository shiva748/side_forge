package com.side.forge.security;

import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Pattern;

import com.side.forge.common.utils.AuthenticationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.side.forge.authorization.dto.AuthorizationContext;
import com.side.forge.authorization.service.AuthorizationContextService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Loads exactly one authorization context for platform or tenant API requests.
 * /api/organizations/{organizationId}/... is never trusted by path alone:
 * resolveOrganization verifies the authenticated user's active membership.
 */
@Component
@RequiredArgsConstructor
public class AuthorizationContextFilter extends OncePerRequestFilter {

    private static final String PLATFORM_API = "/api/platform";
    private static final Pattern ORGANIZATION_API =
            Pattern.compile("^/api/organizations/[1-9][0-9]*(?:/.*)?$");

    private final OrganizationIdResolver organizationIdResolver;
    private final AuthorizationContextService authorizationContextService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = AuthenticationUtils.getAuthenticatedUserId(authentication);

        if (userId == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getServletPath();
        AuthorizationContext context;

        if (isPlatformApi(path)) {
            context = authorizationContextService.resolvePlatform(userId);
        } else if (isOrganizationApi(path)) {
            Long organizationId;
            try {
                organizationId = organizationIdResolver.resolve(request);
            } catch (IllegalArgumentException exception) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid organization context");
                return;
            }

            if (organizationId == null) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Organization ID is required in the URL");
                return;
            }

            try {
                context = authorizationContextService.resolveOrganization(userId, organizationId);
            } catch (org.springframework.security.access.AccessDeniedException exception) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN,
                        "No active membership in the requested organization");
                return;
            }
        } else {
            // Authentication-only APIs such as /api/me do not require tenant context.
            filterChain.doFilter(request, response);
            return;
        }

        Set<GrantedAuthority> authorities = new LinkedHashSet<>(authentication.getAuthorities());
        context.permissions().forEach(code -> authorities.add(new SimpleGrantedAuthority(code)));

        UsernamePasswordAuthenticationToken enriched = UsernamePasswordAuthenticationToken
                .authenticated(authentication.getPrincipal(), authentication.getCredentials(), authorities);
        enriched.setDetails(context);
        SecurityContextHolder.getContext().setAuthentication(enriched);

        filterChain.doFilter(request, response);
    }

    private boolean isPlatformApi(String path) {
        return path.equals(PLATFORM_API) || path.startsWith(PLATFORM_API + "/");
    }

    private boolean isOrganizationApi(String path) {
        return ORGANIZATION_API.matcher(path).matches();
    }
}
