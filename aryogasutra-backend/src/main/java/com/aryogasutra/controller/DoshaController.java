package com.aryogasutra.controller;

import com.aryogasutra.dto.DoshaResultDto;
import com.aryogasutra.dto.DoshaSubmitRequest;
import com.aryogasutra.service.DoshaService;
import com.aryogasutra.util.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/dosha-test")
@RequiredArgsConstructor
public class DoshaController {

    private final DoshaService doshaService;

    @GetMapping("/questions")
    public List<JsonNode> questions() {
        return doshaService.getQuestions();
    }

    @PostMapping
    public DoshaResultDto submit(@Valid @RequestBody DoshaSubmitRequest request) {
        return doshaService.submit(request, SecurityUtils.currentUser());
    }

    @GetMapping("/latest/{patientId}")
    public DoshaResultDto latest(@PathVariable Long patientId) {
        return doshaService.latestForPatient(patientId, SecurityUtils.currentUser());
    }
}
