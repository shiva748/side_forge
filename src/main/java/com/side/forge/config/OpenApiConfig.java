package com.side.forge.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** OpenAPI documentation configuration for Side_forge APIs. */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI sideForgeOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Side_forge API")
                        .description("API documentation for Side_forge school management platform.")
                        .version("1.0.0")
                        .contact(new Contact().name("Side_forge")))
                .components(new Components()
                        .addSecuritySchemes("jwtCookie", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE)
                                .name("jwt")
                                .description("JWT authentication cookie. Log in through /api/auth/login; the server sets this HttpOnly cookie.")));
    }

    @Bean
    public GroupedOpenApi authenticationApi() {
        return GroupedOpenApi.builder()
                .group("authentication-and-user")
                .displayName("Authentication & User")
                .pathsToMatch("/api/auth/**", "/api/me/**")
                .build();
    }

    @Bean
    public GroupedOpenApi organizationApi() {
        return GroupedOpenApi.builder()
                .group("organization")
                .displayName("Organization")
                .pathsToMatch("/api/organizations/**")
                .build();
    }

    @Bean
    public GroupedOpenApi platformApi() {
        return GroupedOpenApi.builder()
                .group("platform")
                .displayName("Platform Administration")
                .pathsToMatch("/api/platform/**")
                .build();
    }
}
