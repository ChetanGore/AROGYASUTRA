package com.aryogasutra.controller;

import com.aryogasutra.service.ReportPdfService;
import com.aryogasutra.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ReportController {

    private final ReportPdfService reportPdfService;

    @GetMapping("/generate-report/{patientId}")
    public ResponseEntity<byte[]> generate(@PathVariable Long patientId) {
        byte[] pdf = reportPdfService.generate(patientId, SecurityUtils.currentUser());
        String filename = "aryogasutra-report-" + patientId + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
