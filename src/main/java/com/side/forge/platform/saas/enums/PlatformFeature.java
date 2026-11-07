package com.side.forge.platform.saas.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PlatformFeature {

	ACADEMIC_MANAGEMENT("Academic Management", "Academic sessions, classes, sections and subjects"),
	STUDENT_MANAGEMENT("Student Management", "Core student profiles, guardians and academic session enrollments"),
	STAFF_MANAGEMENT("Staff Management", "Teaching and non-teaching staff profiles and class/subject assignments"),
	TIMETABLE("Timetable", "Class timetable configuration, periods, slots and publishing"),
	ATTENDANCE("Attendance", "Daily student and staff attendance tracking and audit logs"),
	EXAMINATION_AND_RESULTS("Examination & Results", "Exam scheduling, marks entry, result calculation and report cards"),
	FEES_AND_FINANCE("Fees & Finance", "Fee structures, student demands, concessions, fee collection and receipts"),
	HOMEWORK_AND_ASSIGNMENTS("Homework & Assignments", "Teacher homework assignments, student submissions and evaluations"),
	DASHBOARD_AND_REPORTS("Dashboard & Reports", "Role-based school dashboards, analytical reports and exports"),
	REPORT_EXPORTS("Report Exports", "CSV, Excel and PDF analytical report exports"),
	COMMUNICATION_AND_NOTIFICATIONS("Communication & Notifications", "Targeted school announcements, circulars and notifications"),
	PARENT_PORTAL("Parent Portal", "Dedicated parent portal for multi-child monitoring and homework submission"),
	FILE_STORAGE("File Storage", "Tenant-isolated organization file storage and attachments"),
	TRANSPORT("Transport", "School bus routes, vehicle tracking and student transport allocation"),
	LIBRARY("Library", "Library catalog, book circulation and fine management"),
	INVENTORY("Inventory", "School assets, supplies and inventory tracking"),
	HR_AND_PAYROLL("HR & Payroll", "Staff payroll processing, leave management and salary slips");

	private final String displayName;
	private final String description;
}
