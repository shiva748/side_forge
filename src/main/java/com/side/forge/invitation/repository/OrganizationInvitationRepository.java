package com.side.forge.invitation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.side.forge.invitation.entity.InvitationStatus;
import com.side.forge.invitation.entity.OrganizationInvitation;

import jakarta.persistence.LockModeType;

public interface OrganizationInvitationRepository extends JpaRepository<OrganizationInvitation, Long> {

	Optional<OrganizationInvitation> findByIdAndOrganizationId(Long id, Long organizationId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT i FROM OrganizationInvitation i WHERE i.id = :id")
	Optional<OrganizationInvitation> findByIdForUpdate(@Param("id") Long id);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT i FROM OrganizationInvitation i WHERE i.id = :id AND i.organizationId = :organizationId")
	Optional<OrganizationInvitation> findByIdAndOrganizationIdForUpdate(
			@Param("id") Long id, @Param("organizationId") Long organizationId);

	Optional<OrganizationInvitation> findByTokenHash(String tokenHash);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT i FROM OrganizationInvitation i WHERE i.tokenHash = :tokenHash")
	Optional<OrganizationInvitation> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

	List<OrganizationInvitation> findAllByOrganizationIdAndEmailIgnoreCaseAndRoleCodeIgnoreCaseAndStatusOrderByIdDesc(
			Long organizationId, String email, String roleCode, InvitationStatus status);

	List<OrganizationInvitation> findAllByOrganizationIdOrderByCreatedAtDescIdDesc(Long organizationId);

	List<OrganizationInvitation> findAllByEmailIgnoreCaseOrderByCreatedAtDescIdDesc(String email);

	Optional<OrganizationInvitation> findFirstByOnboardingRequestIdOrderByIdDesc(Long onboardingRequestId);
}
