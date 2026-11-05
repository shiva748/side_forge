package com.side.forge.organization.academic.classsubject.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.organization.academic.classsubject.entity.ClassSubject;

public interface ClassSubjectRepository extends JpaRepository<ClassSubject, Long> {

	Optional<ClassSubject> findByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectId(
			Long organizationId, Long academicSessionId, Long classId, Long subjectId);

	List<ClassSubject> findAllByOrganizationIdAndAcademicSessionIdAndClassIdOrderByDisplayOrderAscIdAsc(
			Long organizationId, Long academicSessionId, Long classId);

	boolean existsByOrganizationIdAndAcademicSessionIdAndClassIdAndSubjectId(
			Long organizationId, Long academicSessionId, Long classId, Long subjectId);
}
