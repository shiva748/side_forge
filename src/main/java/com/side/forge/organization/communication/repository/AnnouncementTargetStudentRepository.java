package com.side.forge.organization.communication.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.communication.entity.AnnouncementTargetStudent;

public interface AnnouncementTargetStudentRepository extends JpaRepository<AnnouncementTargetStudent, Long> {

	List<AnnouncementTargetStudent> findAllByOrganizationIdAndAnnouncementIdOrderByStudentIdAsc(
			Long organizationId, Long announcementId);

	List<AnnouncementTargetStudent> findAllByOrganizationIdAndAnnouncementIdInOrderByStudentIdAsc(
			Long organizationId, Collection<Long> announcementIds);

	void deleteAllByOrganizationIdAndAnnouncementId(Long organizationId, Long announcementId);
}
