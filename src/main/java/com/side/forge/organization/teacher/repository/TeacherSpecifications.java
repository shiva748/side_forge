package com.side.forge.organization.teacher.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

import com.side.forge.organization.staff.entity.EmploymentStatus;
import com.side.forge.organization.staff.entity.EmploymentType;
import com.side.forge.organization.staff.entity.Staff;
import com.side.forge.organization.teacher.entity.TeacherClassAssignment;
import com.side.forge.organization.teacher.entity.TeacherProfile;
import com.side.forge.organization.teacher.entity.TeacherSubjectAssignment;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

public final class TeacherSpecifications {

	private TeacherSpecifications() {
	}

	public static Specification<TeacherProfile> withFilters(
			Long organizationId, String search, String employeeId, String department,
			String designation, EmploymentType employmentType, EmploymentStatus employmentStatus,
			String specialization, Boolean availableForAssignment,
			Long academicSessionId, Long classId, Long subjectId) {

		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(cb.equal(root.get("organizationId"), organizationId));

			if (availableForAssignment != null) {
				predicates.add(cb.equal(root.get("availableForAssignment"), availableForAssignment));
			}
			if (specialization != null && !specialization.isBlank()) {
				String specPattern = "%" + specialization.trim().toLowerCase(Locale.ROOT) + "%";
				predicates.add(cb.like(cb.lower(cb.coalesce(root.get("specialization"), "")), specPattern));
			}

			Subquery<Long> staffSub = query.subquery(Long.class);
			Root<Staff> sr = staffSub.from(Staff.class);
			List<Predicate> sp = new ArrayList<>();
			sp.add(cb.equal(sr.get("organizationId"), organizationId));
			sp.add(cb.equal(sr.get("id"), root.get("staffId")));
			sp.add(cb.isTrue(sr.get("teachingStaff")));

			if (employmentType != null) {
				sp.add(cb.equal(sr.get("employmentType"), employmentType));
			}
			if (employmentStatus != null) {
				sp.add(cb.equal(sr.get("employmentStatus"), employmentStatus));
			}
			if (department != null && !department.isBlank()) {
				sp.add(cb.equal(cb.lower(sr.get("department")), department.trim().toLowerCase(Locale.ROOT)));
			}
			if (designation != null && !designation.isBlank()) {
				sp.add(cb.equal(cb.lower(sr.get("designation")), designation.trim().toLowerCase(Locale.ROOT)));
			}
			if (employeeId != null && !employeeId.isBlank()) {
				sp.add(cb.like(cb.lower(sr.get("employeeId")), "%" + employeeId.trim().toLowerCase(Locale.ROOT) + "%"));
			}
			if (search != null && !search.isBlank()) {
				String p = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
				sp.add(cb.or(
						cb.like(cb.lower(sr.get("firstName")), p),
						cb.like(cb.lower(cb.coalesce(sr.get("middleName"), "")), p),
						cb.like(cb.lower(cb.coalesce(sr.get("lastName"), "")), p),
						cb.like(cb.lower(sr.get("employeeId")), p),
						cb.like(cb.lower(cb.concat(cb.concat(sr.get("firstName"), " "), cb.coalesce(sr.get("lastName"), ""))), p)
				));
			}
			staffSub.select(sr.get("id")).where(sp.toArray(new Predicate[0]));
			predicates.add(cb.exists(staffSub));

			if (subjectId != null) {
				Subquery<Long> tsaSub = query.subquery(Long.class);
				Root<TeacherSubjectAssignment> tsa = tsaSub.from(TeacherSubjectAssignment.class);
				List<Predicate> tp = new ArrayList<>();
				tp.add(cb.equal(tsa.get("organizationId"), organizationId));
				tp.add(cb.equal(tsa.get("teacherId"), root.get("id")));
				tp.add(cb.equal(tsa.get("subjectId"), subjectId));
				if (academicSessionId != null) {
					tp.add(cb.equal(tsa.get("academicSessionId"), academicSessionId));
				}
				if (classId != null) {
					tp.add(cb.equal(tsa.get("classId"), classId));
				}
				tsaSub.select(tsa.get("teacherId")).where(tp.toArray(new Predicate[0]));
				predicates.add(cb.exists(tsaSub));
			} else if (academicSessionId != null || classId != null) {
				Subquery<Long> tcaSub = query.subquery(Long.class);
				Root<TeacherClassAssignment> tca = tcaSub.from(TeacherClassAssignment.class);
				List<Predicate> cp = new ArrayList<>();
				cp.add(cb.equal(tca.get("organizationId"), organizationId));
				cp.add(cb.equal(tca.get("teacherId"), root.get("id")));
				if (academicSessionId != null) {
					cp.add(cb.equal(tca.get("academicSessionId"), academicSessionId));
				}
				if (classId != null) {
					cp.add(cb.equal(tca.get("classId"), classId));
				}
				tcaSub.select(tca.get("teacherId")).where(cp.toArray(new Predicate[0]));

				Subquery<Long> tsaSub = query.subquery(Long.class);
				Root<TeacherSubjectAssignment> tsa = tsaSub.from(TeacherSubjectAssignment.class);
				List<Predicate> tp = new ArrayList<>();
				tp.add(cb.equal(tsa.get("organizationId"), organizationId));
				tp.add(cb.equal(tsa.get("teacherId"), root.get("id")));
				if (academicSessionId != null) {
					tp.add(cb.equal(tsa.get("academicSessionId"), academicSessionId));
				}
				if (classId != null) {
					tp.add(cb.equal(tsa.get("classId"), classId));
				}
				tsaSub.select(tsa.get("teacherId")).where(tp.toArray(new Predicate[0]));
				predicates.add(cb.or(cb.exists(tcaSub), cb.exists(tsaSub)));
			}

			return cb.and(predicates.toArray(new Predicate[0]));
		};
	}
}
