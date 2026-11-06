package com.side.forge.organization.staff.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.EmploymentType;
import com.side.forge.organization.staff.entity.Staff;

import jakarta.persistence.criteria.Predicate;

public final class StaffSpecifications {

	private StaffSpecifications() {
	}

	public static Specification<Staff> withFilters(
			Long organizationId,
			String search,
			String employeeId,
			String department,
			String designation,
			EmploymentType employmentType,
			EmploymentStatus employmentStatus,
			Boolean teachingStaff) {

		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(cb.equal(root.get("organizationId"), organizationId));

			if (employmentType != null) {
				predicates.add(cb.equal(root.get("employmentType"), employmentType));
			}

			if (employmentStatus != null) {
				predicates.add(cb.equal(root.get("employmentStatus"), employmentStatus));
			}

			if (teachingStaff != null) {
				predicates.add(cb.equal(root.get("teachingStaff"), teachingStaff));
			}

			if (department != null && !department.isBlank()) {
				predicates.add(cb.equal(cb.lower(root.get("department")), department.trim().toLowerCase(Locale.ROOT)));
			}

			if (designation != null && !designation.isBlank()) {
				predicates.add(cb.equal(cb.lower(root.get("designation")), designation.trim().toLowerCase(Locale.ROOT)));
			}

			if (employeeId != null && !employeeId.isBlank()) {
				String empPattern = "%" + employeeId.trim().toLowerCase(Locale.ROOT) + "%";
				predicates.add(cb.like(cb.lower(root.get("employeeId")), empPattern));
			}

			if (search != null && !search.isBlank()) {
				String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
				Predicate firstNameMatch = cb.like(cb.lower(root.get("firstName")), pattern);
				Predicate middleNameMatch = cb.like(cb.lower(cb.coalesce(root.get("middleName"), "")), pattern);
				Predicate lastNameMatch = cb.like(cb.lower(cb.coalesce(root.get("lastName"), "")), pattern);
				Predicate empMatch = cb.like(cb.lower(root.get("employeeId")), pattern);
				Predicate fullNameMatch = cb.like(
						cb.lower(cb.concat(cb.concat(root.get("firstName"), " "), cb.coalesce(root.get("lastName"), ""))),
						pattern);
				predicates.add(cb.or(firstNameMatch, middleNameMatch, lastNameMatch, empMatch, fullNameMatch));
			}

			return cb.and(predicates.toArray(new Predicate[0]));
		};
	}
}
