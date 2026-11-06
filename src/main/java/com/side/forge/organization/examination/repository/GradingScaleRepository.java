package com.side.forge.organization.examination.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.examination.entity.GradingScale;

import jakarta.persistence.LockModeType;

public interface GradingScaleRepository extends JpaRepository<GradingScale, Long> {

	Optional<GradingScale> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT g FROM GradingScale g WHERE g.id = :id AND g.organizationId = :organizationId")
	Optional<GradingScale> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	List<GradingScale> findAllByOrganizationIdOrderByNameAsc(Long organizationId);

	boolean existsByOrganizationIdAndNameIgnoreCase(Long organizationId, String name);
}
