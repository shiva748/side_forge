package com.side.forge.organization.reporting.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.reporting.entity.NoticeAudience;
import com.side.forge.organization.reporting.entity.SchoolNotice;

public interface SchoolNoticeRepository extends JpaRepository<SchoolNotice, Long> {

	Optional<SchoolNotice> findByIdAndOrganizationId(Long id, Long organizationId);

	List<SchoolNotice> findAllByOrganizationIdAndActiveTrueOrderByImportantDescPublishedDateDescIdDesc(
			Long organizationId);

	List<SchoolNotice> findAllByOrganizationIdAndActiveTrueAndImportantTrueOrderByPublishedDateDescIdDesc(
			Long organizationId);

	List<SchoolNotice> findAllByOrganizationIdAndActiveTrueAndAudienceInOrderByImportantDescPublishedDateDescIdDesc(
			Long organizationId, Collection<NoticeAudience> audiences);
}
