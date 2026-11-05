package com.side.forge.security;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.side.forge.security.jwt.JwtFilter;

@Configuration
public class SecurityFilterRegistrationConfig {

	@Bean
	public FilterRegistrationBean<JwtFilter> jwtFilterRegistration(JwtFilter jwtFilter) {
		FilterRegistrationBean<JwtFilter> registration = new FilterRegistrationBean<>(jwtFilter);

		registration.setEnabled(false);

		return registration;
	}

	@Bean
	public FilterRegistrationBean<AuthorizationContextFilter> authorizationContextFilterRegistration(
			AuthorizationContextFilter authorizationContextFilter) {

		FilterRegistrationBean<AuthorizationContextFilter> registration = new FilterRegistrationBean<>(
				authorizationContextFilter);

		registration.setEnabled(false);

		return registration;
	}
}
