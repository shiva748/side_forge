package com.side.forge.common.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.side.forge.common.dto.ApiResponse;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<?> handleAccessDenied(AccessDeniedException ex) {
		log.warn("Authorization denied: {}", ex.getMessage());
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(new ApiResponse<>(false, "Access denied. You do not have the required permissions."));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
		String message = ex.getBindingResult().getFieldErrors().stream()
				.map(error -> error.getField() + ": " + error.getDefaultMessage()).findFirst()
				.orElse("Request validation failed");
		return ResponseEntity.badRequest().body(new ApiResponse<>(false, message));
	}

	@ExceptionHandler(EntityNotFoundException.class)
	public ResponseEntity<?> handleNotFound(EntityNotFoundException ex) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse<>(false, ex.getMessage()));
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<?> handleBadRequest(IllegalArgumentException ex) {
		return ResponseEntity.badRequest().body(new ApiResponse<>(false, ex.getMessage()));
	}

	@ExceptionHandler(IllegalStateException.class)
	public ResponseEntity<?> handleConflict(IllegalStateException ex) {
		return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiResponse<>(false, ex.getMessage()));
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<?> handleDataIntegrity(DataIntegrityViolationException ex) {
		log.warn("Data integrity violation", ex);
		return ResponseEntity.status(HttpStatus.CONFLICT)
				.body(new ApiResponse<>(false, "The operation conflicts with existing data."));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<?> handleGeneric(Exception ex) {
		log.error("{}: {}", ex.getClass().getSimpleName(), ex.getMessage(), ex);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ApiResponse<>(false, "Something went wrong"));
	}
}
