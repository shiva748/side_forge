package com.side.forge.organization.student.profile.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

import com.side.forge.organization.student.enrollment.entity.StudentEnrollment;
import com.side.forge.organization.student.profile.entity.Gender;
import com.side.forge.organization.student.profile.entity.Student;
import com.side.forge.organization.student.profile.entity.StudentStatus;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

public final class StudentSpecifications {

	private StudentSpecifications() {
	}

	public static Specification<Student> withFilters(
			Long organizationId,
			String search,
			String admissionNumber,
			StudentStatus status,
			Gender gender,
			Long academicSessionId,
			Long classId) {
		return withFilters(organizationId, search, admissionNumber, status, gender, academicSessionId, classId, null);
	}

	public static Specification<Student> withFilters(
			Long organizationId,
			String search,
			String admissionNumber,
			StudentStatus status,
			Gender gender,
			Long academicSessionId,
			Long classId,
			Long sectionId) {

		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(cb.equal(root.get("organizationId"), organizationId));

			if (status != null) {
				predicates.add(cb.equal(root.get("status"), status));
			}

			if (gender != null) {
				predicates.add(cb.equal(root.get("gender"), gender));
			}

			if (admissionNumber != null && !admissionNumber.isBlank()) {
				String normalizedAdm = admissionNumber.trim().toLowerCase(Locale.ROOT);
				predicates.add(cb.like(cb.lower(root.get("admissionNumber")), "%" + normalizedAdm + "%"));
			}

			if (search != null && !search.isBlank()) {
				String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
				Predicate firstNameMatch = cb.like(cb.lower(root.get("firstName")), pattern);
				Predicate middleNameMatch = cb.like(cb.lower(cb.coalesce(root.get("middleName"), "")), pattern);
				Predicate lastNameMatch = cb.like(cb.lower(cb.coalesce(root.get("lastName"), "")), pattern);
				Predicate admMatch = cb.like(cb.lower(root.get("admissionNumber")), pattern);
				Predicate fullNameMatch = cb.like(
						cb.lower(cb.concat(cb.concat(root.get("firstName"), " "), cb.coalesce(root.get("lastName"), ""))),
						pattern);
				predicates.add(cb.or(firstNameMatch, middleNameMatch, lastNameMatch, admMatch, fullNameMatch));
			}

			if (academicSessionId != null || classId != null || sectionId != null) {
				Subquery<Long> subquery = query.subquery(Long.class);
				Root<StudentEnrollment> enrollmentRoot = subquery.from(StudentEnrollment.class);
				List<Predicate> subPredicates = new ArrayList<>();
				subPredicates.add(cb.equal(enrollmentRoot.get("organizationId"), organizationId));
				subPredicates.add(cb.equal(enrollmentRoot.get("studentId"), root.get("id")));
				if (academicSessionId != null) {
					subPredicates.add(cb.equal(enrollmentRoot.get("academicSessionId"), academicSessionId));
				}
				if (classId != null) {
					subPredicates.add(cb.equal(enrollmentRoot.get("classId"), classId));
				}
				if (sectionId != null) {
					subPredicates.add(cb.equal(enrollmentRoot.get("sectionId"), sectionId));
				}
				subquery.select(enrollmentRoot.get("studentId")).where(subPredicates.toArray(new Predicate[0]));
				predicates.add(cb.exists(subquery));
			}

			return cb.and(predicates.toArray(new Predicate[0]));
		};
	}
}
