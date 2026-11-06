package com.side.forge.storage.provider;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.side.forge.storage.spi.FileStorageProvider;

import jakarta.persistence.EntityNotFoundException;

/**
 * Local filesystem implementation of {@link FileStorageProvider}.
 * Stores binary objects under a configurable directory outside source code
 * using opaque storage keys and strict path-traversal protection.
 */
@Component
@ConditionalOnProperty(name = "forge.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalFileSystemStorageProvider implements FileStorageProvider {

	private static final Pattern SAFE_STORAGE_KEY = Pattern.compile("^[a-zA-Z0-9_\\-]+(/[a-zA-Z0-9_\\-]+)*$");

	private final Path rootDirectory;

	public LocalFileSystemStorageProvider(
			@Value("${forge.storage.local.root-dir:${java.io.tmpdir}/side-forge-storage}") String configuredRootDir) {
		if (configuredRootDir == null || configuredRootDir.isBlank()) {
			throw new IllegalArgumentException("Storage root directory must not be blank");
		}
		this.rootDirectory = Paths.get(configuredRootDir.trim()).toAbsolutePath().normalize();
		try {
			Files.createDirectories(this.rootDirectory);
		} catch (IOException ex) {
			throw new IllegalStateException("Failed to initialize local file storage directory", ex);
		}
	}

	@Override
	public void store(StorageUploadCommand command) {
		if (command == null || command.content() == null) {
			throw new IllegalArgumentException("Storage upload command and content are required");
		}
		Path targetPath = resolveSafePath(command.storageKey());
		try {
			Path parent = targetPath.getParent();
			if (parent != null) {
				Files.createDirectories(parent);
			}
			Files.write(targetPath, command.content(),
					StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
		} catch (IOException ex) {
			throw new IllegalStateException("Failed to store file content", ex);
		}
	}

	@Override
	public byte[] retrieve(String storageKey) {
		Path targetPath = resolveSafePath(storageKey);
		if (!Files.exists(targetPath) || !Files.isRegularFile(targetPath)) {
			throw new EntityNotFoundException("Stored file content not found");
		}
		try {
			return Files.readAllBytes(targetPath);
		} catch (IOException ex) {
			throw new IllegalStateException("Failed to read stored file content", ex);
		}
	}

	@Override
	public boolean delete(String storageKey) {
		Path targetPath = resolveSafePath(storageKey);
		try {
			return Files.deleteIfExists(targetPath);
		} catch (IOException ex) {
			throw new IllegalStateException("Failed to delete stored file content", ex);
		}
	}

	@Override
	public boolean exists(String storageKey) {
		Path targetPath = resolveSafePath(storageKey);
		return Files.exists(targetPath) && Files.isRegularFile(targetPath);
	}

	@Override
	public Optional<StoredObjectMetadata> getObjectMetadata(String storageKey) {
		Path targetPath = resolveSafePath(storageKey);
		if (!Files.exists(targetPath) || !Files.isRegularFile(targetPath)) {
			return Optional.empty();
		}
		try {
			long size = Files.size(targetPath);
			var lastModified = Files.getLastModifiedTime(targetPath).toInstant();
			return Optional.of(new StoredObjectMetadata(storageKey, size, lastModified));
		} catch (IOException ex) {
			throw new IllegalStateException("Failed to read stored object metadata", ex);
		}
	}

	private Path resolveSafePath(String storageKey) {
		if (storageKey == null || storageKey.isBlank()) {
			throw new IllegalArgumentException("Storage key is required");
		}
		String trimmed = storageKey.trim();
		if (trimmed.contains("..") || trimmed.contains("\\") || trimmed.contains("\0")
				|| !SAFE_STORAGE_KEY.matcher(trimmed).matches()) {
			throw new IllegalArgumentException("Invalid storage key");
		}
		Path resolved = rootDirectory.resolve(trimmed).toAbsolutePath().normalize();
		if (!resolved.startsWith(rootDirectory)) {
			throw new IllegalArgumentException("Path traversal detected in storage key");
		}
		return resolved;
	}
}
