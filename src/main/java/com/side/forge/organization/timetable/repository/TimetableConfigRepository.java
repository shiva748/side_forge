package com.side.forge.organization.timetable.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.timetable.entity.TimetableConfig;

import jakarta.persistence.LockModeType;

public interface TimetableConfigRepository extends JpaRepository<TimetableConfig, Long> {

	Optional<TimetableConfig> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT c FROM TimetableConfig c WHERE c.id = :id AND c.organizationId = :organizationId")
	Optional<TimetableConfig> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	List<TimetableConfig> findAllByOrganizationIdOrderByNameAsc(Long organizationId);

	boolean existsByOrganizationIdAndNameIgnoreCase(Long organizationId, String name);

	boolean existsByOrganizationIdAndNameIgnoreCaseAndIdNot(Long organizationId, String name, Long id);
}
