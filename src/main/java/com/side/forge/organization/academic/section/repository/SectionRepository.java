package com.side.forge.organization.academic.section.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.academic.section.entity.Section;

public interface SectionRepository extends JpaRepository<Section, Long> {

	Optional<Section> findByIdAndOrganizationIdAndAcademicSessionId(
			Long id, Long organizationId, Long academicSessionId);

	Optional<Section> findByIdAndOrganizationIdAndAcademicSessionIdAndClassId(
			Long id, Long organizationId, Long academicSessionId, Long classId);

	List<Section> findAllByOrganizationIdAndIdIn(Long organizationId, Collection<Long> ids);

	List<Section> findAllByOrganizationIdAndAcademicSessionIdOrderByClassIdAscNameAsc(
			Long organizationId, Long academicSessionId);

	List<Section> findAllByOrganizationIdAndAcademicSessionIdAndActiveOrderByClassIdAscNameAsc(
			Long organizationId, Long academicSessionId, boolean active);

	List<Section> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByNameAsc(
			Long organizationId, Long academicSessionId, Long classId);

	List<Section> findAllByOrganizationIdAndAcademicSessionIdAndClassIdAndActiveOrderByNameAsc(
			Long organizationId, Long academicSessionId, Long classId, boolean active);

	boolean existsByOrganizationIdAndAcademicSessionIdAndClassIdAndNameIgnoreCase(
			Long organizationId, Long academicSessionId, Long classId, String name);

	boolean existsByOrganizationIdAndAcademicSessionIdAndClassIdAndNameIgnoreCaseAndIdNot(
			Long organizationId, Long academicSessionId, Long classId, String name, Long id);
}
