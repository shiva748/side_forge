package com.side.forge.storage.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.storage.entity.StoredFileReference;

public interface StoredFileReferenceRepository extends JpaRepository<StoredFileReference, Long> {

	Optional<StoredFileReference> findByFileIdAndResourceTypeAndResourceId(
			Long fileId, String resourceType, Long resourceId);

	List<StoredFileReference> findAllByOrganizationIdAndResourceTypeAndResourceIdOrderByIdAsc(
			Long organizationId, String resourceType, Long resourceId);

	List<StoredFileReference> findAllByResourceTypeAndResourceIdOrderByIdAsc(
			String resourceType, Long resourceId);

	List<StoredFileReference> findAllByFileIdOrderByIdAsc(Long fileId);

	long countByFileId(Long fileId);
}
