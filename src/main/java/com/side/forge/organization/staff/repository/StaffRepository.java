package com.side.forge.organization.staff.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.staff.entity.Staff;

import jakarta.persistence.LockModeType;

public interface StaffRepository extends JpaRepository<Staff, Long>, JpaSpecificationExecutor<Staff> {

	Optional<Staff> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT s FROM Staff s WHERE s.id = :id AND s.organizationId = :organizationId")
	Optional<Staff> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	List<Staff> findAllByOrganizationIdAndIdIn(Long organizationId, Collection<Long> ids);

	List<Staff> findAllByOrganizationIdOrderByIdAsc(Long organizationId);

	Optional<Staff> findByOrganizationIdAndUserId(Long organizationId, Long userId);

	boolean existsByOrganizationIdAndEmployeeIdIgnoreCase(Long organizationId, String employeeId);

	boolean existsByOrganizationIdAndEmployeeIdIgnoreCaseAndIdNot(Long organizationId, String employeeId, Long id);

	boolean existsByOrganizationIdAndUserId(Long organizationId, Long userId);

	boolean existsByOrganizationIdAndUserIdAndIdNot(Long organizationId, Long userId, Long id);
}
