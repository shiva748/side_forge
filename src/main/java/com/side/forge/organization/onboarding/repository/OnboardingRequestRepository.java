package com.side.forge.organization.onboarding.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.onboarding.entity.OnboardingRequest;
import com.side.forge.organization.onboarding.entity.OnboardingStatus;

public interface OnboardingRequestRepository extends JpaRepository<OnboardingRequest, Long> {

	List<OnboardingRequest> findByStatus(OnboardingStatus status);
}