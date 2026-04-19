package com.aryogasutra.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${aryogasutra.uploads-dir}")
    private String uploadsDir;

    private Path root;

    @PostConstruct
    void init() throws IOException {
        this.root = Paths.get(uploadsDir).toAbsolutePath().normalize();
        Files.createDirectories(this.root);
    }

    public String storePatientReport(Long patientId, MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Empty file");
        }
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "report";
        String safe = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        String name = patientId + "_" + UUID.randomUUID() + "_" + safe;
        Path dir = root.resolve(String.valueOf(patientId));
        Files.createDirectories(dir);
        Path target = dir.resolve(name);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return target.toAbsolutePath().toString();
    }
}
