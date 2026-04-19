package com.aryogasutra.controller;

import com.aryogasutra.dto.PatientDto;
import com.aryogasutra.dto.PatientUpdateRequest;
import com.aryogasutra.service.PatientService;
import com.aryogasutra.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @GetMapping
    public List<PatientDto> listAll() {
        return patientService.listAll(SecurityUtils.currentUser());
    }

    @GetMapping("/me")
    public PatientDto me() {
        return patientService.getMine(SecurityUtils.currentUser());
    }

    @GetMapping("/{id}")
    public PatientDto getById(@PathVariable Long id) {
        return patientService.getById(id, SecurityUtils.currentUser());
    }

    @PutMapping("/me")
    public PatientDto updateMe(@Valid @RequestBody PatientUpdateRequest request) {
        return patientService.updateMine(request);
    }

    @PostMapping(value = "/me/report", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public PatientDto uploadReport(@RequestPart("file") MultipartFile file) throws IOException {
        return patientService.uploadReport(file);
    }

    /**
     * Serve the patient's uploaded report file — accessible by the patient themselves,
     * doctors, and admins.
     */
    @GetMapping("/{id}/report")
    public ResponseEntity<Resource> downloadReport(@PathVariable Long id) {
        PatientDto patient = patientService.getById(id, SecurityUtils.currentUser());
        if (patient.getReportFilePath() == null || patient.getReportFilePath().isBlank()) {
            return ResponseEntity.notFound().build();
        }
        File file = new File(patient.getReportFilePath());
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(file);
        String filename = file.getName();
        MediaType mediaType = filename.toLowerCase().endsWith(".pdf")
                ? MediaType.APPLICATION_PDF
                : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .body(resource);
    }
}
