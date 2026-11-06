package com.side.forge.organization.communication.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.communication.entity.Announcement;
import com.side.forge.organization.communication.entity.AnnouncementStatus;

import jakarta.persistence.LockModeType;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

	Optional<Announcement> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT a FROM Announcement a WHERE a.id = :id AND a.organizationId = :organizationId")
	Optional<Announcement> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	List<Announcement> findAllByOrganizationIdAndStatusOrderByImportantDescPublicationDateDescIdDesc(
			Long organizationId, AnnouncementStatus status);

	List<Announcement> findAllByOrganizationIdOrderByCreatedAtDescIdDesc(Long organizationId);
}
