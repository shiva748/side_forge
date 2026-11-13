package com.side.forge.notification.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.notification.entity.UserDeviceInstallation;

public interface UserDeviceInstallationRepository extends JpaRepository<UserDeviceInstallation, Long> {

	Optional<UserDeviceInstallation> findByInstallationId(String installationId);

	Optional<UserDeviceInstallation> findByInstallationIdAndUserId(String installationId, Long userId);

	List<UserDeviceInstallation> findAllByUserIdAndActiveTrueOrderByIdAsc(Long userId);

	List<UserDeviceInstallation> findAllByNativePushTokenAndInstallationIdNot(
			String nativePushToken, String installationId);
}
