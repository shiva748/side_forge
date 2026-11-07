package com.side.forge.common.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import com.side.forge.common.dto.ApiResponse;
import com.side.forge.platform.saas.exception.SubscriptionAccessException;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(BadCredentialsException.class)
	public ResponseEntity<?> handleBadCredentials(BadCredentialsException ex) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
				.body(new ApiResponse<>(false, ex.getMessage()));
	}

	@ExceptionHandler(DuplicateKeyException.class)
	public ResponseEntity<?> handleDuplicateKey(DuplicateKeyException ex) {
		return ResponseEntity.status(HttpStatus.CONFLICT)
				.body(new ApiResponse<>(false, ex.getMessage()));
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<?> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
		return ResponseEntity.badRequest()
				.body(new ApiResponse<>(false, "Uploaded file exceeds the maximum allowed size"));
	}

	@ExceptionHandler(SubscriptionAccessException.class)
	public ResponseEntity<?> handleSubscriptionAccessDenied(SubscriptionAccessException ex) {
		log.warn("Subscription/entitlement access denied: {}", ex.getMessage());
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(new ApiResponse<>(false, ex.getMessage()));
	}

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

	@ExceptionHandler(ConstraintViolationException.class)
	public ResponseEntity<?> handleConstraintViolation(ConstraintViolationException ex) {
		String message = ex.getConstraintViolations().stream()
				.map(v -> v.getMessage())
				.findFirst()
				.orElse("Request validation failed");
		return ResponseEntity.badRequest().body(new ApiResponse<>(false, message));
	}

	@ExceptionHandler(HandlerMethodValidationException.class)
	public ResponseEntity<?> handleMethodValidation(HandlerMethodValidationException ex) {
		return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Request validation failed"));
	}

	@ExceptionHandler({MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class,
			MissingServletRequestParameterException.class, MissingServletRequestPartException.class})
	public ResponseEntity<?> handleBadRequestPayload(Exception ex) {
		return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Invalid request parameters or payload"));
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
