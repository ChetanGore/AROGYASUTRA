package com.aryogasutra.controller;

import com.aryogasutra.dto.SuggestionDto;
import com.aryogasutra.dto.SuggestionRequest;
import com.aryogasutra.service.SuggestionService;
import com.aryogasutra.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/suggestions")
@RequiredArgsConstructor
public class SuggestionController {

    private final SuggestionService suggestionService;

    @PostMapping
    public SuggestionDto create(@Valid @RequestBody SuggestionRequest request) {
        return suggestionService.add(request, SecurityUtils.currentUser());
    }

    @GetMapping("/patient/{patientId}")
    public List<SuggestionDto> forPatient(@PathVariable Long patientId) {
        return suggestionService.listForPatient(patientId, SecurityUtils.currentUser());
    }
}
