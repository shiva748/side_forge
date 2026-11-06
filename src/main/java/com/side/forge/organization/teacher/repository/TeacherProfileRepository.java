package com.side.forge.organization.teacher.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.organization.teacher.entity.TeacherProfile;

import jakarta.persistence.LockModeType;

public interface TeacherProfileRepository
		extends JpaRepository<TeacherProfile, Long>, JpaSpecificationExecutor<TeacherProfile> {

	Optional<TeacherProfile> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT t FROM TeacherProfile t WHERE t.id = :id AND t.organizationId = :organizationId")
	Optional<TeacherProfile> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	Optional<TeacherProfile> findByOrganizationIdAndStaffId(Long organizationId, Long staffId);

	List<TeacherProfile> findAllByOrganizationIdAndIdIn(Long organizationId, Collection<Long> ids);

	boolean existsByOrganizationIdAndStaffId(Long organizationId, Long staffId);
}
