package com.side.forge.organization.communication.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.communication.entity.AnnouncementTargetClass;

public interface AnnouncementTargetClassRepository extends JpaRepository<AnnouncementTargetClass, Long> {

	List<AnnouncementTargetClass> findAllByOrganizationIdAndAnnouncementIdOrderByClassIdAsc(
			Long organizationId, Long announcementId);

	List<AnnouncementTargetClass> findAllByOrganizationIdAndAnnouncementIdInOrderByClassIdAsc(
			Long organizationId, Collection<Long> announcementIds);

	void deleteAllByOrganizationIdAndAnnouncementId(Long organizationId, Long announcementId);
}
