
package com.side.forge.authorization.enums;

import java.util.Arrays;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PermissionCode {

	// Platform
	PLATFORM_USER_MANAGE("platform.user.manage"),

	PLATFORM_ORGANIZATION_VIEW("platform.organization.view"),

	PLATFORM_ORGANIZATION_MANAGE("platform.organization.manage"),

	PLATFORM_ROLE_MANAGE("platform.role.manage"),

	PLATFORM_AUDIT_VIEW("platform.audit.view"),

	// School
	SCHOOL_VIEW("school.view"),

	SCHOOL_UPDATE("school.update"),

	SCHOOL_SETTINGS_MANAGE("school.settings.manage"),

	// Student
	STUDENT_VIEW("student.view"),

	STUDENT_CREATE("student.create"),

	STUDENT_UPDATE("student.update"),

	STUDENT_DELETE("student.delete"),

	STUDENT_ENROLLMENT_MANAGE("student.enrollment.manage"),

	// Staff
	TEACHER_VIEW("teacher.view"),

	TEACHER_MANAGE("teacher.manage"),

	STAFF_VIEW("staff.view"),

	STAFF_MANAGE("staff.manage"),

	// Academics
	CLASS_VIEW("class.view"),

	CLASS_MANAGE("class.manage"),

	TIMETABLE_VIEW("timetable.view"),

	TIMETABLE_MANAGE("timetable.manage"),

	// Attendance
	ATTENDANCE_VIEW("attendance.view"),

	ATTENDANCE_MARK("attendance.mark"),

	ATTENDANCE_UPDATE("attendance.update"),

	// Exams
	EXAM_VIEW("exam.view"),

	EXAM_MANAGE("exam.manage"),

	EXAM_ENTER_MARKS("exam.enter_marks"),

	EXAM_PUBLISH_RESULTS("exam.publish_results"),

	// Fees
	FEES_VIEW("fees.view"),

	FEES_MANAGE("fees.manage"),

	FEES_COLLECT("fees.collect"),

	FEES_REFUND("fees.refund"),

	FEES_REPORT_VIEW("fees.report.view"),

	// Admissions
	ADMISSION_VIEW("admission.view"),

	ADMISSION_MANAGE("admission.manage"),

	// Library
	LIBRARY_VIEW("library.view"),

	LIBRARY_MANAGE("library.manage"),

	// Transport
	TRANSPORT_VIEW("transport.view"),

	TRANSPORT_MANAGE("transport.manage"),

	// Communication
	COMMUNICATION_VIEW("communication.view"),

	COMMUNICATION_MANAGE("communication.manage"),

	// Reports
	REPORT_VIEW("report.view"),

	// Parent
	PARENT_CHILD_VIEW("parent.child.view"),

	PARENT_CHILD_COMMUNICATION("parent.child.communication");

	private final String value;

	public static PermissionCode fromValue(String value) {
		return Arrays.stream(values()).filter(permission -> permission.value.equals(value)).findFirst()
				.orElseThrow(() -> new IllegalArgumentException("Unknown permission code: " + value));
	}

	public static boolean contains(String value) {
		return Arrays.stream(values()).anyMatch(permission -> permission.value.equals(value));
	}

	@Override
	public String toString() {
		return value;
	}
}
