package com.aryogasutra.controller;

import com.aryogasutra.dto.PredictRequest;
import com.aryogasutra.dto.PredictResponse;
import com.aryogasutra.service.PredictIntegrationService;
import com.aryogasutra.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PredictController {

    private final PredictIntegrationService predictIntegrationService;

    @PostMapping("/predict")
    public PredictResponse predict(@Valid @RequestBody PredictRequest request) {
        return predictIntegrationService.run(request, SecurityUtils.currentUser());
    }
}
