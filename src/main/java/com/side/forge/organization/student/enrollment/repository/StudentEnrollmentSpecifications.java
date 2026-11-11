package com.side.forge.organization.student.enrollment.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.side.forge.organization.student.enrollment.entity.EnrollmentStatus;
import com.side.forge.organization.student.enrollment.entity.StudentEnrollment;

import jakarta.persistence.criteria.Predicate;

public final class StudentEnrollmentSpecifications {

	private StudentEnrollmentSpecifications() {
	}

	public static Specification<StudentEnrollment> withFilters(
			Long organizationId,
			Long academicSessionId,
			Long classId,
			Long studentId,
			EnrollmentStatus status) {
		return withFilters(organizationId, academicSessionId, classId, null, studentId, status);
	}

	public static Specification<StudentEnrollment> withFilters(
			Long organizationId,
			Long academicSessionId,
			Long classId,
			Long sectionId,
			Long studentId,
			EnrollmentStatus status) {

		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(cb.equal(root.get("organizationId"), organizationId));

			if (academicSessionId != null) {
				predicates.add(cb.equal(root.get("academicSessionId"), academicSessionId));
			}
			if (classId != null) {
				predicates.add(cb.equal(root.get("classId"), classId));
			}
			if (sectionId != null) {
				predicates.add(cb.equal(root.get("sectionId"), sectionId));
			}
			if (studentId != null) {
				predicates.add(cb.equal(root.get("studentId"), studentId));
			}
			if (status != null) {
				predicates.add(cb.equal(root.get("status"), status));
			}

			return cb.and(predicates.toArray(new Predicate[0]));
		};
	}
}
