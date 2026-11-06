package com.side.forge.notification.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.side.forge.notification.entity.InAppNotification;

public interface InAppNotificationRepository
		extends JpaRepository<InAppNotification, Long>, JpaSpecificationExecutor<InAppNotification> {

	Optional<InAppNotification> findByIdAndRecipientUserId(Long id, Long recipientUserId);

	Optional<InAppNotification> findByIdAndOrganizationIdAndRecipientUserId(
			Long id, Long organizationId, Long recipientUserId);

	boolean existsByRecipientUserIdAndOrganizationIdAndEventKey(
			Long recipientUserId, Long organizationId, String eventKey);

	long countByRecipientUserIdAndOrganizationIdAndReadFalse(Long recipientUserId, Long organizationId);

	long countByRecipientUserIdAndReadFalse(Long recipientUserId);

	List<InAppNotification> findAllByRecipientUserIdAndOrganizationIdAndReadFalseOrderByIdAsc(
			Long recipientUserId, Long organizationId);

	List<InAppNotification> findAllByRecipientUserIdAndReadFalseOrderByIdAsc(Long recipientUserId);

	Page<InAppNotification> findAllByRecipientUserIdAndOrganizationIdOrderByCreatedAtDescIdDesc(
			Long recipientUserId, Long organizationId, Pageable pageable);
}
