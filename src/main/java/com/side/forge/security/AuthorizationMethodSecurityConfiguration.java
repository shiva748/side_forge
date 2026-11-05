package com.side.forge.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.annotation.AnnotationTemplateExpressionDefaults;

@Configuration
public class AuthorizationMethodSecurityConfiguration {

	@Bean
	static AnnotationTemplateExpressionDefaults annotationTemplateExpressionDefaults() {
		return new AnnotationTemplateExpressionDefaults();
	}
}
