package com.aryogasutra.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SuggestionRequest {

    @NotNull private Long patientId;

    @NotBlank
    @Size(max = 4000)
    private String suggestionText;
}
