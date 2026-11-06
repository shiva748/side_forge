package com.side.forge.organization.academic.schoolclass.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.academic.schoolclass.entity.SchoolClass;

import jakarta.persistence.LockModeType;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {

	Optional<SchoolClass> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT c FROM SchoolClass c WHERE c.id = :id AND c.organizationId = :organizationId")
	Optional<SchoolClass> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	List<SchoolClass> findAllByOrganizationIdOrderByDisplayOrderAscNameAsc(Long organizationId);

	List<SchoolClass> findAllByOrganizationIdAndActiveOrderByDisplayOrderAscNameAsc(
			Long organizationId, boolean active);

	boolean existsByOrganizationIdAndCodeIgnoreCase(Long organizationId, String code);

	boolean existsByOrganizationIdAndCodeIgnoreCaseAndIdNot(Long organizationId, String code, Long id);

	boolean existsByOrganizationIdAndNameIgnoreCase(Long organizationId, String name);

	boolean existsByOrganizationIdAndNameIgnoreCaseAndIdNot(Long organizationId, String name, Long id);
}
