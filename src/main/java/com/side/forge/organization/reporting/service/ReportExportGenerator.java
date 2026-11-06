package com.side.forge.organization.reporting.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.side.forge.organization.reporting.dto.ReportDtos.ExportFormat;

@Component
public class ReportExportGenerator {

	public record ExportDocument(String filename, String contentType, byte[] content) {
	}

	public ExportDocument generate(
			ExportFormat format, String baseFilename, String organizationName,
			String reportTitle, String academicSessionName, LocalDate startDate, LocalDate endDate,
			List<String> headers, List<List<String>> rows, Map<String, String> summaryTotals) {
		return switch (format) {
			case CSV -> new ExportDocument(baseFilename + ".csv", "text/csv;charset=UTF-8",
					buildCsv(organizationName, reportTitle, academicSessionName, startDate, endDate, headers, rows, summaryTotals));
			case EXCEL -> new ExportDocument(baseFilename + ".xls", "application/vnd.ms-excel;charset=UTF-8",
					buildExcelXml(organizationName, reportTitle, academicSessionName, startDate, endDate, headers, rows, summaryTotals));
			case PDF -> new ExportDocument(baseFilename + ".pdf", "application/pdf",
					buildPdf(organizationName, reportTitle, academicSessionName, startDate, endDate, headers, rows, summaryTotals));
		};
	}

	private byte[] buildCsv(
			String orgName, String title, String sessionName, LocalDate start, LocalDate end,
			List<String> headers, List<List<String>> rows, Map<String, String> totals) {
		StringBuilder sb = new StringBuilder();
		sb.append("School,").append(csvCell(orgName)).append("\n");
		sb.append("Report Title,").append(csvCell(title)).append("\n");
		sb.append("Academic Session,").append(csvCell(sessionName != null ? sessionName : "N/A")).append("\n");
		sb.append("Date Range,").append(csvCell((start != null ? start : "ALL") + " to " + (end != null ? end : "ALL"))).append("\n\n");
		sb.append(String.join(",", headers.stream().map(this::csvCell).toList())).append("\n");
		for (List<String> row : rows) {
			sb.append(String.join(",", row.stream().map(this::csvCell).toList())).append("\n");
		}
		if (totals != null && !totals.isEmpty()) {
			sb.append("\nSummary Totals\n");
			for (Map.Entry<String, String> e : totals.entrySet()) {
				sb.append(csvCell(e.getKey())).append(",").append(csvCell(e.getValue())).append("\n");
			}
		}
		return sb.toString().getBytes(StandardCharsets.UTF_8);
	}

	private byte[] buildExcelXml(
			String orgName, String title, String sessionName, LocalDate start, LocalDate end,
			List<String> headers, List<List<String>> rows, Map<String, String> totals) {
		StringBuilder sb = new StringBuilder();
		sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
		sb.append("<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n");
		sb.append("<Worksheet ss:Name=\"Report\"><Table>\n");
		appendExcelRow(sb, List.of("School", orgName != null ? orgName : ""));
		appendExcelRow(sb, List.of("Report Title", title != null ? title : ""));
		appendExcelRow(sb, List.of("Academic Session", sessionName != null ? sessionName : "N/A"));
		appendExcelRow(sb, List.of("Date Range", (start != null ? start : "ALL") + " to " + (end != null ? end : "ALL")));
		appendExcelRow(sb, headers);
		for (List<String> row : rows) {
			appendExcelRow(sb, row);
		}
		if (totals != null && !totals.isEmpty()) {
			appendExcelRow(sb, List.of("Summary Totals", ""));
			for (Map.Entry<String, String> e : totals.entrySet()) {
				appendExcelRow(sb, List.of(e.getKey(), e.getValue()));
			}
		}
		sb.append("</Table></Worksheet></Workbook>");
		return sb.toString().getBytes(StandardCharsets.UTF_8);
	}

	private void appendExcelRow(StringBuilder sb, List<String> cells) {
		sb.append("<Row>");
		for (String cell : cells) {
			sb.append("<Cell><Data ss:Type=\"String\">").append(xmlEscape(cell)).append("</Data></Cell>");
		}
		sb.append("</Row>\n");
	}

	private byte[] buildPdf(
			String orgName, String title, String sessionName, LocalDate start, LocalDate end,
			List<String> headers, List<List<String>> rows, Map<String, String> totals) {
		List<String> lines = new ArrayList<>();
		lines.add("School: " + (orgName != null ? orgName : ""));
		lines.add("Report: " + (title != null ? title : ""));
		lines.add("Academic Session: " + (sessionName != null ? sessionName : "N/A"));
		lines.add("Date Range: " + (start != null ? start : "ALL") + " to " + (end != null ? end : "ALL"));
		lines.add("------------------------------------------------------------------------");
		lines.add(String.join(" | ", headers));
		lines.add("------------------------------------------------------------------------");
		int maxRows = Math.min(rows.size(), 40);
		for (int i = 0; i < maxRows; i++) {
			lines.add(String.join(" | ", rows.get(i)));
		}
		if (totals != null && !totals.isEmpty()) {
			lines.add("------------------------------------------------------------------------");
			lines.add("Summary Totals:");
			for (Map.Entry<String, String> e : totals.entrySet()) {
				lines.add(e.getKey() + ": " + e.getValue());
			}
		}
		StringBuilder stream = new StringBuilder("BT\n/F1 10 Tf\n40 760 Td\n13 TL\n");
		for (String line : lines) {
			stream.append("(").append(pdfEscape(line)).append(") Tj T*\n");
		}
		stream.append("ET\n");
		String s = stream.toString();
		String pdf = "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
				+ "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
				+ "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
				+ "4 0 obj << /Length " + s.length() + " >>\nstream\n" + s + "endstream\nendobj\n"
				+ "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
				+ "xref\n0 6\n0000000000 65535 f \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF\n";
		return pdf.getBytes(StandardCharsets.UTF_8);
	}

	private String csvCell(String val) {
		return val == null ? "\"\"" : "\"" + val.replace("\"", "\"\"") + "\"";
	}

	private String xmlEscape(String val) {
		return val == null ? "" : val.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
	}

	private String pdfEscape(String val) {
		return val == null ? "" : val.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
	}
}
