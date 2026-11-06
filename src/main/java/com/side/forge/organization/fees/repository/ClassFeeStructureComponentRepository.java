package com.side.forge.organization.fees.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.fees.entity.ClassFeeStructureComponent;

public interface ClassFeeStructureComponentRepository extends JpaRepository<ClassFeeStructureComponent, Long> {

	List<ClassFeeStructureComponent> findAllByOrganizationIdAndFeeStructureIdOrderByDisplayOrderAscIdAsc(
			Long organizationId, Long feeStructureId);

	Optional<ClassFeeStructureComponent> findByIdAndOrganizationIdAndFeeStructureId(
			Long id, Long organizationId, Long feeStructureId);

	boolean existsByFeeStructureIdAndCodeIgnoreCase(Long feeStructureId, String code);
}
