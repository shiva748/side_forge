package com.side.forge.platform.saas.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class FeatureEntitlementWebMvcConfig implements WebMvcConfigurer {

	private final FeatureEntitlementInterceptor featureEntitlementInterceptor;

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(featureEntitlementInterceptor)
				.addPathPatterns("/api/organizations/**");
	}
}
