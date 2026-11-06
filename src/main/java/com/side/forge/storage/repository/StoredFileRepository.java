package com.side.forge.storage.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.storage.entity.StoredFile;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {

	Optional<StoredFile> findByIdAndOrganizationId(Long id, Long organizationId);

	Optional<StoredFile> findByFileUid(String fileUid);

	List<StoredFile> findAllByIdInOrderByIdAsc(Collection<Long> ids);

	List<StoredFile> findAllByOrganizationIdAndIdInOrderByIdAsc(Long organizationId, Collection<Long> ids);
}
