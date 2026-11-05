package com.side.forge.common.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiResponse<T> {

	private boolean success;
	private String message;
	private T data;

	public ApiResponse(boolean success, String message) {
		this(success, message, null);
	}
}
